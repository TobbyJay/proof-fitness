import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { completeOnboarding, putRecords, readStore } from './helpers.js';

test('meals, other-meal evidence, feeling and measurements persist without fabricated trends', async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole('button',{name:'Progress'}).first().click();
  await expect(page.locator('#progressWeightTrend')).toHaveText('No trend yet');
  await expect(page.locator('#progressWaistTrend')).toHaveText('No trend yet');
  await putRecords(page,'measurements',[
    {id:'audit-weight-1',localDate:'2026-07-29',type:'weight',value:73.5,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
    {id:'audit-weight-2',localDate:'2026-07-30',type:'weight',value:74,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
  ]);
  await page.reload();
  await page.getByRole('button',{name:'Progress'}).first().click();
  await expect(page.locator('#progressWeightTrend')).toContainText('average 74.0 kg');

  await page.getByRole('button',{name:'Plan'}).first().click();
  await page.getByRole('button',{name:'Ate planned'}).first().click();
  await page.getByRole('button',{name:'Choose alternative'}).nth(1).click();
  await page.locator('[data-alt-index="0"]').click();
  await page.getByRole('button',{name:'Missed'}).nth(2).click();
  await page.getByRole('button',{name:'Something else'}).nth(3).click();
  await page.locator('#otherMealName').fill('Rice and beans from home');
  await page.getByRole('button',{name:'Save'}).click();
  await expect.poll(async()=>new Set((await readStore(page,'mealChecks')).map(item=>item.status)).has('other')).toBeTruthy();
  await page.reload();
  await expect(page.locator('#persistenceLoading')).toBeHidden();
  const meals=await readStore(page,'mealChecks');
  expect(new Set(meals.map(item=>item.status))).toEqual(new Set(['planned','approved-alternative','missed','other']));
  await expect(page.locator('#streakLabel')).toHaveText('0 days');

  await page.locator('[data-action="open-feeling"]').first().click();
  await page.locator('[data-feeling]').first().click();
  await expect.poll(async()=>(await readStore(page,'dailyCheckIns')).length).toBe(1);
  await page.reload();
  expect((await readStore(page,'dailyCheckIns')).length).toBe(1);
});

test('completed Today and destructive-reset dialog pass serious accessibility checks', async ({ page }) => {
  await completeOnboarding(page);
  let results=await new AxeBuilder({page}).analyze();
  expect(results.violations.filter(item=>['serious','critical'].includes(item.impact))).toEqual([]);
  await page.locator('#themeToggle').click();
  results=await new AxeBuilder({page}).analyze();
  expect(results.violations.filter(item=>['serious','critical'].includes(item.impact))).toEqual([]);
  await page.getByRole('button',{name:'Data'}).first().click();
  await page.getByRole('button',{name:'Reset all data'}).click();
  await expect(page.locator('#modalContent [data-action="close-modal"]').first()).toBeFocused();
  results=await new AxeBuilder({page}).include('#modalLayer').analyze();
  expect(results.violations.filter(item=>['serious','critical'].includes(item.impact))).toEqual([]);
});

for (const viewport of [
  {width:320,height:568},{width:375,height:667},{width:390,height:844},
  {width:430,height:932},{width:768,height:1024}
]) {
  test(`core flows do not overflow at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await completeOnboarding(page);
    const assertNoOverflow=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBeTruthy();
    await assertNoOverflow();
    await page.locator('[data-action="start-workout"]').first().click();
    await expect(page.getByRole('button',{name:'Begin warm-up'})).toBeVisible();
    await assertNoOverflow();
    await page.getByRole('button',{name:'Back to Today'}).click();
    await page.getByRole('button',{name:'Plan'}).first().click();
    await page.getByRole('button',{name:'Week'}).click();
    await page.getByRole('button',{name:'Open running'}).click();
    await expect(page.getByRole('button',{name:'Start run'})).toBeVisible();
    await assertNoOverflow();
  });
}
