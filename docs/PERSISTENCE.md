# Persistence

## Database and schema

Proof Fitness uses Dexie with IndexedDB database `proof-fitness`, database version `4`, and record schema version `4`. Durable records use stable IDs, ISO `createdAt`/`updatedAt` timestamps, and explicit `YYYY-MM-DD` local dates for accountability.

| Store | Responsibility |
| --- | --- |
| `appMeta` | Singleton install/migration state and authoritative `onboardingCompletedAt` |
| `userProfile`, `preferences`, `equipment` | Onboarding/profile, UI/audio choices, equipment and pull-up safety |
| `programmeStates` | Active phase, schedule/template set, week, rotation, extensions, active review |
| `programmeTransitions`, `programmeReviews` | Appendable decisions and first-class Week 4 evidence |
| `scheduleOverrides` | Explicit local-date schedule changes |
| `activeWorkoutSessions` | Recoverable immutable workout snapshot plus execution position |
| `workoutSessions` | Completed and partial strength history |
| `runSessions` | Versioned template/readiness snapshot, planned/completed run-walk evidence, result, continuous-audio recovery, and history |
| `runProgressionStates` | Current running stage, qualifying IDs, recommendation/decision history, milestones, aerobic and optional quality state |
| `mealChecks`, `dailyCheckIns`, `measurements` | Daily accountability and user-entered measurements |
| `exerciseProgressionStates` | Exercise ID/version-specific working loads, performance evidence, recommendations, and decisions |
| `auditEvents` | Migration and high-value lifecycle events |

## Lifecycle and transactions

Startup shows a loading shell, opens IndexedDB, runs migrations, hydrates records, validates stored template/exercise references, then checks `appMeta.onboardingCompletedAt`. Database/reference failures show Retry, Copy diagnostics, Export, and last-resort Reset controls; they never silently create temporary state.

Each completed onboarding step updates `appMeta.onboardingDraft`. Final onboarding atomically writes profile, preferences, equipment, initial Foundation state, baseline measurements, the onboarding transition, metadata, and audit event.

Workout start stores the frozen domain snapshot. Meaningful execution actions write before render state changes. Completion atomically moves the active record to history and updates the programme rotation. Reopening offers resume, partial completion, or deliberate discard while preserving the exact snapshot.

Week 4 evidence uses persisted completed workouts/calibration plus user-reported confidence, discomfort, recovery, and schedule feasibility. Recommendation and user decision remain separate. Extensions and schedule transitions update programme state transactionally without deleting history or progression.

Run records retain immutable versioned template/progression/readiness context, planned/completed phase evidence, result and discomfort, guidance mode, continuous-media position, current phase, pause/completion state, and local date. Position is checkpointed periodically and on pause/visibility/page lifecycle events. Result finalization and progression evaluation share one idempotent transaction; eligibility never silently applies a stage change.

## Migrations

Version 1 establishes explicit store/index declarations and repeat-safe application metadata. Version 2 keeps those stores, adds explicit nested barbell/handle tare state, converts legacy numeric working loads to canonical load objects, and initializes performance/decision arrays. Version 3 evolves equipment in place to `measured` / `estimated` / `unknown`, adds collar count and collar-mass provenance, and does not create or clear stores. Version 4 adds `runProgressionStates` and maps only unambiguous `starter-run` records to Stage 1, preserving timestamps/history and leaving unknown legacy effort as `null`. No migration resets activity or invents qualifying evidence.

## Export, restore, and reset

Export produces JSON with a `proof-fitness` manifest, schema/programme versions, timestamp, metadata, and all stores, including barbell-body, dumbbell-handle, and collar masses and sources, collar count, performance evidence, working loads, decisions, and historical loading snapshots. Restore rejects invalid products, missing store arrays, invalid mass-source enums, and future schemas before a single replace transaction. Older valid exports without collar metadata are upgraded safely with unknown collar mass. Restore does not rewrite historical snapshots or export browser/audio caches.

Reset requires the explicit phrase `RESET`, deletes the database, removes only Proof Fitness caches, and reloads into a fresh migration/onboarding path.

## Derived values

Counts and streaks are recalculated from durable sessions, meals, check-ins, and profile training days. A strength day requires its completed workout plus all meal checks and a feeling; a rest day requires meals and feeling. Optional E never gates the streak. Measurement trends remain hidden until at least three real values exist.
