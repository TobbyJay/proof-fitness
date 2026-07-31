import { isLoadingMode } from '../equipment/loadingModes.js';
import { assertPositiveVersion } from '../shared.js';

const REQUIRED = [
  'id', 'name', 'shortName', 'equipmentType', 'loadingMode', 'movementPattern',
  'primaryMuscles', 'secondaryMuscles', 'defaultPrescription', 'foundationPrescription',
  'leanAthleticPrescription', 'calibrationRule', 'progressionRule', 'regressionRule',
  'restSeconds', 'formCues', 'setupSteps', 'safetyNotes', 'painWarnings',
  'substitutions', 'videoSearchTerm', 'writtenGuidanceSearchTerm', 'estimatedSetDurationSeconds'
];

export function validateExercise(exercise) {
  assertPositiveVersion(exercise, 'Exercise');
  for (const field of REQUIRED) if (exercise[field] === undefined) throw new Error(`Exercise ${exercise.id} is missing ${field}.`);
  if (!isLoadingMode(exercise.loadingMode)) throw new Error(`Exercise ${exercise.id} uses invalid loading mode ${exercise.loadingMode}.`);
  if (!Array.isArray(exercise.formCues) || exercise.formCues.length < 2) throw new Error(`Exercise ${exercise.id} needs at least two form cues.`);
  if (!Array.isArray(exercise.setupSteps) || exercise.setupSteps.length < 1) throw new Error(`Exercise ${exercise.id} needs setup steps.`);
  return true;
}
