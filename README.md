# Proof Fitness

**Proof Fitness** is a local-first fitness accountability app designed around home strength training, Nigerian meals, progressive overload, guided run–walk sessions, and long-term training blocks.

The current repository packages the approved **v0.4.2.1 interactive product prototype** as a Vite application. It is ready for local development and open-source collaboration, but it does not yet implement the full production persistence model described in the requirements.

## Highlights

- Three required home strength sessions, with optional sessions kept separate from the streak.
- Exact plate-loading guidance for a 50 kg spin-lock weight set.
- Conditional pull-up programming: pull-ups unlock only after the bar is installed and safety-confirmed.
- Nigerian meal planning with approved alternatives and minimal adherence logging.
- Exercise form videos, written form cues, substitutions, and progressive-overload recommendations.
- Rest timers with selectable completion tones and vibration where supported.
- A continuous voice-coached run–walk programme designed for earphones and lock-screen media playback.
- Twelve-month training blocks, Week 8 review, track selection, and weekly coaching concepts.
- Responsive light and dark interfaces.
- PWA manifest and a lightweight runtime-caching service worker for production builds.

## Current status

The experience and flows are approved. This repository is the development-ready prototype baseline.

Working now:

- Complete clickable onboarding, planning, workout, running, progress, history, and data-transfer demonstrations.
- Local audio assets for the run coach.
- Responsive mobile and desktop layouts.
- Vite development and production builds.
- Basic PWA metadata and runtime caching.

Still to be implemented for production:

- IndexedDB persistence and schema migrations.
- Durable workout, meal, measurement, readiness, and progression records.
- Versioned export/import with conflict resolution.
- Reliable notification fallbacks and device-specific background-audio testing.
- Complete accessibility audit and automated browser tests.
- Production training-block generation and progression state machines.

See [`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md) for the boundary between prototype behaviour and production work.

## Requirements

- Node.js **20.19+** or **22.12+**
- npm 10+
- A modern Chromium, Firefox, or Safari browser

## Run locally

```bash
npm install
npm run dev
```

Vite prints the local URL, usually:

```text
http://localhost:5173
```

For phone testing on the same Wi-Fi network:

```bash
npm run dev -- --host
```

Then open the network URL shown by Vite.

## Validate and build

```bash
npm run check
npm run build
npm run preview
```

`npm run check` validates the main JavaScript syntax and verifies that the required app, manifest, and coached-audio files exist.

## Repository structure

```text
proof-fitness/
├── audio-scripts/
├── config/
├── docs/
│   ├── audio-generation.md
│   ├── PRODUCT_STATUS.md
│   └── requirements/
├── public/
│   ├── audio/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── sw.js
├── scripts/
│   ├── audio/
│   └── verify-project.mjs
├── src/
│   ├── app.js
│   ├── main.js
│   └── styles.css
├── index.html
├── package.json
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── THIRD_PARTY_NOTICES.md
└── LICENSE
```

## Run-coach audio

The source includes three pre-generated local audio assets:

- A Kokoro-generated Opus voice-coach timeline.
- An MP3 fallback of the same timeline.
- A synthetic chime-only Opus timeline.

They are served as ordinary static media files rather than generated in the browser or embedded in HTML. Ordinary users need only Node and npm—no Python, Kokoro model, FFmpeg, account, API key, microphone, recording, or internet connection after offline download.

Background and lock-screen playback still vary by browser and operating system. Always use the in-app lock-screen test before relying on it outdoors.

Maintainers can regenerate the coach completely locally from the data-driven 28-minute script. See [`docs/audio-generation.md`](docs/audio-generation.md) for voice comparison, pinned dependencies, generation, mastering, verification, offline behavior, platform notes, and licensing.

## Pull-up-bar behaviour

The default state is **Owned, not installed**. Workout C uses the approved dumbbell-pullover fallback until the user:

1. Selects **Installed and available**.
2. Completes the mounting and clearance safety confirmation.
3. Confirms that pull-ups should begin from the next eligible workout.

An active workout never changes underneath the user.

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

Particularly useful early contributions include:

- Accessibility improvements.
- IndexedDB repository design.
- Unit tests for plate configuration and progression rules.
- Playwright coverage for workout recovery and run coaching.
- Offline and installability testing across browsers.
- Nigerian meal alternatives and portion-guidance review.

## Safety and medical disclaimer

Proof Fitness is an educational fitness tool, not medical advice. It must not diagnose injuries or encourage training through pain. Stop exercising and seek qualified medical help for concerning symptoms.

Pull-up bars must be installed and tested according to the manufacturer’s instructions. Outdoor audio should be used at a safe volume, with environmental awareness maintained around traffic and other hazards.

## License

[MIT](LICENSE)
