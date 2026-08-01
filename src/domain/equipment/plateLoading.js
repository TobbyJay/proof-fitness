import { DEFAULT_EQUIPMENT } from './equipmentCatalog.js';
import { calculateBarbellLoading } from '../loading/barbellLoading.js';
import { calculateMatchedDumbbellGuidance, calculateSingleDumbbellGuidance } from '../loading/dumbbellLoading.js';
import { getNextAchievableLoad, getPreviousAchievableLoad } from '../loading/achievableLoads.js';

export function calculateSymmetricPlateLoading(totalPlateLoadKg,inventory=DEFAULT_EQUIPMENT) {
  const result=calculateBarbellLoading(totalPlateLoadKg,inventory);
  return result?{...result,mode:result.loadingMode,totalPlateLoadKg:result.plateLoadKg,perSide:result.sides.left,description:result.sides.left.length?`${result.sides.left.join(' kg + ')} kg per side`:'No removable plates'}:null;
}
export function calculateMatchedDumbbellLoading(loadPerDumbbellKg,inventory=DEFAULT_EQUIPMENT) {
  const result=calculateMatchedDumbbellGuidance(loadPerDumbbellKg,inventory);
  return result?{...result,mode:result.loadingMode,loadPerDumbbellKg,perEnd:result.leftDumbbell.sleeveA,totalPlateLoadKg:loadPerDumbbellKg*2,description:result.leftDumbbell.sleeveA.length?`${result.leftDumbbell.sleeveA.join(' kg + ')} kg on each end of both dumbbells`:'No removable plates'}:null;
}
export function calculatePlateLoading(loadKg,loadingMode,inventory=DEFAULT_EQUIPMENT) {
  if(loadingMode==='barbell-symmetric') return calculateBarbellLoading(loadKg,inventory);
  if(loadingMode==='two-dumbbells-matched') return calculateMatchedDumbbellGuidance(loadKg,inventory);
  if(loadingMode==='single-dumbbell') return calculateSingleDumbbellGuidance(loadKg,inventory);
  return null;
}
export function isAchievableLoad(loadKg,loadingMode,inventory=DEFAULT_EQUIPMENT) {
  if(['bodyweight','bodyweight-assisted','timed-bodyweight','pull-up-progression'].includes(loadingMode)) return true;
  return Boolean(calculatePlateLoading(loadKg,loadingMode,inventory));
}
export function nextAchievableLoad(currentKg,loadingMode,inventory=DEFAULT_EQUIPMENT){return getNextAchievableLoad(currentKg,loadingMode,inventory);}
export function previousAchievableLoad(currentKg,loadingMode,inventory=DEFAULT_EQUIPMENT){return getPreviousAchievableLoad(currentKg,loadingMode,inventory);}
