import { getExercise } from './exerciseCatalog.js';

export function getSubstitutionOptions(exerciseId, context = {}) {
  const source = getExercise(exerciseId);
  return source.substitutions
    .map(getExercise)
    .filter(candidate => candidate.equipmentType !== 'pull-up-bar' || context.pullUpAvailable === true);
}

export function resolveSubstitution(sourceExerciseId, substituteExerciseId, context = {}) {
  const allowed = getSubstitutionOptions(sourceExerciseId, context);
  const substitute = allowed.find(exercise => exercise.id === substituteExerciseId);
  if (!substitute) throw new Error(`${substituteExerciseId} is not an approved substitution for ${sourceExerciseId}.`);
  return substitute;
}
