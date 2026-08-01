import { createRunProgressionState, runProgram } from './runProgram.js';
import { nextRunStage, previousRunStage, RUN_STAGE_ORDER } from './runStages.js';
import { deriveRunMilestones } from './runMilestones.js';
import { hybridProgrammeContext } from './runScheduling.js';
import { isQualifyingRunSession } from './runEvidence.js';

function recommendationId(direction,stageId,evidence){return `run:${direction}:${stageId}:${evidence.join('|')}`;}
function continuousControlled(sessions){return sessions.filter(item=>item.status==='completed'&&item.completedRunSeconds>=1800&&item.templateSnapshot?.longestContinuousRunSeconds>=1800&&item.discomfortFlag!==true&&['comfortable','challenging-controlled'].includes(item.effortResult)&&item.progressionContextSnapshot?.readinessRecommendation?.progressionSuitable!==false);}

export function evaluateRunProgression(stateInput,sessions,{programme=null,now=new Date().toISOString()}={}){
  const state={...createRunProgressionState(now),...stateInput};
  const uniqueSessions=[...new Map(sessions.map(item=>[item.id,item])).values()].sort((a,b)=>String(a.completedAt||a.updatedAt).localeCompare(String(b.completedAt||b.updatedAt)));
  const qualifying=uniqueSessions.filter(item=>isQualifyingRunSession(item,state.currentStageId));
  const qualifyingIds=qualifying.map(item=>item.id); const next=nextRunStage(state.currentStageId);
  const recentAtStage=uniqueSessions.filter(item=>item.stageId===state.currentStageId).slice(-3);
  const hardEvidence=recentAtStage.filter(item=>item.status==='partial'||item.effortResult==='too-hard'||item.discomfortFlag).map(item=>item.id);
  let pending=state.pendingRecommendation;
  let earnedProgression=state.earnedProgression;
  if(next&&qualifyingIds.length>=2){const evidence=qualifyingIds.slice(-2);pending={id:recommendationId('progress',next.id,evidence),type:'progress',eligible:true,fromStageId:state.currentStageId,toStageId:next.id,evidenceSessionIds:evidence,reason:'You completed the current stage with controlled effort on the required number of sessions.',requiresUserConfirmation:true};earnedProgression={recommendationId:pending.id,fromStageId:state.currentStageId,toStageId:next.id,evidenceSessionIds:evidence,earnedAt:now};}
  else if(hardEvidence.length>=2){const previous=previousRunStage(state.currentStageId);if(previous)pending={id:recommendationId('regress',previous.id,hardEvidence.slice(-2)),type:'regress',eligible:true,fromStageId:state.currentStageId,toStageId:previous.id,evidenceSessionIds:hardEvidence.slice(-2),reason:'The current running blocks have repeatedly been difficult to complete with control.',requiresUserConfirmation:true};}
  else if(!pending?.eligible)pending={id:recommendationId('repeat',state.currentStageId,recentAtStage.map(item=>item.id)),type:'repeat',eligible:false,fromStageId:state.currentStageId,toStageId:state.currentStageId,evidenceSessionIds:recentAtStage.map(item=>item.id),reason:recentAtStage.at(-1)?.effortResult==='too-hard'?'Repeat this stage without punishment; one difficult run does not erase earlier evidence.':'Repeat this stage while controlled evidence is established.',requiresUserConfirmation:false};
  const recommendations=[...(state.recommendations||[])];if(pending?.eligible&&!recommendations.some(item=>item.id===pending.id))recommendations.push({...pending,createdAt:now});
  const controlledContinuous=continuousControlled(uniqueSessions);const stageTenReached=RUN_STAGE_ORDER.indexOf(state.currentStageId)>=RUN_STAGE_ORDER.indexOf('run-walk-stage-10')||state.decisions?.some(item=>item.toStageId==='run-walk-stage-10');const recentContinuous=uniqueSessions.filter(item=>item.status==='completed'&&item.templateSnapshot?.longestContinuousRunSeconds>=1800).slice(-3);const recoveryAcceptable=recentContinuous.length>=3&&!recentContinuous.some(item=>item.discomfortFlag||item.progressionContextSnapshot?.readinessRecommendation?.progressionSuitable===false);
  const aerobicBaseStatus=controlledContinuous.some(item=>item.completedRunSeconds>=1800)?'established':state.aerobicBaseStatus;
  const qualitySessionUnlocked=state.qualitySessionUnlocked||(stageTenReached&&controlledContinuous.length>=runProgram.qualityUnlock.controlledCompletions&&recoveryAcceptable&&hybridProgrammeContext(programme));
  return {...state,qualifyingCompletionsAtCurrentStage:qualifyingIds.length,qualifyingSessionIds:qualifyingIds,latestRunSessionId:uniqueSessions.at(-1)?.id||state.latestRunSessionId,pendingRecommendation:pending,earnedProgression,recommendations,aerobicBaseStatus,qualitySessionUnlocked,milestones:deriveRunMilestones(uniqueSessions,state.milestones,now),updatedAt:now};
}

export function decideRunProgression(state,recommendation,decision,now=new Date().toISOString()){
  if(!['progress','repeat','use-previous'].includes(decision))throw new Error('Unknown running progression decision.');
  const record={id:`run-decision:${recommendation?.id||state.currentStageId}:${now}`,recommendationId:recommendation?.id||null,evidenceSessionIds:[...(recommendation?.evidenceSessionIds||[])],decision,fromStageId:state.currentStageId,toStageId:decision==='progress'||decision==='use-previous'?recommendation.toStageId:state.currentStageId,decidedAt:now};
  if(decision==='repeat')return {...state,decisions:[...(state.decisions||[]),record],pendingRecommendation:null,updatedAt:now};
  if(!recommendation?.eligible||!recommendation.toStageId)throw new Error('No eligible running progression is available.');
  return {...state,currentStageId:recommendation.toStageId,currentStageVersion:1,qualifyingCompletionsAtCurrentStage:0,qualifyingSessionIds:[],pendingRecommendation:null,earnedProgression:decision==='progress'?{recommendationId:recommendation.id,fromStageId:state.currentStageId,toStageId:recommendation.toStageId,evidenceSessionIds:recommendation.evidenceSessionIds,acceptedAt:now}:state.earnedProgression,lastProgressionAt:now,decisions:[...(state.decisions||[]),record],updatedAt:now};
}

export function setQualityRunOptIn(state,enabled,now=new Date().toISOString()){
  if(enabled&&!state.qualitySessionUnlocked)throw new Error('Quality running is not unlocked.');
  return {...state,qualitySessionOptIn:Boolean(enabled),frequencyIntent:enabled?'one-primary-plus-optional-quality':state.aerobicBaseStatus==='established'?'one-primary':'optional-one',updatedAt:now};
}
