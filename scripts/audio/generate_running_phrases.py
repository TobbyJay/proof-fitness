#!/usr/bin/env python3
"""Generate a small reusable Kokoro phrase bank for versioned run templates."""

from __future__ import annotations

from _common import CONFIG_PATH, KOKORO_VERSION, WORK_ROOT, phrase_hash, read_json, selected_language_code, write_json
from generate_phrases import synthesise

PHRASE_ROOT = WORK_ROOT / "running-shared"
CACHE_PATH = WORK_ROOT / "running-phrase-cache.json"
PHRASES = {
    "warmup-start": "Begin with a comfortable five minute warm-up walk. Stand tall and gradually walk more briskly.",
    "run-start": "Begin the easy running block now. Keep the effort conversational, your stride relaxed, and do not sprint.",
    "continuous-start": "Begin the continuous easy run now. Stay controlled and slow down if it begins to feel like a race.",
    "quality-start": "Begin the controlled faster interval now. Stay smooth and composed. This is controlled, never a sprint.",
    "recovery-start": "Begin the recovery now. Walk briskly or jog very easily and let your breathing settle.",
    "cooldown-start": "Begin the easy cool-down walk now. Gradually slow down and let your breathing return towards normal.",
    "phase-warning": "Ten seconds remaining. Prepare for the next phase.",
    "finish-warning": "Ten seconds remaining. Keep walking easily.",
    "session-complete": "Session complete. Continue walking until you feel settled.",
}


def main():
    config = read_json(CONFIG_PATH)
    language_code = selected_language_code(config)
    from kokoro import KPipeline

    pipeline = KPipeline(lang_code=language_code)
    PHRASE_ROOT.mkdir(parents=True, exist_ok=True)
    cache = read_json(CACHE_PATH) if CACHE_PATH.exists() else {}
    next_cache = {}
    for phrase_id, phrase_text in PHRASES.items():
        output = PHRASE_ROOT / f"{phrase_id}.wav"
        digest = phrase_hash(phrase_text, config)
        if output.exists() and cache.get(phrase_id) == digest:
            print(f"cached {output.name}")
        else:
            synthesise(pipeline, phrase_text, config, output)
            print(f"generated {output.name}")
        next_cache[phrase_id] = digest
    write_json(CACHE_PATH, next_cache)
    print(f"Reusable running phrases generated with Kokoro {KOKORO_VERSION}.")


if __name__ == "__main__":
    main()
