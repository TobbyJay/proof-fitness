import { deepFreeze } from '../shared.js';

export const DEFAULT_EQUIPMENT = deepFreeze({
  version: 1,
  plates: { '0.5': 6, '1.25': 6, '2.5': 4, '5': 4 },
  removablePlateLoadKg: 40.5,
  dumbbellHandles: 2,
  barbell: { count: 1, lengthCm: 152, construction: 'two-piece-spin-lock' },
  collars: 6,
  pullUpBarStatus: 'owned-not-installed',
  pullUpSafetyConfirmed: false,
  emptyBarbellKg: null,
  emptyDumbbellHandleKg: null
});

export const PULL_UP_BAR_STATES = Object.freeze([
  'not-owned', 'owned-not-installed', 'installed-available', 'temporarily-unavailable'
]);

export function pullUpAvailable(equipment = DEFAULT_EQUIPMENT) {
  return equipment.pullUpBarStatus === 'installed-available' && equipment.pullUpSafetyConfirmed === true;
}
