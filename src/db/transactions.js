import { createProgrammeState } from '../domain/programmes/createProgrammeState.js';
import { EXPORT_TABLES, RECORD_SCHEMA_VERSION } from './schema.js';
import { timestamped } from './migrations.js';
import { getWorkoutTemplate } from '../domain/programmes/programmeCatalog.js';
import { getExercise } from '../domain/exercises/exerciseCatalog.js';

export function newId(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

export function localDate(date = new Date()) {
  const year = date.getFullYear(); const month = String(date.getMonth()+1).padStart(2,'0'); const day = String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

export async function completeOnboardingTransaction(database, input) {
  const now = new Date().toISOString(); const programmeId = newId('programme');
  const domainState = createProgrammeState();
  const programme = timestamped({
    id:programmeId, ...domainState, currentBlockWeek:1, nextWorkoutRotationIndex:0,
    weekFourReviewId:null, transitionStatus:'active', optionalConditioningEnabled:input.optionalConditioningEnabled !== false,
    startedAt:now
  }, now);
  await database.transaction('rw', database.appMeta, database.userProfile, database.preferences, database.equipment, database.programmeStates, database.programmeTransitions, database.measurements, database.auditEvents, async () => {
    await database.userProfile.put(timestamped({ id:'profile', ...input.profile }, now));
    await database.preferences.put(timestamped({ id:'preferences', ...input.preferences }, now));
    await database.equipment.put(timestamped({ id:'equipment', ...input.equipment }, now));
    await database.programmeStates.put(programme);
    await database.programmeTransitions.put(timestamped({id:newId('transition'),programmeStateId:programmeId,fromPhase:null,toPhase:'foundation',fromScheduleMode:null,toScheduleMode:'foundation-three-day',fromTemplateSetId:null,fromTemplateSetVersion:null,toTemplateSetId:'foundation-three-day',toTemplateSetVersion:1,reviewId:null,reason:'onboarding-completed',initiatedBy:'user',effectiveLocalDate:input.localDate||localDate()},now));
    for (const measurement of input.measurements || []) await database.measurements.put(timestamped({ id:newId('measurement'), ...measurement }, now));
    const meta = await database.appMeta.get('app');
    await database.appMeta.put({ ...meta, onboardingDraft:null, onboardingCompletedAt:now, programmeStartedAt:now, activeProgrammeStateId:programmeId, updatedAt:now });
    await database.auditEvents.put(timestamped({ id:newId('audit'), type:'onboarding-completed' }, now));
  });
  return programme;
}

export async function completeWorkoutTransaction(database, activeRecord, programmeState, status = 'completed') {
  const now = new Date().toISOString();
  const completed = { ...activeRecord, status, completedAt:now, updatedAt:now };
  await database.transaction('rw', database.activeWorkoutSessions, database.workoutSessions, database.programmeStates, database.auditEvents, async () => {
    await database.workoutSessions.put(completed);
    await database.activeWorkoutSessions.delete(activeRecord.id);
    await database.programmeStates.put({ ...programmeState, updatedAt:now });
    await database.auditEvents.put(timestamped({ id:newId('audit'), type:`workout-${status}`, entityId:activeRecord.id }, now));
  });
  return completed;
}

export async function persistProgrammeDecision(database, programmeState, { review=null, transition=null } = {}) {
  const now=new Date().toISOString();
  const tables=[database.programmeStates,database.auditEvents];
  if(review) tables.push(database.programmeReviews);
  if(transition) tables.push(database.programmeTransitions);
  await database.transaction('rw',tables,async()=>{
    if(review) await database.programmeReviews.put({ ...timestamped(review,review.createdAt||now),updatedAt:now });
    if(transition) await database.programmeTransitions.put({ ...timestamped(transition,transition.createdAt||now),updatedAt:now });
    await database.programmeStates.put({ ...programmeState,updatedAt:now });
    await database.auditEvents.put(timestamped({id:newId('audit'),type:transition?'programme-transition':'programme-review-saved',entityId:programmeState.id},now));
  });
  return programmeState;
}

export async function exportDatabase(database, programmeVersion) {
  const meta = await database.appMeta.get('app'); const data = {};
  for (const table of EXPORT_TABLES) data[table] = await database.table(table).toArray();
  return { manifest:{ product:'proof-fitness', schemaVersion:RECORD_SCHEMA_VERSION, programmeVersion, exportedAt:new Date().toISOString() }, appMeta:meta, ...data };
}

export function validateImport(payload) {
  if (!payload || payload.manifest?.product !== 'proof-fitness') throw new Error('This is not a Proof Fitness export.');
  if (!Number.isInteger(payload.manifest.schemaVersion) || payload.manifest.schemaVersion > RECORD_SCHEMA_VERSION) throw new Error('This backup uses an unsupported future schema.');
  if (payload.appMeta?.id !== 'app') throw new Error('Backup is missing valid application metadata.');
  for (const table of EXPORT_TABLES) if (!Array.isArray(payload[table])) throw new Error(`Backup is missing ${table}.`);
  for (const table of EXPORT_TABLES) for (const record of payload[table]) if (!record||typeof record.id!=='string') throw new Error(`Backup contains an invalid ${table} record.`);
  for (const session of [...payload.activeWorkoutSessions,...payload.workoutSessions]) {
    try { getWorkoutTemplate(session.templateId); } catch { throw new Error(`Backup references unavailable workout template ${session.templateId}.`); }
    for (const exercise of session.exercisesSnapshot||session.workoutSnapshot?.exercises||[]) {
      try { getExercise(exercise.exerciseId); } catch { throw new Error(`Backup references unavailable exercise ${exercise.exerciseId}.`); }
    }
  }
  return true;
}

export async function replaceDatabaseFromExport(database, payload) {
  validateImport(payload);
  const tables = ['appMeta', ...EXPORT_TABLES];
  await database.transaction('rw', tables.map(name => database.table(name)), async () => {
    for (const name of tables) await database.table(name).clear();
    if (payload.appMeta) await database.appMeta.put(payload.appMeta);
    for (const name of EXPORT_TABLES) if (payload[name].length) await database.table(name).bulkPut(payload[name]);
  });
}
