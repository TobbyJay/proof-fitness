import test from 'node:test';
import assert from 'node:assert/strict';

import {DEFAULT_EQUIPMENT} from '../src/domain/equipment/equipmentCatalog.js';
import {appendPerformance,decideProgression,recordExerciseEvidence} from '../src/domain/progression/progressionRules.js';
import {progressionRecommendation,readinessAwareRecommendation} from '../src/domain/progression/recommendationEngine.js';

function performance({id,exerciseId='barbell-romanian-deadlift',load=15,reps=[12,12,12],calibrationResponse=null,sessionResult='Completed comfortably',formConfidence='controlled',discomfortFlag=false,date='2026-07-12'}={}){
  return {id:id||`performance:${exerciseId}:${date}`,exerciseId,exerciseVersion:1,workoutSessionId:`workout:${date}`,localDate:date,loadingMode:exerciseId.includes('dumbbell')?'two-dumbbells-matched':'barbell-symmetric',load:{loadingMode:'barbell-symmetric',plateLoadKg:load},sets:reps.map((value,index)=>({setNumber:index+1,reps:value})),targetRange:{min:8,max:12,unit:'reps'},calibrationResponse,sessionResult,formConfidence,discomfortFlag,createdAt:`${date}T10:00:00.000Z`};
}

test('same-load rep gains count as progress but do not mutate load',()=>{
  let state={exerciseId:'barbell-romanian-deadlift',exerciseVersion:1,currentWorkingLoad:{loadingMode:'barbell-symmetric',plateLoadKg:15},performances:[]};
  state=appendPerformance(state,performance({date:'2026-07-12',reps:[8,8,8]}),{equipment:DEFAULT_EQUIPMENT,requiredSets:3,repTarget:'8–12'});
  state=appendPerformance(state,performance({date:'2026-07-17',reps:[10,10,9]}),{equipment:DEFAULT_EQUIPMENT,requiredSets:3,repTarget:'8–12'});
  assert.equal(state.currentWorkingLoad.plateLoadKg,15);
  assert.equal(state.pendingRecommendation,null);
  assert.deepEqual(state.performances.map(item=>item.sets.map(set=>set.reps)),[[8,8,8],[10,10,9]]);
});

test('two controlled top-range appearances earn an achievable but unaccepted increase',()=>{
  let state={exerciseId:'barbell-romanian-deadlift',exerciseVersion:1,currentWorkingLoad:{loadingMode:'barbell-symmetric',plateLoadKg:15},performances:[]};
  state=appendPerformance(state,performance({date:'2026-07-22'}),{equipment:DEFAULT_EQUIPMENT,requiredSets:3,repTarget:'8–12'});
  state=appendPerformance(state,performance({date:'2026-07-27'}),{equipment:DEFAULT_EQUIPMENT,requiredSets:3,repTarget:'8–12'});
  assert.equal(state.pendingRecommendation.status,'eligible');
  assert.equal(state.pendingRecommendation.proposedLoad,15.5);
  assert.equal(state.currentWorkingLoad.plateLoadKg,15);
  const accepted=decideProgression(state,state.exerciseId,'accept',state.pendingRecommendation,'2026-07-28T10:00:00.000Z');
  assert.equal(accepted.currentWorkingLoad.plateLoadKg,15.5);
  assert.equal(accepted.lastDecision.decision,'accept');
  const deferred=decideProgression(state,state.exerciseId,'defer',state.pendingRecommendation); const rejected=decideProgression(state,state.exerciseId,'reject',state.pendingRecommendation);
  assert.equal(deferred.currentWorkingLoad.plateLoadKg,15); assert.equal(deferred.pendingRecommendation.decision,'defer');
  assert.equal(rejected.currentWorkingLoad.plateLoadKg,15); assert.equal(rejected.pendingRecommendation,null);
});

test('readiness defers today without erasing earned eligibility',()=>{
  const eligibility=progressionRecommendation({exerciseId:'barbell-romanian-deadlift',currentWorkingLoad:{loadingMode:'barbell-symmetric',plateLoadKg:15},evidence:[performance({date:'2026-07-22'}),performance({date:'2026-07-27'})],equipment:DEFAULT_EQUIPMENT,requiredSets:3,repTarget:'8–12'});
  const today=readinessAwareRecommendation(eligibility,{energy:'Low',sleep:'Poor',soreness:'High'});
  assert.equal(today.todayStatus,'defer-for-readiness');
  assert.equal(today.recommendedLoad.plateLoadKg,15);
  assert.equal(today.earnedProgressionRetained,true);
});

test('discomfort gates increases and repeated heavy evidence offers a previous achievable load',()=>{
  const discomfort=progressionRecommendation({exerciseId:'barbell-romanian-deadlift',currentWorkingLoad:15,evidence:[performance({date:'2026-07-27',discomfortFlag:true})],equipment:DEFAULT_EQUIPMENT,requiredSets:3,repTarget:'8–12'});
  assert.equal(discomfort.status,'not-ready'); assert.equal(discomfort.reasonCode,'discomfort-or-technique');
  const heavy=[performance({date:'2026-07-22',load:16,reps:[6,5,5],calibrationResponse:'too-heavy',sessionResult:'Missed repetitions or sets'}),performance({date:'2026-07-27',load:16,reps:[6,6,5],calibrationResponse:'too-heavy',sessionResult:'Missed repetitions or sets'})];
  const regression=progressionRecommendation({exerciseId:'barbell-romanian-deadlift',currentWorkingLoad:16,evidence:heavy,equipment:DEFAULT_EQUIPMENT,requiredSets:3,repTarget:'8–12'});
  assert.equal(regression.status,'regression-consideration'); assert.ok(regression.proposedLoad<16); assert.equal(regression.requiresUserConfirmation,true);
});

test('exercise identities never cross-contaminate',()=>{
  const ids=['barbell-curl','dumbbell-curl','dumbbell-hammer-curl','barbell-bent-over-row','one-arm-dumbbell-row','dumbbell-pullover','pull-up-progression'];
  let byId={}; ids.forEach((exerciseId,index)=>{byId=recordExerciseEvidence(byId,{exerciseId,reps:index+1});});
  assert.deepEqual(Object.keys(byId).sort(),[...ids].sort());
  ids.forEach(id=>assert.equal(byId[id][0].exerciseId,id));
});

test('bodyweight progression recommends quality or variation rather than kilograms',()=>{
  const evidence=[1,2].map(index=>({id:`push-${index}`,exerciseId:'push-up',workoutSessionId:`workout-${index}`,sets:[{setNumber:1,reps:12},{setNumber:2,reps:12}],controlled:true,hitTopOfRange:true,createdAt:`2026-07-2${index}T10:00:00.000Z`}));
  const recommendation=progressionRecommendation({exerciseId:'push-up',evidence,equipment:DEFAULT_EQUIPMENT,requiredSets:2,repTarget:'controlled reps before failure'});
  assert.equal(recommendation.eligible,true); assert.equal(recommendation.proposedProgression,'repetitions-tempo-range-or-variation'); assert.equal(recommendation.proposedLoad,undefined);
});
