import { test, expect } from '@playwright/test';
import { completeOnboarding, putRecords, readStore } from './helpers.js';

test('completed Foundation B stays the Today occurrence while C advances once and stale duplicate starts are rejected',async({page,context})=>{
  await completeOnboarding(page);
  const programme=(await readStore(page,'programmeStates'))[0];
  const old='2026-01-01T08:00:00.000Z';
  await putRecords(page,'workoutSessions',[{
    id:'completed-foundation-a',localDate:'2026-01-01',status:'completed',templateId:'foundation-a',templateVersion:1,
    programmePhase:'foundation',scheduleMode:'foundation-three-day',completedAt:old,updatedAt:old,
    workoutNameSnapshot:'Full Body A',workoutSnapshot:{templateId:'foundation-a',templateVersion:1,workoutName:'Full Body A',exercises:[]}
  }]);
  await putRecords(page,'programmeStates',[{...programme,lastCompletedRequiredTemplateId:'foundation-a',updatedAt:new Date().toISOString()}]);
  await page.reload();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Full Body B');
  await expect(page.locator('.hero-actions [data-action="start-workout"]')).toHaveText('Start workout');

  const stale=await context.newPage();
  await stale.goto('/');
  await expect(stale.locator('#persistenceLoading')).toBeHidden();
  await expect(stale.locator('#todayWorkoutName')).toHaveText('Full Body B');

  await page.locator('.hero-actions [data-action="start-workout"]').click();
  let active=(await readStore(page,'activeWorkoutSessions'))[0];
  await putRecords(page,'activeWorkoutSessions',[{...active,step:'result',currentExerciseIndex:active.workoutSnapshot.exercises.length-1}]);
  await page.reload();
  await page.locator('#resumeWorkout').click();
  await page.getByRole('button',{name:/Completed comfortably Used as progression evidence/}).click();
  await page.getByRole('button',{name:'Return to Today'}).click();

  await expect(page.locator('#todayWorkoutName')).toHaveText('Full Body B');
  await expect(page.locator('.hero-actions [data-action="start-workout"]')).toHaveText('Workout complete');
  await expect(page.locator('.hero-actions [data-action="start-workout"]')).toBeDisabled();
  await expect(page.locator('#todayWorkoutAction')).toHaveText('Complete Full Body B');
  await expect(page.locator('#workoutState')).toHaveText('Done');
  await expect(page.locator('#todayWorkoutPreview')).toContainText('Next required workout');
  await expect(page.locator('#todayWorkoutPreview')).toContainText('Full Body C');
  expect((await readStore(page,'programmeStates'))[0].lastCompletedRequiredTemplateId).toBe('foundation-b');

  await stale.locator('.hero-actions [data-action="start-workout"]').click();
  await expect(stale.locator('#toast')).toContainText('This workout has already been completed.');
  expect(await readStore(stale,'activeWorkoutSessions')).toEqual([]);
  expect((await readStore(stale,'workoutSessions')).filter(item=>item.templateId==='foundation-b')).toHaveLength(1);
  expect(await readStore(stale,'exerciseProgressionStates')).toEqual([]);

  await page.reload();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Full Body B');
  await expect(page.locator('.hero-actions [data-action="start-workout"]')).toBeDisabled();
  await expect(page.locator('#todayWorkoutPreview')).toContainText('Full Body C');
  const reopened=await context.newPage();
  await reopened.goto('/');
  await expect(reopened.locator('#persistenceLoading')).toBeHidden();
  await expect(reopened.locator('#todayWorkoutName')).toHaveText('Full Body B');
  await expect(reopened.locator('.hero-actions [data-action="start-workout"]')).toHaveText('Workout complete');
  await expect(reopened.locator('#todayWorkoutPreview')).toContainText('Full Body C');
});
