import { PROGRAMME_ID, PROGRAMME_VERSION } from './programmeCatalog.js';

export function createProgrammeState(overrides = {}) {
  return {
    programmeId: PROGRAMME_ID, programmeVersion: PROGRAMME_VERSION,
    activePhase: 'foundation', scheduleMode: 'foundation-three-day',
    activeTemplateSetId: 'foundation-three-day', activeTemplateSetVersion: 1,
    currentProgrammeWeek: 1, foundationExtensionWeeks: 0, weekFourReview: null,
    programmeTransitions: [], lastCompletedRequiredTemplateId: null,
    exerciseProgression: {}, calibrationByExerciseId: {}, ...overrides
  };
}
