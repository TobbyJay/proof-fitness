import test from 'node:test';
import assert from 'node:assert/strict';

import {DEFAULT_EQUIPMENT,normaliseEquipment} from '../src/domain/equipment/equipmentCatalog.js';
import {EquipmentWeightSource,combineEquipmentWeightSources,validateEquipmentWeight} from '../src/domain/equipment/equipmentWeight.js';
import {calculateBarbellLoading} from '../src/domain/loading/barbellLoading.js';
import {calculateMatchedDumbbellGuidance,calculateSingleDumbbellGuidance} from '../src/domain/loading/dumbbellLoading.js';
import {getAchievableBarbellLoads,getAchievableMatchedDumbbellLoads,getNextAchievableLoad,getPreviousAchievableLoad} from '../src/domain/loading/achievableLoads.js';
import {countPlateUsage,inventoryCanSupply,normalisePlateInventory} from '../src/domain/loading/plateInventory.js';
import {describeLoading,plateStacksForDisplay} from '../src/domain/loading/loadDisplay.js';
import {createWorkoutSnapshot} from '../src/domain/workouts/createWorkoutSnapshot.js';
import {getWorkoutTemplate} from '../src/domain/programmes/programmeCatalog.js';

const unknown=normaliseEquipment(DEFAULT_EQUIPMENT);
const estimated=normaliseEquipment({...DEFAULT_EQUIPMENT,barbell:{...DEFAULT_EQUIPMENT.barbell,weight:{weightKg:5,weightSource:'estimated'}},dumbbellHandle:{...DEFAULT_EQUIPMENT.dumbbellHandle,weight:{weightKgEach:1,weightSource:'estimated'}},collars:{count:6,weight:{weightKgEach:0.5,weightSource:'estimated'}}});
const measured=normaliseEquipment({...estimated,barbell:{...estimated.barbell,weight:{weightKg:5.4,weightSource:'measured'}},dumbbellHandle:{...estimated.dumbbellHandle,weight:{weightKgEach:1,weightSource:'measured'}},collars:{...estimated.collars,weight:{weightKgEach:0.5,weightSource:'measured'}}});

test('equipment confidence validates measured, estimated, and unknown',()=>{
  assert.equal(validateEquipmentWeight(5,EquipmentWeightSource.MEASURED).weightSource,'measured');
  assert.equal(validateEquipmentWeight(5,EquipmentWeightSource.ESTIMATED).weightSource,'estimated');
  assert.deepEqual(validateEquipmentWeight('',EquipmentWeightSource.UNKNOWN),{weightKg:null,weightSource:'unknown',warning:null});
  assert.equal(combineEquipmentWeightSources('measured','estimated'),'estimated');
  assert.equal(combineEquipmentWeightSources('measured','unknown'),'unknown');
  assert.throws(()=>validateEquipmentWeight(5,'probably'),/source is invalid/);
});

test('known inventory totals 40.5 kg and rejects overuse',()=>{
  assert.equal(normalisePlateInventory(unknown).removablePlateLoadKg,40.5);
  assert.equal(inventoryCanSupply(unknown,[[5,5],[5,5]]),true);
  assert.equal(inventoryCanSupply(unknown,[[5,5,5],[5,5,5]]),false);
});

test('barbell loading uses two collars and propagates equipment confidence',()=>{
  const unknownLoad=calculateBarbellLoading(15,unknown);
  assert.deepEqual(unknownLoad.sides,{left:[5,2.5],right:[5,2.5]});
  assert.equal(unknownLoad.plateLoadPerSideKg,7.5);
  assert.equal(unknownLoad.totalSystemLoadKg,null);
  assert.match(describeLoading(unknownLoad).headline,/plates \+ bar/);
  assert.doesNotMatch(describeLoading(unknownLoad).headline,/total/);
  assert.equal(unknownLoad.collarsUsed,2);
  assert.match(describeLoading(unknownLoad).headline,/plates \+ bar and collars/);
  const estimatedLoad=calculateBarbellLoading(15,estimated);
  assert.equal(estimatedLoad.totalSystemLoadKg,21);
  assert.equal(estimatedLoad.totalLoadSource,'estimated');
  assert.equal(estimatedLoad.collarWeightKgTotal,1);
  assert.match(describeLoading(estimatedLoad).headline,/Estimated total · 21 kg/);
  const measuredLoad=calculateBarbellLoading(15,measured);
  assert.equal(measuredLoad.totalSystemLoadKg,21.4);
  assert.equal(measuredLoad.totalLoadSource,'measured');
  assert.doesNotMatch(describeLoading(measuredLoad).headline,/Estimated/);
  assert.equal(inventoryCanSupply(estimated,plateStacksForDisplay(estimatedLoad).map(item=>item.plates)),true);
});

test('matched and single dumbbells use two collars per implement and only four for a pair',()=>{
  const matched=calculateMatchedDumbbellGuidance(6,estimated);
  assert.deepEqual(matched.leftDumbbell.sleeveA,[2.5,0.5]);
  assert.deepEqual(matched.leftDumbbell,matched.rightDumbbell);
  assert.equal(matched.totalLoadKgEach,8);
  assert.equal(matched.totalPairLoadKg,16);
  assert.equal(matched.collarsUsed,4);
  assert.equal(matched.collarsUsedPerDumbbell,2);
  assert.deepEqual(countPlateUsage(plateStacksForDisplay(matched).map(item=>item.plates))['2.5'],4);
  assert.equal(calculateMatchedDumbbellGuidance(20,estimated),null);
  const single=calculateSingleDumbbellGuidance(15,unknown);
  assert.deepEqual(single.dumbbell.sleeveA,single.dumbbell.sleeveB);
  assert.equal(single.totalSystemLoadKg,null);
  assert.match(describeLoading(single).headline,/plates \+ handle/);
});

test('achievable graph selects real adjacent loads',()=>{
  const bar=getAchievableBarbellLoads(unknown); const matched=getAchievableMatchedDumbbellLoads(unknown);
  assert.ok(bar.includes(15)&&bar.includes(16));
  assert.deepEqual(getAchievableBarbellLoads(estimated),bar);
  assert.deepEqual(getAchievableBarbellLoads(measured),bar);
  assert.equal(getNextAchievableLoad(15,'barbell-symmetric',unknown),15.5);
  assert.equal(getPreviousAchievableLoad(16,'barbell-symmetric',unknown),15.5);
  assert.ok(!matched.includes(20));
  assert.deepEqual([...bar],[...bar].sort((a,b)=>a-b));
});

test('first-exposure snapshots receive conservative achievable guidance and preserve unknown tare honestly',()=>{
  const snapshot=createWorkoutSnapshot({template:getWorkoutTemplate('foundation-a'),equipment:unknown,progressionStates:[]});
  for(const exercise of snapshot.exercises.filter(item=>['barbell-symmetric','two-dumbbells-matched','single-dumbbell'].includes(item.loadingMode))){
    assert.equal(exercise.loadSource,'suggested-calibration');
    assert.ok(exercise.selectedLoad>0);
    assert.ok(exercise.loadingGuidanceSnapshot);
    assert.equal(exercise.loadingGuidanceSnapshot.totalSystemLoadKg,null);
    assert.equal(exercise.progressionContextSnapshot.lastPerformance,null);
  }
});

test('known equipment supports bar-only calibration and later estimate corrections cannot rewrite snapshots',()=>{
  const snapshot=createWorkoutSnapshot({template:getWorkoutTemplate('foundation-a'),equipment:estimated,progressionStates:[]});
  const barbell=snapshot.exercises.find(item=>item.loadingMode==='barbell-symmetric');
  assert.equal(barbell.selectedLoad,0); assert.equal(barbell.loadingGuidanceSnapshot.totalSystemLoadKg,6);
  const corrected=normaliseEquipment({...estimated,barbell:{...estimated.barbell,weight:{weightKg:7,weightSource:'estimated'}}});
  assert.equal(corrected.barbell.weight.weightKg,7); assert.equal(barbell.loadingGuidanceSnapshot.totalSystemLoadKg,6);
  assert.equal(barbell.loadingGuidanceSnapshot.barbellBodyWeightKg,5);
  assert.throws(()=>{barbell.loadingGuidanceSnapshot.barbellBodyWeightKg=7;},TypeError);
});

test('next appearance snapshot carries real Last Time context for the same stable exercise only',()=>{
  const performance={id:'performance:goblet',exerciseId:'goblet-squat',exerciseVersion:1,workoutSessionId:'workout-1',localDate:'2026-07-27',loadingMode:'single-dumbbell',load:{loadingMode:'single-dumbbell',plateLoadKg:5},loadSnapshot:calculateSingleDumbbellGuidance(5,estimated),sets:[{setNumber:1,reps:10},{setNumber:2,reps:10},{setNumber:3,reps:9}],createdAt:'2026-07-27T10:00:00.000Z'};
  const snapshot=createWorkoutSnapshot({template:getWorkoutTemplate('foundation-a'),equipment:estimated,progressionStates:[{exerciseId:'goblet-squat',exerciseVersion:1,currentWorkingLoad:{loadingMode:'single-dumbbell',plateLoadKg:5},performances:[performance]}]});
  const goblet=snapshot.exercises.find(item=>item.exerciseId==='goblet-squat'); const row=snapshot.exercises.find(item=>item.exerciseId==='one-arm-dumbbell-row');
  assert.equal(goblet.loadSource,'working-load'); assert.deepEqual(goblet.progressionContextSnapshot.lastPerformance.sets.map(set=>set.reps),[10,10,9]);
  assert.equal(row.progressionContextSnapshot.lastPerformance,null);
});
