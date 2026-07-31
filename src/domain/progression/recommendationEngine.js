import { getExercise } from '../exercises/exerciseCatalog.js';
import { isAchievableLoad, nextAchievableLoad } from '../equipment/plateLoading.js';

export function progressionRecommendation({ exerciseId, currentLoad, evidence = [], equipment }) {
  const exercise = getExercise(exerciseId);
  const successful = evidence.filter(item => item.exerciseId === exerciseId && item.controlled === true && item.hitTopOfRange === true);
  const required = exercise.progressionRule.successfulAppearancesRequired || 2;
  if (successful.length < required) return { exerciseId, eligible: false, currentLoad, reason: `Needs ${required - successful.length} more controlled appearance(s).`, appliesAutomatically: false };
  if (typeof currentLoad !== 'number') return { exerciseId, eligible: true, currentLoad, proposedProgression: 'repetitions-tempo-range-or-rung', appliesAutomatically: false };
  const proposedLoad = nextAchievableLoad(currentLoad, exercise.loadingMode, equipment);
  if (proposedLoad === null || !isAchievableLoad(proposedLoad, exercise.loadingMode, equipment)) return { exerciseId, eligible: false, currentLoad, reason: 'No achievable next load with the current plate inventory.', appliesAutomatically: false };
  return { exerciseId, eligible: true, currentLoad, proposedLoad, requiresUserConfirmation: true, appliesAutomatically: false };
}
