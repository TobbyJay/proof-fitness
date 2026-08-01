import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { completeOnboarding, putRecords, readStore, waitForBootstrap } from './helpers.js';

async function assertChoiceFamily(page,family,{minimum=1}={}) {
  const choices=page.locator(`[data-selectable-family="${family}"]`);
  await expect(choices.first()).toBeVisible();
  expect(await choices.count()).toBeGreaterThanOrEqual(minimum);
  for(const choice of await choices.all()) {
    await expect(choice).toBeVisible();
    const label=choice.locator('.selectable-control__label');
    await expect(label).not.toHaveText(/^\s*$/);
    const box=await choice.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(await choice.getAttribute('aria-pressed')).toMatch(/^(true|false)$/);
    const contrast=await label.evaluate(element=>{
      const parse=value=>{const match=value.match(/rgba?\(([^)]+)\)/);if(!match)return null;const parts=match[1].split(',').map(Number);return {r:parts[0],g:parts[1],b:parts[2],a:parts[3]??1};};
      const foreground=parse(getComputedStyle(element).color);
      let node=element,background=null;
      while(node&&!background){const parsed=parse(getComputedStyle(node).backgroundColor);if(parsed?.a>=.95)background=parsed;node=node.parentElement;}
      background ||= {r:255,g:255,b:255,a:1};
      const luminance=color=>{const channel=value=>{value/=255;return value<=.03928?value/12.92:((value+.055)/1.055)**2.4;};return .2126*channel(color.r)+.7152*channel(color.g)+.0722*channel(color.b);};
      const light=Math.max(luminance(foreground),luminance(background));const dark=Math.min(luminance(foreground),luminance(background));
      return (light+.05)/(dark+.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
  await choices.first().focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const focus=await choices.first().evaluate(element=>({style:getComputedStyle(element).outlineStyle,width:parseFloat(getComputedStyle(element).outlineWidth)}));
  expect(focus.style).not.toBe('none');
  expect(focus.width).toBeGreaterThanOrEqual(2);
}

async function expectNoHorizontalOverflow(page) {
  const result=await page.evaluate(()=>({
    fits:document.documentElement.scrollWidth<=window.innerWidth+1,
    scrollWidth:document.documentElement.scrollWidth,
    innerWidth:window.innerWidth,
    offenders:[...document.querySelectorAll('body *')].map(element=>{const rect=element.getBoundingClientRect();return {tag:element.tagName,id:element.id,className:String(element.className),left:rect.left,right:rect.right,width:rect.width};}).filter(item=>item.left < -1 || item.right > window.innerWidth+1).slice(0,12)
  }));
  expect(result,JSON.stringify(result,null,2)).toMatchObject({fits:true});
}

for(const viewport of [{width:390,height:844},{width:320,height:568}]) {
  test(`onboarding choice families remain visible, selected, persisted and mobile-safe at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    await waitForBootstrap(page);
    await page.locator('#obName').fill('Selector audit');
    await page.getByRole('button',{name:'Continue'}).click();
    await assertChoiceFamily(page,'onboarding-schedule',{minimum:7});
    await page.getByRole('button',{name:/Friday/}).click();
    await page.getByRole('button',{name:/Tuesday/}).click();
    await expect(page.locator('[data-ob-day="Tuesday"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-ob-day="Tuesday"] .selectable-control__indicator')).toHaveText('✓');
    await page.getByRole('button',{name:'Continue'}).click();
    await assertChoiceFamily(page,'onboarding-pullup',{minimum:4});
    await page.getByRole('button',{name:/Not owned/}).click();
    await expect(page.locator('[data-ob-pullup-status="not-owned"]')).toHaveAttribute('aria-pressed','true');
    await page.reload();
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await expect(page.locator('[data-ob-day="Tuesday"]')).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Continue'}).click();
    await expect(page.getByRole('heading',{name:'Make every load unambiguous.'})).toBeVisible();
    await page.getByRole('button',{name:'Continue'}).click();
    await assertChoiceFamily(page,'onboarding-audio',{minimum:3});
    await page.getByRole('button',{name:/Visual only/}).click();
    await expect(page.locator('[data-ob-audio="visual"]')).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Continue'}).click();
    await expect(page.getByRole('heading',{name:/Begin Week 1/})).toBeVisible();
    await page.reload();
    await page.getByRole('button',{name:'Back',exact:true}).click();
    await assertChoiceFamily(page,'onboarding-audio',{minimum:3});
    await expect(page.locator('[data-ob-audio="visual"]')).toHaveAttribute('aria-pressed','true');
    await expectNoHorizontalOverflow(page);
  });
}

test('light and dark application choices expose visible labels, state, focus and contrast',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await completeOnboarding(page,{guidance:'visual'});

  await page.locator('[data-action="open-feeling"]').click();
  await assertChoiceFamily(page,'daily-feeling',{minimum:5});
  await page.getByRole('button',{name:/Good Record/}).click();
  await page.reload();
  await page.locator('[data-action="open-feeling"]').click();
  await expect(page.locator('[data-feeling="Good"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Close dialog'}).click();

  await page.getByRole('button',{name:'Plan'}).first().click();
  await assertChoiceFamily(page,'meal-status',{minimum:4});
  await page.locator('[data-meal-id="breakfast"][data-meal-action="planned"]').click();
  await expect(page.locator('[data-meal-id="breakfast"][data-meal-action="planned"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-meal-id="lunch"][data-meal-action="alternative"]').click();
  await assertChoiceFamily(page,'meal-alternative',{minimum:2});
  await page.getByRole('button',{name:'Close dialog'}).click();

  await page.getByRole('button',{name:'Week'}).click();
  await page.locator('[data-action="preview-run"]').click();
  await assertChoiceFamily(page,'run-guidance',{minimum:3});
  await page.getByRole('button',{name:/Chimes only/}).click();
  await expect(page.locator('[data-run-audio-mode="chimes"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Back to Plan'}).click();

  await page.getByRole('button',{name:'Toggle appearance'}).first().click();
  await page.getByRole('button',{name:'Today'}).first().click();
  await page.locator('[data-action="open-feeling"]').click();
  await assertChoiceFamily(page,'daily-feeling',{minimum:5});
  const results=await new AxeBuilder({page}).include('#modalLayer').analyze();
  expect(results.violations.filter(item=>['serious','critical'].includes(item.impact))).toEqual([]);
  await expectNoHorizontalOverflow(page);
});

async function reachFirstExercise(page) {
  await page.locator('[data-action="start-workout"]').first().click();
  await assertChoiceFamily(page,'workout-readiness',{minimum:9});
  await assertChoiceFamily(page,'settings-rest-tone',{minimum:3});
  await page.getByRole('button',{name:'High'}).click();
  await expect(page.locator('[data-readiness-key="soreness"][data-readiness-value="High"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Begin warm-up'}).click();
  for(const item of ['General movement','Dynamic mobility','Exercise rehearsal','Light warm-up set']) await page.getByRole('button',{name:new RegExp(item)}).click();
  await page.getByRole('button',{name:'Continue to form guide'}).click();
  await page.getByRole('button',{name:'Begin working sets'}).click();
}

test('readiness, substitution, calibration and session-result choices use the shared visible control',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await completeOnboarding(page);
  await reachFirstExercise(page);
  await page.getByRole('button',{name:'Swap exercise'}).click();
  await assertChoiceFamily(page,'exercise-substitution',{minimum:1});
  await page.locator('[data-substitute-index="2"]').click();
  await expect(page.locator('#modalLayer')).toBeHidden();
  let active=(await readStore(page,'activeWorkoutSessions'))[0];
  expect(Object.keys(active.substitutions).length).toBe(1);

  const firstId=active.workoutSnapshot.exercises[0].exerciseId;
  await putRecords(page,'activeWorkoutSessions',[{...active,step:'exercise',currentExerciseIndex:0,completedSets:{[firstId]:[1,2]}}]);
  await page.reload();
  await page.locator('#resumeWorkout').click();
  await page.getByRole('button',{name:'Complete set 3'}).click();
  await assertChoiceFamily(page,'exercise-calibration',{minimum:3});
  await page.getByRole('button',{name:'Appropriate'}).click();
  active=(await readStore(page,'activeWorkoutSessions'))[0];
  expect(Object.values(active.calibration)).toContain('appropriate');

  await putRecords(page,'activeWorkoutSessions',[{...active,step:'result',currentExerciseIndex:active.workoutSnapshot.exercises.length-1}]);
  await page.reload();
  await page.locator('#resumeWorkout').click();
  await assertChoiceFamily(page,'session-result',{minimum:4});
  await expect(page.getByRole('button',{name:/Completed comfortably Used as progression evidence/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Stopped early Creates a partial session/})).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('Week 4 and programme-mode decision controls expose domain labels and selected state',async({page})=>{
  await completeOnboarding(page);
  const programme=(await readStore(page,'programmeStates'))[0];
  const now=new Date().toISOString();
  const review={id:'selector-review',programmeStateId:programme.id,reviewType:'foundation-readiness',weekNumber:4,completedWorkoutCount:10,plannedWorkoutCount:12,recommendation:'ready',userDecision:null,reasons:['Evidence is adequate.'],completedAt:now,updatedAt:now};
  await putRecords(page,'programmeReviews',[review]);
  await putRecords(page,'programmeStates',[{...programme,currentProgrammeWeek:4,weekFourReviewId:review.id,weekFourReview:{available:true,recommendation:'ready',reasons:review.reasons},updatedAt:now}]);
  await page.reload();
  await page.getByRole('button',{name:'Plan'}).first().click();
  await page.getByRole('button',{name:'12 months'}).click();
  await page.getByRole('button',{name:'Open Week 4 review'}).click();
  await assertChoiceFamily(page,'week-four-decision',{minimum:2});
  await page.getByRole('button',{name:'Choose Lean Athletic schedule'}).click();
  await assertChoiceFamily(page,'programme-mode',{minimum:2});
  await page.getByRole('button',{name:/Four-day Lean Athletic/}).click();
  await expect(page.locator('#todayWorkoutName')).toHaveText('Lower A');
  await page.reload();
  await page.getByRole('button',{name:'Plan'}).first().click();
  await page.getByRole('button',{name:'12 months'}).click();
  await page.getByRole('button',{name:/Compare four- and three-day modes/}).click();
  await expect(page.locator('[data-schedule-choice="lean-athletic-four-day"]')).toHaveAttribute('aria-pressed','true');
});
