import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { completeOnboarding, readStore, storeCounts } from './helpers.js';

test('clean production install exposes only empty, post-bootstrap state', async ({ page }) => {
  await page.route('**/assets/*.js', async route => {
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.continue();
  });
  const navigation = page.goto('/');
  await page.waitForSelector('#persistenceLoading', { state: 'visible' });
  await navigation;
  await expect(page.locator('#onboardingLayer')).toHaveClass(/completed/);
  await expect(page.locator('#persistenceLoading')).toBeHidden();
  await expect(page.locator('#onboardingLayer')).toBeVisible();
  await expect(page.getByText(/Populated demo|Fake 12-day streak|31 July/i)).toHaveCount(0);
  expect(await storeCounts(page)).toEqual({
    workoutSessions: 0,
    runSessions: 0,
    mealChecks: 0,
    dailyCheckIns: 0,
    measurements: 0,
    exerciseProgressionStates: 0,
    programmeReviews: 0
  });
});

test('completed onboarding starts the approved empty Foundation state', async ({ page }) => {
  await completeOnboarding(page);
  const programme = (await readStore(page, 'programmeStates'))[0];
  expect(programme).toMatchObject({
    activePhase: 'foundation',
    currentProgrammeWeek: 1,
    scheduleMode: 'foundation-three-day',
    nextWorkoutRotationIndex: 0
  });
  await expect(page.locator('#todayWorkoutName')).toHaveText('Full Body A');
  await expect(page.locator('#streakLabel')).toHaveText('0 days');
  expect((await readStore(page, 'workoutSessions')).length).toBe(0);
  expect((await readStore(page, 'runSessions')).length).toBe(0);
  expect((await readStore(page, 'measurements')).map(item => item.value).sort()).toEqual([74.5, 81.2]);
});

test('clean onboarding has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#persistenceLoading')).toBeHidden();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
