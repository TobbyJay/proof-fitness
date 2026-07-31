import { getExercise } from '../exercises/exerciseCatalog.js';
import { deepFreeze } from '../shared.js';
import { validateWorkoutTemplate } from '../workouts/workoutSchema.js';

export function exerciseSlot(exerciseId, overrides = {}) {
  const exercise = getExercise(exerciseId);
  const phasePrescription = overrides.phase === 'foundation' ? exercise.foundationPrescription : exercise.leanAthleticPrescription;
  return {
    exerciseId,
    sets: overrides.sets ?? phasePrescription.sets,
    repTarget: overrides.repTarget ?? phasePrescription.repTarget,
    restSeconds: overrides.restSeconds ?? exercise.restSeconds,
    optional: overrides.optional ?? false
  };
}

export function conditionalPullSlot(overrides = {}) {
  const pull = getExercise('scapular-pull-up');
  return {
    conditional: 'pull-up-availability',
    whenAvailableExerciseId: 'pull-up-progression',
    fallbackExerciseId: 'dumbbell-pullover',
    sets: overrides.sets ?? 3,
    repTarget: overrides.repTarget ?? 'rung-specific or 8–12',
    restSeconds: overrides.restSeconds ?? pull.restSeconds,
    optional: false
  };
}

export function choiceSlot(exerciseId, alternativeExerciseId, overrides = {}) {
  const slot = exerciseSlot(exerciseId, overrides);
  return { ...slot, approvedChoiceExerciseIds: [exerciseId, alternativeExerciseId] };
}

export function workoutTemplate(templateSetId, { id, name, phase = 'lean-athletic', required = true, exercises, primaryAreas }) {
  const template = {
    id, version: 1, templateSetId, templateSetVersion: 1, name, phase, required,
    primaryAreas, exercises, targetDurationMinutes: { minimum: 45, maximum: 50 }
  };
  validateWorkoutTemplate(template);
  return deepFreeze(template);
}
