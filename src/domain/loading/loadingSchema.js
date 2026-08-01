export const EXTERNALLY_LOADED_MODES=Object.freeze(['barbell-symmetric','two-dumbbells-matched','single-dumbbell']);
import { EquipmentWeightSource, isEquipmentWeightSource, validateEquipmentWeight } from '../equipment/equipmentWeight.js';

export function isExternallyLoadedMode(mode){return EXTERNALLY_LOADED_MODES.includes(mode);}

export {validateEquipmentWeight};

export function validateLoadingGuidance(guidance) {
  if(!guidance||!isExternallyLoadedMode(guidance.loadingMode)) throw new Error('Loading guidance needs an externally loaded mode.');
  if(!Number.isFinite(guidance.plateLoadKg)||guidance.plateLoadKg<0) throw new Error('Loading guidance needs a non-negative plate load.');
  if(!isEquipmentWeightSource(guidance.totalLoadSource)) throw new Error('Loading guidance needs a valid total load source.');
  if(guidance.totalLoadSource===EquipmentWeightSource.UNKNOWN&&guidance.totalSystemLoadKg!==null) throw new Error('Unknown equipment mass cannot produce a total system load.');
  if(guidance.totalLoadSource!==EquipmentWeightSource.UNKNOWN&&(!Number.isFinite(guidance.totalSystemLoadKg)||guidance.totalSystemLoadKg<=0)) throw new Error('Known assembled load is invalid.');
  const expectedCollars=guidance.loadingMode==='two-dumbbells-matched'?4:2;
  if(guidance.collarsUsed!==expectedCollars) throw new Error(`Loading guidance must use exactly ${expectedCollars} collars.`);
  return true;
}
