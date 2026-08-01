import Dexie from 'dexie';
import { DATABASE_NAME, SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4 } from './schema.js';
import { migrateToVersion1, migrateToVersion2, migrateToVersion3, migrateToVersion4 } from './migrations.js';

export class ProofFitnessDatabase extends Dexie {
  constructor(name = DATABASE_NAME, options = undefined) {
    super(name, options);
    this.version(1).stores(SCHEMA_V1).upgrade(migrateToVersion1);
    this.version(2).stores(SCHEMA_V2).upgrade(migrateToVersion2);
    this.version(3).stores(SCHEMA_V3).upgrade(migrateToVersion3);
    this.version(4).stores(SCHEMA_V4).upgrade(migrateToVersion4);
    this.on('populate',async transaction=>{await migrateToVersion1(transaction);await migrateToVersion2(transaction);await migrateToVersion3(transaction);await migrateToVersion4(transaction);});
  }
}

export const database = new ProofFitnessDatabase();

export async function openDatabase(db = database) {
  await db.open();
  return db;
}
