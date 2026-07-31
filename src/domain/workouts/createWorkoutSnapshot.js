import { DEFAULT_EQUIPMENT } from '../equipment/equipmentCatalog.js';
import { calculatePlateLoading } from '../equipment/plateLoading.js';
import { resolvePullUpSlot } from '../exercises/pullUpProgression.js';
import { getExercise } from '../exercises/exerciseCatalog.js';
import { resolveSubstitution } from '../exercises/substitutions.js';
import { clone, deepFreeze } from '../shared.js';
import { PROGRAMME_ID, PROGRAMME_VERSION } from '../programmes/programmeCatalog.js';

function selectedExerciseForSlot(slot, equipment, pullUpRung, choices) {
  if (slot.conditional === 'pull-up-availability') return resolvePullUpSlot(equipment, pullUpRung);
  const chosen = choices?.[slot.exerciseId];
  if (chosen) return { exercise: resolveSubstitution(slot.exerciseId, chosen, { pullUpAvailable: equipment.pullUpBarStatus === 'installed-available' && equipment.pullUpSafetyConfirmed }), fallbackFor: null };
  return { exercise: getExercise(slot.exerciseId), fallbackFor: null };
}

function loadFor(exercise, selectedLoads, equipment) {
  const selectedLoad = selectedLoads?.[exercise.id] ?? null;
  const plateLoading = typeof selectedLoad === 'number'
    ? calculatePlateLoading(selectedLoad, exercise.loadingMode, equipment)
    : null;
  return { selectedLoad, plateLoading };
}

export function createWorkoutSnapshot({
  template, programmeId = PROGRAMME_ID, programmeVersion = PROGRAMME_VERSION,
  programmePhase = template.phase, scheduleMode = template.templateSetId,
  equipment = DEFAULT_EQUIPMENT, pullUpRung = 1, selectedLoads = {}, substitutions = {},
  createdAt = new Date().toISOString()
}) {
  const equipmentSnapshot = clone(equipment);
  const exercises = template.exercises.map(slot => {
    const resolved = selectedExerciseForSlot(slot, equipmentSnapshot, pullUpRung, substitutions);
    const exercise = resolved.exercise;
    const sourceExerciseId = slot.conditional ? 'pull-up-progression' : slot.exerciseId;
    const isSubstitution = exercise.id !== sourceExerciseId;
    const substitutePrescription = programmePhase === 'foundation' ? exercise.foundationPrescription : exercise.leanAthleticPrescription;
    const { selectedLoad, plateLoading } = loadFor(exercise, selectedLoads, equipmentSnapshot);
    return {
      exerciseId: exercise.id, exerciseVersion: exercise.version, name: exercise.name,
      equipmentType: exercise.equipmentType, loadingMode: exercise.loadingMode,
      sets: isSubstitution ? substitutePrescription.sets : slot.sets,
      repTarget: isSubstitution || slot.repTarget === 'rung-specific or 8–12' ? substitutePrescription.repTarget : slot.repTarget,
      restSeconds: isSubstitution ? exercise.restSeconds : slot.restSeconds, selectedLoad, plateLoading,
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
