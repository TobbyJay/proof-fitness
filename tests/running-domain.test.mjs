import test from 'node:test';
import assert from 'node:assert/strict';
import { allRunTemplates, getRunTemplate } from '../src/domain/running/runTemplates.js';
import { RUN_STAGE_ORDER } from '../src/domain/running/runStages.js';
import { createRunProgressionState } from '../src/domain/running/runProgram.js';
import { decideRunProgression, evaluateRunProgression, setQualityRunOptIn } from '../src/domain/running/runProgression.js';
import { runCompletionAt } from '../src/domain/running/runEvidence.js';
import { runningReadinessRecommendation } from '../src/domain/running/runReadiness.js';
import { runningFrequencyForProgramme } from '../src/domain/running/runScheduling.js';
import { validateRunningDomain } from '../src/domain/running/runValidation.js';
import starterRun from '../audio-scripts/starter-run.json' with { type:'json' };

const controlledReadiness={progressionSuitable:true,qualitySuitable:true};
function session(id,stageId,overrides={}){
  const template=getRunTemplate(stageId);return {id,stageId,runTemplateId:template.id,status:'completed',plannedRunSeconds:template.plannedRunSeconds,completedRunSeconds:template.plannedRunSeconds,completedDurationSeconds:template.durationSeconds,effortResult:'comfortable',discomfortFlag:false,completedAt:`2026-07-${String(Number(id.replace(/\D/g,''))||1).padStart(2,'0')}T10:00:00.000Z`,templateSnapshot:template,progressionContextSnapshot:{readinessRecommendation:controlledReadiness},...overrides};
}

test('all stable run templates validate and Stage 1 is the preserved 28-minute starter',()=>{
  assert.deepEqual(validateRunningDomain(),{templates:14,stages:13});
  const stage1=getRunTemplate('run-walk-stage-01');
  assert.equal(stage1.audio.assetId,'starter-run');assert.equal(stage1.durationSeconds,1680);assert.equal(stage1.warmupSeconds,300);assert.equal(stage1.rounds,6);assert.equal(stage1.runSecondsPerRound,60);assert.equal(stage1.walkSecondsPerRound,120);assert.equal(stage1.cooldownSeconds,300);
  assert.deepEqual(stage1.phases.map(({endSeconds,...phase})=>phase),starterRun.phases);
  assert.equal(new Set(allRunTemplates().map(item=>`${item.id}@${item.version}`)).size,14);
});

test('two controlled completions make only the next stage available and require acceptance',()=>{
  const state=createRunProgressionState('2026-07-01T00:00:00.000Z');
  const once=evaluateRunProgression(state,[session('run1',state.currentStageId)]);
  assert.equal(once.currentStageId,'run-walk-stage-01');assert.equal(once.pendingRecommendation.eligible,false);
  const twice=evaluateRunProgression(once,[session('run1',state.currentStageId),session('run2',state.currentStageId)]);
  assert.equal(twice.currentStageId,'run-walk-stage-01');assert.equal(twice.pendingRecommendation.toStageId,'run-walk-stage-02');assert.equal(twice.earnedProgression.toStageId,'run-walk-stage-02');
  assert.equal(twice.recommendations.length,1);assert.deepEqual(twice.recommendations[0].evidenceSessionIds,['run1','run2']);
  const repeated=decideRunProgression(twice,twice.pendingRecommendation,'repeat');assert.equal(repeated.currentStageId,'run-walk-stage-01');assert.equal(repeated.earnedProgression.toStageId,'run-walk-stage-02');
  const accepted=decideRunProgression(twice,twice.pendingRecommendation,'progress');assert.equal(accepted.currentStageId,'run-walk-stage-02');assert.equal(accepted.qualifyingCompletionsAtCurrentStage,0);
});

test('partial, discomfort, recovery-deferral, and too-hard evidence do not qualify',()=>{
  const state=createRunProgressionState();const id=state.currentStageId;const template=getRunTemplate(id);
  const partial={...session('run1',id),...runCompletionAt(template,359),effortResult:'comfortable'};
  const discomfort=session('run2',id,{discomfortFlag:true});
  const recovery=session('run3',id,{progressionContextSnapshot:{readinessRecommendation:{progressionSuitable:false}}});
  const hard=session('run4',id,{effortResult:'too-hard'});
  const result=evaluateRunProgression(state,[partial,discomfort,recovery,hard]);assert.equal(result.qualifyingCompletionsAtCurrentStage,0);assert.notEqual(result.pendingRecommendation?.type,'progress');
});

test('repeated difficult evidence recommends but never applies the previous stage',()=>{
  const state={...createRunProgressionState(),currentStageId:'run-walk-stage-05'};
  const result=evaluateRunProgression(state,[session('run1',state.currentStageId,{effortResult:'too-hard'}),session('run2',state.currentStageId,{status:'partial',completedRunSeconds:300})]);
  assert.equal(result.currentStageId,'run-walk-stage-05');assert.equal(result.pendingRecommendation.type,'regress');assert.equal(result.pendingRecommendation.toStageId,'run-walk-stage-04');
  assert.equal(decideRunProgression(result,result.pendingRecommendation,'repeat').currentStageId,'run-walk-stage-05');assert.equal(decideRunProgression(result,result.pendingRecommendation,'use-previous').currentStageId,'run-walk-stage-04');
});

test('continuous ladder advances one stage at a time and Stage 10 alone does not unlock quality',()=>{
  for(const [from,to] of [['run-walk-stage-07','run-walk-stage-08'],['run-walk-stage-08','run-walk-stage-09'],['run-walk-stage-09','run-walk-stage-10']]){
    const state={...createRunProgressionState(),currentStageId:from};const result=evaluateRunProgression(state,[session('run1',from),session('run2',from)],{programme:{activePhase:'lean-athletic',currentProgrammeWeek:48}});assert.equal(result.pendingRecommendation.toStageId,to);assert.equal(result.qualitySessionUnlocked,false);
  }
});

test('quality unlock needs consolidated continuous evidence, suitable recovery, later hybrid context, and opt-in',()=>{
  const base={...createRunProgressionState(),currentStageId:'run-walk-stage-10'};const runs=[session('run1','run-walk-stage-10'),session('run2','run-walk-stage-10'),session('run3','run-walk-stage-10')];
  assert.equal(evaluateRunProgression(base,runs,{programme:{activePhase:'foundation',currentProgrammeWeek:48}}).qualitySessionUnlocked,false);
  assert.equal(evaluateRunProgression(base,runs.slice(0,2),{programme:{activePhase:'lean-athletic',currentProgrammeWeek:48}}).qualitySessionUnlocked,false);
  assert.equal(evaluateRunProgression(base,[...runs.slice(0,2),session('run3','run-walk-stage-10',{discomfortFlag:true})],{programme:{activePhase:'lean-athletic',currentProgrammeWeek:48}}).qualitySessionUnlocked,false);
  const unlocked=evaluateRunProgression(base,runs,{programme:{activePhase:'lean-athletic',currentProgrammeWeek:48}});assert.equal(unlocked.qualitySessionUnlocked,true);assert.equal(unlocked.qualitySessionOptIn,false);assert.equal(setQualityRunOptIn(unlocked,true).frequencyIntent,'one-primary-plus-optional-quality');
});

test('readiness and frequency advice preserve independent strength semantics',()=>{
  const poor=runningReadinessRecommendation({energy:'Low',sleep:'Poor',soreness:'High'});assert.equal(poor.recommendedActivity,'brisk-walk-or-mobility');assert.equal(poor.progressionSuitable,false);
  const qualityConflict=runningReadinessRecommendation({energy:'Good',sleep:'Good',soreness:'Low',qualityRequested:true,recentLowerBodyWorkout:true});assert.equal(qualityConflict.recommendedActivity,'easy-run');assert.equal(qualityConflict.qualitySuitable,false);
  assert.deepEqual(runningFrequencyForProgramme({activePhase:'foundation'},createRunProgressionState()),{intent:'optional-one',recommendedRuns:0,maxRecommendedRuns:1,gatesStrength:false});
});

test('the running ladder has no multi-stage skip and no pace target',()=>{
  assert.equal(RUN_STAGE_ORDER.length,13);assert.ok(allRunTemplates().every(item=>!JSON.stringify(item).match(/pace target|10% faster|all-out|maximum effort|sprint until failure/i)));
});
