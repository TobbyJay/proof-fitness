import { test, expect } from '@playwright/test';
import { completeOnboarding, putRecords, readStore } from './helpers.js';

test.use({viewport:{width:390,height:844}});

async function openRunning(page){
  await page.locator('#todayRunningCard').getByRole('button',{name:/Start run|Review running level/}).click();
  await expect(page.locator('#runStage')).toBeVisible();
}

async function completeQualifyingRun(page){
  await page.getByRole('button',{name:'Start run'}).click();
  await expect(page.locator('.run-clock')).toBeVisible();
  for(let index=0;index<13;index+=1)await page.getByRole('button',{name:'Skip to next phase'}).click();
  await page.getByRole('button',{name:'End session'}).click();
  await expect(page.getByRole('heading',{name:'How did the run feel?'})).toBeVisible();
  await page.getByRole('button',{name:/^Comfortable/}).click();
  await page.getByRole('button',{name:'Save run result'}).click();
  await expect(page.getByText(/Easy work, recorded/)).toBeVisible();
}

test('mobile running flow records evidence, repeats explicitly, progresses explicitly, and survives reload',async({page})=>{
  test.setTimeout(60_000);
  await completeOnboarding(page,{guidance:'visual'});
  await openRunning(page);
  await expect(page.getByRole('heading',{name:'Stage 1 · Foundation Run–Walk'})).toBeVisible();
  await expect(page.locator('#runStage').getByText('28:00 · 6 × 01:00 run / 02:00 walk')).toBeVisible();
  await page.locator('[data-run-audio-mode="chimes"]').click();await expect(page.locator('[data-run-audio-mode="chimes"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-run-audio-mode="visual"]').click();await expect(page.locator('[data-run-audio-mode="visual"]')).toHaveAttribute('aria-pressed','true');

  await page.getByRole('button',{name:'Start run'}).click();
  await page.getByRole('button',{name:'Skip to next phase'}).click();
  await page.getByRole('button',{name:'Pause'}).click();await expect(page.getByRole('button',{name:'Resume'})).toBeVisible();
  await page.getByRole('button',{name:'Resume'}).click();
  await page.getByRole('button',{name:'End session'}).click();
  await page.getByRole('button',{name:/^Comfortable/}).click();await page.getByRole('button',{name:'Save run result'}).click();
  expect((await readStore(page,'runSessions'))[0].status).toBe('partial');
  await page.getByRole('button',{name:'Return to Running'}).click();

  await completeQualifyingRun(page);await page.getByRole('button',{name:'Return to Running'}).click();
  await completeQualifyingRun(page);
  await expect(page.getByText('Run progression available')).toBeVisible();
  await page.getByRole('button',{name:'Repeat current stage'}).click();
  expect((await readStore(page,'runProgressionStates'))[0].currentStageId).toBe('run-walk-stage-01');
  await page.getByRole('button',{name:'Return to Running'}).click();

  await completeQualifyingRun(page);
  await page.getByRole('button',{name:'Progress next run'}).click();
  expect((await readStore(page,'runProgressionStates'))[0].currentStageId).toBe('run-walk-stage-02');
  expect((await readStore(page,'programmeStates'))[0].lastCompletedRequiredTemplateId).toBeFalsy();
  expect(await readStore(page,'workoutSessions')).toHaveLength(0);
  await page.reload();await expect(page.getByRole('heading',{name:'Resume your coached run?'})).toHaveCount(0);
  await openRunning(page);await expect(page.getByRole('heading',{name:'Stage 2 · Extend the Run'})).toBeVisible();
});

test('continuous stage and light/dark running page render at the mobile viewport',async({page})=>{
  await completeOnboarding(page,{guidance:'visual'});const state=(await readStore(page,'runProgressionStates'))[0];
  await putRecords(page,'runProgressionStates',[{...state,currentStageId:'run-walk-stage-08',currentStageVersion:1,qualifyingCompletionsAtCurrentStage:0,qualifyingSessionIds:[],updatedAt:new Date().toISOString()}]);
  await page.reload();await expect(page.locator('#persistenceLoading')).toBeHidden();
  await page.locator('#mobileThemeToggle').click();await expect(page.locator('#app')).toHaveAttribute('data-theme','light');
  await page.locator('#mobileThemeToggle').click();await expect(page.locator('#app')).toHaveAttribute('data-theme','dark');
  await openRunning(page);await expect(page.getByRole('heading',{name:'Stage 8 · First Continuous Run'})).toBeVisible();await expect(page.locator('#runStage').getByText(/20 min continuous easy run/)).toBeVisible();
});

test('cached chime guidance warns, pauses, resumes, and saves while offline',async({page,context})=>{
  test.setTimeout(60_000);await completeOnboarding(page,{guidance:'chimes'});await openRunning(page);
  await page.getByRole('button',{name:'Test coach'}).click();await expect(page.getByText('Audio tested')).toBeVisible();
  await page.getByRole('button',{name:'Download for offline'}).click();await expect(page.getByText('Available offline',{exact:true})).toBeVisible({timeout:20_000});
  await page.evaluate(async()=>{await navigator.serviceWorker?.ready;return true;});await page.reload();await expect(page.locator('#persistenceLoading')).toBeHidden();await context.setOffline(true);await page.reload();await expect(page.locator('#persistenceLoading')).toBeHidden();
  await openRunning(page);await page.getByRole('button',{name:'Test coach'}).click();await page.getByRole('button',{name:'Start run'}).click();
  await page.locator('#runCoachAudio').evaluate(audio=>{audio.currentTime=290;});await expect(page.getByText(/Ten seconds remaining/)).toBeVisible();
  await page.getByRole('button',{name:'Pause'}).click();await page.getByRole('button',{name:'Resume'}).click();await page.getByRole('button',{name:'End session'}).click();await page.getByRole('button',{name:/^Comfortable/}).click();await page.getByRole('button',{name:'Save run result'}).click();
  expect((await readStore(page,'runSessions'))[0].status).toBe('partial');await context.setOffline(false);
});
