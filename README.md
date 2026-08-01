# Proof Fitness

Proof Fitness is a local-first home strength, Nigerian nutrition, running, and accountability PWA. It requires no account or backend: structured records are stored in the browser's IndexedDB database and remain after the PWA is closed or refreshed.

## What is included

- Four Foundation and Calibration weeks using the versioned A → B → C rotation.
- A deterministic Week 4 review that can recommend four-day Lean Athletic, a one-week extension, or a two-week extension; the user's decision is stored separately.
- Four-day Lean Athletic and a permanent three-day Lean Athletic alternative that preserve history and progression.
- Optional E conditioning/recovery, including the approved 28-minute run–walk session: five-minute warm-up, six 1-minute run/2-minute walk rounds, and five-minute cool-down.
- Immutable active-workout snapshots, set/rest recovery, exercise-ID progression, and conditional pull-up/pullover behavior.
- Exact barbell and dumbbell assembly guidance with collar-aware totals and measured/estimated/unknown equipment mass, actual rep logging, and user-confirmed double progression through physically achievable plate loads.
- Local meal checks, daily check-ins, measurements, history, and derived streaks.
- Versioned JSON export and transactional replace restore.

Clearing browser/site data removes the local database. Export a backup before clearing storage, changing browser profiles, or moving devices. Browsers may evict site storage under device pressure, especially in private-browsing modes. There is no cloud synchronization.

## Run locally

Requires Node.js 20.19+ (or 22.12+) and npm 10+.

```bash
npm install
npm run dev
```

`npm run dev` always uses genuine persisted state. No development fixtures are loaded. For phone testing on the same network, use `npm run dev -- --host`.

## Validate and build

```bash
npm run programme:validate
npm run check
npm test
npm run build
npm run test:integration
npm run audit:bundle
```

`npm run check` validates syntax, production structure, the programme catalog, persistence requirements, the unchanged run script, and automated tests.

## Local data controls

The Data screen exports every durable record, including active workout snapshots. Restore validates the product/schema manifest before replacing the database in one transaction. Merge import is intentionally unavailable.

“Reset all Proof Fitness data” requires typing `RESET`, deletes IndexedDB and Proof Fitness caches, and returns to onboarding only after deletion succeeds.

See [Load guidance](docs/LOAD_GUIDANCE.md), [Progressive overload](docs/PROGRESSIVE_OVERLOAD.md), [Persistence](docs/PERSISTENCE.md), [Programme domain](docs/PROGRAMME_DOMAIN.md), [production audit](docs/PRODUCTION_AUDIT.md), [manual PWA checklist](docs/MANUAL_PWA_TEST_CHECKLIST.md), and [Product status](docs/PRODUCT_STATUS.md).

The automated production audit is complete. The current release category is **READY FOR DEVICE ACCEPTANCE TESTING**, not fully production-released: installed iPhone and Android checks remain mandatory.

## Run-coach audio

Voice, chimes-only, and visual-only guidance remain available. Voice/chimes use one continuous local media track and Media Session controls where supported; no browser speech or cloud text-to-speech is used. Lock-screen behavior varies by browser/OS, so use the in-app audio test. Maintainers can regenerate assets locally using [the audio-generation guide](docs/audio-generation.md).

## Safety

Proof Fitness is educational software, not medical advice. Stop for concerning symptoms and seek qualified care. Pull-up bars must be installed and tested according to their instructions. Maintain environmental awareness when using audio outdoors.

## License

[MIT](LICENSE)
