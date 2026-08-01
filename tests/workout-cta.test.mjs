import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveWorkoutCTA } from '../src/state/deriveWorkoutCTA.js';

const next = { id:'foundation-c',version:1,name:'Full Body C',snapshot:null };
const completedB = {
  id:'workout-b',localDate:'2026-08-01',status:'completed',templateId:'foundation-b',templateVersion:1,
  completedAt:'2026-08-01T08:00:00.000Z',
  workoutSnapshot:{templateId:'foundation-b',templateVersion:1,workoutName:'Full Body B'}
};

test('Today CTA keeps a completed scheduled workout separate from the next required workout',()=>{
  const result=deriveWorkoutCTA({activeWorkout:null,workoutRecords:[completedB],nextRequiredWorkout:next,localDate:'2026-08-01'});
  assert.equal(result.state,'completed');
  assert.equal(result.todayScheduledWorkout.name,'Full Body B');
  assert.equal(result.nextRequiredWorkout.name,'Full Body C');
  assert.equal(result.ctaLabel,'Workout complete');
  assert.equal(result.accountabilityState,'Done');
  assert.equal(result.disabled,true);
});

test('Today CTA derives active, partial, and not-started states without a second done flag',()=>{
  const active=deriveWorkoutCTA({activeWorkout:{active:true,snapshot:{templateId:'foundation-b',templateVersion:1,workoutName:'Full Body B'}},workoutRecords:[],nextRequiredWorkout:{...next,id:'foundation-b',name:'Full Body B'},localDate:'2026-08-01'});
  assert.equal(active.state,'active');
  assert.equal(active.ctaLabel,'Resume workout');

  const partial=deriveWorkoutCTA({activeWorkout:null,workoutRecords:[{...completedB,status:'partial'}],nextRequiredWorkout:{...next,id:'foundation-b',name:'Full Body B'},localDate:'2026-08-01'});
  assert.equal(partial.state,'partial');
  assert.equal(partial.ctaLabel,'Start workout');
  assert.equal(partial.accountabilityState,'Partial');

  const untouched=deriveWorkoutCTA({activeWorkout:null,workoutRecords:[],nextRequiredWorkout:next,localDate:'2026-08-01'});
  assert.equal(untouched.state,'not-started');
  assert.equal(untouched.ctaLabel,'Start workout');
});
