# Prototype v0.4.1 — Conditional Pull-up Bar Activation

## Approved correction

The pull-up bar is not assumed to be installed. The default state is **Owned, not installed**.

## Equipment states

- Not owned
- Owned, not installed
- Installed and available
- Temporarily unavailable

Pull-up programming is enabled only when the state is **Installed and available** and the one-time safety confirmation is complete.

## Workout behaviour

- Before activation, Workout C uses a dumbbell pullover.
- The pullover has its own exercise history and progression state.
- Activating the bar affects the next Workout C, never a workout already in progress.
- Marking the bar temporarily unavailable restores the fallback without resetting pull-up progress.
- Pull-up rung selection remains locked until activation.

## Safety activation

Before enabling pull-up workouts, the user confirms installation, mounting-surface suitability, partial-load stability, clearance and rated-load suitability. A brief physical check is still required before every session.

## Prototype boundary

These settings use simulated state in the prototype. Production persistence and migrations remain unimplemented.
