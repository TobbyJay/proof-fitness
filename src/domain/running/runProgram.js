import { deepFreeze } from '../shared.js';
import { RUN_STAGE_ORDER } from './runStages.js';

export const RUN_PROGRAM_ID='proof-running';
export const RUN_PROGRAM_VERSION=1;
export const PRIMARY_RUNNING_STATE_ID='primary-running';
export const RUN_FREQUENCY_INTENTS=Object.freeze(['optional-one','one-primary','one-primary-plus-optional-quality']);

export const runProgram=deepFreeze({
  id:RUN_PROGRAM_ID,version:RUN_PROGRAM_VERSION,primaryPriority:'strength-and-physique',secondaryPriority:'aerobic-running',
  stageOrder:RUN_STAGE_ORDER,foundationFrequency:'optional-one',leanAthleticFrequency:'one-primary',
  qualityTemplateId:'controlled-intervals-01',qualityOptional:true,qualityUnlock:{continuousRunSeconds:1800,controlledCompletions:3,minimumProgrammeWeek:41}
});

export function createRunProgressionState(now=new Date().toISOString()){
  return {id:PRIMARY_RUNNING_STATE_ID,runProgramVersion:RUN_PROGRAM_VERSION,currentStageId:RUN_STAGE_ORDER[0],currentStageVersion:1,qualifyingCompletionsAtCurrentStage:0,qualifyingSessionIds:[],latestRunSessionId:null,pendingRecommendation:null,earnedProgression:null,lastProgressionAt:null,aerobicBaseStatus:'not-established',qualitySessionUnlocked:false,qualitySessionOptIn:false,frequencyIntent:'optional-one',recommendations:[],decisions:[],milestones:[],createdAt:now,updatedAt:now};
}
