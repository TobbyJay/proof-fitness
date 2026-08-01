import { test, expect } from '@playwright/test';
import { completeOnboarding, installSinglePutFailure, readStore, restorePut } from './helpers.js';

async function reachFirstWorkingSet(page) {
  await page.locator('[data-action="start-workout"]').first().click();
  await expect(page.locator('#workoutStage').getByRole('heading', { name: 'Full Body A' })).toBeVisible();
  await page.getByRole('button', { name: 'High' }).click();
  await page.getByRole('button', { name: 'Begin warm-up' }).click();
  for (const item of ['General movement','Dynamic mobility','Exercise rehearsal','Light warm-up set']) {
    await page.getByRole('button', { name: new RegExp(item) }).click();
  }
  await page.getByRole('button', { name: 'Continue to form guide' }).click();
  await page.getByRole('button', { name: 'Begin working sets' }).click();
  await expect(page.getByRole('button', { name: 'Complete set 1' })).toBeVisible();
}

test('active workout snapshot, load, substitution, sets and rest recover', async ({ page, context, browser }) => {
  await completeOnboarding(page);
  await reachFirstWorkingSet(page);

  await page.getByRole('button', { name: 'Swap exercise' }).click();
  await installSinglePutFailure(page, 'activeWorkoutSessions');
  await page.locator('[data-substitute-index="2"]').click();
  await expect(page.locator('.workout-persistence-error')).toContainText('Nothing advanced');
  expect((await readStore(page,'activeWorkoutSessions'))[0].substitutions).toEqual({});
  await restorePut(page);
  await page.locator('[data-substitute-index="2"]').click();
  await page.getByRole('button', { name: 'Set today’s load' }).click();
  await page.locator('#selectedLoadInput').fill('5');
  await installSinglePutFailure(page, 'activeWorkoutSessions');
  await page.getByRole('button', { name: 'Save load' }).click();
  await expect(page.locator('#selectedLoadError')).toContainText('Could not save');
  expect((await readStore(page,'activeWorkoutSessions'))[0].workoutSnapshot.exercises[0].selectedLoad).toBe(1);
  await restorePut(page);
  await page.getByRole('button', { name: 'Save load' }).click();
  await expect(page.locator('.exercise-load')).toContainText('5 kg');

  await installSinglePutFailure(page, 'activeWorkoutSessions');
  await page.getByRole('button', { name: 'Complete set 1' }).click();
  await expect(page.locator('.workout-persistence-error')).toContainText('Nothing advanced');
  await expect(page.getByRole('button', { name: 'Complete set 1' })).toBeVisible();
  let active=(await readStore(page,'activeWorkoutSessions'))[0];
  expect(active.completedSets).toEqual({});

  await restorePut(page);
  await page.getByRole('button', { name: 'Complete set 1' }).click();
  await expect(page.getByRole('button', { name: 'Start next set' })).toBeVisible();
  active=(await readStore(page,'activeWorkoutSessions'))[0];
  expect(Object.values(active.completedSets)[0]).toEqual([1]);
  expect(active.workoutSnapshot.exercises[0].selectedLoad).toBe(5);
  expect(active.workoutSnapshot.templateId).toBe('foundation-a');
  expect(active.workoutSnapshot.templateVersion).toBe(1);
  expect(active.readiness.soreness).toBe('High');
  expect(active.supersededSnapshots.length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: /Continue Full Body A/ })).toBeVisible();
  await expect(page.locator('#resumeWorkout')).toBeVisible();
  await expect(page.getByRole('button', { name: 'End as partial' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Discard' })).toBeVisible();
  await page.locator('#resumeWorkout').click();
  await expect(page.getByRole('button', { name: 'Start next set' })).toBeVisible();

  const storage=await context.storageState({indexedDB:true});
  const recreated=await browser.newContext({storageState:storage});
  const reopened=await recreated.newPage();
  await reopened.goto('/');
  await expect(reopened.locator('#persistenceLoading')).toBeHidden();
  await expect(reopened.getByRole('heading', { name: /Continue Full Body A/ })).toBeVisible();
  await recreated.close();
});

test('failed session completion remains active and is retryable without duplication', async ({ page }) => {
  await completeOnboarding(page);
  await page.locator('[data-action="start-workout"]').first().click();
  await page.getByRole('button',{name:'Back to Today'}).click();
  await page.locator('#resumeActiveWorkout').click();
  await page.locator('[data-action="end-workout-menu"]').click();
  await installSinglePutFailure(page,'workoutSessions');
  await page.getByRole('button',{name:'End as partial'}).click();
  await expect(page.locator('#toast')).toContainText('Could not save');
  expect((await readStore(page,'activeWorkoutSessions')).length).toBe(1);
  expect(await readStore(page,'workoutSessions')).toEqual([]);
  await restorePut(page);
  await page.getByRole('button',{name:'End as partial'}).click();
  expect((await readStore(page,'activeWorkoutSessions')).length).toBe(0);
  expect((await readStore(page,'workoutSessions')).length).toBe(1);
});

test('discard does not advance the required Foundation rotation', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await completeOnboarding(page);
  await page.locator('[data-action="start-workout"]').first().click();
  await page.getByRole('button', { name: 'Back to Today' }).click();
  await page.locator('#resumeActiveWorkout').click();
  await page.locator('[data-action="end-workout-menu"]').click();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Full Body A');
  expect(await readStore(page,'workoutSessions')).toEqual([]);
  expect((await readStore(page,'programmeStates'))[0].lastCompletedRequiredTemplateId).toBeNull();
});

test('pull-up lifecycle changes future Workout C but never its active snapshot', async ({ page }) => {
  await completeOnboarding(page);
  const programme=(await readStore(page,'programmeStates'))[0];
  await page.evaluate(async value=>{
    const request=indexedDB.open('proof-fitness');const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const tx=db.transaction('programmeStates','readwrite');tx.objectStore('programmeStates').put({...value,lastCompletedRequiredTemplateId:'foundation-b'});
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  },programme);
  await page.reload();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Full Body C');
  await expect(page.locator('#todayWorkoutPreview')).toContainText('Dumbbell pullover');

  await page.getByRole('button',{name:'Plan'}).first().click();
  await page.getByRole('button',{name:'Update pull-up bar status'}).click();
  await page.getByRole('button',{name:/Installed and available/}).click();
  for(const checkbox of await page.locator('[data-pullup-safety-check]').all()) await checkbox.check();
  await page.getByRole('button',{name:'Enable pull-up workouts'}).click();
  await page.getByRole('button',{name:'Today'}).first().click();
  await expect(page.locator('#todayWorkoutPreview')).toContainText('Pull-up progression');
  await page.locator('[data-action="start-workout"]').first().click();
  let active=(await readStore(page,'activeWorkoutSessions'))[0];
  expect(active.workoutSnapshot.exercises.some(item=>item.exerciseId==='controlled-negative-pull-up')).toBeTruthy();
  expect(active.workoutSnapshot.exercises.some(item=>item.exerciseId==='dumbbell-pullover')).toBeFalsy();

  await page.getByRole('button',{name:'Back to Today'}).click();
  await page.getByRole('button',{name:'Plan'}).first().click();
  await page.getByRole('button',{name:'Review pull-up setup'}).click();
  await page.getByRole('button',{name:/Temporarily unavailable/}).click();
  active=(await readStore(page,'activeWorkoutSessions'))[0];
  expect(active.workoutSnapshot.exercises.some(item=>item.exerciseId==='controlled-negative-pull-up')).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('heading',{name:/Continue Full Body C/})).toBeVisible();
  active=(await readStore(page,'activeWorkoutSessions'))[0];
  expect(active.workoutSnapshot.pullUpAvailabilitySnapshot).toMatchObject({status:'installed-available',safetyConfirmed:true,rung:2});
});
