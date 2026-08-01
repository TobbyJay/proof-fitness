const lowerBodyTemplates=new Set(['lean-lower-a','lean-lower-b','foundation-a','foundation-b','foundation-c','lean-three-day-a','lean-three-day-b','lean-three-day-c']);
export function isLowerBodyStrengthTemplate(templateId){return lowerBodyTemplates.has(templateId);}

export function runningFrequencyForProgramme(programme,progressionState){
  if(programme?.activePhase==='foundation')return {intent:'optional-one',recommendedRuns:0,maxRecommendedRuns:1,gatesStrength:false};
  if(progressionState?.qualitySessionUnlocked&&progressionState?.qualitySessionOptIn)return {intent:'one-primary-plus-optional-quality',recommendedRuns:1,maxRecommendedRuns:2,gatesStrength:false};
  return {intent:'one-primary',recommendedRuns:1,maxRecommendedRuns:1,gatesStrength:false};
}

export function hybridProgrammeContext(programme){return programme?.activePhase==='lean-athletic'&&(programme?.currentProgrammeWeek>=41||programme?.hybridBlockEnabled===true);}
