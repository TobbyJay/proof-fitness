import { allRunTemplates } from './runTemplates.js';
import { RUN_STAGE_ORDER } from './runStages.js';

const EXPECTED=Object.freeze({
  'run-walk-stage-01':[6,60,120,1680], 'run-walk-stage-02':[6,90,120,1860],
  'run-walk-stage-03':[6,120,90,1860], 'run-walk-stage-04':[5,180,90,1950],
  'run-walk-stage-05':[4,240,90,1920], 'run-walk-stage-06':[3,360,120,2040],
  'run-walk-stage-07':[3,480,120,2400], 'run-walk-stage-08':[1,1200,0,1800],
  'run-walk-stage-09':[1,1500,0,2100], 'run-walk-stage-10':[1,1800,0,2400],
  'easy-continuous-30':[1,1800,0,2400], 'easy-continuous-35':[1,2100,0,2700],
  'easy-continuous-40':[1,2400,0,3000], 'controlled-intervals-01':[6,60,120,1680]
});

export function validateRunTemplate(template){
  if(!template||typeof template.id!=='string'||!Number.isInteger(template.version))throw new Error('Run template needs a stable ID and version.');
  if(!Number.isInteger(template.durationSeconds)||template.durationSeconds<=0)throw new Error(`${template.id} has an invalid duration.`);
  if(!Array.isArray(template.phases)||!template.phases.length)throw new Error(`${template.id} has no phases.`);
  let cursor=0;const phaseIds=new Set();
  for(const phase of template.phases){
    if(typeof phase.id!=='string'||phaseIds.has(phase.id))throw new Error(`${template.id} has an invalid or duplicate phase ID.`);phaseIds.add(phase.id);
    if(phase.startSeconds!==cursor||phase.durationSeconds<=0||phase.endSeconds!==phase.startSeconds+phase.durationSeconds)throw new Error(`${template.id} has a broken phase sequence.`);
    if(!/Ten seconds/i.test(phase.warning))throw new Error(`${template.id} phase ${phase.id} is missing its ten-second warning.`);
    cursor=phase.endSeconds;
  }
  if(cursor!==template.durationSeconds)throw new Error(`${template.id} phase total does not match.`);
  const runSeconds=template.phases.filter(item=>['easy-run','controlled-run'].includes(item.type)).reduce((sum,item)=>sum+item.durationSeconds,0);
  if(runSeconds!==template.plannedRunSeconds)throw new Error(`${template.id} planned running time does not match.`);
  if(template.warmupSeconds!==300||template.cooldownSeconds!==300)throw new Error(`${template.id} must retain five-minute walks.`);
  const expected=EXPECTED[template.id];if(!expected)throw new Error(`${template.id} is not registered in the running programme validator.`);
  if(template.rounds!==expected[0]||template.runSecondsPerRound!==expected[1]||template.walkSecondsPerRound!==expected[2]||template.durationSeconds!==expected[3])throw new Error(`${template.id} does not match the approved timeline.`);
  return true;
}

export function validateRunningDomain(){
  const templates=allRunTemplates(); const ids=new Set();
  for(const template of templates){validateRunTemplate(template);if(ids.has(template.id))throw new Error(`Duplicate run template ${template.id}.`);ids.add(template.id);}
  for(const id of RUN_STAGE_ORDER)if(!ids.has(id))throw new Error(`Running stage ${id} has no template.`);
  const stage1=templates.find(item=>item.id==='run-walk-stage-01');
  if(stage1.durationSeconds!==1680||stage1.warmupSeconds!==300||stage1.cooldownSeconds!==300||stage1.rounds!==6||stage1.runSecondsPerRound!==60||stage1.walkSecondsPerRound!==120)throw new Error('Stage 1 no longer matches the approved 28-minute run–walk.');
  return {templates:templates.length,stages:RUN_STAGE_ORDER.length};
}
