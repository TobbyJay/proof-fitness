import { timestamped } from '../migrations.js';

export function createRepository(database, tableName) {
  const table = () => database.table(tableName);
  return {
    get: id => table().get(id),
    all: () => table().toArray(),
    count: () => table().count(),
    async put(record) {
      const existing = record.id ? await table().get(record.id) : null;
      const now = new Date().toISOString();
      const value = existing
        ? { ...existing, ...record, schemaVersion:existing.schemaVersion || 1, updatedAt:now }
        : timestamped(record, now);
      await table().put(value); return value;
    },
    delete: id => table().delete(id),
    clear: () => table().clear()
  };
}
