import { deepFreeze } from '../shared.js';
import { EquipmentWeightSource, normaliseEquipmentWeight } from './equipmentWeight.js';

export const DEFAULT_EQUIPMENT = deepFreeze({
  version: 3,
  plates: { '0.5': 6, '1.25': 6, '2.5': 4, '5': 4 },
  removablePlateLoadKg: 40.5,
  dumbbellHandles: 2,
  dumbbellHandle:{count:2,weight:{weightKgEach:null,weightSource:EquipmentWeightSource.UNKNOWN}},
  barbell: { count: 1, owned:true, lengthCm: 152, construction: 'two-piece-spin-lock', weight:{weightKg:null,weightSource:EquipmentWeightSource.UNKNOWN} },
  collars:{count:6,weight:{weightKgEach:null,weightSource:EquipmentWeightSource.UNKNOWN}},
  pullUpBarStatus: 'owned-not-installed',
  pullUpSafetyConfirmed: false,
  emptyBarbellKg: null,
  emptyDumbbellHandleKg: null
});

// Reference data for the configured style of set. It is deliberately not the generic default.
export const STANDARD_SPIN_LOCK_ESTIMATES=deepFreeze({
  profileId:'configuration-b-152cm-spin-lock',
  barbellBody:{weightKg:5,weightSource:EquipmentWeightSource.ESTIMATED},
  dumbbellHandle:{weightKgEach:1,weightSource:EquipmentWeightSource.ESTIMATED},
  collar:{weightKgEach:0.5,weightSource:EquipmentWeightSource.ESTIMATED},
  removablePlateLoadKg:40.5
});

export function normaliseEquipment(equipment={}) {
  const barLegacy=Number(equipment.emptyBarbellKg);
  const dumbbellLegacy=Number(equipment.emptyDumbbellHandleKg);
  const barWeight=normaliseEquipmentWeight(equipment.barbell?.weight,{legacyValue:equipment.barbell?.tareWeightKg??barLegacy,legacyKnown:equipment.barbell?.tareWeightKnown});
  const dumbbellWeight=normaliseEquipmentWeight(equipment.dumbbellHandle?.weight,{valueKey:'weightKgEach',legacyValue:equipment.dumbbellHandle?.tareWeightKgEach??dumbbellLegacy,legacyKnown:equipment.dumbbellHandle?.tareWeightKnown});
  const collarRecord=typeof equipment.collars==='object'?equipment.collars:{};
  const collarWeight=normaliseEquipmentWeight(collarRecord.weight,{valueKey:'weightKgEach'});
  const collarCount=Number.isInteger(Number(collarRecord.count??equipment.collars))&&Number(collarRecord.count??equipment.collars)>=0?Number(collarRecord.count??equipment.collars):DEFAULT_EQUIPMENT.collars.count;
  const {tareWeightKnown:_barKnown,tareWeightKg:_barTare,...barbell}=equipment.barbell||{};
  const {tareWeightKnown:_handleKnown,tareWeightKgEach:_handleTare,...dumbbellHandle}=equipment.dumbbellHandle||{};
  return {
    ...DEFAULT_EQUIPMENT,...equipment,plates:{...DEFAULT_EQUIPMENT.plates,...equipment.plates},
    version:3,
    barbell:{...DEFAULT_EQUIPMENT.barbell,...barbell,weight:barWeight},
    dumbbellHandle:{...DEFAULT_EQUIPMENT.dumbbellHandle,...dumbbellHandle,weight:dumbbellWeight},
    collars:{count:collarCount,weight:collarWeight},
    emptyBarbellKg:null,emptyDumbbellHandleKg:null
  };
}

export const PULL_UP_BAR_STATES = Object.freeze([
  'not-owned', 'owned-not-installed', 'installed-available', 'temporarily-unavailable'
]);

export function pullUpAvailable(equipment = DEFAULT_EQUIPMENT) {
  return equipment.pullUpBarStatus === 'installed-available' && equipment.pullUpSafetyConfirmed === true;
}
