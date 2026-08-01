# Versioned running audio

Every run template has a versioned JSON timeline under `audio-scripts/` and a public copy under `public/audio-scripts/`. Voice and chime modes play continuous pre-rendered media files; JavaScript timers drive the visible fallback only and are not the primary audio cue mechanism.

Stage 1 retains the shipped `starter-run-coach.opus`, MP3 fallback, `starter-run-chimes.opus`, manifest, and exact 28-minute cue timeline. Later templates use a small reusable nine-phrase Kokoro bank (warm-up, interval, continuous, controlled quality, recovery, cooldown, warning, finish warning, completion), then assemble those phrases and locally generated tones at template phase boundaries. This avoids dozens of near-duplicate speech clips while keeping every session a static continuous track.

## Maintainer workflow

```bash
npm run audio:setup
PATH=/path/to/ffmpeg:$PATH npm run audio:generate-running
PATH=/path/to/ffmpeg:$PATH npm run audio:verify
npm run running:validate
```

`audio:generate-running` synchronizes domain timelines, generates/caches the shared phrases with pinned Kokoro 0.9.4 and the configured local voice, and writes Opus voice/chime tracks plus SHA-256 manifests. New templates use Opus; Stage 1 keeps its existing MP3 fallback. No browser speech synthesis, cloud TTS API, credential, or base64 audio is used.

## Playback, recovery, and offline use

The run page offers Voice coach, Chimes only, and Visual only. Ten-second warnings exist in all templates. Media Session exposes Proof Fitness and the template name with play, pause, seek, and position where supported. Proof does not claim that every browser/OS guarantees lock-screen execution; the pre-run test and optional wake lock remain explicit fallbacks.

Audio position, template/stage, current phase, guidance mode, and status are checkpointed periodically and on pause, visibility/page lifecycle events, completion, and recoverable interruption. Recovery says the saved point may lag slightly.

The service worker runtime-caches same-origin versioned run scripts/manifests/media and handles byte-range playback. “Download for offline” verifies every required resource in Cache Storage before reporting success. Updating the app replaces stale Proof Fitness caches without touching IndexedDB history.
