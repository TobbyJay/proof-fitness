import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { completeOnboarding, putRecords, readStore } from './helpers.js';

async function openData(page) {
  await page.getByRole('button',{name:'Data'}).first().click();
  await expect(page.getByRole('button',{name:'Export backup'})).toBeVisible();
}

test('production-shaped export resets and restores transactionally without duplication', async ({ page }, testInfo) => {
  await completeOnboarding(page);
  const now=new Date().toISOString();
  const programme=(await readStore(page,'programmeStates'))[0];
  await putRecords(page,'programmeStates',[{...programme,lastCompletedRequiredTemplateId:'foundation-b',updatedAt:now}]);
  const snapshot=(templateId,workoutName)=>({programmeId:'proof-fitness',programmeVersion:1,programmePhase:'foundation',scheduleMode:'foundation-three-day',templateSetId:'foundation-three-day',templateSetVersion:1,templateId,templateVersion:1,workoutName,createdAt:now,equipmentSnapshot:{},pullUpAvailabilitySnapshot:{status:'not-owned',safetyConfirmed:false,rung:2},exercises:[]});
  await putRecords(page,'workoutSessions',[
    {id:'audit-workout-a',localDate:'2026-07-28',status:'completed',programmePhase:'foundation',templateId:'foundation-a',templateVersion:1,workoutSnapshot:snapshot('foundation-a','Full Body A'),exercisesSnapshot:[],completedAt:now,updatedAt:now},
    {id:'audit-workout-b',localDate:'2026-07-29',status:'completed',programmePhase:'foundation',templateId:'foundation-b',templateVersion:1,workoutSnapshot:snapshot('foundation-b','Full Body B'),exercisesSnapshot:[],completedAt:now,updatedAt:now},
    {id:'audit-workout-partial',localDate:'2026-07-30',status:'partial',programmePhase:'foundation',templateId:'foundation-c',templateVersion:1,workoutSnapshot:snapshot('foundation-c','Full Body C'),exercisesSnapshot:[],completedAt:now,updatedAt:now}
  ]);
  await putRecords(page,'exerciseProgressionStates',[{id:'barbell-curl@1',exerciseId:'barbell-curl',exerciseVersion:1,calibrationStatus:'appropriate',successfulAppearances:2,pendingRecommendation:null,acceptedRecommendation:{loadKg:10,acceptedAt:now},deferredRecommendation:null,rejectedRecommendation:null,updatedAt:now}]);
  await putRecords(page,'runSessions',[{id:'audit-run',localDate:'2026-07-30',status:'completed',runTemplateId:'starter-run',runTemplateVersion:1,guidanceMode:'visual',audioPositionSeconds:1680,completedAt:now,updatedAt:now}]);
  await putRecords(page,'mealChecks',[{id:'2026-07-30:breakfast',localDate:'2026-07-30',mealId:'breakfast',status:'planned',name:'Production meal',updatedAt:now}]);
  await putRecords(page,'dailyCheckIns',[{id:'2026-07-30',localDate:'2026-07-30',feeling:'Good',energy:'Good',sleep:'Okay',soreness:'Low',updatedAt:now}]);
  await openData(page);

  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup'}).click();
  const download=await downloadPromise;
  const backupPath=await download.path();
  const payload=JSON.parse(await readFile(backupPath,'utf8'));
  expect(payload.manifest).toMatchObject({product:'proof-fitness',schemaVersion:4,programmeVersion:1});
  expect(payload.runProgressionStates).toHaveLength(1);
  expect(payload.exerciseProgressionStates).toHaveLength(1);
  expect(payload.runSessions).toHaveLength(1);
  expect(payload.workoutSessions).toHaveLength(3);
  expect(payload.workoutSessions.every(item=>item.workoutSnapshot?.templateVersion===1)).toBeTruthy();
  expect(JSON.stringify(payload)).not.toMatch(/developmentFixture|Populated demo|base64/);

  await page.getByRole('button',{name:'Reset all data'}).click();
  await expect(page.getByRole('button',{name:'Delete all local data'})).toBeDisabled();
  await page.getByRole('button',{name:'Cancel'}).click();
  expect((await readStore(page,'runSessions')).length).toBe(1);
  await page.getByRole('button',{name:'Reset all data'}).click();
  await page.locator('#resetPhrase').fill('RESET');
  await page.getByRole('button',{name:'Delete all local data'}).click();
  await expect(page.locator('#onboardingLayer')).toBeVisible();

  await page.getByRole('button',{name:'Restore a backup'}).click();
  await page.locator('#importFileInput').setInputFiles(backupPath);
  await expect(page.getByRole('heading',{name:'Replace local Proof Fitness data?'})).toBeVisible();
  await page.locator('#confirmImport').check();
  await page.getByRole('button',{name:'Replace and restore'}).click();
  await expect(page.locator('#persistenceLoading')).toBeHidden();
  await expect(page.locator('#onboardingLayer')).toHaveClass(/completed/);
  expect((await readStore(page,'runSessions')).length).toBe(1);
  expect((await readStore(page,'exerciseProgressionStates')).length).toBe(1);
  expect((await readStore(page,'workoutSessions')).length).toBe(3);
  expect((await readStore(page,'programmeStates'))[0].lastCompletedRequiredTemplateId).toBe('foundation-b');
  expect((await readStore(page,'measurements')).length).toBe(2);

  const corruptPath=testInfo.outputPath('corrupt.json');
  await writeFile(corruptPath,'{"manifest":{"product":"wrong"}}');
  await openData(page);
  await page.locator('#importFileInput').setInputFiles(corruptPath);
  await page.locator('#confirmImport').check();
  await page.getByRole('button',{name:'Replace and restore'}).click();
  await expect(page.locator('#toast')).toContainText('not a Proof Fitness export');
  expect((await readStore(page,'runSessions')).length).toBe(1);
});
