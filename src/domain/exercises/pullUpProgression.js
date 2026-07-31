import { pullUpAvailable } from '../equipment/equipmentCatalog.js';
import { getExercise } from './exerciseCatalog.js';

export const PULL_UP_RUNGS = Object.freeze([
  { id: 1, exerciseId: 'scapular-pull-up', name: 'Dead hangs and scapular control' },
  { id: 2, exerciseId: 'controlled-negative-pull-up', name: 'Controlled negative pull-ups' },
  { id: 3, exerciseId: 'assisted-pull-up', name: 'Assisted pull-ups' },
  { id: 4, exerciseId: 'strict-pull-up', name: 'Strict pull-ups' }
]);

export function resolvePullUpSlot(equipment, rung = 1) {
  if (!pullUpAvailable(equipment)) return { exercise: getExercise('dumbbell-pullover'), fallbackFor: 'pull-up-progression', rung: null };
  const selected = PULL_UP_RUNGS.find(item => item.id === rung) || PULL_UP_RUNGS[0];
  return { exercise: getExercise(selected.exerciseId), fallbackFor: null, rung: selected.id };
}
