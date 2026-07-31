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

## Prototype implementation

The current application keeps most state in memory. Refreshing can reset demonstration data. Several flows simulate the future result of durable operations.

## Production implementation priorities

1. Define and implement the IndexedDB schema.
2. Migrate app state from in-memory objects into repositories.
3. Implement transactional workout and meal writes.
4. Add versioned export/import and migrations.
5. Implement progression and block-transition state machines.
6. Add automated tests and accessibility validation.
7. Validate PWA installability, offline behaviour, and background media on target devices.

## Non-goals for the first production release

- Social feeds and public profiles.
- Leaderboards.
- GPS route tracking.
- Calorie-burn estimates.
- Wearable recovery scoring.
- Medical diagnosis.
