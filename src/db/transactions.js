import { createProgrammeState } from '../domain/programmes/createProgrammeState.js';
import { EXPORT_TABLES, RECORD_SCHEMA_VERSION } from './schema.js';
import { timestamped } from './migrations.js';
import { getWorkoutTemplate } from '../domain/programmes/programmeCatalog.js';
import { getExercise } from '../domain/exercises/exerciseCatalog.js';
import { normaliseEquipment } from '../domain/equipment/equipmentCatalog.js';
import { isEquipmentWeightSource } from '../domain/equipment/equipmentWeight.js';
import { createRunProgressionState, PRIMARY_RUNNING_STATE_ID } from '../domain/running/runProgram.js';
import { evaluateRunProgression } from '../domain/running/runProgression.js';
import { isRunEffortResult, normaliseLegacyRunSession, runCompletionAt } from '../domain/running/runEvidence.js';
import { getRunTemplate } from '../domain/running/runTemplates.js';
import { runningFrequencyForProgramme } from '../domain/running/runScheduling.js';

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
  await database.transaction('rw', database.appMeta, database.userProfile, database.preferences, database.equipment, database.programmeStates, database.programmeTransitions, database.measurements, database.runProgressionStates, database.auditEvents, async () => {
    await database.userProfile.put(timestamped({ id:'profile', ...input.profile }, now));
    await database.preferences.put(timestamped({ id:'preferences', ...input.preferences }, now));
    await database.equipment.put(timestamped({ id:'equipment', ...input.equipment }, now));
    await database.programmeStates.put(programme);
    await database.programmeTransitions.put(timestamped({id:newId('transition'),programmeStateId:programmeId,fromPhase:null,toPhase:'foundation',fromScheduleMode:null,toScheduleMode:'foundation-three-day',fromTemplateSetId:null,fromTemplateSetVersion:null,toTemplateSetId:'foundation-three-day',toTemplateSetVersion:1,reviewId:null,reason:'onboarding-completed',initiatedBy:'user',effectiveLocalDate:input.localDate||localDate()},now));
    for (const measurement of input.measurements || []) await database.measurements.put(timestamped({ id:newId('measurement'), ...measurement }, now));
    if(!await database.runProgressionStates.get(PRIMARY_RUNNING_STATE_ID))await database.runProgressionStates.put(timestamped(createRunProgressionState(now),now));
    const meta = await database.appMeta.get('app');
    await database.appMeta.put({ ...meta, onboardingDraft:null, onboardingCompletedAt:now, programmeStartedAt:now, activeProgrammeStateId:programmeId, updatedAt:now });
    await database.auditEvents.put(timestamped({ id:newId('audit'), type:'onboarding-completed' }, now));
  });
  return programme;
}

export async function completeRunEvidenceTransaction(database,sessionPatch,programmeState=null){
  const now=new Date().toISOString();
  return database.transaction('rw',database.runSessions,database.runProgressionStates,database.auditEvents,async()=>{
    const existing=await database.runSessions.get(sessionPatch.id);if(!existing)throw new Error('Run session could not be found.');
    const currentProgression=await database.runProgressionStates.get(PRIMARY_RUNNING_STATE_ID)||timestamped(createRunProgressionState(now),now);
    if(existing.evidenceFinalizedAt)return {session:existing,progression:currentProgression};
    if(!isRunEffortResult(sessionPatch.effortResult))throw new Error('Run effort result is invalid.');
    const template=getRunTemplate(existing.runTemplateId||existing.templateId);const derived=runCompletionAt(template,sessionPatch.completedDurationSeconds);
    if(sessionPatch.status!==derived.status)throw new Error('Run completion status does not match the completed template evidence.');
    const session={...existing,...sessionPatch,evidenceFinalizedAt:now,updatedAt:now,schemaVersion:RECORD_SCHEMA_VERSION};
    await database.runSessions.put(session);
    const sessions=await database.runSessions.toArray();
    const progression={...evaluateRunProgression(currentProgression,sessions,{programme:programmeState,now}),schemaVersion:RECORD_SCHEMA_VERSION};
    await database.runProgressionStates.put(progression);
    await database.auditEvents.put(timestamped({id:newId('audit'),type:`run-${session.status}`,entityId:session.id,runStageId:session.stageId,effortResult:session.effortResult},now));
    return {session,progression};
  });
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
  const tables=[database.programmeStates,database.runProgressionStates,database.auditEvents];
  if(review) tables.push(database.programmeReviews);
  if(transition) tables.push(database.programmeTransitions);
  await database.transaction('rw',tables,async()=>{
    if(review) await database.programmeReviews.put({ ...timestamped(review,review.createdAt||now),updatedAt:now });
    if(transition) await database.programmeTransitions.put({ ...timestamped(transition,transition.createdAt||now),updatedAt:now });
    await database.programmeStates.put({ ...programmeState,updatedAt:now });
    const running=await database.runProgressionStates.get(PRIMARY_RUNNING_STATE_ID);
    if(running){const frequency=runningFrequencyForProgramme(programmeState,running);await database.runProgressionStates.put({...running,frequencyIntent:frequency.intent,updatedAt:now});}
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
  for (const table of EXPORT_TABLES) if (!Array.isArray(payload[table])&&!(table==='runProgressionStates'&&payload.manifest.schemaVersion<4)) throw new Error(`Backup is missing ${table}.`);
  for (const table of EXPORT_TABLES) for (const record of payload[table]||[]) if (!record||typeof record.id!=='string') throw new Error(`Backup contains an invalid ${table} record.`);
  for(const equipment of payload.equipment) for(const source of [equipment.barbell?.weight?.weightSource,equipment.dumbbellHandle?.weight?.weightSource,equipment.collars?.weight?.weightSource].filter(value=>value!==undefined)) if(!isEquipmentWeightSource(source)) throw new Error('Backup contains an invalid equipment weight source.');
  for (const session of [...payload.activeWorkoutSessions,...payload.workoutSessions]) {
    try { getWorkoutTemplate(session.templateId); } catch { throw new Error(`Backup references unavailable workout template ${session.templateId}.`); }
    for (const exercise of session.exercisesSnapshot||session.workoutSnapshot?.exercises||[]) {
      try { getExercise(exercise.exerciseId); } catch { throw new Error(`Backup references unavailable exercise ${exercise.exerciseId}.`); }
      const guidance=exercise.loadingGuidanceSnapshot||exercise.loadSnapshot;
      for(const source of [guidance?.barbellBodyWeightSource,guidance?.handleWeightSource,guidance?.collarWeightSource,guidance?.totalLoadSource].filter(value=>value!==undefined)) if(!isEquipmentWeightSource(source)) throw new Error('Backup contains an invalid loading weight source.');
    }
  }
  for(const run of payload.runSessions){const templateId=run.runTemplateId||run.templateId;if(templateId){try{getRunTemplate(templateId);}catch{throw new Error(`Backup references unavailable run template ${templateId}.`);}}else if(payload.manifest.schemaVersion>=4&&run.migrationStatus!=='unknown-legacy-run-template')throw new Error('Backup contains a run with no resolvable template.');if(run.effortResult!==undefined&&run.effortResult!==null&&!isRunEffortResult(run.effortResult))throw new Error('Backup contains an invalid run effort result.');}
  return true;
}

export async function replaceDatabaseFromExport(database, payload) {
  validateImport(payload);
  const upgraded={...payload,runProgressionStates:payload.runProgressionStates||[]};
  const tables = ['appMeta', ...EXPORT_TABLES];
  await database.transaction('rw', tables.map(name => database.table(name)), async () => {
    for (const name of tables) await database.table(name).clear();
    if (upgraded.appMeta) await database.appMeta.put({...upgraded.appMeta,schemaVersion:RECORD_SCHEMA_VERSION,completedMigrations:[...new Set([...(upgraded.appMeta.completedMigrations||[]),1,2,3,4])]});
    for (const name of EXPORT_TABLES) if (upgraded[name].length) {
      let records=upgraded[name];
      if(name==='equipment') records=records.map(record=>({...normaliseEquipment(record),id:record.id,createdAt:record.createdAt,updatedAt:record.updatedAt,schemaVersion:RECORD_SCHEMA_VERSION}));
      if(name==='exerciseProgressionStates') records=records.map(record=>{
        const loadingMode=record.loadingMode||getExercise(record.exerciseId).loadingMode;
        const currentWorkingLoad=typeof record.currentWorkingLoad==='number'?{loadingMode,plateLoadKg:record.currentWorkingLoad}:record.currentWorkingLoad;
        return {...record,loadingMode,currentWorkingLoad,performances:record.performances||[],decisions:record.decisions||[],schemaVersion:RECORD_SCHEMA_VERSION};
      });
      if(name==='runSessions')records=records.map(record=>({...normaliseLegacyRunSession(record),schemaVersion:RECORD_SCHEMA_VERSION}));
      await database.table(name).bulkPut(records);
    }
    if(!upgraded.runProgressionStates.length)await database.runProgressionStates.put(timestamped(createRunProgressionState(),new Date().toISOString()));
  });
}
