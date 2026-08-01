import { RECORD_SCHEMA_VERSION } from './schema.js';
import { normaliseEquipment } from '../domain/equipment/equipmentCatalog.js';
import { createRunProgressionState, PRIMARY_RUNNING_STATE_ID } from '../domain/running/runProgram.js';
import { normaliseLegacyRunSession } from '../domain/running/runEvidence.js';

export function timestamped(record, now = new Date().toISOString()) {
  return { schemaVersion:RECORD_SCHEMA_VERSION, createdAt:now, updatedAt:now, ...record };
}

export async function migrateToVersion1(transaction) {
  const now = new Date().toISOString();
  const meta = transaction.table('appMeta');
  if (!await meta.get('app')) {
    await meta.put(timestamped({
      id:'app', onboardingCompletedAt:null, programmeStartedAt:null,
      activeProgrammeStateId:null, databaseCreatedAt:now, onboardingDraft:null,
      completedMigrations:[1]
    }, now));
  }
  await transaction.table('auditEvents').put(timestamped({ id:`migration-1-${now}`, type:'migration-completed', migrationVersion:1 }, now));
}

export async function migrateToVersion2(transaction) {
  const now=new Date().toISOString(); const equipmentTable=transaction.table('equipment');
  await equipmentTable.toCollection().modify(record=>{
    const legacyBar=Number(record.emptyBarbellKg); const legacyDumbbell=Number(record.emptyDumbbellHandleKg);
    const barKg=Number(record.barbell?.tareWeightKg??legacyBar); const dumbbellKg=Number(record.dumbbellHandle?.tareWeightKgEach??legacyDumbbell);
    const barKnown=record.barbell?.tareWeightKnown===true||(record.barbell?.tareWeightKnown===undefined&&barKg>0);
    const dumbbellKnown=record.dumbbellHandle?.tareWeightKnown===true||(record.dumbbellHandle?.tareWeightKnown===undefined&&dumbbellKg>0);
    record.barbell={count:1,owned:true,lengthCm:152,construction:'two-piece-spin-lock',...record.barbell,tareWeightKnown:barKnown,tareWeightKg:barKnown?barKg:null};
    record.dumbbellHandle={count:record.dumbbellHandles||2,...record.dumbbellHandle,tareWeightKnown:dumbbellKnown,tareWeightKgEach:dumbbellKnown?dumbbellKg:null};
    record.emptyBarbellKg=barKnown?barKg:null; record.emptyDumbbellHandleKg=dumbbellKnown?dumbbellKg:null;
    record.schemaVersion=2; record.updatedAt=now;
  });
  const progression=transaction.table('exerciseProgressionStates');
  await progression.toCollection().modify(record=>{
    if(typeof record.currentWorkingLoad==='number') record.currentWorkingLoad={loadingMode:record.loadingMode||null,plateLoadKg:record.currentWorkingLoad};
    record.performances=record.performances||[]; record.decisions=record.decisions||[]; record.schemaVersion=2; record.updatedAt=now;
  });
  const meta=transaction.table('appMeta'); const app=await meta.get('app');
  if(app) await meta.put({...app,completedMigrations:[...new Set([...(app.completedMigrations||[1]),2])],updatedAt:now,schemaVersion:2});
  await transaction.table('auditEvents').put(timestamped({id:`migration-2-${now}`,type:'migration-completed',migrationVersion:2},now));
}

export async function migrateToVersion3(transaction) {
  const now=new Date().toISOString(); const equipmentTable=transaction.table('equipment');
  await equipmentTable.toCollection().modify(record=>{
    const normalised=normaliseEquipment(record);
    Object.assign(record,normalised,{schemaVersion:3,updatedAt:now});
  });
  for(const tableName of ['activeWorkoutSessions','workoutSessions']) await transaction.table(tableName).toCollection().modify(record=>{
    // Historical loading snapshots stay byte-for-byte meaningful; old totals are not recalculated.
    record.schemaVersion=3;
  });
  const meta=transaction.table('appMeta'); const app=await meta.get('app');
  if(app) await meta.put({...app,completedMigrations:[...new Set([...(app.completedMigrations||[1,2]),3])],updatedAt:now,schemaVersion:3});
  await transaction.table('auditEvents').put(timestamped({id:`migration-3-${now}`,type:'migration-completed',migrationVersion:3,legacyKnownWeightPolicy:'estimated'},now));
}

export async function migrateToVersion4(transaction) {
  const now=new Date().toISOString();
  await transaction.table('runSessions').toCollection().modify(record=>Object.assign(record,normaliseLegacyRunSession(record),{schemaVersion:4,updatedAt:record.updatedAt||now}));
  const running=transaction.table('runProgressionStates');
  if(!await running.get(PRIMARY_RUNNING_STATE_ID))await running.put({...createRunProgressionState(now),schemaVersion:4});
  const meta=transaction.table('appMeta'); const app=await meta.get('app');
  if(app)await meta.put({...app,completedMigrations:[...new Set([...(app.completedMigrations||[1,2,3]),4])],updatedAt:now,schemaVersion:4});
  await transaction.table('auditEvents').put(timestamped({id:`migration-4-${now}`,type:'migration-completed',migrationVersion:4,legacyRunPolicy:'unambiguous starter-run mapped to run-walk-stage-01; effort remains null'},now));
}
