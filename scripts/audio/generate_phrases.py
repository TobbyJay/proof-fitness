#!/usr/bin/env python3
"""Generate cached, lossless Kokoro phrase WAVs for the starter run."""

from __future__ import annotations

import argparse

from _common import (
    CACHE_PATH,
    KOKORO_VERSION,
    PHRASE_ROOT,
    load_inputs,
    phase_clip_id,
    phrase_hash,
    read_json,
    selected_language_code,
    write_json,
)


def phrase_specs(session: dict, detailed: bool):
    for phase in session["phases"]:
        start_parts = [phase["instruction"], phase["cue"]]
        if detailed and phase.get("encouragement"):
            start_parts.append(phase["encouragement"])
        yield phase_clip_id(phase, "start"), " ".join(start_parts)
        yield phase_clip_id(phase, "warning"), phase["warning"]
    final_phase = session["phases"][-1]
    yield "session-complete", final_phase["completionInstruction"]


def synthesise(pipeline, text, config, destination):
    import numpy as np
    import soundfile as sf

    parts = [np.asarray(item[2], dtype=np.float32) for item in pipeline(
        text, voice=config["voice"], speed=config["speed"]
    )]
    if not parts:
        raise RuntimeError(f"Kokoro returned no audio for {destination.name}")
    pause = np.zeros(int(config["sampleRate"] * 0.08), dtype=np.float32)
    joined = parts[0]
    for part in parts[1:]:
        joined = np.concatenate((joined, pause, part))
    before = np.zeros(int(config["sampleRate"] * config["silenceBeforeMs"] / 1000), dtype=np.float32)
    after = np.zeros(int(config["sampleRate"] * config["silenceAfterMs"] / 1000), dtype=np.float32)
    audio = np.concatenate((before, joined, after))
    peak = float(np.max(np.abs(audio)))
    if peak > 0.99:
        audio *= 0.98 / peak
    sf.write(destination, audio, config["sampleRate"], subtype="PCM_24")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="regenerate all phrases")
    args = parser.parse_args()
    config, session, _ = load_inputs()
    language_code = selected_language_code(config)

    from kokoro import KPipeline

    pipeline = KPipeline(lang_code=language_code)
    PHRASE_ROOT.mkdir(parents=True, exist_ok=True)
    cache = read_json(CACHE_PATH) if CACHE_PATH.exists() else {}
    next_cache = {}
    for phrase_id, text in phrase_specs(session, config["detailedCoaching"]):
        output = PHRASE_ROOT / f"{phrase_id}.wav"
        digest = phrase_hash(text, config)
        if not args.force and output.exists() and cache.get(phrase_id) == digest:
            print(f"cached {output.name}")
        else:
            synthesise(pipeline, text, config, output)
            print(f"generated {output.name}")
        next_cache[phrase_id] = digest
    write_json(CACHE_PATH, next_cache)
    print(f"Generated with Kokoro {KOKORO_VERSION}, voice {config['voice']}.")


if __name__ == "__main__":
    main()
