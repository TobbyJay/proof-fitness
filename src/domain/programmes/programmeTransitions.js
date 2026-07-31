import { clone, deepFreeze } from '../shared.js';
import { getTemplateSet } from './programmeCatalog.js';
import { phaseForScheduleMode, SCHEDULE_MODES } from '../scheduling/scheduleMode.js';

const ALLOWED = new Set([
  'foundation-three-day>lean-athletic-four-day','foundation-three-day>lean-athletic-three-day',
  'lean-athletic-four-day>lean-athletic-three-day','lean-athletic-three-day>lean-athletic-four-day'
]);

export function createProgrammeTransition(programmeState, toScheduleMode, reason = 'user-choice') {
  if (!SCHEDULE_MODES.includes(toScheduleMode) || !ALLOWED.has(`${programmeState.scheduleMode}>${toScheduleMode}`)) throw new Error('Unsupported programme transition.');
  const target = getTemplateSet(toScheduleMode);
  return deepFreeze({
    fromPhase: programmeState.activePhase, toPhase: phaseForScheduleMode(toScheduleMode),
    fromScheduleMode: programmeState.scheduleMode, toScheduleMode,
    fromTemplateSetId: programmeState.activeTemplateSetId, toTemplateSetId: target.id,
    fromTemplateSetVersion: programmeState.activeTemplateSetVersion, toTemplateSetVersion: target.version,
    effectiveFromNextWorkout: true, reason
  });
}

export function applyProgrammeTransition(programmeState, transition) {
  const next = clone(programmeState);
  // A frozen in-progress session remains the exact same snapshot across a schedule change.
  if (programmeState.activeWorkoutSnapshot) next.activeWorkoutSnapshot = programmeState.activeWorkoutSnapshot;
  next.activePhase = transition.toPhase; next.scheduleMode = transition.toScheduleMode;
  next.activeTemplateSetId = transition.toTemplateSetId; next.activeTemplateSetVersion = transition.toTemplateSetVersion;
  next.programmeTransitions = [...(next.programmeTransitions || []), transition];
  return next;
}
