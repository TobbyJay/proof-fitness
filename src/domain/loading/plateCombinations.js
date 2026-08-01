import { PLATE_DENOMINATIONS_KG, normalisePlateInventory, plateInventoryKey } from './plateInventory.js';

const UNIT=0.25;
const cache=new Map();
const toUnits=value=>Math.round(value/UNIT);
const toKg=units=>units*UNIT;

// Plates are always returned largest-first: closest to the bar/handle first.
export function enumerateIdenticalSleeveLoads(inventory, sleeveCount) {
  if(!Number.isInteger(sleeveCount)||sleeveCount<1) throw new Error('Sleeve count must be a positive integer.');
  const key=`${plateInventoryKey(inventory)}|${sleeveCount}`;
  if(cache.has(key)) return cache.get(key);
  const normalised=normalisePlateInventory(inventory);
  const limits=PLATE_DENOMINATIONS_KG.map(size=>Math.floor(normalised.plates[String(size)]/sleeveCount));
  const bestByUnits=new Map();
  function visit(index,counts) {
    if(index===PLATE_DENOMINATIONS_KG.length) {
      const units=counts.reduce((sum,count,i)=>sum+count*toUnits(PLATE_DENOMINATIONS_KG[i]),0);
      const plateCount=counts.reduce((sum,count)=>sum+count,0);
      const previous=bestByUnits.get(units);
      if(!previous||plateCount<previous.plateCount) {
        const plates=PLATE_DENOMINATIONS_KG.flatMap((size,i)=>Array(counts[i]).fill(size));
        bestByUnits.set(units,Object.freeze({perSleeveKg:toKg(units),plates:Object.freeze(plates),plateCount}));
      }
      return;
    }
    for(let count=0;count<=limits[index];count+=1) visit(index+1,[...counts,count]);
  }
  visit(0,[]);
  const result=Object.freeze([...bestByUnits.values()].sort((a,b)=>a.perSleeveKg-b.perSleeveKg));
  cache.set(key,result); return result;
}

export function findIdenticalSleeveLoad(targetPerSleeveKg,inventory,sleeveCount) {
  if(!Number.isFinite(targetPerSleeveKg)||targetPerSleeveKg<0) return null;
  return enumerateIdenticalSleeveLoads(inventory,sleeveCount).find(item=>Math.abs(item.perSleeveKg-targetPerSleeveKg)<1e-9)||null;
}

export function clearPlateCombinationCache() { cache.clear(); }
