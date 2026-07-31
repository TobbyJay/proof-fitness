import { test, expect } from '@playwright/test';
import { completeOnboarding, readStore } from './helpers.js';

async function openStarterRun(page) {
  await page.getByRole('button',{name:'Plan'}).first().click();
  await page.getByRole('button',{name:'Week'}).click();
  await page.getByRole('button',{name:'Open starter run'}).click();
  await expect(page.getByRole('heading',{name:/Run–walk/i})).toBeVisible();
}

test('paused visual run recovers its version, guidance and saved position', async ({ page }) => {
  await completeOnboarding(page,{guidance:'visual'});
  await openStarterRun(page);
  await page.getByRole('button',{name:'Start coached run'}).click();
  await page.getByRole('button',{name:'Skip to next phase'}).click();
  await page.getByRole('button',{name:'Pause'}).click();
  let run=(await readStore(page,'runSessions'))[0];
  expect(run).toMatchObject({status:'paused',runTemplateId:'starter-run',runTemplateVersion:1,guidanceMode:'visual'});
  expect(run.audioPositionSeconds).toBeGreaterThanOrEqual(300);

  await page.reload();
  await expect(page.getByRole('heading',{name:'Resume your coached run?'})).toBeVisible();
  await expect(page.getByText(/may be a few seconds behind/)).toBeVisible();
  await page.getByRole('button',{name:'End run'}).click();
  run=(await readStore(page,'runSessions'))[0];
  expect(run.status).toBe('completed');
  expect(run.audioPositionSeconds).toBeGreaterThanOrEqual(300);

  await openStarterRun(page);
  await page.getByRole('button',{name:'Start coached run'}).click();
  const runs=await readStore(page,'runSessions');
  expect(runs.length).toBe(2);
  expect(new Set(runs.map(item=>item.id)).size).toBe(2);
});
