# Product status

## Approved product experience

The v0.4.2.1 product prototype is approved as the baseline for Proof Fitness.

It covers:

- First-launch onboarding.
- Daily accountability.
- Home strength workout execution.
- Form guidance and substitutions.
- Equipment-aware plate loading.
- Conditional pull-up availability.
- Meal adherence and alternatives.
- Weekly coaching concepts.
- Twelve-month training blocks.
- Guided run–walk sessions.
- Data export/import UX.

## Programme-domain implementation

Programme domain v1 is implemented and is now the source of truth for active strength screens. It includes a complete versioned exercise catalog, Foundation A/B/C for Weeks 1–4, the Week 4 readiness review and extensions, four-day Lean Athletic, optional E, a permanent three-day fallback, conditional pull-up/pullover resolution, pure transitions, exercise-ID progression, plate validation, duration estimates, and immutable active-workout snapshots.

See `PROGRAMME_DOMAIN.md` and `EXERCISE_CATALOG.md`.

## Prototype implementation

The current application keeps most state in memory. Refreshing can reset demonstration data. Several flows simulate the future result of durable operations.

## Production implementation priorities

1. Define and implement the IndexedDB schema.
2. Migrate app state from in-memory objects into repositories.
3. Implement transactional workout and meal writes.
4. Add versioned export/import and migrations.
5. Persist the implemented progression, calibration, review, transition, and snapshot records transactionally.
6. Complete populated-demo removal and accessibility/browser validation.
7. Validate PWA installability, offline behaviour, and background media on target devices.

## Non-goals for the first production release

- Social feeds and public profiles.
- Leaderboards.
- GPS route tracking.
- Calorie-burn estimates.
- Wearable recovery scoring.
- Medical diagnosis.
