import { test, expect } from '@playwright/test';
import { completeOnboarding, readStore } from './helpers.js';

async function openStarterRun(page) {
  await page.getByRole('button',{name:'Today'}).first().click();
  await page.locator('#todayRunningCard').getByRole('button',{name:/Start run|Review running level/}).click();
  await expect(page.getByRole('heading',{name:/Stage 1 · Foundation Run–Walk/i})).toBeVisible();
}

test('paused visual run recovers its version, guidance and saved position', async ({ page }) => {
  await completeOnboarding(page,{guidance:'visual'});
  await openStarterRun(page);
  await page.getByRole('button',{name:'Start run'}).click();
  await page.getByRole('button',{name:'Skip to next phase'}).click();
  await page.getByRole('button',{name:'Pause'}).click();
  let run=(await readStore(page,'runSessions'))[0];
  expect(run).toMatchObject({status:'paused',runTemplateId:'run-walk-stage-01',runTemplateVersion:1,guidanceMode:'visual'});
  expect(run.audioPositionSeconds).toBeGreaterThanOrEqual(300);

  await page.reload();
  await expect(page.getByRole('heading',{name:'Resume your coached run?'})).toBeVisible();
  await expect(page.getByText(/may be a few seconds behind/)).toBeVisible();
  await page.getByRole('button',{name:'End run'}).click();
  await expect(page.getByRole('heading',{name:'How did the run feel?'})).toBeVisible();
  await page.getByRole('button',{name:/Comfortable/}).click();
  await page.getByRole('button',{name:'Save run result'}).click();
  run=(await readStore(page,'runSessions'))[0];
  expect(run.status).toBe('partial');
  expect(run.audioPositionSeconds).toBeGreaterThanOrEqual(300);

  await page.getByRole('button',{name:'Return to Running'}).click();
  await page.getByRole('button',{name:'Back to Plan'}).click();
  await openStarterRun(page);
  await page.getByRole('button',{name:'Start run'}).click();
  const runs=await readStore(page,'runSessions');
  expect(runs.length).toBe(2);
  expect(new Set(runs.map(item=>item.id)).size).toBe(2);
});
