# Running domain

Running programme identity is `proof-running@1`. It is independent of strength programme v1, calendar weeks, and database schema v4. Stable templates and pure rules live in `src/domain/running/`; `src/app.js` only coordinates persisted state and renders decisions.

## Philosophy and ladder

Strength and physique remain the primary training priority. Running develops aerobic capacity through longer controlled running and less walking—not pace races, calorie punishment, or automatic prescriptions.

| Stage | Session | Total |
| --- | --- | ---: |
| 1 | 5 min walk; 6 × (1 min easy run / 2 min walk); 5 min walk | 28 min |
| 2 | 6 × (1:30 / 2:00), plus walks | 31 min |
| 3 | 6 × (2:00 / 1:30), plus walks | 31 min |
| 4 | 5 × (3:00 / 1:30), plus walks | 32:30 |
| 5 | 4 × (4:00 / 1:30), plus walks | 32 min |
| 6 | 3 × (6:00 / 2:00), plus walks | 34 min |
| 7 | 3 × (8:00 / 2:00), plus walks | 40 min |
| 8 | 20 min continuous easy run, plus walks | 30 min |
| 9 | 25 min continuous easy run, plus walks | 35 min |
| 10 | 30 min continuous easy run, plus walks | 40 min |

After Stage 10, aerobic-base templates maintain and extend continuous easy running to 30, 35, and 40 minutes. “Easy” means conversational and controlled; the user should slow down before the run feels like a race.

Stage 1 reads the original `starter-run.json` directly and continues using the original `starter-run` voice, MP3, chime, manifest, phase IDs, timing, and copy. The alias remains resolvable for historical records.

## Evidence and decisions

A qualifying session is completed with every prescribed running block, has effort `comfortable` or `challenging-controlled`, reports no concerning discomfort, and was not started against an obviously unsuitable recovery recommendation. Two unique qualifying sessions at the current stage earn one-step progression.

Earning is not acceptance. Proof stores a separate recommendation and offers Progress next run or Repeat current stage. Repeat preserves earned evidence. A single `too-hard` or partial run recommends neutral repetition; repeated difficult/partial evidence may recommend the previous stage, but only the user can apply it. Duplicate completion is transactionally idempotent.

Partial sessions remain in history and never erase earlier qualifying evidence. Concerning pain blocks new progression; Proof gives neutral stop/protect guidance and does not diagnose injury.

## Readiness, strength, and Optional E

Current-stage eligibility and today’s recommendation are separate. Low energy, poor sleep, or high lower-body soreness can recommend brisk walking or mobility without removing an earned stage. Quality work near a demanding lower-body session becomes an easy-run recommendation.

Foundation Weeks 1–4 support zero or one optional run/walk in Optional E. Lean Athletic supports one recommended easy run where recovery allows. Four-day/three-day strength transitions do not reset running. Runs never advance the strength rotation, modify working loads, gate Foundation, become a fifth required lift, or gate the strength streak. Brisk walk, mobility, light core, and recovery remain valid Optional E choices.

## Aerobic base and hybrid quality

Quality remains locked until the current ladder has reached Stage 10, three controlled continuous runs of at least 30 minutes exist, recent recovery is suitable, no recent continuous run reports concerning discomfort, and the programme is in a later hybrid context (currently Lean Athletic Week 41+ or an explicit hybrid block).

The user must then opt in. `Controlled Intervals 1` is a separate optional session: 5-minute warm-up; 6 × (1 minute controlled faster—not sprinting / 2 minutes very easy jog or walk); 5-minute cool-down. It never replaces the primary 30–40 minute easy run or gates strength adherence.

## Persistence and metrics

`runProgressionStates` stores current stage, qualifying IDs, pending and earned recommendations, user decisions, milestones, aerobic status, quality unlock/opt-in, and frequency intent. `runSessions` stores the immutable template/progression/readiness snapshot, planned and completed run/walk time, completed phases, effort, discomfort, guidance, and lifecycle timestamps.

Metrics are limited to completed runs, total running time, current stage, longest prescribed continuous run, recent effort, and milestones. There is no GPS distance, pace target, route, heart rate, calorie estimate, VO2 max, training-stress score, wearable integration, social score, or fabricated hybrid score.
