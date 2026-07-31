# Programme domain

Proof Fitness programme domain version: `programmeId: proof-fitness`, `programmeVersion: 1`.

This domain is the programme source of truth. It is deliberately separate from the application version, a future database version, exercise versions, and workout-template versions. Records are plain serialisable objects with stable IDs. Domain definitions contain no functions, and active workouts are frozen snapshots.

## Boundaries

- `src/domain/exercises/` owns exercise identity, instructions, safety, substitutions, and pull-up rungs.
- `src/domain/programmes/` owns workout templates, template sets, the programme catalog, and pure transitions.
- `src/domain/progression/` owns calibration evidence and conservative exercise-specific recommendations.
- `src/domain/reviews/` owns the deterministic Foundation readiness review.
- `src/domain/scheduling/` owns schedule modes and completion-ordered rotation.
- `src/domain/workouts/` validates templates, estimates duration, and creates immutable execution snapshots.
- `src/app.js` renders these records and holds temporary prototype state. It is not the authoritative programme definition.

The layers are intentionally distinct: exercise definition ≠ workout template ≠ programme state ≠ workout session ≠ rendered interface.

## Identity and versioning

Exercise history uses `exerciseId` + `exerciseVersion`; workout history uses `templateId` + `templateVersion`; template sets use `templateSetId` + `templateSetVersion`. Names are display copy only. Versions are positive integers and are not embedded in IDs.

The authoritative catalogs are `exerciseCatalog` and `programmeCatalog`. All template references and curated substitution references are validated at import/test time.

## Loading and equipment

Supported loading modes are `barbell-symmetric`, `two-dumbbells-matched`, `single-dumbbell`, `bodyweight`, `bodyweight-assisted`, `timed-bodyweight`, and `pull-up-progression`.

The default equipment snapshot contains six 0.5 kg plates, six 1.25 kg plates, four 2.5 kg plates, four 5 kg plates, two spin-lock dumbbell handles, one 152 cm two-piece spin-lock barbell, six collars, and 40.5 kg removable load. The plate service rejects configurations that cannot be assembled symmetrically from that inventory. Empty implement weights remain nullable instead of being guessed.

The barbell is used for Romanian and conventional deadlifts, floor press, bent-over row, glute bridge, and barbell curl: bilateral compound strength, posterior-chain loading, horizontal push/pull, glute strength, and direct biceps work.

Dumbbells are used for goblet squats, lunges, split squats, one-arm rows, overhead and squeeze-floor pressing, lateral raises, pullovers, curls, triceps work, and calf raises: unilateral work, independent-arm work, accessories, and practical home setup. Balance is defined by movement coverage and useful weekly exposure—not equal exercise counts.

No approved template requires a bench, squat rack, stands, cable, machine, Olympic lift, or barbell clean.

## Foundation and Calibration

Foundation defaults to Weeks 1–4 with three required strength sessions in completion order: `foundation-a` → `foundation-b` → `foundation-c`. Calendar weekdays do not advance the rotation. A run–walk, brisk walk, or mobility session is optional and never gates required strength completion.

- Full Body A: goblet squat, barbell floor press, barbell Romanian deadlift, one-arm dumbbell row, lateral raise, dead bug.
- Full Body B: conventional barbell deadlift, bodyweight-to-dumbbell Bulgarian split-squat progression, standing dumbbell overhead press, barbell bent-over row, push-up, front plank.
- Full Body C: dumbbell reverse lunge, dumbbell squeeze floor press, barbell glute bridge, one conditional vertical-pull slot, dumbbell curl, overhead dumbbell triceps extension, side plank.

Weeks 1–2 store `too-light`, `appropriate`, or `too-heavy` against the stable exercise ID. Weeks 3–4 may make conservative recommendations after controlled evidence, but never change load without confirmation.

## Week 4 readiness review and extensions

`foundationReadinessReview` is a pure deterministic service. Before Week 4 it returns `available: false`. At Week 4 it considers required-session completion, calibration gaps, self-reported form confidence, unresolved discomfort, energy, sleep, recovery, and four-day feasibility. It does not diagnose or claim to observe technique.

Baseline recommendations are:

- `ready`: at least 10/12 sessions, usable main-pattern calibration, adequate confidence/recovery, and no unresolved concerning discomfort.
- `extend-one-week`: eight or nine sessions, one important calibration gap, improving temporary recovery disruption, or low confidence.
- `extend-two-weeks`: fewer than eight sessions, multiple calibration gaps, persistently poor recovery, or unresolved discomfort requiring substitution.

`recommendation` and `userDecision` are separate fields. A user may choose three days even when the system says `ready`. `foundationExtensionWeeks` is `0`, `1`, or `2`. Extensions continue A → B → C, retain the original review and all evidence, and re-evaluate the latest window. They do not restart Week 1. Extension weeks shift the Lean Athletic start and later calendar dates by the same amount; the long-term annual review/reset concept remains in the programme spine.

## Lean Athletic schedules

The recommended transition begins in Week 5 when ready.

`lean-athletic-four-day` rotates by completion: Lower A → Upper A → Lower B → Upper B. It has four required strength workouts; weekdays are user-selected.

- Lower A: Romanian deadlift, goblet squat, reverse lunge, calf raise, dead bug.
- Upper A: barbell floor press, one-arm row, overhead press, lateral raise, overhead triceps extension, front plank.
- Lower B: conventional deadlift, glute bridge, dumbbell Bulgarian split squat, calf raise, side plank or reverse crunch.
- Upper B: bent-over row, conditional pull-up/pullover slot, push-up or squeeze floor press, first-class barbell curl, lying triceps extension, optional lateral raise.

`optional-e` supports coached easy run–walk, brisk walk, mobility, light core, and very light calf/lateral-raise work when recovery supports it. It is not required, cannot replace a required strength workout automatically, and does not generate unrelated progression evidence.

`lean-athletic-three-day` is a permanent post-Foundation mode, not an extension of Foundation. Its A/B/C full-body templates retain squat/lunge, hinge, chest press, horizontal pull, vertical pull or pullover, shoulder, arm, and core exposure. Switching to it is a scheduling choice, not failure.

## Pull-up progression and substitutions

Pull-up states are `not-owned`, `owned-not-installed` (default), `installed-available`, and `temporarily-unavailable`. Only installed plus safety-confirmed resolves to the chosen rung: scapular control, controlled negative, assisted, or strict pull-up. Otherwise, the slot resolves to the complete `dumbbell-pullover` definition. The histories remain separate.

Curated substitutions are stable exercise IDs. Resolution returns the substitute’s complete definition, including its sets, target, rest, loading mode, setup, cues, safety, progression, and identity. Arbitrary label replacement is not supported.

## Progression

Calibration and performance evidence are maps keyed by exercise ID. Barbell row and one-arm row, barbell/dumbbell/hammer curls, and pullover/pull-up work never share evidence. Loaded exercises use conservative double progression after two controlled top-of-range appearances by default. Bodyweight work progresses through quality, reps, tempo, range, or rung. Every proposed load must be achievable with the owned plates and requires `accept`, `defer`, or `reject`; there is no silent application.

## Workout snapshots and duration

`createWorkoutSnapshot` resolves the current template, equipment, pull-up condition/rung, and substitutions into a deeply frozen record. It contains programme/template IDs and versions, phase, schedule mode, creation time, equipment and pull-up snapshots, and all exercise execution guidance. Later catalog, equipment, schedule, or programme changes cannot rewrite it. An in-workout substitution produces a new frozen resolved snapshot while retaining the superseded snapshot unchanged.

The duration estimator uses working sets, exercise-specific set duration, unilateral work, rest, transitions, and preparation/setup. Required templates validate inside a documented 40–55 minute tolerance around the normal 45–50 minute target. Optional within-workout work is excluded from required-completion duration.

## Persistence hand-off

The later persistence layer should store these direct mappings:

| Persistence concept | Programme-domain field |
| --- | --- |
| `programmeVersion` | `programme.programmeVersion` |
| `activePhase` | `programme.activePhase` |
| `scheduleMode` | `programme.scheduleMode` |
| `activeTemplateSetId` / version | same fields on programme state |
| `currentProgrammeWeek` | same field on programme state |
| `foundationExtensionWeeks` | same field on programme state |
| `weekFourReview` | immutable review result plus separate user decision |
| `programmeTransitions` | append-only pure transition results |
| `exerciseId` / `exerciseVersion` | exercise evidence and exercise snapshots |
| `templateId` / `templateVersion` | workout snapshot |
| `workoutSnapshot` | full frozen snapshot serialized as a plain object |

IndexedDB, durable repositories, full export/import, and populated-demo removal are intentionally not implemented here. They are the next production-hardening phase.
