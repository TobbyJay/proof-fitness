import { RECORD_SCHEMA_VERSION } from './schema.js';

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
