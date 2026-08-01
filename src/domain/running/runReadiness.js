function low(value){return ['low','poor','tired'].includes(String(value||'').toLowerCase());}
function high(value){return ['high','very high'].includes(String(value||'').toLowerCase());}

export function runningReadinessRecommendation({energy,sleep,soreness,recentLowerBodyWorkout=false,upcomingLowerBodyWorkout=false,qualityRequested=false}={}){
  const recoveryConcern=low(energy)||low(sleep)||high(soreness);
  if(recoveryConcern)return {code:'recovery-first',recommendedActivity:'brisk-walk-or-mobility',progressionSuitable:false,qualitySuitable:false,reason:'Low energy, poor sleep, or high lower-body soreness makes brisk walking or mobility the better conditioning choice today. Earned run progression remains available.'};
  if(qualityRequested&&(recentLowerBodyWorkout||upcomingLowerBodyWorkout))return {code:'easy-over-quality',recommendedActivity:'easy-run',progressionSuitable:true,qualitySuitable:false,reason:'Keep this session easy to protect recovery around demanding lower-body strength work.'};
  return {code:'run-available',recommendedActivity:'current-run-stage',progressionSuitable:true,qualitySuitable:!recentLowerBodyWorkout&&!upcomingLowerBodyWorkout,reason:'Recovery indicators support an easy, controlled running session.'};
}
