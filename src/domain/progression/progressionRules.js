import { canonicalWorkingLoad, progressionRecommendation } from './recommendationEngine.js';

export function recordExerciseEvidence(progressionState,evidence) {
  if(!evidence.exerciseId) throw new Error('Progression evidence requires an exerciseId.');
  return {...progressionState,[evidence.exerciseId]:[...(progressionState[evidence.exerciseId]||[]),{...evidence}]};
}

export function appendPerformance(progressionState,evidence,{equipment,repTarget,requiredSets}={}) {
  if(!evidence.exerciseId||!evidence.workoutSessionId) throw new Error('Performance evidence requires exercise and workout session IDs.');
  const performances=[...(progressionState?.performances||[]).filter(item=>item.id!==evidence.id),evidence];
  let currentWorkingLoad=canonicalWorkingLoad(progressionState?.currentWorkingLoad,evidence.loadingMode);
  let calibrationStatus=progressionState?.calibrationStatus||'not-started';
  if(evidence.calibrationResponse) calibrationStatus=evidence.calibrationResponse==='appropriate'?'established':evidence.calibrationResponse;
  if(!currentWorkingLoad&&['appropriate','too-light'].includes(evidence.calibrationResponse)) currentWorkingLoad=canonicalWorkingLoad(evidence.load,evidence.loadingMode);
  const recommendation=progressionRecommendation({exerciseId:evidence.exerciseId,currentWorkingLoad,evidence:performances,equipment,requiredSets,repTarget,calibrationStatus});
  const previousPending=progressionState?.pendingRecommendation;
  const pendingRecommendation=recommendation.eligible?{
    id:`recommendation:${evidence.exerciseId}:${recommendation.direction||'quality'}:${recommendation.proposedLoad??performances.length}`,
    ...recommendation,createdAt:evidence.createdAt,decision:null
  }:previousPending?.decision==null&&previousPending?.status==='eligible'?previousPending:null;
  return {...progressionState,exerciseId:evidence.exerciseId,exerciseVersion:evidence.exerciseVersion,loadingMode:evidence.loadingMode,currentWorkingLoad,repRange:evidence.targetRange,calibrationStatus,performances,pendingRecommendation,updatedAt:evidence.createdAt};
}

export function decideProgression(state,exerciseId,decision,recommendation,stateNow=new Date().toISOString()) {
  if(!['accept','defer','reject'].includes(decision)) throw new Error('Invalid progression decision.');
  if(!recommendation?.requiresUserConfirmation) throw new Error('Progression decision requires a confirmable recommendation.');
  const decisionRecord={id:`decision:${exerciseId}:${stateNow}`,exerciseId,recommendationId:recommendation.id||null,decision,decidedAt:stateNow,recommendedLoad:recommendation.recommendedLoad||null};
  const currentWorkingLoad=decision==='accept'&&recommendation.recommendedLoad?{...recommendation.recommendedLoad}:state.currentWorkingLoad;
  return {...state,currentWorkingLoad,decisions:[...(state.decisions||[]),decisionRecord],pendingRecommendation:decision==='defer'?{...recommendation,decision:'defer',deferredAt:stateNow}:null,lastDecision:decisionRecord,updatedAt:stateNow};
}

export const BULGARIAN_SPLIT_SQUAT_STAGES=Object.freeze([
  {stage:1,exerciseId:'bodyweight-bulgarian-split-squat',label:'Bodyweight'},
  {stage:2,exerciseId:'dumbbell-bulgarian-split-squat',label:'Light matched dumbbells'},
  {stage:3,exerciseId:'dumbbell-bulgarian-split-squat',label:'Heavier matched dumbbells through double progression'}
]);
