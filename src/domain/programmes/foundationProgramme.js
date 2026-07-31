import { deepFreeze } from '../shared.js';
import { conditionalPullSlot, exerciseSlot, workoutTemplate } from './templateHelpers.js';

const setId = 'foundation-three-day';
const phase = 'foundation';

export const foundationA = workoutTemplate(setId, {
  id: 'foundation-a', name: 'Full Body A', phase,
  primaryAreas: ['lower body', 'chest', 'posterior chain', 'back', 'shoulders', 'core'],
  exercises: [
    exerciseSlot('goblet-squat', { phase }), exerciseSlot('barbell-floor-press', { phase }),
    exerciseSlot('barbell-romanian-deadlift', { phase }), exerciseSlot('one-arm-dumbbell-row', { phase }),
    exerciseSlot('dumbbell-lateral-raise', { phase, sets: 2 }), exerciseSlot('dead-bug', { phase, sets: 2 })
  ]
});

export const foundationB = workoutTemplate(setId, {
  id: 'foundation-b', name: 'Full Body B', phase,
  primaryAreas: ['lower body', 'posterior chain', 'shoulders', 'back', 'chest', 'core'],
  exercises: [
    exerciseSlot('conventional-barbell-deadlift', { phase, sets: 3, repTarget: '5–8', restSeconds: 120 }),
    exerciseSlot('bodyweight-bulgarian-split-squat', { phase, sets: 3, repTarget: '8–12 each side' }),
    exerciseSlot('standing-dumbbell-overhead-press', { phase }), exerciseSlot('barbell-bent-over-row', { phase }),
    exerciseSlot('push-up', { phase, sets: 2, repTarget: 'controlled reps, stopping before failure' }),
    exerciseSlot('front-plank', { phase, sets: 2, repTarget: '20–45 seconds' })
  ]
});

export const foundationC = workoutTemplate(setId, {
  id: 'foundation-c', name: 'Full Body C', phase,
  primaryAreas: ['lower body', 'chest', 'glutes', 'vertical pull', 'arms', 'core'],
  exercises: [
    exerciseSlot('dumbbell-reverse-lunge', { phase }), exerciseSlot('dumbbell-squeeze-floor-press', { phase }),
    exerciseSlot('barbell-glute-bridge', { phase, repTarget: '10–15' }), conditionalPullSlot({ sets: 3 }),
    exerciseSlot('dumbbell-curl', { phase, sets: 2, repTarget: '8–15', restSeconds: 60 }),
    exerciseSlot('overhead-dumbbell-triceps-extension', { phase, sets: 2, repTarget: '10–15', restSeconds: 60 }),
    exerciseSlot('side-plank', { phase, sets: 2, repTarget: '20–40 seconds each side', restSeconds: 45 })
  ]
});

export const optionalFoundationSession = deepFreeze({
  id: 'foundation-optional', version: 1, templateSetId: setId, templateSetVersion: 1,
  name: 'Optional conditioning or recovery', phase, required: false,
  activities: ['coached-easy-run-walk', 'brisk-walk', 'mobility']
});

export const foundationProgramme = deepFreeze({
  id: setId, version: 1, name: 'Foundation and Calibration', phase,
  defaultDurationWeeks: 4, allowedExtensionWeeks: [0, 1, 2], requiredSessionsPerWeek: 3,
  rotation: ['foundation-a', 'foundation-b', 'foundation-c'],
  templates: [foundationA, foundationB, foundationC], optionalSessions: [optionalFoundationSession]
});

export function applyFoundationExtension(programmeState, extensionWeeks) {
  if (![1, 2].includes(extensionWeeks)) throw new Error('Foundation may be extended by one or two weeks.');
  return {
    ...programmeState,
    foundationExtensionWeeks: extensionWeeks,
    activePhase: 'foundation', scheduleMode: 'foundation-three-day',
    activeTemplateSetId: 'foundation-three-day', activeTemplateSetVersion: 1,
    // Deliberately retain weekFourReview, calibration, progression and last rotation position.
    weekFourReview: programmeState.weekFourReview,
    calibrationByExerciseId: programmeState.calibrationByExerciseId,
    exerciseProgression: programmeState.exerciseProgression,
    lastCompletedRequiredTemplateId: programmeState.lastCompletedRequiredTemplateId
  };
}
