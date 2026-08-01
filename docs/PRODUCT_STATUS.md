# Product status

## Release readiness

**READY FOR DEVICE ACCEPTANCE TESTING** as of 2026-07-31.

The production integration suite covers clean installation, onboarding recovery and atomic failure, active workout recovery and write failures, pull-up snapshot behavior, Week 4 outcomes and schedule transitions, run recovery, production-shaped export/restore/reset, service-worker replacement, forced-network-failure offline operation, serious/critical accessibility scans, bundle inspection, and five representative mobile viewports.

Physical installed-PWA testing on iPhone and Android is still required. Proof Fitness must not be described as **READY FOR PRODUCTION RELEASE** until the checks in `docs/MANUAL_PWA_TEST_CHECKLIST.md` pass on real devices.

## Production persistence baseline

Proof Fitness now uses Dexie over IndexedDB for account-free, backend-free local persistence. First render waits for database migration and hydration. A database failure opens recovery controls rather than appearing to be a new installation.

Durable flows include partial/completed onboarding, explicit known/unknown implement tare weights, programme state and A/B/C or Lean Athletic rotations, Week 4 reviews and user decisions, programme transitions, pull-up equipment safety, immutable loading-aware active workout snapshots, completed/partial workouts with actual set evidence, versioned running stage/evidence/recommendations/audio recovery, meals, check-ins, measurements, exercise progression recommendations and decisions, export/restore, and reset.

Fresh installations contain no completed activity, measurements, history, reviews, progression evidence, or non-zero streak. Planned programme and meal content remains visible without being recorded as completed.

## Programme domain

Programme domain v1 remains the single source of truth. It includes 44 versioned exercises, Foundation A/B/C, four-day Lean Athletic, optional E, permanent three-day Lean Athletic, deterministic Week 4 review rules, extensions, pull-up fallback, progression, transitions, duration estimates, and immutable workout snapshots.

Running programme v1 is independent. It provides ten beginner-to-continuous stages, aerobic-base 30/35/40, user-confirmed evidence progression, readiness-aware Optional E advice, and a later opt-in controlled quality template without modifying strength rotation or adherence.

## Current limitations

- Storage is tied to the browser profile and may be removed when site data is cleared or evicted.
- Restore is replace-only; record merge is unavailable.
- Background audio and wake lock support vary across platforms.
- Notifications and cross-device synchronization are not implemented.
- Physical installed-PWA behavior, OS lock-screen audio/media controls, cold offline launch, and real update prompts remain device-acceptance work.
- Measurement edit/delete controls are not currently exposed.

## Non-goals

Accounts, cloud sync, analytics, social feeds, GPS tracking, calorie-burn estimates, wearable recovery scoring, and medical diagnosis are not part of this release.
