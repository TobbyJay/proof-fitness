import { getExercise } from '../exercises/exerciseCatalog.js';
import { isExternallyLoadedMode } from '../loading/loadingSchema.js';
import { getNextAchievableLoad, getPreviousAchievableLoad } from '../loading/achievableLoads.js';
import { calculatePlateLoading } from '../equipment/plateLoading.js';

const ACCESSORY_PATTERNS=new Set(['elbow-flexion','elbow-extension','shoulder-abduction','calf-raise']);

export function parseRepRange(target='') {
  if(target&&typeof target==='object'&&('min' in target||'max' in target)) return {min:target.min??null,max:target.max??target.min??null,unit:target.unit||'reps'};
  const text=String(target); const numbers=/^controlled reps/i.test(text)?[]:text.match(/\d+(?:\.\d+)?/g)?.map(Number)||[];
  const unit=/rep/i.test(target)?'reps':/second|sec/i.test(target)?'seconds':'reps';
  if(!numbers.length) return {min:null,max:null,unit};
  return {min:numbers[0],max:numbers[1]??numbers[0],unit};
}

export function canonicalWorkingLoad(load,loadingMode) {
  if(load==null) return null;
  if(typeof load==='number') return {loadingMode,plateLoadKg:load};
  const plateLoadKg=Number(load.plateLoadKg??load.loadKg);
  return Number.isFinite(plateLoadKg)?{loadingMode:load.loadingMode||loadingMode,plateLoadKg}:null;
}

function plateLoadOf(value){return typeof value==='number'?value:Number(value?.plateLoadKg??value?.loadKg);}
function sameLoad(a,b){return Number.isFinite(plateLoadOf(a))&&Math.abs(plateLoadOf(a)-plateLoadOf(b))<1e-9;}
function concerning(item){return item.discomfortFlag===true||item.discomfortFlag==='concerning'||item.formConfidence==='breakdown';}
function poor(item){return item.calibrationResponse==='too-heavy'||['Missed repetitions or sets','Stopped early'].includes(item.sessionResult)||item.formConfidence==='breakdown';}
function hitTop(item,max,sets){
  if(item.hitTopOfRange===true) return item.controlled!==false&&!concerning(item);
  const values=(item.sets||[]).map(set=>Number(set.reps??set.durationSeconds)).filter(Number.isFinite);
  return values.length>=sets&&max!=null&&values.slice(0,sets).every(value=>value>=max)&&item.formConfidence!=='low'&&item.controlled!==false&&!concerning(item)&&!['Missed repetitions or sets','Stopped early'].includes(item.sessionResult);
}

export function progressionRecommendation({exerciseId,currentLoad,currentWorkingLoad=currentLoad,evidence=[],equipment,requiredSets,repTarget,calibrationStatus}) {
  const exercise=getExercise(exerciseId); const working=canonicalWorkingLoad(currentWorkingLoad,exercise.loadingMode);
  const relevant=evidence.filter(item=>item.exerciseId===exerciseId).sort((a,b)=>String(a.createdAt||a.recordedAt||'').localeCompare(String(b.createdAt||b.recordedAt||'')));
  const latest=relevant.at(-1);
  if(latest&&concerning(latest)) return {exerciseId,status:'not-ready',eligible:false,currentLoad:plateLoadOf(working),currentWorkingLoad:working,reasonCode:'discomfort-or-technique',reason:'Hold progression for now. Use the current load or an approved regression until this movement feels controlled again.',appliesAutomatically:false};
  if(isExternallyLoadedMode(exercise.loadingMode)&&working&&relevant.length>=2&&relevant.slice(-2).every(poor)) {
    const proposedLoad=getPreviousAchievableLoad(working.plateLoadKg,exercise.loadingMode,equipment);
    if(proposedLoad!=null) return {exerciseId,status:'regression-consideration',eligible:true,direction:'decrease',currentLoad:working.plateLoadKg,currentWorkingLoad:working,proposedLoad,recommendedLoad:canonicalWorkingLoad(proposedLoad,exercise.loadingMode),recommendedLoadingGuidance:calculatePlateLoading(proposedLoad,exercise.loadingMode,equipment),reasonCode:'repeated-too-heavy',reason:'The current load has repeatedly prevented controlled target performance.',requiresUserConfirmation:true,appliesAutomatically:false};
  }
  if(!isExternallyLoadedMode(exercise.loadingMode)) {
    const range=parseRepRange(repTarget||latest?.targetRange||exercise.defaultPrescription.repTarget);
    const required=exercise.progressionRule.successfulAppearancesRequired||2; const setCount=requiredSets||exercise.defaultPrescription.sets;
    let successful=relevant.filter(item=>hitTop(item,range.max,setCount));
    if(range.max==null&&successful.length<required) {
      const controlled=relevant.filter(item=>!concerning(item)&&item.controlled!==false&&(item.sets||[]).length>=setCount);
      const recent=controlled.slice(-required); const totals=recent.map(item=>item.sets.slice(0,setCount).reduce((sum,set)=>sum+Number(set.reps??set.durationSeconds??0),0));
      successful=recent.length>=required&&totals.at(-1)>totals[0]?recent:[];
    }
    if(successful.length<required) return {exerciseId,status:'repeat-current-load',eligible:false,currentLoad:null,currentWorkingLoad:null,reasonCode:'build-quality-evidence',reason:`Build controlled repetitions, duration, range, or tempo. ${required-successful.length} more qualifying appearance(s) needed.`,evidence:successful.map(item=>item.id||item.workoutSessionId),appliesAutomatically:false};
    return {exerciseId,status:'eligible',eligible:true,currentLoad:null,currentWorkingLoad:null,proposedProgression:exercise.loadingMode==='pull-up-progression'?'next-approved-rung':'repetitions-tempo-range-or-variation',reasonCode:'quality-progression-earned',reason:'Repeated controlled performance supports the next approved reps, duration, tempo, range, variation, or rung progression.',evidence:successful.slice(-required).map(item=>item.id||item.workoutSessionId),requiresUserConfirmation:true,appliesAutomatically:false};
  }
  if(!working) return {exerciseId,status:'calibration',eligible:false,currentLoad:null,currentWorkingLoad:null,reasonCode:'working-load-not-established',reason:calibrationStatus==='too-heavy'?'Choose a lower achievable calibration load.':'Complete calibration and confirm a repeatable load.',appliesAutomatically:false};
  const range=parseRepRange(repTarget||latest?.targetRange||exercise.defaultPrescription.repTarget);
  const required=exercise.progressionRule.successfulAppearancesRequired||2;
  const setCount=requiredSets||exercise.defaultPrescription.sets;
  const successful=relevant.filter(item=>(item.load==null||sameLoad(item.load,working))&&hitTop(item,range.max,setCount));
  if(successful.length<required) return {exerciseId,status:'repeat-current-load',eligible:false,currentLoad:working.plateLoadKg,currentWorkingLoad:working,reasonCode:'build-repetitions',reason:`Build repetitions with controlled form. ${required-successful.length} more top-range appearance(s) needed.`,evidence:successful.slice(-required).map(item=>item.id||item.workoutSessionId),appliesAutomatically:false};
  const proposedLoad=getNextAchievableLoad(working.plateLoadKg,exercise.loadingMode,equipment);
  if(proposedLoad===null) return {exerciseId,status:'not-ready',eligible:false,currentLoad:working.plateLoadKg,currentWorkingLoad:working,reasonCode:'no-achievable-next-load',reason:'No achievable next load exists with the current plate inventory.',appliesAutomatically:false};
  const accessory=ACCESSORY_PATTERNS.has(exercise.movementPattern);
  return {exerciseId,status:'eligible',eligible:true,direction:'increase',currentLoad:working.plateLoadKg,currentWorkingLoad:working,proposedLoad,recommendedLoad:canonicalWorkingLoad(proposedLoad,exercise.loadingMode),recommendedLoadingGuidance:calculatePlateLoading(proposedLoad,exercise.loadingMode,equipment),reasonCode:'top-range-confirmed',reason:accessory?'You confirmed the top of the range repeatedly with controlled reps; the next physical load is available when control remains the priority.':`You reached the top of the ${range.min}–${range.max} range across all required sets on ${required} controlled appearances.`,evidence:successful.slice(-required).map(item=>item.id||item.workoutSessionId),requiresUserConfirmation:true,appliesAutomatically:false};
}

export function readinessAwareRecommendation(eligibility,readiness={}) {
  const low=readiness.soreness==='High'||readiness.energy==='Low'||readiness.sleep==='Poor';
  if(!eligibility?.eligible||eligibility.direction!=='increase') return {eligibility,todayStatus:eligibility?.status||'not-ready',recommendedLoad:eligibility?.currentWorkingLoad||null,earnedProgressionRetained:Boolean(eligibility?.eligible),reason:eligibility?.reason};
  if(low) return {eligibility,todayStatus:'defer-for-readiness',recommendedLoad:eligibility.currentWorkingLoad,earnedProgressionRetained:true,reason:'Your readiness is lower than usual. Repeat the current load today; the earned progression remains available.'};
  return {eligibility,todayStatus:'progression-available',recommendedLoad:eligibility.recommendedLoad,earnedProgressionRetained:true,reason:eligibility.reason};
}
