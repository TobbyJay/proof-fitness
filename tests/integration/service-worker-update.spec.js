import { test, expect } from '@playwright/test';
import { completeOnboarding, readStore } from './helpers.js';

async function waitForControlledServiceWorker(page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBeTruthy();
}

test('service-worker replacement preserves IndexedDB and active workout recovery', async ({ page }) => {
  await completeOnboarding(page);
  await waitForControlledServiceWorker(page);
  await page.locator('[data-action="start-workout"]').first().click();
  await page.getByRole('button',{name:'Back to Today'}).click();
  await page.evaluate(async () => { await caches.open('proof-fitness-0.4-demo'); });
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js?audit-version-b=1');
    const registration=await navigator.serviceWorker.ready;
    await registration.update();
  });
  await expect.poll(() => page.evaluate(async () => !(await caches.keys()).includes('proof-fitness-0.4-demo'))).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('heading',{name:/Continue Full Body A/})).toBeVisible();
  expect((await readStore(page,'activeWorkoutSessions')).length).toBe(1);
  expect((await readStore(page,'programmeStates'))[0].scheduleMode).toBe('foundation-three-day');
  expect((await readStore(page,'measurements')).length).toBe(2);
});

test('cached production shell reloads and accepts local writes offline', async ({ page }) => {
  await completeOnboarding(page,{guidance:'visual'});
  await waitForControlledServiceWorker(page);
  const cachedAssets=await page.evaluate(async () => {
    const cache=await caches.open('proof-fitness-v1.2.0');
    return (await cache.keys()).map(request=>new URL(request.url).pathname);
  });
  expect(cachedAssets.some(path=>path.startsWith('/assets/')&&path.endsWith('.js'))).toBeTruthy();
  expect(cachedAssets.some(path=>path.startsWith('/assets/')&&path.endsWith('.css'))).toBeTruthy();

  await page.route('**/*',route=>route.abort('internetdisconnected'));
  await page.reload();
  await expect(page.locator('#persistenceLoading')).toBeHidden();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Full Body A');
  await page.getByRole('button',{name:'Plan'}).first().click();
  await page.getByRole('button',{name:'Ate planned'}).first().click();
  expect((await readStore(page,'mealChecks')).length).toBe(1);
  await page.getByRole('button',{name:'Week'}).click();
  await page.getByRole('button',{name:'Open running'}).click();
  await expect(page.getByRole('heading',{name:/Foundation Run–Walk/i})).toBeVisible();
  await page.unroute('**/*');
});
