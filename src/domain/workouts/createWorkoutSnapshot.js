import { DEFAULT_EQUIPMENT } from '../equipment/equipmentCatalog.js';
import { calculatePlateLoading } from '../equipment/plateLoading.js';
import { getConservativeCalibrationLoad } from '../loading/achievableLoads.js';
import { isExternallyLoadedMode } from '../loading/loadingSchema.js';
import { canonicalWorkingLoad } from '../progression/recommendationEngine.js';
import { resolvePullUpSlot } from '../exercises/pullUpProgression.js';
import { getExercise } from '../exercises/exerciseCatalog.js';
import { resolveSubstitution } from '../exercises/substitutions.js';
import { clone, deepFreeze } from '../shared.js';
import { PROGRAMME_ID, PROGRAMME_VERSION } from '../programmes/programmeCatalog.js';
import { EquipmentWeightSource } from '../equipment/equipmentWeight.js';

function selectedExerciseForSlot(slot, equipment, pullUpRung, choices) {
  if (slot.conditional === 'pull-up-availability') return resolvePullUpSlot(equipment, pullUpRung);
  const chosen = choices?.[slot.exerciseId];
  if (chosen) return { exercise: resolveSubstitution(slot.exerciseId, chosen, { pullUpAvailable: equipment.pullUpBarStatus === 'installed-available' && equipment.pullUpSafetyConfirmed }), fallbackFor: null };
  return { exercise: getExercise(slot.exerciseId), fallbackFor: null };
}

function progressionFor(progressionStates,exercise) {
  if(Array.isArray(progressionStates)) return progressionStates.find(item=>item.exerciseId===exercise.id&&item.exerciseVersion===exercise.version)||null;
  return progressionStates?.[exercise.id]||null;
}

function loadFor(exercise, selectedLoads, equipment, progressionStates) {
  const progression=progressionFor(progressionStates,exercise);
  const working=canonicalWorkingLoad(progression?.currentWorkingLoad,exercise.loadingMode);
  const explicit=selectedLoads?.[exercise.id];
  const suggested=progressionStates!==undefined&&isExternallyLoadedMode(exercise.loadingMode)
    ? getConservativeCalibrationLoad(exercise.loadingMode,equipment,{allowZero:exercise.loadingMode==='barbell-symmetric'&&equipment?.barbell?.weight?.weightSource!==EquipmentWeightSource.UNKNOWN&&equipment?.collars?.weight?.weightSource!==EquipmentWeightSource.UNKNOWN}) : null;
  const selectedLoad = Number.isFinite(explicit)?explicit:working?.plateLoadKg??suggested;
  const plateLoading = typeof selectedLoad === 'number'
    ? calculatePlateLoading(selectedLoad, exercise.loadingMode, equipment)
    : null;
  return {selectedLoad,plateLoading,progression,loadSource:Number.isFinite(explicit)?'user-selected':working?'working-load':suggested!==null?'suggested-calibration':null};
}

export function createWorkoutSnapshot({
  template, programmeId = PROGRAMME_ID, programmeVersion = PROGRAMME_VERSION,
  programmePhase = template.phase, scheduleMode = template.templateSetId,
  equipment = DEFAULT_EQUIPMENT, pullUpRung = 1, selectedLoads = {}, substitutions = {}, progressionStates,
  createdAt = new Date().toISOString()
}) {
  const equipmentSnapshot = clone(equipment);
  const exercises = template.exercises.map(slot => {
    const resolved = selectedExerciseForSlot(slot, equipmentSnapshot, pullUpRung, substitutions);
    const exercise = resolved.exercise;
    const sourceExerciseId = slot.conditional ? 'pull-up-progression' : slot.exerciseId;
    const isSubstitution = exercise.id !== sourceExerciseId;
    const substitutePrescription = programmePhase === 'foundation' ? exercise.foundationPrescription : exercise.leanAthleticPrescription;
    const { selectedLoad, plateLoading, progression, loadSource } = loadFor(exercise, selectedLoads, equipmentSnapshot, progressionStates);
    const lastPerformance=progression?.performances?.at(-1)||null;
    return {
      exerciseId: exercise.id, exerciseVersion: exercise.version, name: exercise.name,
      equipmentType: exercise.equipmentType, loadingMode: exercise.loadingMode,
      sets: isSubstitution ? substitutePrescription.sets : slot.sets,
      repTarget: isSubstitution || slot.repTarget === 'rung-specific or 8–12' ? substitutePrescription.repTarget : slot.repTarget,
      restSeconds: isSubstitution ? exercise.restSeconds : slot.restSeconds, selectedLoad, plateLoading,
      selectedLoadCanonical:plateLoading?{loadingMode:exercise.loadingMode,plateLoadKg:selectedLoad}:null,
      loadingGuidanceSnapshot:plateLoading?clone(plateLoading):null,loadSource,
      progressionContextSnapshot:{lastPerformance:clone(lastPerformance),target:isSubstitution?substitutePrescription.repTarget:slot.repTarget,recommendation:clone(progression?.pendingRecommendation?.decision?null:progression?.pendingRecommendation||null),recommendationId:progression?.pendingRecommendation?.id||null,recommendationDecision:progression?.pendingRecommendation?.decision||null,calibrationStatus:progression?.calibrationStatus||'not-started'},
      formCues: clone(exercise.formCues), setupSteps: clone(exercise.setupSteps), commonMistakes: clone(exercise.commonMistakes),
      safetyNotes: clone(exercise.safetyNotes), painWarnings: clone(exercise.painWarnings),
      videoSearchTerm: exercise.videoSearchTerm, writtenGuidanceSearchTerm: exercise.writtenGuidanceSearchTerm,
      substitutionSourceExerciseId: isSubstitution ? sourceExerciseId : null,
      optional: Boolean(slot.optional)
    };
  });
  return deepFreeze({
    programmeId, programmeVersion, programmePhase, scheduleMode,
    templateSetId: template.templateSetId, templateSetVersion: template.templateSetVersion,
    templateId: template.id, templateVersion: template.version, workoutName: template.name, createdAt,
    equipmentSnapshot, pullUpAvailabilitySnapshot: { status: equipmentSnapshot.pullUpBarStatus, safetyConfirmed: equipmentSnapshot.pullUpSafetyConfirmed, rung: pullUpRung },
    exercises
  });
}
