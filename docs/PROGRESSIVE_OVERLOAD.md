# Progressive overload

Proof Fitness uses exercise-specific double progression and requires user confirmation for every load change. More controlled repetitions at the same load are progression; adding plates is only the later step.

## Foundation timing

- **Week 1 — Calibration:** learn movements and establish conservative starting loads.
- **Week 2 — Calibration:** confirm or adjust repeatable working loads.
- **Week 3 — Progression begins:** build repetitions with established loads.
- **Week 4 — Progression continues:** controlled performance contributes to the readiness review.

The transition to Lean Athletic retains matching exercise IDs, working loads, performances, and decisions. Switching four-day and three-day Lean Athletic modes also preserves them and does not award progression merely because frequency changed.

## Evidence and working load

Each completed set stores its number, target range, actual repetitions or duration, and completion time. An exercise appearance stores the stable exercise ID/version, workout session ID, local date, loading mode, canonical plate load, immutable load display snapshot, completed sets, calibration response, session result, form confidence, and discomfort flag.

An `appropriate` calibration response establishes the selected load as repeatable. A `too-light` response can retain it as a conservative baseline while more evidence is built. A `too-heavy` response does not silently establish or reduce a load.

## Eligibility

For loaded exercises, the default compound rule requires the prescribed upper range across all required sets on two controlled appearances at the current load. Accessories also build repetitions and control before a plate increase because the smallest physical jump can be proportionally large. The next proposal comes from the achievable-load graph, never `current + arbitrary increment`.

Eligibility and today's recommendation are separate. Low energy, poor sleep, or high soreness can recommend repeating the current load while retaining an earned increase. Sharp pain, concerning discomfort, or recorded technique breakdown blocks an increase with neutral safety guidance. Two recent too-heavy or missed-target appearances may offer the previous achievable load as a user-confirmed regression.

Equipment mass confidence does not change eligibility. Progression operates on canonical, physically achievable plate configurations even when the bar, handle, or collars are estimated or unknown. An estimated assembled-load change may be shown secondarily, but the progression event remains the plate-load change and can still occur when no assembled total is available.

## Decisions

- **Accept** updates the working load to the exact recommended canonical plate load.
- **Defer** retains the current working load and records the earned recommendation.
- **Reject** retains the current working load and records the decision so it is not recreated merely by re-rendering.

No session completion mutates a working load. A decision record is required. Recommendations preserve their evidence IDs and exact achievable configuration.

## Independent histories

Progression keys are stable exercise IDs, never display names. Barbell curl, dumbbell curl, and dumbbell hammer curl are independent. Barbell row and one-arm dumbbell row are independent. Every substitution uses its own working load and appearances. Dumbbell pullover performance never affects the pull-up rung.

Pull-ups retain the approved dead-hang/scapular-control → controlled-negative → assisted → strict path and use their rung rules rather than plate increments. Bodyweight exercises progress through controlled reps, duration, range, tempo, or an approved harder variation.

## History and receipts

The Progress screen shows up to four real chronological appearances for each recorded exercise plus an actionable recommendation when present. The workout receipt derives its load, actual set results, calibration response, and evaluated progression status from persisted execution evidence; it does not invent dates or results. Historical assembled-load labels come from the saved loading snapshot, including the then-current mass provenance, and are not recalculated from current settings.
