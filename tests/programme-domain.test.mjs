import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_EQUIPMENT } from '../src/domain/equipment/equipmentCatalog.js';
import { calculateMatchedDumbbellLoading, isAchievableLoad } from '../src/domain/equipment/plateLoading.js';
import { exercises, getExercise } from '../src/domain/exercises/exerciseCatalog.js';
import { resolvePullUpSlot } from '../src/domain/exercises/pullUpProgression.js';
import { getSubstitutionOptions } from '../src/domain/exercises/substitutions.js';
import { applyFoundationExtension, foundationProgramme } from '../src/domain/programmes/foundationProgramme.js';
import { leanAthleticProgramme, optionalE } from '../src/domain/programmes/leanAthleticProgramme.js';
import { threeDayFallback } from '../src/domain/programmes/threeDayFallback.js';
import { getWorkoutTemplate, programmeCatalog } from '../src/domain/programmes/programmeCatalog.js';
import { createProgrammeState } from '../src/domain/programmes/createProgrammeState.js';
import { applyProgrammeTransition, createProgrammeTransition } from '../src/domain/programmes/programmeTransitions.js';
import { recordExerciseEvidence } from '../src/domain/progression/progressionRules.js';
import { progressionRecommendation } from '../src/domain/progression/recommendationEngine.js';
import { foundationReadinessReview, withUserDecision } from '../src/domain/reviews/foundationReadinessReview.js';
import { nextRequiredWorkout } from '../src/domain/scheduling/workoutRotation.js';
import { createWorkoutSnapshot } from '../src/domain/workouts/createWorkoutSnapshot.js';
import { estimateWorkoutDuration } from '../src/domain/workouts/estimateWorkoutDuration.js';
import { validateProgrammeDomain } from '../src/domain/validateProgrammeDomain.js';

const installed = { ...DEFAULT_EQUIPMENT, plates:{...DEFAULT_EQUIPMENT.plates}, pullUpBarStatus:'installed-available', pullUpSafetyConfirmed:true };
const unavailable = { ...DEFAULT_EQUIPMENT, plates:{...DEFAULT_EQUIPMENT.plates} };

test('exercise catalog has unique stable IDs and full substitutions', () => {
  const ids = Object.keys(exercises);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(getExercise('barbell-curl').loadingMode, 'barbell-symmetric');
  assert.notEqual(getExercise('barbell-curl').id, getExercise('dumbbell-curl').id);
  for (const exercise of Object.values(exercises)) {
    assert.ok(Number.isInteger(exercise.version) && exercise.version > 0);
    assert.ok(exercise.setupSteps.length);
    assert.ok(exercise.formCues.length >= 2);
    for (const option of getSubstitutionOptions(exercise.id, { pullUpAvailable:true })) {
      assert.equal(typeof option.defaultPrescription.sets, 'number');
      assert.notEqual(option.id, exercise.id);
    }
  }
});

test('Foundation is four weeks with A → B → C and an optional session', () => {
  assert.equal(foundationProgramme.defaultDurationWeeks, 4);
  assert.deepEqual(foundationProgramme.allowedExtensionWeeks, [0,1,2]);
  assert.deepEqual(foundationProgramme.rotation, ['foundation-a','foundation-b','foundation-c']);
  assert.equal(foundationProgramme.templates.length, 3);
  assert.equal(foundationProgramme.optionalSessions[0].required, false);
});

test('Foundation extension keeps review, evidence and rotation position', () => {
  const original = createProgrammeState({ weekFourReview:{recommendation:'extend-one-week'}, calibrationByExerciseId:{'goblet-squat':[{}]}, exerciseProgression:{'goblet-squat':[{}]}, lastCompletedRequiredTemplateId:'foundation-b' });
  const extended = applyFoundationExtension(original, 1);
  assert.equal(extended.foundationExtensionWeeks, 1);
  assert.equal(extended.weekFourReview, original.weekFourReview);
  assert.equal(extended.calibrationByExerciseId, original.calibrationByExerciseId);
  assert.equal(nextRequiredWorkout({ scheduleMode:extended.scheduleMode, lastCompletedTemplateId:extended.lastCompletedRequiredTemplateId }).templateId, 'foundation-c');
});

test('conditional pull-up slot uses pullover until installed and confirmed', () => {
  for (const equipment of [
    { ...unavailable, pullUpBarStatus:'owned-not-installed' },
    { ...unavailable, pullUpBarStatus:'installed-available', pullUpSafetyConfirmed:false },
    { ...unavailable, pullUpBarStatus:'temporarily-unavailable' }
  ]) assert.equal(resolvePullUpSlot(equipment, 2).exercise.id, 'dumbbell-pullover');
  assert.equal(resolvePullUpSlot(installed, 2).exercise.id, 'controlled-negative-pull-up');
});

test('Foundation C snapshot resolves only one conditional pull exercise', () => {
  const unavailableSnapshot = createWorkoutSnapshot({ template:getWorkoutTemplate('foundation-c'), equipment:unavailable, pullUpRung:2 });
  assert.ok(unavailableSnapshot.exercises.some(item => item.exerciseId === 'dumbbell-pullover'));
  assert.ok(!unavailableSnapshot.exercises.some(item => item.exerciseId === 'controlled-negative-pull-up'));
  const installedSnapshot = createWorkoutSnapshot({ template:getWorkoutTemplate('foundation-c'), equipment:installed, pullUpRung:2 });
  assert.ok(installedSnapshot.exercises.some(item => item.exerciseId === 'controlled-negative-pull-up'));
  assert.ok(!installedSnapshot.exercises.some(item => item.exerciseId === 'dumbbell-pullover'));
});

test('Week 4 review is deterministic and keeps recommendation separate from decision', () => {
  assert.equal(foundationReadinessReview({ currentProgrammeWeek:3 }).available, false);
  const baseline = { currentProgrammeWeek:4, plannedRequiredWorkouts:12, incompleteCalibrationAreas:0, formConfidence:'good', unresolvedPainOrDiscomfort:false, energy:'good', sleep:'good', recoveryBetweenSessions:'normal' };
  const ready = foundationReadinessReview({ ...baseline, completedRequiredWorkouts:10 });
  assert.equal(ready.recommendation, 'ready'); assert.equal(ready.userDecision, null);
  assert.equal(withUserDecision(ready, 'lean-athletic-three-day').recommendation, 'ready');
  assert.equal(foundationReadinessReview({ ...baseline, completedRequiredWorkouts:9 }).recommendation, 'extend-one-week');
  assert.equal(foundationReadinessReview({ ...baseline, completedRequiredWorkouts:7 }).recommendation, 'extend-two-weeks');
  assert.notEqual(foundationReadinessReview({ ...baseline, completedRequiredWorkouts:12, unresolvedPainOrDiscomfort:true }).recommendation, 'ready');
});

test('four-day Lean Athletic and optional E match the approved rotation', () => {
  assert.deepEqual(leanAthleticProgramme.rotation, ['lean-lower-a','lean-upper-a','lean-lower-b','lean-upper-b']);
  const ids = id => getWorkoutTemplate(id).exercises.flatMap(slot => slot.conditional ? [slot.whenAvailableExerciseId,slot.fallbackExerciseId] : [slot.exerciseId]);
  assert.ok(ids('lean-upper-a').includes('barbell-floor-press'));
  assert.ok(ids('lean-lower-a').includes('barbell-romanian-deadlift'));
  assert.ok(ids('lean-lower-b').includes('conventional-barbell-deadlift'));
  assert.ok(ids('lean-lower-b').includes('barbell-glute-bridge'));
  assert.ok(ids('lean-upper-b').includes('barbell-bent-over-row'));
  assert.ok(ids('lean-upper-b').includes('barbell-curl'));
  assert.equal(optionalE.required, false); assert.equal(optionalE.gatesStrengthStreak, false);
});

test('permanent three-day mode contains A, B, C and transitions preserve evidence', () => {
  assert.deepEqual(threeDayFallback.rotation, ['lean-three-day-a','lean-three-day-b','lean-three-day-c']);
  const active = createWorkoutSnapshot({ template:getWorkoutTemplate('lean-lower-a'), equipment:unavailable });
  const state = createProgrammeState({ activePhase:'lean-athletic', scheduleMode:'lean-athletic-four-day', activeTemplateSetId:'lean-athletic-four-day', exerciseProgression:{'barbell-curl':[{reps:10}]}, activeWorkoutSnapshot:active });
  const transition = createProgrammeTransition(state, 'lean-athletic-three-day', 'schedule-constraint');
  const next = applyProgrammeTransition(state, transition);
  assert.deepEqual(next.exerciseProgression, state.exerciseProgression);
  assert.equal(next.activeWorkoutSnapshot, active);
  assert.equal(next.scheduleMode, 'lean-athletic-three-day');
  const back = applyProgrammeTransition(next, createProgrammeTransition(next, 'lean-athletic-four-day', 'schedule-recovered'));
  assert.equal(back.activeTemplateSetId, 'lean-athletic-four-day');
});

test('rotation follows completion order rather than weekdays and resumes snapshots', () => {
  assert.equal(nextRequiredWorkout({ scheduleMode:'foundation-three-day', lastCompletedTemplateId:'foundation-a' }).templateId, 'foundation-b');
  assert.equal(nextRequiredWorkout({ scheduleMode:'foundation-three-day', lastCompletedTemplateId:'foundation-c' }).templateId, 'foundation-a');
  const snapshot = createWorkoutSnapshot({ template:getWorkoutTemplate('foundation-b') });
  assert.equal(nextRequiredWorkout({ scheduleMode:'foundation-three-day', activeWorkoutSnapshot:snapshot }).templateId, 'foundation-b');
});

test('snapshots retain versions, substitutions and equipment without later mutation', () => {
  const mutableEquipment = { ...unavailable, plates:{...unavailable.plates} };
  const template = structuredClone(getWorkoutTemplate('foundation-a'));
  const snapshot = createWorkoutSnapshot({ template, equipment:mutableEquipment, substitutions:{'barbell-floor-press':'dumbbell-floor-press'} });
  assert.equal(snapshot.programmeVersion, 1); assert.equal(snapshot.templateVersion, 1);
  const substitute = snapshot.exercises.find(item => item.exerciseId === 'dumbbell-floor-press');
  assert.equal(substitute.substitutionSourceExerciseId, 'barbell-floor-press');
  assert.equal(substitute.loadingMode, getExercise('dumbbell-floor-press').loadingMode);
  mutableEquipment.pullUpBarStatus = 'installed-available'; template.name = 'Changed later';
  assert.equal(snapshot.equipmentSnapshot.pullUpBarStatus, 'owned-not-installed');
  assert.equal(snapshot.workoutName, 'Full Body A');
  assert.throws(() => { snapshot.workoutName = 'Mutated'; }, TypeError);
});

test('progression is exercise-ID specific, confirmed, and plate-realistic', () => {
  let evidence = {};
  evidence = recordExerciseEvidence(evidence, { exerciseId:'barbell-curl', controlled:true, hitTopOfRange:true });
  evidence = recordExerciseEvidence(evidence, { exerciseId:'barbell-curl', controlled:true, hitTopOfRange:true });
  assert.equal(evidence['dumbbell-curl'], undefined);
  assert.equal(evidence['dumbbell-pullover'], undefined);
  const recommendation = progressionRecommendation({ exerciseId:'barbell-curl', currentLoad:10, evidence:evidence['barbell-curl'], equipment:unavailable });
  assert.equal(recommendation.eligible, true); assert.equal(recommendation.appliesAutomatically, false);
  assert.equal(isAchievableLoad(15.25, 'barbell-symmetric', unavailable), false);
  assert.deepEqual(calculateMatchedDumbbellLoading(5, unavailable).perEnd, [2.5]);
  assert.equal(isAchievableLoad(20, 'two-dumbbells-matched', unavailable), false);
});

test('required workouts validate and stay in documented duration tolerance', () => {
  const result = validateProgrammeDomain();
  assert.equal(result.errors.length, 0); assert.deepEqual(result.warnings, []);
  for (const template of Object.values(programmeCatalog.templates)) assert.equal(estimateWorkoutDuration(template).withinTarget, true, template.id);
});
