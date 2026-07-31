#!/usr/bin/env python3
"""Assemble cached phrases and generated chimes into continuous browser audio."""

from __future__ import annotations

import json
import math
from pathlib import Path

from _common import (
    CHIME_ROOT,
    COACH_ROOT,
    KOKORO_VERSION,
    PHRASE_ROOT,
    WORK_ROOT,
    deterministic_generated_at,
    load_inputs,
    phase_clip_id,
    read_json,
    require_command,
    run,
    sha256_file,
    write_json,
)


def mix_at(timeline, clip, start_seconds, sample_rate, gain=1.0):
    import numpy as np

    start = max(0, int(round(start_seconds * sample_rate)))
    if start >= len(timeline):
        return
    end = min(len(timeline), start + len(clip))
    timeline[start:end] += np.asarray(clip[: end - start], dtype=np.float32) * gain


def tone(pattern, sample_rate, volume=0.16):
    import numpy as np

    pieces = []
    for index, (frequency, duration) in enumerate(pattern):
        count = int(sample_rate * duration)
        time = np.arange(count, dtype=np.float32) / sample_rate
        envelope = np.minimum(1, time / 0.018) * np.minimum(1, (duration - time) / 0.06)
        pieces.append(np.sin(2 * math.pi * frequency * time) * envelope * volume)
        if index < len(pattern) - 1:
            pieces.append(np.zeros(int(sample_rate * 0.075), dtype=np.float32))
    return np.concatenate(pieces).astype(np.float32)


def load_wav(path: Path, expected_rate: int):
    import numpy as np
    import soundfile as sf

    audio, rate = sf.read(path, dtype="float32", always_2d=False)
    if rate != expected_rate:
        raise RuntimeError(f"{path.name} is {rate} Hz; expected {expected_rate} Hz")
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    return audio


def ffmpeg_encode(source: Path, output: Path, codec_args: list[str], mastering: dict):
    ffmpeg = require_command("ffmpeg")
    filters = (
        "highpass=f=70,"
        "acompressor=threshold=-20dB:ratio=2:attack=12:release=160:makeup=2dB,"
        f"loudnorm=I={mastering['integratedLufs']}:TP={mastering['truePeakDb']}:"
        f"LRA={mastering['loudnessRange']},"
        f"alimiter=limit={10 ** (mastering['truePeakDb'] / 20):.6f},"
        "aresample=24000"
    )
    run([
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-af", filters, *codec_args, str(output),
    ])


def main():
    import numpy as np
    import soundfile as sf

    config, session, library = load_inputs()
    sample_rate = config["sampleRate"]
    duration = session["durationSeconds"]
    samples = duration * sample_rate
    voice = np.zeros(samples, dtype=np.float32)
    chimes = np.zeros(samples, dtype=np.float32)
    warning_tone = tone(library["chimes"]["warning"], sample_rate, 0.13)

    cues = []
    for phase in session["phases"]:
        start_clip_path = PHRASE_ROOT / f"{phase_clip_id(phase, 'start')}.wav"
        warning_clip_path = PHRASE_ROOT / f"{phase_clip_id(phase, 'warning')}.wav"
        if not start_clip_path.exists() or not warning_clip_path.exists():
            raise SystemExit("Phrase WAVs are missing. Run `npm run audio:generate` from the repository root.")
        start = phase["startSeconds"]
        warning = start + phase["durationSeconds"] - config["warningSeconds"]
        start_tone = tone(library["chimes"][phase["type"]], sample_rate)
        # Start tones lead speech slightly and remain quiet enough to preserve intelligibility.
        tone_start = max(0, start - 0.30)
        mix_at(chimes, start_tone, tone_start, sample_rate)
        mix_at(voice, start_tone, tone_start, sample_rate)
        mix_at(voice, load_wav(start_clip_path, sample_rate), start, sample_rate, 0.92)
        mix_at(chimes, warning_tone, warning, sample_rate)
        mix_at(voice, warning_tone, warning, sample_rate)
        mix_at(voice, load_wav(warning_clip_path, sample_rate), warning + 0.30, sample_rate, 0.92)
        cues.extend([
            {"id": phase["id"], "timeSeconds": start, "phase": phase["type"], "kind": "start"},
            {"id": f"{phase['id']}-warning", "timeSeconds": warning, "phase": phase["type"], "kind": "warning"},
        ])

    completion = load_wav(PHRASE_ROOT / "session-complete.wav", sample_rate)
    completion_start = max(0, duration - len(completion) / sample_rate)
    completion_tone = tone(library["chimes"]["session-complete"], sample_rate, 0.17)
    mix_at(voice, completion, completion_start, sample_rate, 0.92)
    mix_at(voice, completion_tone, duration - len(completion_tone) / sample_rate, sample_rate)
    mix_at(chimes, completion_tone, duration - len(completion_tone) / sample_rate, sample_rate)
    cues.append({"id": "session-complete", "timeSeconds": duration, "phase": "complete", "kind": "completion"})

    # Leave headroom before the mastering pass.
    for timeline in (voice, chimes):
        peak = float(np.max(np.abs(timeline)))
        if peak > 0.88:
            timeline *= 0.88 / peak

    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    COACH_ROOT.mkdir(parents=True, exist_ok=True)
    CHIME_ROOT.mkdir(parents=True, exist_ok=True)
    voice_wav = WORK_ROOT / "starter-run-coach.wav"
    chime_wav = WORK_ROOT / "starter-run-chimes.wav"
    sf.write(voice_wav, voice, sample_rate, subtype="PCM_24")
    sf.write(chime_wav, chimes, sample_rate, subtype="PCM_24")

    opus_path = COACH_ROOT / "starter-run-coach.opus"
    mp3_path = COACH_ROOT / "starter-run-coach.mp3"
    chime_path = CHIME_ROOT / "starter-run-chimes.opus"
    mastering = config["mastering"]
    ffmpeg_encode(voice_wav, opus_path, ["-c:a", "libopus", "-b:a", mastering["opusBitrate"], "-vbr", "on"], mastering)
    ffmpeg_encode(voice_wav, mp3_path, ["-c:a", "libmp3lame", "-b:a", mastering["mp3Bitrate"]], mastering)
    ffmpeg_encode(chime_wav, chime_path, ["-c:a", "libopus", "-b:a", mastering["opusBitrate"], "-vbr", "on"], mastering)

    manifest_path = COACH_ROOT / "starter-run-coach.manifest.json"
    old_manifest = read_json(manifest_path) if manifest_path.exists() else None
    file_hashes = {
        "opus": sha256_file(opus_path),
        "mp3": sha256_file(mp3_path),
        "chimes": sha256_file(chime_path),
    }
    manifest = {
        "schemaVersion": 1,
        "sessionId": session["id"],
        "durationSeconds": duration,
        "voiceEngine": "kokoro",
        "voice": config["voice"],
        "language": config["languageCode"],
        "speed": config["speed"],
        "kokoroVersion": KOKORO_VERSION,
        "generatedAt": deterministic_generated_at(old_manifest, file_hashes),
        "mastering": {
            "integratedLufs": mastering["integratedLufs"],
            "truePeakDb": mastering["truePeakDb"],
            "sampleRate": sample_rate,
            "opusBitrate": mastering["opusBitrate"],
            "mp3Bitrate": mastering["mp3Bitrate"],
        },
        "files": {
            "opus": {"path": "/audio/coach/starter-run-coach.opus", "sha256": file_hashes["opus"]},
            "mp3": {"path": "/audio/coach/starter-run-coach.mp3", "sha256": file_hashes["mp3"]},
            "chimes": {"path": "/audio/chimes/starter-run-chimes.opus", "sha256": file_hashes["chimes"]},
        },
        "cues": cues,
    }
    write_json(manifest_path, manifest)
    print(f"Assembled {duration}-second coach and chime timelines.")


if __name__ == "__main__":
    main()
