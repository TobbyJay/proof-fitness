export const DATABASE_NAME = 'proof-fitness';
export const DATABASE_VERSION = 3;
export const RECORD_SCHEMA_VERSION = 3;

export const SCHEMA_V1 = Object.freeze({
  appMeta: 'id, onboardingCompletedAt, updatedAt',
  userProfile: 'id, updatedAt',
  preferences: 'id, updatedAt',
  equipment: 'id, updatedAt',
  programmeStates: 'id, activePhase, scheduleMode, updatedAt',
  programmeTransitions: 'id, programmeStateId, effectiveLocalDate, createdAt',
  programmeReviews: 'id, programmeStateId, reviewType, weekNumber, completedAt',
  scheduleOverrides: 'id, localDate, createdAt',
  activeWorkoutSessions: 'id, status, templateId, updatedAt',
  workoutSessions: 'id, localDate, status, templateId, completedAt',
  runSessions: 'id, localDate, status, runTemplateId, updatedAt',
  mealChecks: 'id, [localDate+mealId], localDate, status, updatedAt',
  dailyCheckIns: 'id, localDate, updatedAt',
  measurements: 'id, localDate, type, createdAt',
  exerciseProgressionStates: 'id, exerciseId, exerciseVersion, updatedAt',
  auditEvents: 'id, type, createdAt'
});

// Version 2 extends records in-place; no additional stores are needed.
export const SCHEMA_V2 = SCHEMA_V1;
// Version 3 evolves equipment records and loading snapshots in place; stores are unchanged.
export const SCHEMA_V3 = SCHEMA_V2;

export const EXPORT_TABLES = Object.freeze([
  'userProfile','preferences','equipment','programmeStates','programmeTransitions',
  'programmeReviews','scheduleOverrides','activeWorkoutSessions','workoutSessions',
  'runSessions','mealChecks','dailyCheckIns','measurements','exerciseProgressionStates','auditEvents'
]);
