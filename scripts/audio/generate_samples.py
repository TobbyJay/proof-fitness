#!/usr/bin/env python3
"""Generate local voice-comparison samples without changing the selected voice."""

from __future__ import annotations

import argparse
import json

from _common import (
    KOKORO_VERSION,
    SAMPLE_ROOT,
    SUPPORTED_ENGLISH_VOICES,
    load_inputs,
    selected_language_code,
    write_json,
)

SAMPLE_VOICES = ("bf_emma", "bf_isabella", "bm_fable", "af_heart", "af_bella", "am_fenrir")


def synthesise(pipeline, text, voice, speed, sample_rate, destination):
    import numpy as np
    import soundfile as sf

    parts = [np.asarray(item[2], dtype=np.float32) for item in pipeline(text, voice=voice, speed=speed)]
    audio = np.concatenate(parts) if parts else np.zeros(1, dtype=np.float32)
    pad = np.zeros(int(sample_rate * 0.15), dtype=np.float32)
    sf.write(destination, np.concatenate((pad, audio, pad)), sample_rate, subtype="PCM_16")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace existing sample WAVs, including the currently selected voice",
    )
    args = parser.parse_args()
    config, _, library = load_inputs()

    from kokoro import KPipeline

    SAMPLE_ROOT.mkdir(parents=True, exist_ok=True)
    pipelines = {}
    entries = []
    for voice in SAMPLE_VOICES:
        language_code = selected_language_code(config, voice)
        language = SUPPORTED_ENGLISH_VOICES[voice]
        output = SAMPLE_ROOT / f"proof-coach-{voice}.wav"
        if not output.exists() or args.force:
            if language_code not in pipelines:
                pipelines[language_code] = KPipeline(lang_code=language_code)
            synthesise(
                pipelines[language_code],
                library["sampleText"],
                voice,
                config["speed"],
                config["sampleRate"],
                output,
            )
            print(f"generated {output.relative_to(SAMPLE_ROOT.parent.parent.parent)}")
        else:
            print(f"kept existing {output.name}; pass --force to replace it")
        entries.append(
            {
                "voice": voice,
                "language": language,
                "speed": config["speed"],
                "file": f"/audio/samples/{output.name}",
                "selected": voice == config["voice"],
            }
        )

    write_json(
        SAMPLE_ROOT / "index.json",
        {
            "schemaVersion": 1,
            "sampleText": library["sampleText"],
            "kokoroVersion": KOKORO_VERSION,
            "samples": entries,
        },
    )
    print("Voice samples are review-only and are not included in the production app shell.")


if __name__ == "__main__":
    main()
