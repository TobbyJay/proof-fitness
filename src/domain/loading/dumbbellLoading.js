import { findIdenticalSleeveLoad } from './plateCombinations.js';
import { inventoryCanSupply } from './plateInventory.js';
import { validateLoadingGuidance } from './loadingSchema.js';
import { combineEquipmentWeightSources, normaliseEquipmentWeight } from '../equipment/equipmentWeight.js';

export function getDumbbellMass(equipment) {
  const handle=normaliseEquipmentWeight(equipment?.dumbbellHandle?.weight,{valueKey:'weightKgEach',legacyValue:equipment?.dumbbellHandle?.tareWeightKgEach??equipment?.emptyDumbbellHandleKg,legacyKnown:equipment?.dumbbellHandle?.tareWeightKnown});
  const collar=normaliseEquipmentWeight(equipment?.collars?.weight,{valueKey:'weightKgEach'});
  return {handleWeightKgEach:handle.weightKgEach,handleWeightSource:handle.weightSource,collarWeightKgEach:collar.weightKgEach,collarWeightSource:collar.weightSource};
}

function handle(stack){return {sleeveA:[...stack],sleeveB:[...stack]};}

export function calculateMatchedDumbbellGuidance(plateLoadKgEach,inventory) {
  if(!Number.isFinite(plateLoadKgEach)||plateLoadKgEach<0) return null;
  const combination=findIdenticalSleeveLoad(plateLoadKgEach/2,inventory,4);
  if(!combination) return null;
  const stack=[...combination.plates];
  if(!inventoryCanSupply(inventory,[stack,stack,stack,stack])) return null;
  if(Number(inventory?.collars?.count??inventory?.collars??0)<4) return null;
  const mass=getDumbbellMass(inventory); const totalLoadSource=combineEquipmentWeightSources(mass.handleWeightSource,mass.collarWeightSource);
  const collarWeightKgPerDumbbell=mass.collarWeightKgEach===null?null:mass.collarWeightKgEach*2;
  const collarWeightKgTotal=mass.collarWeightKgEach===null?null:mass.collarWeightKgEach*4;
  const totalEach=totalLoadSource==='unknown'?null:mass.handleWeightKgEach+collarWeightKgPerDumbbell+plateLoadKgEach;
  const result={
    loadingMode:'two-dumbbells-matched',plateLoadKg:plateLoadKgEach*2,plateLoadKgEach,
    plateLoadPerSleeveKg:plateLoadKgEach/2,leftDumbbell:handle(stack),rightDumbbell:handle(stack),
    plateConfiguration:{leftDumbbell:handle(stack),rightDumbbell:handle(stack)},
    ...mass,collarsUsed:4,collarsUsedPerDumbbell:2,collarWeightKgPerDumbbell,collarWeightKgTotal,totalLoadSource,
    totalSystemLoadKg:totalEach===null?null:totalEach*2,totalLoadKgEach:totalEach,totalPairLoadKg:totalEach===null?null:totalEach*2
  };
  validateLoadingGuidance(result); return result;
}

export function calculateSingleDumbbellGuidance(plateLoadKg,inventory) {
  if(!Number.isFinite(plateLoadKg)||plateLoadKg<0) return null;
  const combination=findIdenticalSleeveLoad(plateLoadKg/2,inventory,2);
  if(!combination) return null;
  const stack=[...combination.plates];
  if(!inventoryCanSupply(inventory,[stack,stack])) return null;
  if(Number(inventory?.collars?.count??inventory?.collars??0)<2) return null;
  const mass=getDumbbellMass(inventory); const totalLoadSource=combineEquipmentWeightSources(mass.handleWeightSource,mass.collarWeightSource);
  const collarWeightKgTotal=mass.collarWeightKgEach===null?null:mass.collarWeightKgEach*2;
  const result={
    loadingMode:'single-dumbbell',plateLoadKg,plateLoadPerSleeveKg:plateLoadKg/2,
    dumbbell:handle(stack),plateConfiguration:{dumbbell:handle(stack)},
    ...mass,collarsUsed:2,collarWeightKgTotal,totalLoadSource,
    totalSystemLoadKg:totalLoadSource==='unknown'?null:mass.handleWeightKgEach+collarWeightKgTotal+plateLoadKg,totalLoadKg:totalLoadSource==='unknown'?null:mass.handleWeightKgEach+collarWeightKgTotal+plateLoadKg
  };
  validateLoadingGuidance(result); return result;
}
