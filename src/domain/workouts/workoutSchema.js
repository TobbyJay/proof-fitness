import { assertPositiveVersion } from '../shared.js';
import { getExercise } from '../exercises/exerciseCatalog.js';

export function validateWorkoutTemplate(template) {
  assertPositiveVersion(template, 'Workout template');
  if (!template.templateSetId || !Number.isInteger(template.templateSetVersion)) throw new Error(`${template.id} needs a versioned template set.`);
  if (!Array.isArray(template.exercises) || template.exercises.length === 0) throw new Error(`${template.id} needs exercises.`);
  const seen = new Set();
  for (const slot of template.exercises) {
    const ids = slot.conditional ? [slot.whenAvailableExerciseId, slot.fallbackExerciseId] : [slot.exerciseId];
    ids.forEach(getExercise);
    const identity = slot.conditional ? `conditional:${ids.join(':')}` : slot.exerciseId;
    if (seen.has(identity)) throw new Error(`${template.id} accidentally repeats ${identity}.`);
    seen.add(identity);
    if (!slot.optional && (!Number.isFinite(slot.sets) || !slot.repTarget || !Number.isFinite(slot.restSeconds))) {
      throw new Error(`${template.id} has an incomplete required prescription.`);
    }
  }
  return true;
}
