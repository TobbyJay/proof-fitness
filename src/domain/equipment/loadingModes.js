export const LOADING_MODES = Object.freeze([
  'barbell-symmetric',
  'two-dumbbells-matched',
  'single-dumbbell',
  'bodyweight',
  'bodyweight-assisted',
  'timed-bodyweight',
  'pull-up-progression'
]);

export function isLoadingMode(value) {
  return LOADING_MODES.includes(value);
}
