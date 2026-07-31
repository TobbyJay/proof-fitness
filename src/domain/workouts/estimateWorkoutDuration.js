import { getExercise } from '../exercises/exerciseCatalog.js';

export function estimateWorkoutDuration(template, { warmupSeconds = null, transitionSeconds = 55 } = {}) {
  const activeSlots = template.exercises.filter(slot => !slot.optional);
  const preparationSeconds = warmupSeconds ?? (activeSlots.length <= 5 ? 780 : activeSlots.length === 6 ? 600 : 420);
  let seconds = preparationSeconds + Math.max(0, activeSlots.length - 1) * transitionSeconds;
  for (const slot of activeSlots) {
    const exerciseId = slot.conditional ? slot.fallbackExerciseId : slot.exerciseId;
    const exercise = getExercise(exerciseId);
    seconds += slot.sets * exercise.estimatedSetDurationSeconds;
    // Includes the ordinary post-final-set reset before moving equipment.
    seconds += slot.sets * slot.restSeconds;
  }
  return { seconds, minutes: Math.round(seconds / 60), withinTarget: seconds >= 40 * 60 && seconds <= 55 * 60 };
}
