"""Shared, maintainer-only helpers for Proof Fitness audio generation."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "config" / "audio-coach.json"
SESSION_PATH = ROOT / "audio-scripts" / "starter-run.json"
LIBRARY_PATH = ROOT / "audio-scripts" / "phrase-library.json"
WORK_ROOT = ROOT / "scripts" / "audio" / ".work"
PHRASE_ROOT = WORK_ROOT / "phrases"
CACHE_PATH = WORK_ROOT / "phrase-cache.json"
COACH_ROOT = ROOT / "public" / "audio" / "coach"
CHIME_ROOT = ROOT / "public" / "audio" / "chimes"
SAMPLE_ROOT = ROOT / "public" / "audio" / "samples"
KOKORO_VERSION = "0.9.4"

# Verified against Kokoro-82M VOICES.md for the pinned official library.
SUPPORTED_ENGLISH_VOICES = {
    "bf_alice": "british-english",
    "bf_emma": "british-english",
    "bf_isabella": "british-english",
    "bf_lily": "british-english",
    "bm_daniel": "british-english",
    "bm_fable": "british-english",
    "bm_george": "british-english",
    "bm_lewis": "british-english",
    "af_heart": "american-english",
    "af_bella": "american-english",
    "af_nicole": "american-english",
    "am_fenrir": "american-english",
    "am_michael": "american-english",
}


def read_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_inputs():
    return read_json(CONFIG_PATH), read_json(SESSION_PATH), read_json(LIBRARY_PATH)


def fail(message: str) -> "NoReturn":
    print(f"Audio generation error: {message}", file=sys.stderr)
    raise SystemExit(1)


def require_command(name: str) -> str:
    command = shutil.which(name)
    if not command:
        fail(
            f"{name} is required for maintainers. On Ubuntu run "
            f"`sudo apt install {'ffmpeg' if name in ('ffmpeg', 'ffprobe') else name}`. "
            "Ordinary app users do not need this tool."
        )
    return command


def run(command: list[str], *, capture=False) -> subprocess.CompletedProcess:
    return subprocess.run(
        command,
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def phrase_hash(text: str, config: dict) -> str:
    value = {
        "text": text,
        "voice": config["voice"],
        "speed": config["speed"],
        "language": config["language"],
        "kokoroVersion": KOKORO_VERSION,
    }
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def phase_clip_id(phase: dict, kind: str) -> str:
    phase_id = phase["id"]
    if phase_id.startswith("run-round-"):
        phase_id = f"run-round-{int(phase_id.rsplit('-', 1)[1]):02d}"
    elif phase_id.startswith("walk-round-"):
        phase_id = f"walk-round-{int(phase_id.rsplit('-', 1)[1]):02d}"
    return f"{phase_id}-{kind}"


def selected_language_code(config: dict, voice: str | None = None) -> str:
    selected = voice or config["voice"]
    language = SUPPORTED_ENGLISH_VOICES.get(selected)
    if not language:
        fail(
            f"Unsupported Kokoro voice `{selected}` for version {KOKORO_VERSION}. "
            f"Choose one of: {', '.join(sorted(SUPPORTED_ENGLISH_VOICES))}"
        )
    expected = "b" if language == "british-english" else "a"
    if voice is None and config.get("languageCode") != expected:
        fail(f"Voice `{selected}` requires languageCode `{expected}`.")
    return expected


def deterministic_generated_at(existing: dict | None, new_hashes: dict) -> str:
    if existing:
        previous = {
            kind: details.get("sha256")
            for kind, details in existing.get("files", {}).items()
        }
        if previous == new_hashes and existing.get("generatedAt"):
            return existing["generatedAt"]
    epoch = os.environ.get("SOURCE_DATE_EPOCH")
    if epoch:
        from datetime import datetime, timezone

        return datetime.fromtimestamp(int(epoch), timezone.utc).isoformat().replace("+00:00", "Z")
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
