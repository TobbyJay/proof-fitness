import { findIdenticalSleeveLoad } from './plateCombinations.js';
import { inventoryCanSupply } from './plateInventory.js';
import { validateLoadingGuidance } from './loadingSchema.js';
import { combineEquipmentWeightSources, normaliseEquipmentWeight } from '../equipment/equipmentWeight.js';

export function getBarbellMass(equipment) {
  const body=normaliseEquipmentWeight(equipment?.barbell?.weight,{legacyValue:equipment?.barbell?.tareWeightKg??equipment?.emptyBarbellKg,legacyKnown:equipment?.barbell?.tareWeightKnown});
  const collar=normaliseEquipmentWeight(equipment?.collars?.weight,{valueKey:'weightKgEach'});
  return {barbellBodyWeightKg:body.weightKg,barbellBodyWeightSource:body.weightSource,collarWeightKgEach:collar.weightKgEach,collarWeightSource:collar.weightSource};
}

export function calculateBarbellLoading(plateLoadKg,inventory) {
  if(!Number.isFinite(plateLoadKg)||plateLoadKg<0) return null;
  const combination=findIdenticalSleeveLoad(plateLoadKg/2,inventory,2);
  if(!combination) return null;
  const stack=[...combination.plates];
  if(!inventoryCanSupply(inventory,[stack,stack])) return null;
  if(Number(inventory?.collars?.count??inventory?.collars??0)<2) return null;
  const mass=getBarbellMass(inventory); const totalLoadSource=combineEquipmentWeightSources(mass.barbellBodyWeightSource,mass.collarWeightSource);
  const collarWeightKgTotal=mass.collarWeightKgEach===null?null:mass.collarWeightKgEach*2;
  const result={
    loadingMode:'barbell-symmetric',plateLoadKg,plateLoadPerSideKg:plateLoadKg/2,
    sides:{left:[...stack],right:[...stack]},plateConfiguration:{left:[...stack],right:[...stack]},
    ...mass,collarsUsed:2,collarWeightKgTotal,totalLoadSource,
    totalSystemLoadKg:totalLoadSource==='unknown'?null:mass.barbellBodyWeightKg+collarWeightKgTotal+plateLoadKg
  };
  validateLoadingGuidance(result); return result;
}
