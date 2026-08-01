# Load guidance

Proof Fitness keeps removable plate load as canonical evidence and derives assembled load only when the non-plate component masses are available. A bare `15 kg` label is never sufficient for an externally loaded exercise.

## Equipment mass and confidence

Equipment records store each component separately:

```js
barbell: { weight: { weightKg: 5, weightSource: 'estimated' } }
dumbbellHandle: { count: 2, weight: { weightKgEach: 1, weightSource: 'estimated' } }
collars: { count: 6, weight: { weightKgEach: 0.5, weightSource: 'estimated' } }
```

The stable sources are `measured`, `estimated`, and `unknown`. Measured means the user physically weighed the component. Estimated means a manufacturer/set figure or a migrated legacy numeric value whose measurement provenance is unavailable. Unknown normally has a `null` number and never produces a fabricated total.

The Configuration B reference for this style of set is a 5.0 kg two-piece 152 cm barbell body, 1.0 kg per short spin-lock dumbbell handle, and 0.5 kg per spin-lock collar—all **estimated** until physically weighed. The app has no distinct preset system, so these figures are documented reference data and are not silently applied as universal defaults. Generic users begin with unknown equipment masses. The plate inventory remains nominally known at 40.5 kg.

## Assembled-load calculation

A barbell uses one body and exactly two collars:

```text
assembled barbell = plate load + barbell body + (2 × collar)
```

One dumbbell uses one handle and exactly two collars. A matched pair uses two handles and exactly four collars:

```text
assembled dumbbell = plates on that dumbbell + handle + (2 × collar)
matched pair = 2 × assembled dumbbell
```

If every required non-plate component is measured, the result source is `measured`. If at least one is estimated and none is unknown, the UI says **Estimated total**. If any is unknown, the total is `null` and the UI shows exact plate facts such as `15 kg plates + bar and collars` or `6 kg plates each + handle and collars`.

## Inventory and combinations

The physical inventory is 6 × 0.5 kg, 6 × 1.25 kg, 4 × 2.5 kg, and 4 × 5 kg: **40.5 kg** removable load. Combination enumeration uses integer quarter-kilogram units to avoid floating-point search errors. It enforces two identical barbell sides, four identical sleeves for two matched dumbbells, or two identical sleeves for one dumbbell. Plate counts are shared across every sleeve.

For every achievable sleeve total, the engine retains a minimal-plate configuration, largest plate closest to the body/handle. The plate-stack visualizer represents plates only; collar contribution appears in the text breakdown and is never drawn as a plate.

## Canonical evidence and snapshots

Progression and working loads remain plate-configuration based. For example, `15 kg plate load → 16 kg plate load` is the progression event whether equipment mass is measured, estimated, or unknown. Equipment confidence never gates progression eligibility.

New loading snapshots retain plate load and layout plus bar/handle mass and source, collar mass and source, collars used, assembled total, and total source. Starting a workout freezes that guidance and the equipment snapshot. Last Time, Today, history, and receipts render the recorded loading snapshot rather than current Equipment settings, so correcting an estimate affects future workouts only and never rewrites history.
