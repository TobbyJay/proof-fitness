export const EquipmentWeightSource=Object.freeze({
  MEASURED:'measured',
  ESTIMATED:'estimated',
  UNKNOWN:'unknown'
});

export const EQUIPMENT_WEIGHT_SOURCES=Object.freeze(Object.values(EquipmentWeightSource));

export function isEquipmentWeightSource(value){return EQUIPMENT_WEIGHT_SOURCES.includes(value);}

export function normaliseEquipmentWeight(weight,{valueKey='weightKg',legacyValue=null,legacyKnown=undefined}={}) {
  const suppliedSource=weight?.weightSource;
  const suppliedValue=Number(weight?.[valueKey]);
  if(isEquipmentWeightSource(suppliedSource)) {
    const validValue=Number.isFinite(suppliedValue)&&suppliedValue>0;
    return {[valueKey]:suppliedSource===EquipmentWeightSource.UNKNOWN||!validValue?null:suppliedValue,weightSource:suppliedSource===EquipmentWeightSource.UNKNOWN||validValue?suppliedSource:EquipmentWeightSource.UNKNOWN};
  }
  const legacyNumber=Number(legacyValue);
  const legacyHasValue=Number.isFinite(legacyNumber)&&legacyNumber>0;
  const legacyIsKnown=legacyKnown===true||(legacyKnown===undefined&&legacyHasValue);
  return legacyIsKnown&&legacyHasValue
    ? {[valueKey]:legacyNumber,weightSource:EquipmentWeightSource.ESTIMATED}
    : {[valueKey]:null,weightSource:EquipmentWeightSource.UNKNOWN};
}

export function validateEquipmentWeight(value,source,{label='Equipment',warningThresholdKg=50,valueKey='weightKg'}={}) {
  if(!isEquipmentWeightSource(source)) throw new Error(`${label} weight source is invalid.`);
  if(source===EquipmentWeightSource.UNKNOWN) return {[valueKey]:null,weightSource:source,warning:null};
  const number=Number(value);
  if(!Number.isFinite(number)||number<=0) throw new Error(`${label} weight must be a positive number.`);
  return {[valueKey]:number,weightSource:source,warning:number>warningThresholdKg?`${label} weight looks unusually high. Check the value before saving.`:null};
}

export function combineEquipmentWeightSources(...sources) {
  if(sources.some(source=>source===EquipmentWeightSource.UNKNOWN)) return EquipmentWeightSource.UNKNOWN;
  if(sources.some(source=>source===EquipmentWeightSource.ESTIMATED)) return EquipmentWeightSource.ESTIMATED;
  return sources.length&&sources.every(source=>source===EquipmentWeightSource.MEASURED)
    ? EquipmentWeightSource.MEASURED
    : EquipmentWeightSource.UNKNOWN;
}

export function weightSourceLabel(source) {
  return source===EquipmentWeightSource.MEASURED?'Measured':source===EquipmentWeightSource.ESTIMATED?'Estimated':'Unknown';
}
