import { enumerateIdenticalSleeveLoads } from './plateCombinations.js';

function unique(values){return Object.freeze([...new Set(values.map(value=>Math.round(value*100)/100))].sort((a,b)=>a-b));}
export function getAchievableBarbellLoads(inventory){return unique(enumerateIdenticalSleeveLoads(inventory,2).map(item=>item.perSleeveKg*2));}
export function getAchievableMatchedDumbbellLoads(inventory){return unique(enumerateIdenticalSleeveLoads(inventory,4).map(item=>item.perSleeveKg*2));}
export function getAchievableSingleDumbbellLoads(inventory){return unique(enumerateIdenticalSleeveLoads(inventory,2).map(item=>item.perSleeveKg*2));}
export function getAchievableLoads(mode,inventory){
  if(mode==='barbell-symmetric') return getAchievableBarbellLoads(inventory);
  if(mode==='two-dumbbells-matched') return getAchievableMatchedDumbbellLoads(inventory);
  if(mode==='single-dumbbell') return getAchievableSingleDumbbellLoads(inventory);
  return Object.freeze([]);
}
export function getNextAchievableLoad(currentLoad,mode,inventory){return getAchievableLoads(mode,inventory).find(load=>load>currentLoad+1e-9)??null;}
export function getPreviousAchievableLoad(currentLoad,mode,inventory){return [...getAchievableLoads(mode,inventory)].reverse().find(load=>load<currentLoad-1e-9)??null;}
export function getConservativeCalibrationLoad(mode,inventory,{allowZero=false}={}){
  const loads=getAchievableLoads(mode,inventory);
  return loads.find(load=>allowZero?load>=0:load>0)??null;
}
