export const CALIBRATION_RESPONSES = Object.freeze(['too-light','appropriate','too-heavy']);

export function recordCalibration(calibrationState, { exerciseId, exerciseVersion = 1, response, workoutId = null, recordedAt = new Date().toISOString() }) {
  if (!CALIBRATION_RESPONSES.includes(response)) throw new Error('Invalid calibration response.');
  return {
    ...calibrationState,
    [exerciseId]: [...(calibrationState[exerciseId] || []), { exerciseId, exerciseVersion, response, workoutId, recordedAt }]
  };
}
