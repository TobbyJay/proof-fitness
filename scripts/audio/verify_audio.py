#!/usr/bin/env python3
"""Verify the generated timeline, manifest, app references, and offline contract."""

from __future__ import annotations

import json
import re
from pathlib import Path

from _common import (
    CHIME_ROOT,
    COACH_ROOT,
    ROOT,
    load_inputs,
    read_json,
    require_command,
    run,
    sha256_file,
)


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def probe(path: Path):
    ffprobe = require_command("ffprobe")
    result = run([
        ffprobe, "-v", "error", "-show_entries",
        "format=duration:stream=sample_rate,channels", "-of", "json", str(path)
    ], capture=True)
    return json.loads(result.stdout)


def has_signal(path: Path, when: float, duration: float):
    ffmpeg = require_command("ffmpeg")
    start = max(0, when - 0.5)
    result = run([
        ffmpeg, "-hide_banner", "-ss", str(start), "-t", str(duration), "-i", str(path),
        "-af", "volumedetect", "-f", "null", "-"
    ], capture=True)
    match = re.search(r"max_volume:\s*(-?[\d.]+) dB", result.stderr)
    return bool(match and float(match.group(1)) > -55)


def max_volume(path: Path):
    ffmpeg = require_command("ffmpeg")
    result = run([
        ffmpeg, "-hide_banner", "-i", str(path), "-af", "volumedetect",
        "-f", "null", "-"
    ], capture=True)
    match = re.search(r"max_volume:\s*(-?[\d.]+) dB", result.stderr)
    check(match, f"could not measure peak level for {path.name}")
    return float(match.group(1))


def verify_session(session, asset_id):
    manifest_path = COACH_ROOT / f"{asset_id}-coach.manifest.json"
    manifest = read_json(manifest_path)
    paths = {
        "opus": COACH_ROOT / f"{asset_id}-coach.opus",
        "chimes": CHIME_ROOT / f"{asset_id}-chimes.opus",
    }
    if asset_id == "starter-run":
        paths["mp3"] = COACH_ROOT / "starter-run-coach.mp3"
    for path in [manifest_path, *paths.values()]:
        check(path.exists() and path.stat().st_size > 0, f"missing required output: {path}")

    expected_duration = session["durationSeconds"]
    for kind, path in paths.items():
        details = probe(path)
        duration = float(details["format"]["duration"])
        check(abs(duration - expected_duration) <= 0.25, f"{kind} duration is {duration}, expected {expected_duration}")
        expected_rate = "24000" if kind == "mp3" else "48000"
        check(
            details["streams"][0]["sample_rate"] == expected_rate,
            f"{kind} sample rate is {details['streams'][0]['sample_rate']}, expected {expected_rate}",
        )
        check(max_volume(path) <= 0, f"{session['id']} {kind} clips above digital full scale")
        expected_hash = manifest["files"][kind]["sha256"]
        check(sha256_file(path) == expected_hash, f"{kind} SHA-256 does not match manifest")

    phases = session["phases"]
    check(phases[0]["startSeconds"] == 0, "session must begin at zero")
    cursor = 0
    for phase in phases:
        check(phase["startSeconds"] == cursor, f"phase gap or overlap at {phase['id']}")
        check(all(phase.get(key) for key in ("id", "type", "label", "instruction", "cue", "warning", "completionInstruction")), f"incomplete phase {phase['id']}")
        cursor += phase["durationSeconds"]
    check(cursor == expected_duration, "phase duration total does not match session")

    cue_times = [cue["timeSeconds"] for cue in manifest["cues"]]
    check(cue_times == sorted(cue_times), "manifest cue timestamps are not ordered")
    check(all(0 <= cue <= expected_duration for cue in cue_times), "manifest contains an invalid cue")
    for cue in manifest["cues"]:
        window = 1.2 if cue["kind"] != "completion" else 1.5
        check(has_signal(paths["opus"], cue["timeSeconds"], window), f"{session['id']} coach is silent around {cue['id']}")


def main():
    _, starter_session, _ = load_inputs()
    sessions = [(starter_session, "starter-run")]
    for script_path in sorted((ROOT / "audio-scripts").glob("*.json")):
        if script_path.name in {"starter-run.json", "phrase-library.json"}:
            continue
        session = read_json(script_path)
        sessions.append((session, session["id"]))
    for session, asset_id in sessions:
        verify_session(session, asset_id)

    app = "\n".join(path.read_text(encoding="utf-8") for path in (ROOT / "src").rglob("*.js"))
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    worker = (ROOT / "public" / "sw.js").read_text(encoding="utf-8")
    for reference in (
        "/audio/coach/starter-run-coach.opus",
        "/audio/coach/starter-run-coach.mp3",
        "/audio/chimes/starter-run-chimes.opus",
    ):
        check(reference in app or reference in html, f"application does not reference {reference}")
    check("RUN_RESOURCE_PREFIXES" in worker and "isAllowedRunResource" in worker, "service worker omits safe versioned audio caching")
    check("/audio/coach/starter-run-coach.manifest.json" in worker, "service worker omits manifest")
    check("/audio-scripts/starter-run.json" in worker, "service worker omits run script")

    source_files = [
        path for base in (ROOT / "src", ROOT / "public")
        for path in base.rglob("*") if path.is_file() and path.suffix in {".js", ".html", ".css"}
    ]
    source = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in source_files)
    check(not re.search(r"data:audio/[^;]+;base64,", source), "base64 audio is embedded in source")
    check(not re.search(r"google-cloud-texttospeech|amazon-polly|azure.*speech|elevenlabs", source, re.I), "cloud TTS reference found")
    check(not re.search(r"(tts|speech).{0,20}(api[_-]?key|secret)", source, re.I), "TTS API key pattern found")
    print("Audio verification passed.")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, FileNotFoundError, json.JSONDecodeError) as error:
        raise SystemExit(f"Audio verification failed: {error}")
