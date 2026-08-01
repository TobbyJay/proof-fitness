import { getRunStage, nextRunStage } from './runStages.js';
import { runningReadinessRecommendation } from './runReadiness.js';

export function todayRunRecommendation({progressionState,readiness,programme,recentLowerBodyWorkout=false,upcomingLowerBodyWorkout=false,qualityRequested=false}){
  const recovery=runningReadinessRecommendation({...readiness,recentLowerBodyWorkout,upcomingLowerBodyWorkout,qualityRequested});
  const current=getRunStage(progressionState.currentStageId); const available=progressionState.pendingRecommendation?.type==='progress'?nextRunStage(current.id):null;
  return {...recovery,currentStageId:current.id,availableStageId:available?.id||null,programmePhase:programme?.activePhase||'foundation'};
}
