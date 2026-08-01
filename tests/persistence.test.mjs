import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ProofFitnessDatabase, openDatabase } from '../src/db/database.js';
import { PersistenceCoordinator } from '../src/state/persistenceCoordinator.js';
import { hydrateState, calculateStreak } from '../src/state/hydrateState.js';
import { createWorkoutSnapshot } from '../src/domain/workouts/createWorkoutSnapshot.js';
import { getWorkoutTemplate } from '../src/domain/programmes/programmeCatalog.js';
import { DEFAULT_EQUIPMENT } from '../src/domain/equipment/equipmentCatalog.js';
import { nextRequiredWorkout } from '../src/domain/scheduling/workoutRotation.js';
import { localDate } from '../src/db/transactions.js';

function fixtureName(label) { return `proof-fitness-test-${label}-${crypto.randomUUID()}`; }
async function context(t,label) {
  const name=fixtureName(label); const db=new ProofFitnessDatabase(name); const persistence=new PersistenceCoordinator(db);
  t.after(async()=>{db.close();await db.delete();});
  return {name,db,persistence,state:await persistence.initialise()};
}
function onboardingInput(overrides={}) {
  return {profile:{name:'Local user',goal:'build-muscle-controlled-waist',trainingDays:['Monday','Wednesday','Friday'],optionalDay:'Saturday'},preferences:{theme:'dark',runGuidanceMode:'voice',notificationsEnabled:false},equipment:{...DEFAULT_EQUIPMENT,plates:{...DEFAULT_EQUIPMENT.plates}},measurements:[],optionalConditioningEnabled:true,...overrides};
}

test('clean install creates schema metadata and no activity',async t=>{
  const {db,state}=await context(t,'clean');
  assert.match(db.name,/^proof-fitness-test-clean-/);
  assert.equal(state.appMeta.onboardingCompletedAt,null);
  assert.equal(state.derived.streak,0);
  for(const collection of ['workouts','runs','mealChecks','checkIns','measurements','progression','reviews','transitions']) assert.deepEqual(state[collection],[]);
  assert.ok(state.appMeta.completedMigrations.includes(1));
});

test('partial onboarding and completed onboarding survive recreation',async t=>{
  const {name,db,persistence}=await context(t,'onboarding');
  await persistence.saveOnboardingDraft({step:2,name:'Ada',days:['Tuesday','Thursday','Saturday']});
  db.close();
  const reopened=new ProofFitnessDatabase(name); const second=new PersistenceCoordinator(reopened); const partial=await second.initialise();
  assert.equal(partial.appMeta.onboardingDraft.step,2);
  const programme=await second.completeOnboarding(onboardingInput({profile:{...onboardingInput().profile,name:'Ada'},measurements:[{type:'weight',value:71.2,localDate:'2026-07-31'}]}));
  reopened.close();
  const thirdDb=new ProofFitnessDatabase(name); const complete=await hydrateState(await openDatabase(thirdDb));
  assert.ok(complete.appMeta.onboardingCompletedAt);
  assert.equal(complete.appMeta.activeProgrammeStateId,programme.id);
  assert.equal(complete.programme.activePhase,'foundation');
  assert.equal(complete.programme.currentProgrammeWeek,1);
  assert.equal(complete.measurements.length,1);
  assert.equal(complete.transitions.length,1);
  assert.equal(complete.transitions[0].reason,'onboarding-completed');
  assert.equal(complete.derived.streak,0);
  thirdDb.close();
});

test('active workout snapshot, actions, and Foundation rotation persist',async t=>{
  const {name,db,persistence}=await context(t,'workout');
  let programme=await persistence.completeOnboarding(onboardingInput());
  const snapshot=createWorkoutSnapshot({template:getWorkoutTemplate('foundation-a'),programmeVersion:programme.programmeVersion,programmePhase:programme.activePhase,scheduleMode:programme.scheduleMode,equipment:DEFAULT_EQUIPMENT,pullUpRung:2});
  const active=await persistence.startWorkout(snapshot,{step:'exercise'});
  await persistence.updateWorkout(active.id,{completedSets:{'goblet-squat':[1,2]},substitutions:{'one-arm-dumbbell-row':'barbell-bent-over-row'},currentExerciseIndex:1,currentSetIndex:2,restDeadline:'2026-07-31T12:00:00.000Z'});
  db.close();
  const reopened=new ProofFitnessDatabase(name); const second=new PersistenceCoordinator(reopened); const recovered=await second.initialise();
  assert.deepEqual(recovered.activeWorkout.workoutSnapshot,snapshot);
  assert.deepEqual(recovered.activeWorkout.completedSets['goblet-squat'],[1,2]);
  assert.equal(recovered.activeWorkout.substitutions['one-arm-dumbbell-row'],'barbell-bent-over-row');
  programme={...recovered.programme,lastCompletedRequiredTemplateId:'foundation-a'};
  await second.completeWorkout(recovered.activeWorkout,programme);
  const after=await hydrateState(reopened);
  assert.equal(after.activeWorkout,null);
  assert.equal(after.workouts.length,1);
  assert.equal(nextRequiredWorkout({scheduleMode:after.programme.scheduleMode,activeTemplateSetId:after.programme.activeTemplateSetId,lastCompletedTemplateId:after.programme.lastCompletedRequiredTemplateId,activeWorkoutSnapshot:null}).templateId,'foundation-b');
  reopened.close();
});

test('workout start is idempotent and rejects a completed same-day occurrence',async t=>{
  const {db,persistence}=await context(t,'duplicate-workout-start');
  const programme=await persistence.completeOnboarding(onboardingInput());
  const snapshot=createWorkoutSnapshot({template:getWorkoutTemplate('foundation-b'),programmeVersion:programme.programmeVersion,programmePhase:programme.activePhase,scheduleMode:programme.scheduleMode,equipment:DEFAULT_EQUIPMENT,pullUpRung:2});
  const [first,second]=await Promise.all([persistence.startWorkout(snapshot),persistence.startWorkout(snapshot)]);
  assert.equal(first.id,second.id);
  assert.equal(await persistence.repos.activeWorkouts.count(),1);
  await persistence.completeWorkout(first,{...programme,lastCompletedRequiredTemplateId:'foundation-b'});
  await assert.rejects(()=>persistence.startWorkout(snapshot),error=>error.name==='WorkoutAlreadyCompletedError'&&error.message==='This workout has already been completed.');
  assert.equal(await persistence.repos.activeWorkouts.count(),0);
  assert.equal(await persistence.repos.workouts.count(),1);
  assert.equal(await persistence.repos.progression.count(),0);
  const hydrated=await hydrateState(db);
  assert.equal(nextRequiredWorkout({scheduleMode:hydrated.programme.scheduleMode,activeTemplateSetId:hydrated.programme.activeTemplateSetId,lastCompletedTemplateId:hydrated.programme.lastCompletedRequiredTemplateId,activeWorkoutSnapshot:null}).templateId,'foundation-c');
});

test('meals, check-ins, measurements, progression, reviews, transitions, equipment, and runs persist',async t=>{
  const {db,persistence}=await context(t,'records');
  const programme=await persistence.completeOnboarding(onboardingInput());
  await persistence.saveMeal('breakfast','planned',{name:'Breakfast'});
  await persistence.saveCheckIn({feeling:'Good',energy:'Good',sleep:'Okay',soreness:'Low'});
  await persistence.saveMeasurement('weight',70.4);
  await persistence.saveMeasurement('waist',82.1);
  await persistence.saveProgression({exerciseId:'barbell-curl',exerciseVersion:1,currentWorkingLoad:10,successfulAppearances:0,pendingRecommendation:null});
  await persistence.saveEquipment({...DEFAULT_EQUIPMENT,pullUpBarStatus:'installed-available',pullUpSafetyConfirmed:true,pullUpSafetyConfirmation:{confirmed:true,confirmedAt:new Date().toISOString(),confirmationVersion:1}});
  const review={id:'review-1',programmeStateId:programme.id,reviewType:'foundation-readiness',weekNumber:4,recommendation:'ready',userDecision:null,completedAt:new Date().toISOString()};
  const transition={id:'transition-1',programmeStateId:programme.id,fromPhase:'foundation',toPhase:'lean-athletic',fromScheduleMode:'foundation-three-day',toScheduleMode:'lean-athletic-four-day',effectiveLocalDate:'2026-07-31'};
  await persistence.saveProgrammeDecision({...programme,weekFourReviewId:review.id},{review,transition});
  await persistence.saveRun({id:'run-1',status:'paused',startedAt:new Date().toISOString(),audioPositionSeconds:418,currentPhaseIndex:4,paused:true,guidanceMode:'chimes',lastPersistedAt:new Date().toISOString()});
  const state=await hydrateState(db);
  assert.equal(state.mealChecks.length,1); assert.equal(state.checkIns.length,1); assert.equal(state.measurements.length,2);
  assert.equal(state.progression[0].exerciseId,'barbell-curl'); assert.equal(state.reviews[0].recommendation,'ready');
  assert.ok(state.transitions.some(item=>item.id==='transition-1')); assert.equal(state.equipment.pullUpSafetyConfirmation.confirmed,true);
  assert.equal(state.runs[0].audioPositionSeconds,418); assert.equal(state.runs[0].guidanceMode,'chimes');
});

test('accepted, deferred, and rejected recommendations persist without cross-exercise duplication',async t=>{
  const {db,persistence}=await context(t,'progression-decisions');
  await persistence.completeOnboarding(onboardingInput());
  await persistence.saveProgression({exerciseId:'barbell-curl',exerciseVersion:1,calibrationStatus:'appropriate',acceptedRecommendation:{loadKg:10},deferredRecommendation:null,rejectedRecommendation:null});
  await persistence.saveProgression({exerciseId:'dumbbell-curl',exerciseVersion:1,calibrationStatus:'too-heavy',acceptedRecommendation:null,deferredRecommendation:{loadKg:5},rejectedRecommendation:null});
  await persistence.saveProgression({exerciseId:'hammer-curl',exerciseVersion:1,calibrationStatus:'too-light',acceptedRecommendation:null,deferredRecommendation:null,rejectedRecommendation:{loadKg:15.25,reason:'plate-infeasible'}});
  const state=await hydrateState(db);
  assert.equal(state.progression.length,3);
  assert.equal(new Set(state.progression.map(item=>item.exerciseId)).size,3);
  assert.equal(state.progression.find(item=>item.exerciseId==='barbell-curl').acceptedRecommendation.loadKg,10);
  assert.equal(state.progression.find(item=>item.exerciseId==='dumbbell-curl').deferredRecommendation.loadKg,5);
  assert.equal(state.progression.find(item=>item.exerciseId==='hammer-curl').rejectedRecommendation.reason,'plate-infeasible');
});

test('export/replace round trip preserves records and rejects future schemas',async t=>{
  const source=await context(t,'export-source');
  await source.persistence.completeOnboarding(onboardingInput());
  await source.persistence.saveMeasurement('weight',68.5);
  const payload=await source.persistence.exportAll(1);
  assert.equal(payload.manifest.product,'proof-fitness');
  assert.equal(payload.measurements.length,1);
  const target=await context(t,'export-target');
  await target.persistence.importReplace(payload);
  const restored=await hydrateState(target.db);
  assert.ok(restored.appMeta.onboardingCompletedAt);
  assert.equal(restored.measurements[0].value,68.5);
  await assert.rejects(()=>target.persistence.importReplace({...payload,manifest:{...payload.manifest,schemaVersion:999}}),/future schema/);
});

test('streak requires workouts on configured strength days but not rest days',()=>{
  const today=new Date(2026,6,31); // Friday
  const common={profile:{trainingDays:['Wednesday','Friday']},mealChecks:[],checkIns:[],workouts:[]};
  for(const date of ['2026-07-30','2026-07-31']) for(const mealId of ['breakfast','lunch','snack','dinner']) common.mealChecks.push({localDate:date,mealId,status:'planned'});
  common.checkIns.push({localDate:'2026-07-30',feeling:'Good'},{localDate:'2026-07-31',feeling:'Good'});
  assert.equal(calculateStreak(common,today),0);
  common.workouts.push({localDate:'2026-07-31',status:'completed'});
  assert.equal(calculateStreak(common,today),2);
});

test('local calendar evidence stays correct across midnight when UTC differs',()=>{
  const beforeMidnight=new Date(2026,6,31,23,59);
  const afterMidnight=new Date(2026,7,1,0,1);
  assert.equal(localDate(beforeMidnight),'2026-07-31');
  assert.equal(localDate(afterMidnight),'2026-08-01');
  assert.equal(afterMidnight.toISOString().slice(0,10),'2026-07-31');
  const records={profile:{trainingDays:[]},workouts:[],mealChecks:[],checkIns:[]};
  for(const mealId of ['breakfast','lunch','snack','dinner']) records.mealChecks.push({localDate:'2026-07-31',mealId,status:'planned'});
  records.checkIns.push({localDate:'2026-07-31',feeling:'Good'});
  assert.equal(calculateStreak(records,beforeMidnight),1);
  assert.equal(calculateStreak(records,afterMidnight),0);
  for(const mealId of ['breakfast','lunch','snack','dinner']) records.mealChecks.push({localDate:'2026-08-01',mealId,status:'planned'});
  records.checkIns.push({localDate:'2026-08-01',feeling:'Good'});
  assert.equal(calculateStreak(records,afterMidnight),2);
});
