# Local run-coach audio generation

Proof Fitness ships its run coach as static Opus and MP3 files. Ordinary users only need `npm install` and `npm run dev`: they do not need Python, Kokoro, FFmpeg, a speech model, an account, an API key, a microphone, or a recording. Speech is never generated in the browser and using the coach does not require an internet connection after its assets have been downloaded.

The Python toolchain in this guide is only for maintainers regenerating committed audio.

## Architecture

`audio-scripts/starter-run.json` is the source of truth for the 28-minute timeline, visible phase labels, phrase generation, cue times, and verification. `config/audio-coach.json` selects the supported fixed Kokoro voice and mastering settings. Maintainer scripts generate lossless phrase WAVs into the ignored `scripts/audio/.work/` directory, mix programmatically generated chimes, and use FFmpeg to create:

- `public/audio/coach/starter-run-coach.opus`
- `public/audio/coach/starter-run-coach.mp3`
- `public/audio/chimes/starter-run-chimes.opus`
- `public/audio/coach/starter-run-coach.manifest.json`

The app prefers Opus when the browser reports support and falls back to MP3. One continuous media element is the run clock, so pause, resume, seeking, minimising, and returning to the app reconstruct the phase from `audio.currentTime`. Media Session controls can keep controlling the track from a headset or lock screen where the browser and operating system permit it.

## Maintainer setup

Use Python 3.10–3.12. On Ubuntu, install the system tools explicitly:

```bash
sudo apt update
sudo apt install ffmpeg espeak-ng
npm run audio:setup
```

Kokoro uses Misaki for grapheme-to-phoneme conversion; its English out-of-dictionary fallback can use the local eSpeak NG library. eSpeak does not produce the committed voice audio. Kokoro does, and neither tool is an application runtime dependency.

The first generation downloads the pinned Kokoro model and selected fixed voice from the official `hexgrad/Kokoro-82M` repository into the maintainer machine's model cache. No model weight is committed here.

macOS maintainers can install FFmpeg and eSpeak NG with Homebrew, then run `npm run audio:setup`. Windows maintainers can use current FFmpeg builds and the official eSpeak NG installer, then invoke the Python scripts from the virtual environment with the Windows `Scripts` path. These platform notes have not been tested by this project.

## Compare and select a voice

```bash
npm run audio:samples
```

The command synthesises the exact same sample with several supported British and American voices and writes an index to `public/audio/samples/index.json`. Review-only audio files are ignored by Git. Existing samples are preserved; use `npm run audio:samples -- --force` only when replacement is intentional.

Set `voice`, `language`, and `languageCode` in `config/audio-coach.json`. The generator rejects voice identifiers outside the voice set verified for Kokoro 0.9.4 and rejects a British/American language-code mismatch. Proof currently defaults to `bf_emma`, a supported British voice with the strongest published overall grade among the British options in the Kokoro voice card. Voice cloning is not used or supported.

## Generate and verify

```bash
npm run audio:generate
npm run audio:verify
npm run check
npm run build
```

Phrase caching hashes the text, voice, speed, language, and Kokoro version, so unchanged phrases are not regenerated. Pass `--force` directly to `generate_phrases.py` only for an intentional full refresh.

The mastering chain targets -16 LUFS integrated loudness, -1.5 dB true peak, and LRA 7, with gentle compression and a 70 Hz high-pass filter. Lossless synthesis and the pre-encode master are mono at 24 kHz. Opus uses its native 48 kHz decode rate at 32 kbit/s VBR; MP3 remains 24 kHz at 48 kbit/s. The chime-only track uses 32 kbit/s Opus VBR. Prioritise outdoor intelligibility and listen through a single earpiece before approving regenerated assets.

Verification checks phase continuity, duration within 250 ms, required phase copy, ordered cue timestamps, signal near cues, peak level, manifest hashes, application and service-worker references, embedded base64 audio, and cloud-TTS/API-key patterns.

## Offline and background limitations

The run screen streams the selected guidance files into the service worker's Cache Storage cache and reports byte-based progress in both Vite development and production. “Available offline” appears only after every required Cache Storage write is confirmed. The production service worker serves those cached files, including media byte-range requests, and pre-caches the manifest and session script. Optional voice-comparison samples are never part of the app shell.

Continuous audio and Media Session integration improve lock-screen and headset behavior; they cannot guarantee it. iOS may suspend a PWA, discard caches under storage pressure, restrict wake locks, or expose fewer Media Session actions. Autoplay still requires a user gesture. Always use the in-app coach test on the actual phone before an outdoor run and keep one ear open around traffic.

## Add or change a session

1. Add a versioned session JSON under `audio-scripts/` with stable IDs, contiguous timestamps, instructions, cues, warnings, and completion copy.
2. Keep action, duration, and intensity at the front of every phase announcement.
3. Add any new synthetic chime pattern to `phrase-library.json`.
4. Extend assembly and app session selection without copying coaching strings into JavaScript.
5. Generate, listen, run verification, and commit only approved final programme assets and their manifest.

Contributors must document every new inference library, model, voice-specific attribution, codec tool, or third-party audio asset in `THIRD_PARTY_NOTICES.md`. Do not commit model caches, virtual environments, intermediate WAVs, recordings, API keys, or review-only samples. Check the dependency's actual licence file or model card before stating redistribution rights.
