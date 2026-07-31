export function recordExerciseEvidence(progressionState, evidence) {
  if (!evidence.exerciseId) throw new Error('Progression evidence requires an exerciseId.');
  return { ...progressionState, [evidence.exerciseId]: [...(progressionState[evidence.exerciseId] || []), { ...evidence }] };
}

export function decideProgression(state, exerciseId, decision, recommendation) {
  if (!['accept','defer','reject'].includes(decision)) throw new Error('Invalid progression decision.');
  return {
    ...state,
    decisions: [...(state.decisions || []), { exerciseId, decision, recommendation: { ...recommendation } }],
    acceptedLoads: decision === 'accept' ? { ...(state.acceptedLoads || {}), [exerciseId]: recommendation.proposedLoad } : { ...(state.acceptedLoads || {}) }
  };
}

export const BULGARIAN_SPLIT_SQUAT_STAGES = Object.freeze([
  { stage: 1, exerciseId: 'bodyweight-bulgarian-split-squat', label: 'Bodyweight' },
  { stage: 2, exerciseId: 'dumbbell-bulgarian-split-squat', label: 'Light matched dumbbells' },
  { stage: 3, exerciseId: 'dumbbell-bulgarian-split-squat', label: 'Heavier matched dumbbells through double progression' }
]);
