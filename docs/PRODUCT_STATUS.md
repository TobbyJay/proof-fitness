# Product status

## Production persistence baseline

Proof Fitness now uses Dexie over IndexedDB for account-free, backend-free local persistence. First render waits for database migration and hydration. A database failure opens recovery controls rather than appearing to be a new installation.

Durable flows include partial/completed onboarding, programme state and A/B/C or Lean Athletic rotations, Week 4 reviews and user decisions, programme transitions, pull-up equipment safety, immutable active workout snapshots, completed/partial workouts, runs and audio position, meals, check-ins, measurements, exercise progression, export/restore, and reset.

Fresh installations contain no completed activity, measurements, history, reviews, progression evidence, or non-zero streak. Planned programme and meal content remains visible without being recorded as completed.

## Programme domain

Programme domain v1 remains the single source of truth. It includes 44 versioned exercises, Foundation A/B/C, four-day Lean Athletic, optional E, permanent three-day Lean Athletic, deterministic Week 4 review rules, extensions, pull-up fallback, progression, transitions, duration estimates, and immutable workout snapshots.

## Current limitations

- Storage is tied to the browser profile and may be removed when site data is cleared or evicted.
- Restore is replace-only; record merge is unavailable.
- Background audio and wake lock support vary across platforms.
- Notifications and cross-device synchronization are not implemented.
- Automated repository and fake-IndexedDB tests are present; broader browser automation and accessibility audits remain useful follow-up work.

## Non-goals

Accounts, cloud sync, analytics, social feeds, GPS tracking, calorie-burn estimates, wearable recovery scoring, and medical diagnosis are not part of this release.
