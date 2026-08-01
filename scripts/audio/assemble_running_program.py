#!/usr/bin/env python3
"""Assemble reusable phrases into continuous Opus coach and chime tracks."""

from __future__ import annotations

import json
from pathlib import Path

from _common import CHIME_ROOT, COACH_ROOT, CONFIG_PATH, KOKORO_VERSION, ROOT, WORK_ROOT, deterministic_generated_at, read_json, require_command, run, sha256_file, write_json
from assemble_session import load_wav, mix_at, tone
from generate_running_phrases import PHRASE_ROOT

SCRIPT_ROOT = ROOT / "audio-scripts"
TONE_TYPE = {"controlled-run": "easy-run", "very-easy-recovery": "recovery-walk"}


def fast_encode(source, output, bitrate):
    """Encode sparse pre-mastered cues without scanning minutes of silence twice."""
    ffmpeg = require_command("ffmpeg")
    run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-af", "alimiter=limit=0.841395,aresample=24000", "-c:a", "libopus", "-b:a", bitrate, "-vbr", "on", str(output)])


def phrase_for(phase, *, warning=False):
    if warning:
        return "finish-warning" if phase["type"] == "cool-down-walk" else "phase-warning"
    return {
        "warm-up-walk": "warmup-start",
        "easy-run": "continuous-start" if phase["id"] == "continuous-run" else "run-start",
        "controlled-run": "quality-start",
        "recovery-walk": "recovery-start",
        "very-easy-recovery": "recovery-start",
        "cool-down-walk": "cooldown-start",
    }[phase["type"]]


def assemble(session, config, library):
    import numpy as np
    import soundfile as sf

    sample_rate = config["sampleRate"]
    duration = session["durationSeconds"]
    warning_tone = tone(library["chimes"]["warning"], sample_rate, 0.13)
    cues = []

    def make_timeline(with_voice):
        timeline = np.zeros(duration * sample_rate, dtype=np.float32)
        for phase in session["phases"]:
            start = phase["startSeconds"]
            warning = start + phase["durationSeconds"] - config["warningSeconds"]
            chime_type = TONE_TYPE.get(phase["type"], phase["type"])
            start_tone = tone(library["chimes"][chime_type], sample_rate)
            mix_at(timeline, start_tone, max(0, start - 0.30), sample_rate)
            mix_at(timeline, warning_tone, warning, sample_rate)
            if with_voice:
                mix_at(timeline, load_wav(PHRASE_ROOT / f"{phrase_for(phase)}.wav", sample_rate), start, sample_rate, 0.92)
                mix_at(timeline, load_wav(PHRASE_ROOT / f"{phrase_for(phase, warning=True)}.wav", sample_rate), warning + 0.30, sample_rate, 0.92)
        completion = load_wav(PHRASE_ROOT / "session-complete.wav", sample_rate)
        completion_tone = tone(library["chimes"]["session-complete"], sample_rate, 0.17)
        if with_voice:
            mix_at(timeline, completion, max(0, duration - len(completion) / sample_rate), sample_rate, 0.92)
        mix_at(timeline, completion_tone, duration - len(completion_tone) / sample_rate, sample_rate)
        peak = float(np.max(np.abs(timeline)))
        if peak > 0.88:
            timeline *= 0.88 / peak
        return timeline

    for phase in session["phases"]:
        warning = phase["startSeconds"] + phase["durationSeconds"] - config["warningSeconds"]
        cues.extend([
            {"id": phase["id"], "timeSeconds": phase["startSeconds"], "phase": phase["type"], "kind": "start"},
            {"id": f"{phase['id']}-warning", "timeSeconds": warning, "phase": phase["type"], "kind": "warning"},
        ])
    cues.append({"id": "session-complete", "timeSeconds": duration, "phase": "complete", "kind": "completion"})

    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    COACH_ROOT.mkdir(parents=True, exist_ok=True)
    CHIME_ROOT.mkdir(parents=True, exist_ok=True)
    voice_wav = WORK_ROOT / f"{session['id']}-coach.wav"
    chime_wav = WORK_ROOT / f"{session['id']}-chimes.wav"
    opus_path = COACH_ROOT / f"{session['id']}-coach.opus"
    chime_path = CHIME_ROOT / f"{session['id']}-chimes.opus"
    mastering = config["mastering"]
    sf.write(voice_wav, make_timeline(True), sample_rate, subtype="PCM_24")
    fast_encode(voice_wav, opus_path, mastering["opusBitrate"])
    voice_wav.unlink(missing_ok=True)
    sf.write(chime_wav, make_timeline(False), sample_rate, subtype="PCM_24")
    fast_encode(chime_wav, chime_path, mastering["opusBitrate"])
    chime_wav.unlink(missing_ok=True)

    manifest_path = COACH_ROOT / f"{session['id']}-coach.manifest.json"
    old_manifest = read_json(manifest_path) if manifest_path.exists() else None
    file_hashes = {"opus": sha256_file(opus_path), "chimes": sha256_file(chime_path)}
    manifest = {
        "schemaVersion": 1, "sessionId": session["id"], "sessionVersion": session.get("version", 1),
        "durationSeconds": duration, "voiceEngine": "kokoro", "voice": config["voice"],
        "language": config["languageCode"], "speed": config["speed"], "kokoroVersion": KOKORO_VERSION,
        "generatedAt": deterministic_generated_at(old_manifest, file_hashes),
        "mastering": {"integratedLufs": mastering["integratedLufs"], "truePeakDb": mastering["truePeakDb"], "sampleRate": sample_rate, "opusBitrate": mastering["opusBitrate"]},
        "files": {"opus": {"path": f"/audio/coach/{session['id']}-coach.opus", "sha256": file_hashes["opus"]}, "chimes": {"path": f"/audio/chimes/{session['id']}-chimes.opus", "sha256": file_hashes["chimes"]}},
        "cues": cues,
    }
    write_json(manifest_path, manifest)
    print(f"assembled {session['id']} ({duration} seconds)")


def main():
    config = read_json(CONFIG_PATH)
    library = read_json(SCRIPT_ROOT / "phrase-library.json")
    for path in sorted(SCRIPT_ROOT.glob("*.json")):
        if path.name in {"phrase-library.json", "starter-run.json"}:
            continue
        assemble(read_json(path), config, library)


if __name__ == "__main__":
    main()
