import { deepFreeze } from '../shared.js';
import { choiceSlot, conditionalPullSlot, exerciseSlot, workoutTemplate } from './templateHelpers.js';

const setId = 'lean-athletic-four-day';

export const leanLowerA = workoutTemplate(setId, {
  id: 'lean-lower-a', name: 'Lower A', primaryAreas: ['posterior chain', 'quadriceps', 'glutes', 'calves', 'core'],
  exercises: [
    exerciseSlot('barbell-romanian-deadlift'), exerciseSlot('goblet-squat'),
    exerciseSlot('dumbbell-reverse-lunge', { sets: 2 }), exerciseSlot('standing-dumbbell-calf-raise'),
    exerciseSlot('dead-bug', { sets: 2 })
  ]
});

export const leanUpperA = workoutTemplate(setId, {
  id: 'lean-upper-a', name: 'Upper A', primaryAreas: ['chest', 'back', 'shoulders', 'triceps', 'core'],
  exercises: [
    exerciseSlot('barbell-floor-press'), exerciseSlot('one-arm-dumbbell-row'),
    exerciseSlot('standing-dumbbell-overhead-press'), exerciseSlot('dumbbell-lateral-raise', { sets: 2 }),
    exerciseSlot('overhead-dumbbell-triceps-extension', { sets: 2 }), exerciseSlot('front-plank', { sets: 2 })
  ]
});

export const leanLowerB = workoutTemplate(setId, {
  id: 'lean-lower-b', name: 'Lower B', primaryAreas: ['posterior chain', 'glutes', 'quadriceps', 'calves', 'core'],
  exercises: [
    exerciseSlot('conventional-barbell-deadlift', { sets: 3, repTarget: '5–8', restSeconds: 120 }),
    exerciseSlot('barbell-glute-bridge', { repTarget: '10–15' }),
    exerciseSlot('dumbbell-bulgarian-split-squat'), exerciseSlot('standing-dumbbell-calf-raise'),
    choiceSlot('side-plank', 'reverse-crunch', { sets: 2, repTarget: 'exercise-specific target', restSeconds: 45 })
  ]
});

export const leanUpperB = workoutTemplate(setId, {
  id: 'lean-upper-b', name: 'Upper B', primaryAreas: ['back', 'vertical pull', 'chest', 'biceps', 'triceps', 'shoulders'],
  exercises: [
    exerciseSlot('barbell-bent-over-row'), conditionalPullSlot(),
    choiceSlot('push-up', 'dumbbell-squeeze-floor-press', { sets: 3, repTarget: 'controlled range' }),
    exerciseSlot('barbell-curl', { sets: 3, repTarget: '8–12' }),
    exerciseSlot('lying-dumbbell-triceps-extension', { sets: 2, repTarget: '10–15' }),
    exerciseSlot('dumbbell-lateral-raise', { sets: 2, repTarget: '12–20', optional: true })
  ]
});

export const optionalE = deepFreeze({
  id: 'optional-e', version: 1, templateSetId: setId, templateSetVersion: 1,
  name: 'Conditioning and Recovery', phase: 'lean-athletic', required: false,
  activities: ['coached-easy-run-walk', 'brisk-walk', 'mobility', 'light-core', 'very-light-calf-work', 'very-light-lateral-raise-work'],
  gatesStrengthStreak: false, generatesUntrainedExerciseProgression: false
});

export const leanAthleticProgramme = deepFreeze({
  id: setId, version: 1, name: 'Lean Athletic four-day', phase: 'lean-athletic', requiredSessionsPerWeek: 4,
  rotation: ['lean-lower-a', 'lean-upper-a', 'lean-lower-b', 'lean-upper-b'],
  templates: [leanLowerA, leanUpperA, leanLowerB, leanUpperB], optionalSessions: [optionalE]
});
