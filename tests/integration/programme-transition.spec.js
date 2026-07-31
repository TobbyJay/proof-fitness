import { test, expect } from '@playwright/test';
import { completeOnboarding, putRecords, readStore } from './helpers.js';

function completedFoundationRecords(programmeId, count) {
  const calibration={
    'goblet-squat':'appropriate','dumbbell-floor-press':'appropriate','barbell-romanian-deadlift':'appropriate',
    'one-arm-dumbbell-row':'appropriate','dumbbell-lateral-raise':'appropriate','dead-bug':'appropriate'
  };
  return Array.from({length:count},(_,index)=>({
    id:`audit-workout-${index+1}`,status:'completed',programmeStateId:programmeId,
    programmePhase:'foundation',templateId:['foundation-a','foundation-b','foundation-c'][index%3],
    templateVersion:1,localDate:`2026-07-${String(index+1).padStart(2,'0')}`,calibration,
    workoutSnapshot:{templateId:['foundation-a','foundation-b','foundation-c'][index%3],templateVersion:1,exercises:[]},
    completedAt:`2026-07-${String(index+1).padStart(2,'0')}T08:00:00.000Z`,updatedAt:new Date().toISOString()
  }));
}

async function openBlockPlan(page) {
  await page.getByRole('button',{name:'Plan'}).first().click();
  await page.getByRole('button',{name:'12 months'}).click();
}

test('Week 4 ready review persists and transitions through four- and three-day modes', async ({ page }) => {
  await completeOnboarding(page);
  const programme=(await readStore(page,'programmeStates'))[0];
  await putRecords(page,'programmeStates',[{...programme,currentProgrammeWeek:4,updatedAt:new Date().toISOString()}]);
  await putRecords(page,'workoutSessions',completedFoundationRecords(programme.id,10));
  await page.reload();
  await expect(page.locator('#persistenceLoading')).toBeHidden();

  await openBlockPlan(page);
  await page.getByRole('button',{name:'Open Week 4 review'}).click();
  await page.locator('#reviewConfidence').selectOption('adequate');
  await page.locator('#reviewRecovery').selectOption('normal');
  await page.locator('#reviewFourDays').check();
  await page.getByRole('button',{name:'Calculate and save review'}).click();
  await expect(page.getByRole('heading',{name:'Ready to choose the next schedule'})).toBeVisible();
  let review=(await readStore(page,'programmeReviews'))[0];
  expect(review.recommendation).toBe('ready');
  expect(review.userDecision).toBeNull();

  await page.getByRole('button',{name:'Choose Lean Athletic schedule'}).click();
  await page.getByRole('button',{name:/Four-day Lean Athletic/}).click();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Lower A');
  let stored=(await readStore(page,'programmeStates'))[0];
  expect(stored).toMatchObject({activePhase:'lean-athletic',scheduleMode:'lean-athletic-four-day',currentProgrammeWeek:5});
  review=(await readStore(page,'programmeReviews'))[0];
  expect(review.userDecision).toBe('lean-athletic-four-day');
  expect((await readStore(page,'workoutSessions')).length).toBe(10);

  await page.reload();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Lower A');
  await openBlockPlan(page);
  await page.getByRole('button',{name:/Compare four- and three-day modes/}).click();
  await page.getByRole('button',{name:/Three-day Lean Athletic/}).click();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Lean Athletic Full Body A');
  stored=(await readStore(page,'programmeStates'))[0];
  expect(stored.scheduleMode).toBe('lean-athletic-three-day');
  expect(stored.currentProgrammeWeek).toBe(5);
  const now=new Date().toISOString();
  await putRecords(page,'workoutSessions',[...await readStore(page,'workoutSessions'),{
    id:'audit-fallback-a',status:'completed',programmeStateId:stored.id,programmePhase:'lean-athletic',
    scheduleMode:'lean-athletic-three-day',templateId:'lean-three-day-a',templateVersion:1,
    localDate:'2026-07-30',workoutSnapshot:{templateId:'lean-three-day-a',templateVersion:1,exercises:[]},
    completedAt:now,updatedAt:now
  }]);
  await putRecords(page,'programmeStates',[{...stored,lastCompletedRequiredTemplateId:'lean-three-day-a',updatedAt:now}]);
  await page.reload();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Lean Athletic Full Body B');

  await openBlockPlan(page);
  await page.getByRole('button',{name:/Compare four- and three-day modes/}).click();
  await page.getByRole('button',{name:/Four-day Lean Athletic/}).click();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Lower A');
  const transitions=await readStore(page,'programmeTransitions');
  expect(transitions.some(item=>item.fromScheduleMode==='lean-athletic-four-day'&&item.toScheduleMode==='lean-athletic-three-day')).toBeTruthy();
  expect(transitions.some(item=>item.fromScheduleMode==='lean-athletic-three-day'&&item.toScheduleMode==='lean-athletic-four-day')).toBeTruthy();
  expect((await readStore(page,'workoutSessions')).length).toBe(11);
});

for (const [count, expected, heading] of [
  [9,'extend-one-week','Consider one more Foundation week'],
  [7,'extend-two-weeks','Consider two more Foundation weeks']
]) {
  test(`Week 4 ${expected} recommendation persists independently from a decision`, async ({ page }) => {
    await completeOnboarding(page);
    const programme=(await readStore(page,'programmeStates'))[0];
    await putRecords(page,'programmeStates',[{...programme,currentProgrammeWeek:4,updatedAt:new Date().toISOString()}]);
    await putRecords(page,'workoutSessions',completedFoundationRecords(programme.id,count));
    await page.reload();
    await expect(page.locator('#persistenceLoading')).toBeHidden();
    await openBlockPlan(page);
    await page.getByRole('button',{name:'Open Week 4 review'}).click();
    await page.locator('#reviewConfidence').selectOption('adequate');
    await page.getByRole('button',{name:'Calculate and save review'}).click();
    await expect(page.getByRole('heading',{name:heading})).toBeVisible();
    let review=(await readStore(page,'programmeReviews'))[0];
    expect(review).toMatchObject({recommendation:expected,userDecision:null});
    await page.reload();
    await openBlockPlan(page);
    await page.getByRole('button',{name:'Open Week 4 review'}).click();
    await expect(page.getByRole('heading',{name:heading})).toBeVisible();
    review=(await readStore(page,'programmeReviews'))[0];
    expect(review.userDecision).toBeNull();
  });
}
