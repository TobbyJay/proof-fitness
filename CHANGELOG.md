# Changelog

## Unreleased — Production integration audit

- Replaced binary tare confidence with measured/estimated/unknown equipment mass, added separate collar count/weight, and included exactly two collars per implement (four per matched pair) in assembled-load snapshots.
- Added the preserving IndexedDB v2 → v3 migration, conservative legacy-known → estimated conversion, enum-validated export/restore, historical mass-provenance snapshots, and mobile light/dark regression coverage.
- Added explicit barbell/handle tare configuration with honest unknown states and a preserving IndexedDB v1 → v2 migration.
- Added deterministic shared-inventory loading engines, cached achievable-load graphs, exact accessible plate stacks, and unambiguous total/plate/per-side labels.
- Added conservative first-exposure calibration loads, actual rep/duration logging, immutable loading/progression snapshots, readiness/discomfort-aware double progression, regression proposals, and accept/defer/reject decisions.
- Added exercise progression history and workout receipts backed only by persisted appearances, plus load/progression/migration unit coverage.
- Added Playwright production integration coverage for clean install, resumable/atomic onboarding, workout and run recovery, failure retry, pull-up snapshots, Week 4 outcomes, schedule transitions, export/restore/reset, service-worker replacement, offline operation, accessibility, and five mobile viewports.
- Fixed first-offline-reload asset caching, run-ID reuse, recovered run position, failed run-start status, dialog cancel/focus behavior, reset-to-restore reachability, and meal-status ARIA.
- Added persisted onboarding audio preference, persisted selected workout loads and plate guidance, inline workout persistence errors, honest “Something else” meals, and real-record weight averages.
- Added automated production-bundle inspection and physical iPhone/Android installed-PWA acceptance instructions.
- Release category: **READY FOR DEVICE ACCEPTANCE TESTING**; physical-device checks remain outstanding.

## Production persistence

- Added the versioned `proof-fitness` IndexedDB database, Dexie repositories, initial migration, metadata, atomic onboarding, and asynchronous hydration/recovery.
- Persisted programme state, Week 4 reviews and decisions, transitions, active/completed/partial workouts, immutable snapshots, pull-up safety, progression, runs, meals, check-ins, and measurements.
- Added real versioned export/replace restore, deliberate reset, durable-derived counts/streaks, and fake-IndexedDB coverage.
- Removed populated activity, hard-coded dates, simulated recovery, and demonstration export/import from production.
- Preserved programme domain v1 and the continuous 28-minute run-coach timeline.

## Programme domain v1

- Replaced the executable single-workout prototype with authoritative versioned exercise and programme catalogs.
- Added Foundation A/B/C for Weeks 1–4, deterministic readiness review, extensions, four-day Lean Athletic, optional E, and permanent three-day fallback.
- Added ID-based substitutions, conditional pull-up progression, plate-aware progression rules, pure transitions, duration validation, and immutable workout snapshots.
- Connected Today, programme, onboarding, active workout, and progression views to the domain.
- Added programme-domain documentation, catalog documentation, build-time validation, and automated tests.

## 0.1.0 — 2026-07-31

- Packaged the approved v0.4.2.1 prototype as the Proof Fitness Vite codebase.
- Added local run-coach audio assets.
- Added PWA metadata and runtime caching.
- Added open-source documentation and MIT licensing.
- Added project verification scripts.
