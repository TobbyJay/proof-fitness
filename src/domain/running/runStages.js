import { deepFreeze } from '../shared.js';
import { getRunTemplate } from './runTemplates.js';

export const RUN_STAGE_ORDER=Object.freeze([
  'run-walk-stage-01','run-walk-stage-02','run-walk-stage-03','run-walk-stage-04','run-walk-stage-05',
  'run-walk-stage-06','run-walk-stage-07','run-walk-stage-08','run-walk-stage-09','run-walk-stage-10',
  'easy-continuous-30','easy-continuous-35','easy-continuous-40'
]);

export const RUN_STAGES=deepFreeze(Object.fromEntries(RUN_STAGE_ORDER.map((id,index)=>{
  const template=getRunTemplate(id);
  return [id,{id,version:1,order:index+1,name:template.name,templateId:id,templateVersion:template.version,category:index<10?'beginner-progression':'aerobic-base',requiredQualifyingCompletions:2}];
})));

export function getRunStage(id){const stage=RUN_STAGES[id];if(!stage)throw new Error(`Unknown run stage: ${id}`);return stage;}
export function nextRunStage(id){const index=RUN_STAGE_ORDER.indexOf(id);return index>=0&&index<RUN_STAGE_ORDER.length-1?getRunStage(RUN_STAGE_ORDER[index+1]):null;}
export function previousRunStage(id){const index=RUN_STAGE_ORDER.indexOf(id);return index>0?getRunStage(RUN_STAGE_ORDER[index-1]):null;}
