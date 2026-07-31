import Dexie from 'dexie';
import { DATABASE_NAME, DATABASE_VERSION, SCHEMA_V1 } from './schema.js';
import { migrateToVersion1 } from './migrations.js';

export class ProofFitnessDatabase extends Dexie {
  constructor(name = DATABASE_NAME, options = undefined) {
    super(name, options);
    this.version(DATABASE_VERSION).stores(SCHEMA_V1).upgrade(migrateToVersion1);
    this.on('populate',transaction=>migrateToVersion1(transaction));
  }
}

export const database = new ProofFitnessDatabase();

export async function openDatabase(db = database) {
  await db.open();
  return db;
}
