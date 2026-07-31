import { deepFreeze } from '../shared.js';
import { choiceSlot, conditionalPullSlot, exerciseSlot, workoutTemplate } from './templateHelpers.js';

const setId = 'lean-athletic-three-day';
export const leanThreeDayA = workoutTemplate(setId, { id:'lean-three-day-a', name:'Lean Athletic Full Body A', primaryAreas:['lower body','posterior chain','chest','back','shoulders','core'], exercises:[exerciseSlot('barbell-romanian-deadlift'),exerciseSlot('barbell-floor-press'),exerciseSlot('one-arm-dumbbell-row'),exerciseSlot('goblet-squat'),exerciseSlot('dumbbell-lateral-raise',{sets:2}),exerciseSlot('dead-bug',{sets:2})] });
export const leanThreeDayB = workoutTemplate(setId, { id:'lean-three-day-b', name:'Lean Athletic Full Body B', primaryAreas:['lower body','posterior chain','shoulders','back','chest','core'], exercises:[exerciseSlot('conventional-barbell-deadlift',{repTarget:'5–8',restSeconds:120}),exerciseSlot('dumbbell-bulgarian-split-squat'),exerciseSlot('standing-dumbbell-overhead-press'),exerciseSlot('barbell-bent-over-row'),exerciseSlot('push-up',{sets:2}),exerciseSlot('front-plank',{sets:2})] });
export const leanThreeDayC = workoutTemplate(setId, { id:'lean-three-day-c', name:'Lean Athletic Full Body C', primaryAreas:['glutes','lower body','vertical pull','chest','arms','core'], exercises:[exerciseSlot('barbell-glute-bridge'),exerciseSlot('dumbbell-reverse-lunge'),conditionalPullSlot(),exerciseSlot('dumbbell-squeeze-floor-press'),exerciseSlot('barbell-curl'),choiceSlot('overhead-dumbbell-triceps-extension','lying-dumbbell-triceps-extension',{sets:2}),exerciseSlot('side-plank',{sets:2})] });

export const threeDayFallback = deepFreeze({
  id:setId, version:1, name:'Lean Athletic three-day', phase:'lean-athletic', requiredSessionsPerWeek:3,
  rotation:['lean-three-day-a','lean-three-day-b','lean-three-day-c'], templates:[leanThreeDayA,leanThreeDayB,leanThreeDayC],
  purpose:['busy periods','lower recovery','return after interruption','user preference']
});
