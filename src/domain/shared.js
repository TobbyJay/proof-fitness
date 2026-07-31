export function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

export function assertPositiveVersion(record, label = 'record') {
  if (!Number.isInteger(record?.version) || record.version < 1) {
    throw new Error(`${label} ${record?.id || '(unknown)'} must have a positive integer version.`);
  }
}
