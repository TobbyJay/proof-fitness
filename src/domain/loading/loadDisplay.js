import { EquipmentWeightSource, weightSourceLabel } from '../equipment/equipmentWeight.js';

const nf=new Intl.NumberFormat('en-GB',{maximumFractionDigits:2});
export const formatKg=value=>`${nf.format(value)} kg`;
export const formatPlateStack=plates=>plates.length?plates.map(plate=>formatKg(plate)).join(' + '):'No removable plates';

function sourceFor(guidance){
  if(guidance.totalLoadSource) return guidance.totalLoadSource;
  return guidance.tareWeightKnown===true?EquipmentWeightSource.ESTIMATED:EquipmentWeightSource.UNKNOWN;
}

function estimated(value,source){return `${source===EquipmentWeightSource.ESTIMATED?'~':''}${formatKg(value)}`;}

export function describeLoading(guidance) {
  if(!guidance) return {headline:'Load not selected',detail:'Choose an achievable calibration load.'};
  const source=sourceFor(guidance); const sourceLabel=weightSourceLabel(source);
  if(guidance.loadingMode==='barbell-symmetric') {
    if(source===EquipmentWeightSource.UNKNOWN) return {headline:`${formatKg(guidance.plateLoadKg)} plates + bar and collars`,detail:`${formatKg(guidance.plateLoadPerSideKg)} plates per side; equipment mass is unknown.`,sourceLabel};
    const body=guidance.barbellBodyWeightKg??guidance.tareWeightKg; const collars=guidance.collarWeightKgTotal;
    return {headline:`${source===EquipmentWeightSource.ESTIMATED?'Estimated total · ':''}${formatKg(guidance.totalSystemLoadKg)}`,detail:collars==null?`${formatKg(guidance.plateLoadKg)} plates + ${estimated(body,source)} bar`:`${formatKg(guidance.plateLoadKg)} plates + ${estimated(body,guidance.barbellBodyWeightSource)} bar + ${estimated(collars,guidance.collarWeightSource)} collars`,sourceLabel};
  }
  if(guidance.loadingMode==='two-dumbbells-matched') {
    if(source===EquipmentWeightSource.UNKNOWN) return {headline:`${formatKg(guidance.plateLoadKgEach)} plates each + handle and collars`,detail:'Exact sleeve instructions remain available; equipment mass is unknown.',sourceLabel};
    const handle=guidance.handleWeightKgEach??guidance.tareWeightKg; const collars=guidance.collarWeightKgPerDumbbell;
    return {headline:`${source===EquipmentWeightSource.ESTIMATED?'Estimated · ':''}${formatKg(guidance.totalLoadKgEach)} each`,detail:collars==null?`${formatKg(guidance.totalPairLoadKg)} ${source===EquipmentWeightSource.ESTIMATED?'estimated ':''}pair load · ${formatKg(guidance.plateLoadKgEach)} plates + ${estimated(handle,source)} handle each`:`${formatKg(guidance.totalPairLoadKg)} ${source===EquipmentWeightSource.ESTIMATED?'estimated ':''}pair load · ${formatKg(guidance.plateLoadKgEach)} plates + ${estimated(handle,guidance.handleWeightSource)} handle + ${estimated(collars,guidance.collarWeightSource)} collars each`,sourceLabel};
  }
  if(source===EquipmentWeightSource.UNKNOWN) return {headline:`${formatKg(guidance.plateLoadKg)} plates + handle and collars`,detail:'Exact sleeve instructions remain available; equipment mass is unknown.',sourceLabel};
  const handle=guidance.handleWeightKgEach??guidance.tareWeightKg; const collars=guidance.collarWeightKgTotal;
  return {headline:`${source===EquipmentWeightSource.ESTIMATED?'Estimated total · ':''}${formatKg(guidance.totalLoadKg)}`,detail:collars==null?`${formatKg(guidance.plateLoadKg)} plates + ${estimated(handle,source)} handle`:`${formatKg(guidance.plateLoadKg)} plates + ${estimated(handle,guidance.handleWeightSource)} handle + ${estimated(collars,guidance.collarWeightSource)} collars`,sourceLabel};
}

export function plateStacksForDisplay(guidance) {
  if(!guidance) return [];
  if(guidance.loadingMode==='barbell-symmetric') return [{label:'Left',plates:guidance.sides.left},{label:'Right',plates:guidance.sides.right}];
  if(guidance.loadingMode==='two-dumbbells-matched') return [
    {label:'Dumbbell 1 · sleeve A',plates:guidance.leftDumbbell.sleeveA},{label:'Dumbbell 1 · sleeve B',plates:guidance.leftDumbbell.sleeveB},
    {label:'Dumbbell 2 · sleeve A',plates:guidance.rightDumbbell.sleeveA},{label:'Dumbbell 2 · sleeve B',plates:guidance.rightDumbbell.sleeveB}
  ];
  return [{label:'Sleeve A',plates:guidance.dumbbell.sleeveA},{label:'Sleeve B',plates:guidance.dumbbell.sleeveB}];
}
