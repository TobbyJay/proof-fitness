import { LOADING_MODES } from './equipment/loadingModes.js';
import { exercises } from './exercises/exerciseCatalog.js';
import { programmeCatalog } from './programmes/programmeCatalog.js';
import { estimateWorkoutDuration } from './workouts/estimateWorkoutDuration.js';
import { DEFAULT_EQUIPMENT } from './equipment/equipmentCatalog.js';
import { getConservativeCalibrationLoad, getNextAchievableLoad } from './loading/achievableLoads.js';
import { calculatePlateLoading } from './equipment/plateLoading.js';
import { isExternallyLoadedMode } from './loading/loadingSchema.js';

export function validateProgrammeDomain() {
  const errors = []; const warnings = [];
  const exerciseIds = Object.keys(exercises);
  if (new Set(exerciseIds).size !== exerciseIds.length) errors.push('Exercise IDs are not unique.');
  for (const exercise of Object.values(exercises)) {
    if (!LOADING_MODES.includes(exercise.loadingMode)) errors.push(`${exercise.id}: invalid loading mode.`);
    for (const substituteId of exercise.substitutions) if (!exercises[substituteId]) errors.push(`${exercise.id}: unresolved substitution ${substituteId}.`);
    if(isExternallyLoadedMode(exercise.loadingMode)) {
      const startingLoad=getConservativeCalibrationLoad(exercise.loadingMode,DEFAULT_EQUIPMENT);
      if(startingLoad==null||!calculatePlateLoading(startingLoad,exercise.loadingMode,DEFAULT_EQUIPMENT)) errors.push(`${exercise.id}: cannot generate valid first-exposure loading guidance.`);
      const next=getNextAchievableLoad(startingLoad,exercise.loadingMode,DEFAULT_EQUIPMENT);
      if(next!=null&&!calculatePlateLoading(next,exercise.loadingMode,DEFAULT_EQUIPMENT)) errors.push(`${exercise.id}: next load is not physically achievable.`);
    }
  }
  const templateIds = Object.keys(programmeCatalog.templates);
  if (new Set(templateIds).size !== templateIds.length) errors.push('Template IDs are not unique.');
  for (const template of Object.values(programmeCatalog.templates)) {
    const duration = estimateWorkoutDuration(template);
    if (!duration.withinTarget) warnings.push(`${template.id}: estimated ${duration.minutes} minutes (40–55 minute validation tolerance).`);
    for (const slot of template.exercises.filter(item => item.conditional === 'pull-up-availability')) {
      if (slot.fallbackExerciseId !== 'dumbbell-pullover') errors.push(`${template.id}: pull-up slot must provide the dumbbell-pullover fallback.`);
    }
    if (template.id.startsWith('foundation-') || template.id.startsWith('lean-three-day-')) {
      const ids = template.exercises.flatMap(slot => slot.conditional ? [slot.whenAvailableExerciseId, slot.fallbackExerciseId] : [slot.exerciseId]);
      const patterns = ids.map(id => exercises[id]?.movementPattern).filter(Boolean);
      if (!patterns.some(pattern => ['squat','lunge','hinge','hip-extension'].includes(pattern))) errors.push(`${template.id}: missing lower-body coverage.`);
      if (!patterns.some(pattern => ['horizontal-push','vertical-push'].includes(pattern))) errors.push(`${template.id}: missing upper-body push coverage.`);
      if (!patterns.some(pattern => ['horizontal-pull','vertical-pull'].includes(pattern))) errors.push(`${template.id}: missing upper-body pull coverage.`);
    }
  }
  for (const required of ['foundation-a','foundation-b','foundation-c','lean-lower-a','lean-upper-a','lean-lower-b','lean-upper-b','lean-three-day-a','lean-three-day-b','lean-three-day-c']) if (!programmeCatalog.templates[required]) errors.push(`Missing ${required}.`);
  if (!programmeCatalog.templates['lean-upper-b'].exercises.some(slot => slot.exerciseId === 'barbell-curl')) errors.push('Barbell curl is missing from Upper B.');
  if (errors.length) throw new Error(errors.join('\n'));
  return { exerciseCount: exerciseIds.length, templateCount: templateIds.length, errors, warnings };
}
