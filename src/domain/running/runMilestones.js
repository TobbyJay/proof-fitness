const DEFINITIONS=Object.freeze([
  {id:'first-run-walk',label:'First completed run–walk',test:sessions=>sessions.some(item=>item.status==='completed')},
  {id:'ten-minutes-running',label:'10 minutes total running',test:sessions=>sessions.filter(item=>item.status==='completed').reduce((sum,item)=>sum+(item.completedRunSeconds||0),0)>=600},
  {id:'continuous-20',label:'First 20-minute continuous run',test:sessions=>sessions.some(item=>item.status==='completed'&&item.templateSnapshot?.longestContinuousRunSeconds>=1200)},
  {id:'continuous-25',label:'First 25-minute continuous run',test:sessions=>sessions.some(item=>item.status==='completed'&&item.templateSnapshot?.longestContinuousRunSeconds>=1500)},
  {id:'continuous-30',label:'First 30-minute continuous run',test:sessions=>sessions.some(item=>item.status==='completed'&&item.templateSnapshot?.longestContinuousRunSeconds>=1800)},
  {id:'continuous-35',label:'First 35-minute easy run',test:sessions=>sessions.some(item=>item.status==='completed'&&item.templateSnapshot?.longestContinuousRunSeconds>=2100)},
  {id:'continuous-40',label:'First 40-minute easy run',test:sessions=>sessions.some(item=>item.status==='completed'&&item.templateSnapshot?.longestContinuousRunSeconds>=2400)}
]);

export function deriveRunMilestones(sessions,existing=[],achievedAt=new Date().toISOString()){
  const known=new Map(existing.map(item=>[item.id,item]));
  for(const definition of DEFINITIONS)if(!known.has(definition.id)&&definition.test(sessions))known.set(definition.id,{id:definition.id,label:definition.label,achievedAt,runSessionId:sessions.filter(item=>item.status==='completed').at(-1)?.id||null});
  return [...known.values()];
}

export function nextRunMilestone(sessions){return DEFINITIONS.find(item=>!item.test(sessions))||null;}
