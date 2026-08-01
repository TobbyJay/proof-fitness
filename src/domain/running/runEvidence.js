import { getRunTemplate, resolveRunTemplateId } from './runTemplates.js';
import { RUN_PROGRAM_VERSION } from './runProgram.js';

export const RUN_EFFORT_RESULTS=Object.freeze(['comfortable','challenging-controlled','too-hard']);
export function isRunEffortResult(value){return RUN_EFFORT_RESULTS.includes(value);}

function isRunningPhase(phase){return ['easy-run','controlled-run'].includes(phase.type);}

export function runCompletionAt(templateOrId,positionSeconds){
  const template=typeof templateOrId==='string'?getRunTemplate(templateOrId):templateOrId;
  const position=Math.max(0,Math.min(template.durationSeconds,Number(positionSeconds)||0));
  const completedPhases=template.phases.filter(item=>position>=item.endSeconds).map(item=>item.id);
  const completedRunSeconds=template.phases.filter(isRunningPhase).reduce((sum,item)=>sum+Math.max(0,Math.min(position,item.endSeconds)-item.startSeconds),0);
  const completedWalkSeconds=template.phases.filter(item=>!isRunningPhase(item)).reduce((sum,item)=>sum+Math.max(0,Math.min(position,item.endSeconds)-item.startSeconds),0);
  const runningBlocksCompleted=completedRunSeconds>=template.plannedRunSeconds;
  return {completedDurationSeconds:Math.floor(position),completedRunSeconds:Math.floor(completedRunSeconds),completedWalkSeconds:Math.floor(completedWalkSeconds),completedPhases,runningBlocksCompleted,status:runningBlocksCompleted?'completed':'partial'};
}

export function createRunSessionSnapshot({id,templateId,startedAt,guidanceMode,progressionState,readinessRecommendation}){
  const template=getRunTemplate(templateId);
  return {id,runProgramVersion:RUN_PROGRAM_VERSION,runTemplateId:template.id,runTemplateVersion:template.version,templateId:template.id,templateVersion:template.version,stageId:template.stageId,stageVersion:template.stageVersion,templateSnapshot:template,startedAt,plannedDurationSeconds:template.durationSeconds,plannedRunSeconds:template.plannedRunSeconds,plannedWalkSeconds:template.plannedWalkSeconds,guidanceMode,progressionContextSnapshot:{currentStageId:progressionState.currentStageId,qualifyingCompletionsAtCurrentStage:progressionState.qualifyingCompletionsAtCurrentStage,pendingRecommendation:progressionState.pendingRecommendation,readinessRecommendation},effortResult:null,discomfortFlag:false};
}

export function normaliseLegacyRunSession(record){
  const legacyTemplateId=record.runTemplateId||record.templateId;
  if(!legacyTemplateId)return {...record,runProgramVersion:record.runProgramVersion||RUN_PROGRAM_VERSION,runTemplateId:null,templateId:null,stageId:null,migrationStatus:'unknown-legacy-run-template',effortResult:record.effortResult??null,discomfortFlag:Boolean(record.discomfortFlag)};
  const templateId=resolveRunTemplateId(legacyTemplateId);
  const template=getRunTemplate(templateId); const position=Number(record.completedDurationSeconds??record.audioPositionSeconds??0);
  const completion=runCompletionAt(template,position);
  return {...record,runProgramVersion:record.runProgramVersion||RUN_PROGRAM_VERSION,legacyRunTemplateId:legacyTemplateId==='starter-run'?'starter-run':record.legacyRunTemplateId||null,runTemplateId:template.id,runTemplateVersion:record.runTemplateVersion||template.version,templateId:template.id,templateVersion:record.templateVersion||template.version,stageId:record.stageId||template.stageId,stageVersion:record.stageVersion||template.stageVersion,templateSnapshot:record.templateSnapshot||template,plannedDurationSeconds:record.plannedDurationSeconds||template.durationSeconds,completedDurationSeconds:record.completedDurationSeconds??completion.completedDurationSeconds,plannedRunSeconds:record.plannedRunSeconds??template.plannedRunSeconds,completedRunSeconds:record.completedRunSeconds??completion.completedRunSeconds,plannedWalkSeconds:record.plannedWalkSeconds??template.plannedWalkSeconds,completedWalkSeconds:record.completedWalkSeconds??completion.completedWalkSeconds,completedPhases:record.completedPhases||completion.completedPhases,effortResult:record.effortResult??null,discomfortFlag:Boolean(record.discomfortFlag)};
}

export function isQualifyingRunSession(session,currentStageId){
  return session.status==='completed'&&session.stageId===currentStageId&&session.completedRunSeconds>=session.plannedRunSeconds&&session.discomfortFlag!==true&&['comfortable','challenging-controlled'].includes(session.effortResult)&&session.progressionContextSnapshot?.readinessRecommendation?.progressionSuitable!==false;
}
