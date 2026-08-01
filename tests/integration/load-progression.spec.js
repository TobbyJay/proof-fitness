import {test,expect} from '@playwright/test';
import {completeOnboarding,putRecords,readStore} from './helpers.js';

async function beginFirstExercise(page){
  await page.locator('[data-action="start-workout"]').first().click();
  await page.getByRole('button',{name:'Begin warm-up'}).click();
  for(const name of ['General movement','Dynamic mobility','Exercise rehearsal','Light warm-up set']) await page.getByRole('button',{name:new RegExp(name)}).click();
  await page.getByRole('button',{name:'Continue to form guide'}).click();
  await page.getByRole('button',{name:'Begin working sets'}).click();
}

test('equipment confidence and collar-aware estimates render honestly in light and dark mobile UI',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await completeOnboarding(page);
  await expect(page.locator('#todayWorkoutPreview')).toContainText('plates + handle and collars');
  await page.getByRole('button',{name:'Data'}).first().click();
  await expect(page.locator('#settingsBarSource')).toHaveValue('unknown'); await expect(page.locator('#settingsDumbbellSource')).toHaveValue('unknown'); await expect(page.locator('#settingsCollarSource')).toHaveValue('unknown');
  await page.locator('#settingsBarSource').selectOption('estimated'); await page.locator('#settingsBarWeight').fill('5');
  await page.locator('#settingsDumbbellSource').selectOption('estimated'); await page.locator('#settingsDumbbellWeight').fill('1');
  await page.locator('#settingsCollarSource').selectOption('estimated'); await page.locator('#settingsCollarWeight').fill('0.5');
  await page.getByRole('button',{name:'Save equipment weights'}).click();
  const equipment=(await readStore(page,'equipment'))[0];
  expect(equipment.barbell.weight).toEqual({weightKg:5,weightSource:'estimated'});
  expect(equipment.dumbbellHandle.weight).toEqual({weightKgEach:1,weightSource:'estimated'});
  expect(equipment.collars).toEqual({count:6,weight:{weightKgEach:0.5,weightSource:'estimated'}});
  await page.getByRole('button',{name:'Today'}).first().click();
  await expect(page.locator('#todayWorkoutPreview')).toContainText('Estimated total · 3 kg');
  await expect(page.locator('#todayWorkoutPreview')).toContainText('Estimated total · 6 kg');
  await beginFirstExercise(page); await expect(page.locator('.load-guidance .status-pill')).toHaveText('Estimated');
  const active=(await readStore(page,'activeWorkoutSessions'))[0];
  const goblet=active.workoutSnapshot.exercises.find(item=>item.exerciseId==='goblet-squat').loadingGuidanceSnapshot;
  const deadlift=active.workoutSnapshot.exercises.find(item=>item.exerciseId==='barbell-romanian-deadlift').loadingGuidanceSnapshot;
  expect(goblet).toMatchObject({collarsUsed:2,totalSystemLoadKg:3,totalLoadSource:'estimated'});
  expect(deadlift).toMatchObject({collarsUsed:2,totalSystemLoadKg:6,totalLoadSource:'estimated'});
  await page.evaluate(()=>document.getElementById('themeToggle').click()); await expect(page.locator('#app')).toHaveAttribute('data-theme','light');
  await page.evaluate(()=>document.getElementById('themeToggle').click()); await expect(page.locator('#app')).toHaveAttribute('data-theme','dark');
});

test('measured badge renders while an active historical snapshot keeps its recorded mass',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await completeOnboarding(page);
  await page.getByRole('button',{name:'Data'}).first().click();
  for(const [prefix,value] of [['Bar','5.4'],['Dumbbell','1'],['Collar','0.5']]){await page.locator(`#settings${prefix}Source`).selectOption('measured');await page.locator(`#settings${prefix}Weight`).fill(value);}
  await page.getByRole('button',{name:'Save equipment weights'}).click(); await page.getByRole('button',{name:'Today'}).first().click(); await beginFirstExercise(page);
  await expect(page.locator('.load-guidance .status-pill')).toHaveText('Measured');
  const before=(await readStore(page,'activeWorkoutSessions'))[0]; const recorded=before.workoutSnapshot.exercises[0].loadingGuidanceSnapshot.totalSystemLoadKg;
  const equipment=(await readStore(page,'equipment'))[0]; equipment.dumbbellHandle.weight.weightKgEach=2;
  await putRecords(page,'equipment',[equipment]); await page.reload(); await expect(page.locator('#persistenceLoading')).toBeHidden();
  await page.getByRole('dialog').getByRole('button',{name:'Resume workout',exact:true}).click();
  await expect(page.locator('.load-guidance .status-pill')).toHaveText('Measured');
  const after=(await readStore(page,'activeWorkoutSessions'))[0];
  expect(after.workoutSnapshot.exercises[0].loadingGuidanceSnapshot.totalSystemLoadKg).toBe(recorded);
  expect(after.workoutSnapshot.exercises[0].loadingGuidanceSnapshot.handleWeightKgEach).toBe(1);
});

test('first exposure shows exact sleeves and persists actual reps plus calibration at 320px',async({page})=>{
  await page.setViewportSize({width:320,height:568}); await completeOnboarding(page); await beginFirstExercise(page);
  await expect(page.locator('.first-exposure')).toContainText('First exposure');
  await expect(page.getByText('Suggested calibration load',{exact:true})).toBeVisible();
  await expect(page.locator('.load-guidance')).toContainText('Sleeve A'); await expect(page.locator('.load-guidance')).toContainText('0.5 kg');
  await page.getByRole('button',{name:'Increase reps'}).click();
  await page.getByRole('button',{name:/Complete set 1 with 9 reps/}).click();
  let active=(await readStore(page,'activeWorkoutSessions'))[0]; expect(active.setPerformance['goblet-squat'][0].reps).toBe(9);
  await page.getByRole('button',{name:'Start next set'}).click();
  await page.getByRole('button',{name:/Complete set 2 with 8 reps/}).click(); await page.getByRole('button',{name:'Start next set'}).click();
  await page.getByRole('button',{name:/Complete set 3 with 8 reps/}).click();
  await page.getByRole('button',{name:/Appropriate/}).click();
  const progression=(await readStore(page,'exerciseProgressionStates')).find(item=>item.exerciseId==='goblet-squat');
  expect(progression.currentWorkingLoad).toMatchObject({loadingMode:'single-dumbbell',plateLoadKg:1});
  expect(progression.performances[0].sets.map(set=>set.reps)).toEqual([9,8,8]);
  expect(progression.calibrationStatus).toBe('established');
});

test('earned progression is user-accepted, changes to an exact load, and survives recreation',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await completeOnboarding(page);
  const now='2026-08-01T10:00:00.000Z';
  await putRecords(page,'exerciseProgressionStates',[{id:'goblet-squat@1',exerciseId:'goblet-squat',exerciseVersion:1,loadingMode:'single-dumbbell',calibrationStatus:'established',currentWorkingLoad:{loadingMode:'single-dumbbell',plateLoadKg:1},performances:[],decisions:[],pendingRecommendation:{id:'recommendation:goblet-squat:increase:2',exerciseId:'goblet-squat',status:'eligible',eligible:true,direction:'increase',currentWorkingLoad:{loadingMode:'single-dumbbell',plateLoadKg:1},recommendedLoad:{loadingMode:'single-dumbbell',plateLoadKg:2},proposedLoad:2,reason:'Two controlled top-range appearances confirmed this progression.',reasonCode:'top-range-confirmed',requiresUserConfirmation:true,appliesAutomatically:false,createdAt:now},createdAt:now,updatedAt:now}]);
  await page.reload(); await expect(page.locator('#persistenceLoading')).toBeHidden(); await beginFirstExercise(page);
  await expect(page.getByText('Progression available',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Use new load'}).click();
  let progression=(await readStore(page,'exerciseProgressionStates')).find(item=>item.exerciseId==='goblet-squat');
  expect(progression.currentWorkingLoad.plateLoadKg).toBe(2); expect(progression.lastDecision.decision).toBe('accept');
  let active=(await readStore(page,'activeWorkoutSessions'))[0]; expect(active.workoutSnapshot.exercises[0].selectedLoad).toBe(2);
  expect(active.workoutSnapshot.exercises[0].loadingGuidanceSnapshot.dumbbell.sleeveA).toEqual([0.5,0.5]);
  await page.reload(); await expect(page.getByRole('heading',{name:/Continue Full Body A/})).toBeVisible();
  progression=(await readStore(page,'exerciseProgressionStates')).find(item=>item.exerciseId==='goblet-squat'); expect(progression.currentWorkingLoad.plateLoadKg).toBe(2);
});
