import { deepFreeze } from '../shared.js';
import starterRun from '../../../audio-scripts/starter-run.json' with { type: 'json' };

const easyCue='Easy pace. Stay controlled, keep your stride relaxed, and slow down if the run begins to feel like a race.';
const walkCue='Walk briskly and let your breathing settle while you keep moving.';

function phase({id,type,label,startSeconds,durationSeconds,round=null,instruction,cue,warning}){
  return {id,type,label,startSeconds,durationSeconds,round,instruction,cue,warning,endSeconds:startSeconds+durationSeconds};
}

function intervalTemplate({id,name,stageNumber,runSeconds,walkSeconds,rounds,totalSeconds,audioAssetId=id}){
  let cursor=0; const phases=[];
  phases.push(phase({id:'warmup',type:'warm-up-walk',label:'WARM-UP WALK',startSeconds:cursor,durationSeconds:300,instruction:'Walk now for five minutes at a comfortable warm-up pace.',cue:'Stand tall, relax your shoulders, and gradually walk more briskly.',warning:'Ten seconds remaining. Prepare for an easy run.'})); cursor+=300;
  for(let round=1;round<=rounds;round+=1){
    phases.push(phase({id:`run-round-${round}`,type:'easy-run',label:round===rounds?'FINAL EASY RUN':'EASY RUN',startSeconds:cursor,durationSeconds:runSeconds,round,instruction:`Run now for ${durationWords(runSeconds)} at an easy, conversational pace.`,cue:easyCue,warning:'Ten seconds remaining. Prepare to walk.'})); cursor+=runSeconds;
    phases.push(phase({id:`walk-round-${round}`,type:'recovery-walk',label:round===rounds?'FINAL RECOVERY WALK':'RECOVERY WALK',startSeconds:cursor,durationSeconds:walkSeconds,round,instruction:`Walk now for ${durationWords(walkSeconds)} at a brisk recovery pace.`,cue:walkCue,warning:round===rounds?'Ten seconds remaining. Prepare for the cool-down.':'Ten seconds remaining. Prepare for the next easy run.'})); cursor+=walkSeconds;
  }
  phases.push(phase({id:'cooldown',type:'cool-down-walk',label:'COOL-DOWN WALK',startSeconds:cursor,durationSeconds:300,instruction:'Walk now for five minutes at an easy cool-down pace.',cue:'Gradually slow down and let your breathing return towards normal.',warning:'Ten seconds remaining. Keep walking easily.'})); cursor+=300;
  if(cursor!==totalSeconds) throw new Error(`${id} duration does not match its phases.`);
  return {id,version:1,stageId:id,stageVersion:1,stageNumber,name,kind:'run-walk',rounds,runSecondsPerRound:runSeconds,walkSecondsPerRound:walkSeconds,warmupSeconds:300,cooldownSeconds:300,durationSeconds:cursor,plannedRunSeconds:runSeconds*rounds,plannedWalkSeconds:cursor-runSeconds*rounds,longestContinuousRunSeconds:runSeconds,phases,audio:{assetId:audioAssetId,voice:`/audio/coach/${audioAssetId}-coach.opus`,mp3:null,chimes:`/audio/chimes/${audioAssetId}-chimes.opus`,manifest:`/audio/coach/${audioAssetId}-coach.manifest.json`,script:`/audio-scripts/${id}.json`}};
}

function continuousTemplate({id,name,stageNumber=null,runSeconds,kind='continuous-easy'}){
  const phases=[
    phase({id:'warmup',type:'warm-up-walk',label:'BRISK WARM-UP WALK',startSeconds:0,durationSeconds:300,instruction:'Walk briskly for five minutes and prepare to run easily.',cue:'Build warmth without rushing.',warning:'Ten seconds remaining. Prepare for an easy continuous run.'}),
    phase({id:'continuous-run',type:'easy-run',label:'CONTINUOUS EASY RUN',startSeconds:300,durationSeconds:runSeconds,instruction:`Run continuously for ${durationWords(runSeconds)} at an easy pace.`,cue:easyCue,warning:'Ten seconds remaining. Prepare for the cool-down walk.'}),
    phase({id:'cooldown',type:'cool-down-walk',label:'COOL-DOWN WALK',startSeconds:300+runSeconds,durationSeconds:300,instruction:'Walk easily for five minutes to cool down.',cue:'Let your breathing settle gradually.',warning:'Ten seconds remaining. Keep walking easily.'})
  ];
  const durationSeconds=runSeconds+600;
  return {id,version:1,stageId:id,stageVersion:1,stageNumber,name,kind,rounds:1,runSecondsPerRound:runSeconds,walkSecondsPerRound:0,warmupSeconds:300,cooldownSeconds:300,durationSeconds,plannedRunSeconds:runSeconds,plannedWalkSeconds:600,longestContinuousRunSeconds:runSeconds,phases,audio:{assetId:id,voice:`/audio/coach/${id}-coach.opus`,mp3:null,chimes:`/audio/chimes/${id}-chimes.opus`,manifest:`/audio/coach/${id}-coach.manifest.json`,script:`/audio-scripts/${id}.json`}};
}

function qualityTemplate(){
  const base=intervalTemplate({id:'controlled-intervals-01',name:'Controlled Intervals 1',stageNumber:null,runSeconds:60,walkSeconds:120,rounds:6,totalSeconds:1680});
  const phases=base.phases.map(item=>item.type==='easy-run'?{...item,type:'controlled-run',label:item.round===base.rounds?'FINAL CONTROLLED INTERVAL':'CONTROLLED FASTER RUN',instruction:'Run for one minute at a controlled faster effort—smooth, never a sprint.',cue:'Stay composed and finish knowing you could repeat the effort. This is controlled conditioning, not maximal running.'}:item.type==='recovery-walk'?{...item,type:'very-easy-recovery',label:item.round===base.rounds?'FINAL VERY EASY RECOVERY':'VERY EASY JOG / WALK',instruction:'Jog very easily or walk for two minutes.',cue:'Make the recovery genuinely easy so the next controlled interval stays smooth.'}:item);
  return {...base,kind:'controlled-quality',quality:true,runIntensity:'controlled-faster-not-sprint',phases};
}

function preservedStarterTemplate(){
  const phases=starterRun.phases.map(item=>({...item,endSeconds:item.startSeconds+item.durationSeconds}));
  return {id:'run-walk-stage-01',version:1,stageId:'run-walk-stage-01',stageVersion:1,stageNumber:1,name:'Foundation Run–Walk',kind:'run-walk',rounds:6,runSecondsPerRound:60,walkSecondsPerRound:120,warmupSeconds:300,cooldownSeconds:300,durationSeconds:starterRun.durationSeconds,plannedRunSeconds:360,plannedWalkSeconds:1320,longestContinuousRunSeconds:60,phases,audio:{assetId:'starter-run',voice:'/audio/coach/starter-run-coach.opus',mp3:'/audio/coach/starter-run-coach.mp3',chimes:'/audio/chimes/starter-run-chimes.opus',manifest:'/audio/coach/starter-run-coach.manifest.json',script:'/audio-scripts/starter-run.json'}};
}

export function durationWords(seconds){
  if(seconds%60===0) return `${seconds/60} minute${seconds===60?'':'s'}`;
  const minutes=Math.floor(seconds/60); return `${minutes} minute${minutes===1?'':'s'} ${seconds%60} seconds`;
}

const templates=[
  preservedStarterTemplate(),
  intervalTemplate({id:'run-walk-stage-02',name:'Extend the Run',stageNumber:2,runSeconds:90,walkSeconds:120,rounds:6,totalSeconds:1860}),
  intervalTemplate({id:'run-walk-stage-03',name:'Run Longer Than Recovery',stageNumber:3,runSeconds:120,walkSeconds:90,rounds:6,totalSeconds:1860}),
  intervalTemplate({id:'run-walk-stage-04',name:'Three-Minute Blocks',stageNumber:4,runSeconds:180,walkSeconds:90,rounds:5,totalSeconds:1950}),
  intervalTemplate({id:'run-walk-stage-05',name:'Four-Minute Blocks',stageNumber:5,runSeconds:240,walkSeconds:90,rounds:4,totalSeconds:1920}),
  intervalTemplate({id:'run-walk-stage-06',name:'Six-Minute Blocks',stageNumber:6,runSeconds:360,walkSeconds:120,rounds:3,totalSeconds:2040}),
  intervalTemplate({id:'run-walk-stage-07',name:'Eight-Minute Blocks',stageNumber:7,runSeconds:480,walkSeconds:120,rounds:3,totalSeconds:2400}),
  continuousTemplate({id:'run-walk-stage-08',name:'First Continuous Run',stageNumber:8,runSeconds:1200}),
  continuousTemplate({id:'run-walk-stage-09',name:'Continuous 25',stageNumber:9,runSeconds:1500}),
  continuousTemplate({id:'run-walk-stage-10',name:'Continuous 30',stageNumber:10,runSeconds:1800}),
  continuousTemplate({id:'easy-continuous-30',name:'Aerobic Base 30',runSeconds:1800}),
  continuousTemplate({id:'easy-continuous-35',name:'Aerobic Base 35',runSeconds:2100}),
  continuousTemplate({id:'easy-continuous-40',name:'Aerobic Base 40',runSeconds:2400}),
  qualityTemplate()
];

export const RUN_TEMPLATE_ALIASES=Object.freeze({'starter-run':'run-walk-stage-01'});
export const RUN_TEMPLATES=deepFreeze(Object.fromEntries(templates.map(template=>[template.id,template])));

export function resolveRunTemplateId(id){return RUN_TEMPLATE_ALIASES[id]||id;}
export function getRunTemplate(id){const template=RUN_TEMPLATES[resolveRunTemplateId(id)];if(!template)throw new Error(`Unknown run template: ${id}`);return template;}
export function allRunTemplates(){return Object.values(RUN_TEMPLATES);}
