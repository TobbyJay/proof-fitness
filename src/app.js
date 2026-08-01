import starterRun from '../audio-scripts/starter-run.json';
import { phaseAtTime, phaseIndexAtTime } from './run-phase.js';
import { DEFAULT_EQUIPMENT } from './domain/equipment/equipmentCatalog.js';
import { getExercise } from './domain/exercises/exerciseCatalog.js';
import { getSubstitutionOptions } from './domain/exercises/substitutions.js';
import { PULL_UP_RUNGS } from './domain/exercises/pullUpProgression.js';
import { createProgrammeState } from './domain/programmes/createProgrammeState.js';
import { applyFoundationExtension } from './domain/programmes/foundationProgramme.js';
import { getWorkoutTemplate, PROGRAMME_VERSION } from './domain/programmes/programmeCatalog.js';
import { nextRequiredWorkout } from './domain/scheduling/workoutRotation.js';
import { createWorkoutSnapshot } from './domain/workouts/createWorkoutSnapshot.js';
import { estimateWorkoutDuration } from './domain/workouts/estimateWorkoutDuration.js';
import { foundationReadinessReview } from './domain/reviews/foundationReadinessReview.js';
import { applyProgrammeTransition, createProgrammeTransition } from './domain/programmes/programmeTransitions.js';
import { recordCalibration } from './domain/progression/calibration.js';
import { bootstrapApplication } from './state/applicationBootstrap.js';
import { persistence } from './state/persistenceCoordinator.js';
import { localDate, newId } from './db/transactions.js';
import { calculateDerived } from './state/hydrateState.js';
import { deriveWorkoutCTA } from './state/deriveWorkoutCTA.js';

const RUN_CACHE_NAME = 'proof-fitness-v1.1.0';
const RUN_AUDIO = {
  opus: '/audio/coach/starter-run-coach.opus',
  mp3: '/audio/coach/starter-run-coach.mp3',
  chimes: '/audio/chimes/starter-run-chimes.opus'
};

function renderChoice({
  className = 'choice-button', family, attributes = '', label, description = '',
  selected = false, disabled = false, badge = '', compact = false
}) {
  const classes = [className, 'selectable-control', compact ? 'selectable-control--compact' : '', selected ? 'selected' : ''].filter(Boolean).join(' ');
  return `<button type="button" class="${classes}" data-selectable-family="${family}" ${attributes} aria-pressed="${selected}" ${disabled ? 'disabled aria-disabled="true"' : ''}><span class="selectable-control__content">${badge ? `<small class="selectable-control__badge">${badge}</small>` : ''}<strong class="selectable-control__label">${label}</strong>${description ? `<small class="selectable-control__description">${description}</small>` : ''}</span><span class="selectable-control__indicator" aria-hidden="true">${selected ? '✓' : '○'}</span></button>`;
}

function savedRunMode() { return 'voice'; }
function saveRunMode(value) { return persistence.savePreference({ runGuidanceMode:value }).catch(showPersistenceError); }

const meals = [
  {
    id: 'breakfast', time: '08:00', slot: 'Breakfast',
    planned: 'Oats, milk, banana and three eggs', protein: 'Eggs + milk',
    alternatives: [
      { name: 'Two moi moi, two eggs and fruit', note: 'Similar protein and energy' },
      { name: 'Bread, sardines and plain yoghurt', note: 'Convenience option' }
    ]
  },
  {
    id: 'lunch', time: '13:00', slot: 'Lunch',
    planned: 'Rice, beans, chicken and vegetables', protein: 'Chicken + beans',
    alternatives: [
      { name: 'Boiled yam with egg and fish sauce', note: 'Similar training-day role' },
      { name: 'Potatoes, grilled chicken and vegetables', note: 'Higher-protein option' }
    ]
  },
  {
    id: 'snack', time: '16:30', slot: 'Pre-workout',
    planned: 'Banana and plain yoghurt', protein: 'Yoghurt',
    alternatives: [
      { name: 'One scoop whey and fruit', note: 'Higher-protein convenience option' },
      { name: 'Bread and two eggs', note: 'More filling alternative' }
    ]
  },
  {
    id: 'dinner', time: '20:30', slot: 'Dinner',
    planned: 'Moderate eba, okra soup and fish', protein: 'Fish',
    alternatives: [
      { name: 'Amala, ewedu and lean protein', note: 'Similar evening meal role' },
      { name: 'Rice and beans with grilled fish', note: 'Convenience option' }
    ]
  }
];

const warmupResource = {
  youtubeTitle: '5 Min Full Body Warm Up · Caroline Girvan',
  youtubeUrl: 'https://www.youtube.com/watch?v=c0VxUFHdYzs',
  guideSource: 'NHS warm-up guide',
  guideUrl: 'https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/'
};

const pullupLevels = PULL_UP_RUNGS.map(rung => {
  const exercise = getExercise(rung.exerciseId);
  return { id:rung.id, name:rung.name, short:exercise.shortName, prescription:`${exercise.defaultPrescription.sets} × ${exercise.defaultPrescription.repTarget}`, note:exercise.formCues[0] };
});


const runPhases = starterRun.phases.map((phase) => ({
  ...phase,
  mode: phase.type === 'easy-run' ? 'run' : phase.type === 'cool-down-walk' ? 'cooldown' : 'walk',
  start: phase.startSeconds,
  end: phase.startSeconds + phase.durationSeconds
}));
const RUN_TOTAL_SECONDS = starterRun.durationSeconds;

const state = {
  screen: 'today',
  theme: 'dark',
  meals: {},
  feeling: null,
  weight: null,
  completedToday: false,
  completedWorkoutSnapshots: [],
  profile: null,
  appMeta: null,
  measurements: [],
  workoutRecords: [],
  runHistory: [],
  mealChecks: [],
  checkIns: [],
  progression: [],
  reviews: [],
  transitions: [],
  derived: { streak:0,completedWorkouts:0,completedRuns:0,mealChecks:0 },
  persistenceReady: false,
  persistenceError: null,
  workout: {
    active: false,
    finished: false,
    step: 'overview',
    startedAt: null,
    elapsedBeforePause: 0,
    currentExercise: 0,
    completedSets: {},
    warmup: new Set(),
    restRemaining: 0,
    restTotal: 75,
    restEndsAt: null,
    calibration: {},
    result: null,
    restWarningPlayed: false,
    substitutions: {},
    forceFullForm: false,
    pullupEnabledAtStart: null,
    snapshot: null,
    supersededSnapshots: [],
    sessionId: null,
    persistenceMessage: ''
  },
  readiness: { energy: 'Good', sleep: 'Okay', soreness: 'Low' },
  formSeen: {},
  pullupLevel: 2,
  equipment: { ...DEFAULT_EQUIPMENT, plates: { ...DEFAULT_EQUIPMENT.plates } },
  programme: createProgrammeState(),
  run: {
    id: null,
    active: false,
    step: 'overview',
    completed: false,
    audioMode: savedRunMode(),
    audioTested: false,
    audioFormat: null,
    audioError: '',
    offlineStatus: 'checking',
    offlineProgress: 0,
    phaseIndex: 0,
    paused: false,
    lockScreenConfirmed: false,
    keepAwake: false
  },
  settings: {
    restSoundEnabled: true,
    restTone: 'double-bell',
    vibrationEnabled: true,
    audioUnlocked: false
  }
};

const pullupStatusLabels = {
  'not-owned': 'Not owned',
  'owned-not-installed': 'Owned, not installed',
  'installed-available': 'Installed and available',
  'temporarily-unavailable': 'Temporarily unavailable'
};

function pullupEnabledForFutureWorkouts() {
  return state.equipment.pullUpBarStatus === 'installed-available' && state.equipment.pullUpSafetyConfirmed;
}

function pullupEnabledForCurrentWorkout() {
  return state.workout.snapshot
    ? state.workout.snapshot.pullUpAvailabilitySnapshot.status === 'installed-available' && state.workout.snapshot.pullUpAvailabilitySnapshot.safetyConfirmed
    : pullupEnabledForFutureWorkouts();
}

function nextWorkoutTemplate() {
  const next = nextRequiredWorkout({
    scheduleMode: state.programme.scheduleMode,
    activeTemplateSetId: state.programme.activeTemplateSetId,
    lastCompletedTemplateId: state.programme.lastCompletedRequiredTemplateId,
    activeWorkoutSnapshot: state.workout.active ? state.workout.snapshot : null
  });
  return getWorkoutTemplate(next.templateId);
}

function currentWorkoutCTA() {
  const nextTemplate = nextWorkoutTemplate();
  return deriveWorkoutCTA({
    activeWorkout:state.workout,
    workoutRecords:state.workoutRecords,
    nextRequiredWorkout:{ id:nextTemplate.id,version:nextTemplate.version,name:nextTemplate.name,snapshot:null },
    localDate:localDate()
  });
}

function snapshotExerciseView(exercise) {
  const definition = getExercise(exercise.exerciseId);
  const load = exercise.selectedLoad == null
    ? ['bodyweight','bodyweight-assisted','timed-bodyweight','pull-up-progression'].includes(exercise.loadingMode) ? 'Bodyweight' : 'Calibrate load'
    : `${exercise.selectedLoad} kg`;
  return {
    id:exercise.exerciseId, name:exercise.name, sets:exercise.sets, target:exercise.repTarget,
    load, qualifier:exercise.loadingMode, plates:exercise.plateLoading?.description || (exercise.loadingMode.includes('bodyweight') || exercise.loadingMode === 'pull-up-progression' ? 'No removable plates' : 'Use a balanced achievable configuration'),
    type:exercise.loadingMode.includes('bodyweight') || exercise.loadingMode === 'pull-up-progression' ? 'bodyweight' : exercise.equipmentType,
    cue:exercise.formCues.join(' '), setup:exercise.setupSteps.join(' '), mistake:exercise.commonMistakes.join(' ') || exercise.safetyNotes[0],
    easier:`Approved regression: ${definition.regressionRule.exerciseId}.`,
    youtubeTitle:`${exercise.name} form guide`, youtubeUrl:`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.videoSearchTerm)}`,
    guideSource:`Written ${exercise.name} guidance`, guideUrl:`https://www.google.com/search?q=${encodeURIComponent(exercise.writtenGuidanceSearchTerm)}`,
    substitutes:getSubstitutionOptions(exercise.substitutionSourceExerciseId || exercise.exerciseId, { pullUpAvailable:pullupEnabledForCurrentWorkout() }).map(item => ({ id:item.id, name:item.name, note:`Uses its own ${item.defaultPrescription.sets} × ${item.defaultPrescription.repTarget} prescription` })),
    substitutionSourceExerciseId:exercise.substitutionSourceExerciseId, optional:exercise.optional, restSeconds:exercise.restSeconds
  };
}

function activeWorkoutExercises() {
  return (state.workout.snapshot?.exercises || []).map(snapshotExerciseView);
}

function currentWorkoutExercise() {
  return activeWorkoutExercises()[state.workout.currentExercise];
}

function pullupStatusLabel() {
  return pullupStatusLabels[state.equipment.pullUpBarStatus] || 'Unknown';
}

const onboardingState = {
  step: 0,
  name: '',
  weight: '',
  target: '',
  waist: '',
  days: ['Monday','Wednesday','Friday'],
  optionalDay: 'Saturday',
  barWeight: '',
  dumbbellWeight: '',
  pullupBarStatus: 'owned-not-installed',
  audioMode: 'voice',
  notificationsEnabled: false,
  exclusions: new Set()
};

const onboardingSteps = [
  {
    eyebrow: 'Goal', title: 'Start with the plan that matters now.',
    copy: 'Set the lean-gain target and begin. Food exclusions, notifications and waist tracking appear later when they are relevant.',
    render: () => `<div class="onboarding-fields two-column"><label>Name<input id="obName" value="${onboardingState.name}"></label><label>Current weight (kg, optional)<input id="obWeight" type="number" step="0.1" value="${onboardingState.weight}"></label><label>Target weight (kg, optional)<input id="obTarget" type="number" step="0.1" value="${onboardingState.target}"></label><label>Waist (cm, optional)<input id="obWaist" type="number" step="0.1" value="${onboardingState.waist}"></label></div>`
  },
  {
    eyebrow: 'Schedule', title: 'Choose three days you can defend.', copy: 'The workout sequence remains A → B → C even when a day moves.',
    render: () => `<div class="option-grid" role="group" aria-label="Required training days">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => renderChoice({className:'option-tile',family:'onboarding-schedule',attributes:`data-ob-day="${day}"`,label:day,description:onboardingState.days.includes(day)?'Required workout day':'Available',selected:onboardingState.days.includes(day)})).join('')}</div><div class="onboarding-fields"><label>Optional workout day<select id="obOptional">${['Saturday','Sunday','None'].map(x => `<option ${x===onboardingState.optionalDay?'selected':''}>${x}</option>`).join('')}</select></label></div>`
  },
  {
    eyebrow: 'Equipment', title: 'Make every load unambiguous.', copy: 'Your plate inventory is ready to confirm. Empty implement weights are optional; plate-only loads remain explicit until entered.',
    render: () => `<div class="onboarding-summary"><div><span>0.5 kg plates</span><strong>6</strong></div><div><span>1.25 kg plates</span><strong>6</strong></div><div><span>2.5 kg plates</span><strong>4</strong></div><div><span>5 kg plates</span><strong>4</strong></div><div><span>Total removable plates</span><strong>40.5 kg</strong></div><div><span>Pull-up bar</span><strong>${pullupStatusLabels[onboardingState.pullupBarStatus]}</strong></div></div><div class="equipment-status-grid" role="group" aria-label="Pull-up bar status">${Object.entries(pullupStatusLabels).map(([value,label]) => renderChoice({className:'option-tile',family:'onboarding-pullup',attributes:`data-ob-pullup-status="${value}"`,label,description:value === 'installed-available' ? 'Requires a one-time safety confirmation' : value === 'owned-not-installed' ? 'Current default · pullovers remain scheduled' : value === 'temporarily-unavailable' ? 'Pull-up progression pauses without resetting' : 'Pull-up work stays locked',selected:onboardingState.pullupBarStatus===value})).join('')}</div><div class="pullup-safety"><strong>Conditional programming</strong><p>Pull-up workouts appear only after the bar is marked installed and the safety check is confirmed. Until then, Workout C uses a dumbbell pullover with separate history.</p></div><div class="onboarding-fields two-column"><label>Empty barbell weight (optional)<input id="obBar" type="number" step="0.1" placeholder="Unknown" value="${onboardingState.barWeight}"></label><label>One empty dumbbell handle (optional)<input id="obDumbbell" type="number" step="0.1" placeholder="Unknown" value="${onboardingState.dumbbellWeight}"></label></div>`
  },
  {
    eyebrow: 'Coaching', title: 'Choose your coaching defaults.', copy: 'Pick the run guidance you want saved. You can change this later before any run.',
    render: () => `<div class="option-grid coaching-options" role="group" aria-label="Run guidance preference">${[
      ['voice','Voice coach','Continuous spoken guidance and ten-second warnings'],
      ['chimes','Chimes only','Continuous audio cues without spoken coaching'],
      ['visual','Visual only','On-screen phases; keep Proof visible']
    ].map(([value,label,note]) => renderChoice({className:'option-tile',family:'onboarding-audio',attributes:`data-ob-audio="${value}"`,label,description:note,selected:onboardingState.audioMode===value})).join('')}</div><label class="run-wake-option"><input id="obNotifications" type="checkbox" ${onboardingState.notificationsEnabled?'checked':''}> <span><strong>Allow reminder prompts later</strong><small>This preference does not request browser permission during setup.</small></span></label>`
  },
  {
    eyebrow: 'Ready', title: 'Begin Week 1 without more paperwork.', copy: 'Meals are ready. Food exclusions appear when Meals is opened; waist and reminders appear during the first weekly review.',
    render: () => `<div class="onboarding-summary"><div><span>Weeks 1–4</span><strong>Three full-body strength workouts</strong></div><div><span>After Week 4</span><strong>Consistency, calibration and recovery review</strong></div><div><span>Recommended next step</span><strong>Four-day Lean Athletic</strong></div><div><span>Always available</span><strong>Permanent three-day training</strong></div><div><span>First workout</span><strong>Full Body A</strong></div><div><span>Workout C pull slot</span><strong>${onboardingState.pullupBarStatus === 'installed-available' ? 'Pull-up setup pending safety confirmation' : 'Dumbbell pullover until bar activation'}</strong></div></div><div class="pullup-safety"><strong>Four weeks is the default calibration period.</strong><p>You will continue practising form throughout the programme.</p></div>`
  }
];

let workoutTicker = null;
let restTicker = null;
let audioContext = null;
const app = document.getElementById('app');
const modalLayer = document.getElementById('modalLayer');
const modalContent = document.getElementById('modalContent');
const toast = document.getElementById('toast');

function renderOnboarding() {
  const layer = document.getElementById('onboardingLayer');
  const content = document.getElementById('onboardingContent');
  const step = onboardingSteps[onboardingState.step];
  document.getElementById('onboardingStepLabel').textContent = `STEP ${onboardingState.step + 1} OF ${onboardingSteps.length}`;
  document.getElementById('onboardingProgressBar').style.width = `${((onboardingState.step + 1) / onboardingSteps.length) * 100}%`;
  content.innerHTML = `<div class="onboarding-step"><span class="eyebrow">${step.eyebrow}</span><h2 tabindex="-1">${step.title}</h2><p>${step.copy}</p>${step.render()}<p class="persistence-inline-error" id="onboardingPersistenceError" role="alert" aria-live="polite"></p><div class="onboarding-actions"><button class="onboarding-skip" id="onboardingRestore">Restore a backup</button><div class="onboarding-actions-right">${onboardingState.step > 0 ? '<button class="button button-ghost" id="onboardingBack">Back</button>' : ''}<button class="button button-primary" id="onboardingNext">${onboardingState.step === onboardingSteps.length - 1 ? 'Begin Week 1' : 'Continue'}</button></div></div></div>`;
  document.getElementById('onboardingNext').addEventListener('click', async () => {
    captureOnboardingStep();
    if (!onboardingState.name.trim()) { document.getElementById('onboardingPersistenceError').textContent='Enter your name to continue.'; return; }
    if (onboardingState.step < onboardingSteps.length - 1) {
      const nextStep=onboardingState.step+1;
      try { await persistence.saveOnboardingDraft(serialiseOnboarding(nextStep)); onboardingState.step=nextStep; renderOnboarding(); }
      catch (error) { document.getElementById('onboardingPersistenceError').textContent=`Could not save this step: ${error.message}`; }
    }
    else {
      try {
        const equipment={ ...state.equipment,pullUpBarStatus:onboardingState.pullupBarStatus,pullUpSafetyConfirmed:false,emptyBarbellKg:Number(onboardingState.barWeight)||null,emptyDumbbellHandleKg:Number(onboardingState.dumbbellWeight)||null };
        const measurements=[]; if(Number(onboardingState.weight)>0) measurements.push({type:'weight',value:Number(onboardingState.weight),localDate:localDate()}); if(Number(onboardingState.waist)>0) measurements.push({type:'waist',value:Number(onboardingState.waist),localDate:localDate()});
        state.programme=await persistence.completeOnboarding({ profile:{name:onboardingState.name.trim(),goal:'build-muscle-controlled-waist',targetWeightKg:Number(onboardingState.target)||null,trainingDays:[...onboardingState.days],optionalDay:onboardingState.optionalDay},preferences:{theme:state.theme,runGuidanceMode:onboardingState.audioMode,notificationsEnabled:onboardingState.notificationsEnabled},equipment,measurements,optionalConditioningEnabled:onboardingState.optionalDay!=='None' });
        state.run.audioMode=onboardingState.audioMode;
        state.equipment=equipment; state.appMeta=(await persistence.repos.appMeta.get('app')); state.profile=await persistence.repos.profile.get('profile'); state.measurements=measurements;
        layer.classList.add('completed'); updateAll(); showToast('Week 1 is ready. Your progress is stored on this device.');
      } catch(error) { document.getElementById('onboardingPersistenceError').textContent=`Could not complete onboarding: ${error.message}. Your entries remain here; retry when ready.`; }
    }
  });
  document.getElementById('onboardingBack')?.addEventListener('click', async () => { captureOnboardingStep(); const next=Math.max(0,onboardingState.step-1); try{await persistence.saveOnboardingDraft(serialiseOnboarding(next));onboardingState.step=next;renderOnboarding();}catch(error){document.getElementById('onboardingPersistenceError').textContent=error.message;} });
  document.getElementById('onboardingRestore')?.addEventListener('click',chooseImportFile);
  content.querySelectorAll('[data-ob-day]').forEach(button => button.addEventListener('click', () => {
    const day = button.dataset.obDay;
    const index = onboardingState.days.indexOf(day);
    if (index >= 0) onboardingState.days.splice(index,1); else if (onboardingState.days.length < 3) onboardingState.days.push(day); else showToast('Choose exactly three required days.');
    renderOnboarding();
  }));
  content.querySelectorAll('[data-ob-food]').forEach(button => button.addEventListener('click', () => {
    const food = button.dataset.obFood; onboardingState.exclusions.has(food) ? onboardingState.exclusions.delete(food) : onboardingState.exclusions.add(food); renderOnboarding();
  }));
  content.querySelectorAll('[data-ob-pullup-status]').forEach(button => button.addEventListener('click', () => {
    onboardingState.pullupBarStatus = button.dataset.obPullupStatus;
    renderOnboarding();
  }));
  content.querySelectorAll('[data-ob-audio]').forEach(button => button.addEventListener('click', () => {
    onboardingState.audioMode = button.dataset.obAudio;
    renderOnboarding();
  }));
}

function captureOnboardingStep() {
  const name = document.getElementById('obName'); if (name) onboardingState.name = name.value.trim();
  const weight = document.getElementById('obWeight'); if (weight) onboardingState.weight = weight.value;
  const target = document.getElementById('obTarget'); if (target) onboardingState.target = target.value;
  const waist = document.getElementById('obWaist'); if (waist) onboardingState.waist = waist.value;
  const optional = document.getElementById('obOptional'); if (optional) onboardingState.optionalDay = optional.value;
  const bar = document.getElementById('obBar'); if (bar) onboardingState.barWeight = bar.value;
  const dumbbell = document.getElementById('obDumbbell'); if (dumbbell) onboardingState.dumbbellWeight = dumbbell.value;
  const notifications = document.getElementById('obNotifications'); if (notifications) onboardingState.notificationsEnabled = notifications.checked;
}

function serialiseOnboarding(step=onboardingState.step) { return { ...onboardingState,step,days:[...onboardingState.days],exclusions:[...onboardingState.exclusions] }; }

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 2600);
}

function setTheme(theme) {
  state.theme = theme;
  app.dataset.theme = theme;
  document.documentElement.style.background = theme === 'dark' ? '#11140f' : '#f4f0e7';
  if (state.persistenceReady) persistence.savePreference({ theme }).catch(error => showPersistenceError(error));
}

function toggleTheme() { setTheme(state.theme === 'dark' ? 'light' : 'dark'); }

document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('mobileThemeToggle').addEventListener('click', toggleTheme);

function showScreen(name) {
  state.screen = name;
  document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.dataset.screen === name));
  document.querySelectorAll('[data-go]').forEach(el => el.classList.toggle('active', el.dataset.go === name));
  const workoutActive = name === 'workout' || name === 'run';
  document.querySelector('.mobile-nav').classList.toggle('hidden', workoutActive);
  document.querySelector('.mobile-header').classList.toggle('hidden', workoutActive);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.go)));

let modalReturnFocus = null;
function openModal(html) {
  modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modalContent.innerHTML = html;
  modalLayer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const close = modalContent.querySelector('[data-action="close-modal"]');
  if(close?.classList.contains('modal-close')) close.setAttribute('aria-label','Close dialog');
  modalContent.querySelectorAll('[data-action="close-modal"]').forEach(button=>button.addEventListener('click',closeModal));
  window.requestAnimationFrame(() => (close || modalContent.querySelector('button, input, select, [href]'))?.focus());
}
function closeModal() {
  modalLayer.classList.add('hidden');
  document.body.style.overflow = '';
  modalReturnFocus?.focus();
  modalReturnFocus = null;
}
modalLayer.querySelector('.modal-backdrop').addEventListener('click', closeModal);

document.addEventListener('keydown', event => {
  if (modalLayer.classList.contains('hidden')) return;
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') {
    const focusable=[...modalContent.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    if(!focusable.length) return;
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});

function renderTodayMeals() {
  const preview = document.getElementById('todayMealPreview');
  preview.innerHTML = meals.map(meal => {
    const status = state.meals[meal.id];
    const label = status?.type === 'planned' ? 'Planned meal' : status?.type === 'alternative' ? 'Alternative' : status?.type === 'missed' ? 'Missed' : status?.type === 'other' ? 'Something else' : meal.planned;
    return `<div class="meal-preview-row ${status ? 'checked' : ''}"><small>${meal.slot}</small><strong>${label}</strong><span role="img" aria-label="${status ? 'Checked' : 'Not checked'}"></span></div>`;
  }).join('');
}

function renderMeals() {
  const container = document.getElementById('mealPlanView');
  container.innerHTML = meals.map(meal => {
    const status = state.meals[meal.id];
    let stateLabel = 'Not checked';
    if (status?.type === 'planned') stateLabel = 'Planned meal';
    if (status?.type === 'alternative') stateLabel = status.name;
    if (status?.type === 'missed') stateLabel = 'Missed';
    if (status?.type === 'other') stateLabel = status.name;
    return `
      <article class="meal-card" data-meal-card="${meal.id}">
        <div class="meal-time">${meal.time}<br><span>${meal.slot}</span></div>
        <div>
          <h2>${meal.planned}</h2>
          <span class="protein-tag">Protein: ${meal.protein}</span>
          <div class="meal-options" role="group" aria-label="${meal.slot} status">
            ${renderChoice({className:'meal-option-button',family:'meal-status',attributes:`data-meal-action="planned" data-meal-id="${meal.id}"`,label:'Ate planned',selected:status?.type==='planned',compact:true})}
            ${renderChoice({className:'meal-option-button',family:'meal-status',attributes:`data-meal-action="alternative" data-meal-id="${meal.id}"`,label:'Choose alternative',selected:status?.type==='alternative',compact:true})}
            ${renderChoice({className:'meal-option-button missed',family:'meal-status',attributes:`data-meal-action="missed" data-meal-id="${meal.id}"`,label:'Missed',selected:status?.type==='missed',compact:true})}
            ${renderChoice({className:'meal-option-button',family:'meal-status',attributes:`data-meal-action="other" data-meal-id="${meal.id}"`,label:'Something else',selected:status?.type==='other',compact:true})}
          </div>
        </div>
        <div class="meal-card-state">${stateLabel}</div>
      </article>`;
  }).join('');

  container.querySelectorAll('[data-meal-action]').forEach(button => button.addEventListener('click', () => handleMealAction(button.dataset.mealId, button.dataset.mealAction)));
}

async function handleMealAction(mealId, action) {
  const meal = meals.find(item => item.id === mealId);
  if (action === 'planned') {
    try { const record=await persistence.saveMeal(mealId,'planned',{name:meal.planned}); state.mealChecks=upsertById(state.mealChecks,record); } catch(error){ return showPersistenceError(error); }
    state.meals[mealId] = { type: 'planned', name: meal.planned };
    updateAll();
    showToast(`${meal.slot} recorded.`);
    return;
  }
  if (action === 'missed') {
    try { const record=await persistence.saveMeal(mealId,'missed',{name:'Missed'}); state.mealChecks=upsertById(state.mealChecks,record); } catch(error){ return showPersistenceError(error); }
    state.meals[mealId] = { type: 'missed', name: 'Missed' };
    updateAll();
    showToast(`${meal.slot} recorded as missed—no lecture attached.`);
    return;
  }
  if (action === 'other') {
    openModal(`<div class="modal-heading"><div><span class="eyebrow">${meal.slot}</span><h2 id="modalTitle">Record something else</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>This is saved honestly and does not count as planned-meal adherence.</p><div class="modal-form"><label>What did you have?<input id="otherMealName" autocomplete="off"></label><p class="persistence-inline-error" id="otherMealError" role="alert"></p></div><div class="modal-actions"><button class="button button-ghost" data-action="close-modal">Cancel</button><button class="button button-primary" id="saveOtherMeal">Save</button></div>`);
    modalContent.querySelectorAll('[data-action="close-modal"]').forEach(button=>button.addEventListener('click',closeModal));
    document.getElementById('saveOtherMeal').addEventListener('click',async()=>{
      const name=document.getElementById('otherMealName').value.trim();
      if(!name){document.getElementById('otherMealError').textContent='Describe the meal to save it.';return;}
      try{const record=await persistence.saveMeal(mealId,'other',{name});state.mealChecks=upsertById(state.mealChecks,record);}catch(error){document.getElementById('otherMealError').textContent=`Could not save: ${error.message}. Retry.`;return;}
      state.meals[mealId]={type:'other',name};closeModal();updateAll();showToast(`${meal.slot} recorded.`);
    });
    return;
  }
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">${meal.slot}</span><h2 id="modalTitle">Choose an approved alternative</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>Alternatives are similar in training role, not claimed to be nutritionally identical.</p>
    <div class="choice-list" role="group" aria-label="Approved alternatives">
      ${meal.alternatives.map((alt,index) => renderChoice({family:'meal-alternative',attributes:`data-alt-index="${index}"`,label:alt.name,description:alt.note})).join('')}
    </div>
  `);
  modalContent.querySelectorAll('[data-alt-index]').forEach(button => button.addEventListener('click', async () => {
    const alt = meal.alternatives[Number(button.dataset.altIndex)];
    try { const record=await persistence.saveMeal(mealId,'approved-alternative',{name:alt.name}); state.mealChecks=upsertById(state.mealChecks,record); } catch(error){ return showPersistenceError(error); }
    state.meals[mealId] = { type: 'alternative', name: alt.name };
    closeModal(); updateAll(); showToast(`${meal.slot} alternative recorded.`);
  }));
}

function mealAdherence() {
  const adhered = Object.values(state.meals).filter(x => x.type === 'planned' || x.type === 'alternative').length;
  return Math.round((adhered / meals.length) * 100);
}

function updateDailyStatus() {
  const workoutCTA=currentWorkoutCTA();
  state.completedToday=workoutCTA.state==='completed';
  const mealCount = Object.keys(state.meals).length;
  const completedCount = [state.completedToday, mealCount === meals.length, Boolean(state.feeling), Boolean(state.weight)].filter(Boolean).length;
  document.getElementById('dailyDoneCount').textContent = completedCount;
  document.getElementById('mealStatusText').textContent = mealCount ? `${mealCount} of ${meals.length} checked · ${mealAdherence()}% adherence` : 'Nothing logged yet';
  document.getElementById('mealState').textContent = mealCount === meals.length ? 'Done' : 'Open';
  document.getElementById('feelingStatusText').textContent = state.feeling ? `Feeling: ${state.feeling}` : 'One tap this evening';
  document.getElementById('feelingState').textContent = state.feeling ? 'Done' : 'Log';
  document.getElementById('weightStatusText').textContent = state.weight ? `${state.weight.toFixed(1)} kg recorded` : 'Due today · weekly average matters';
  document.getElementById('weightState').textContent = state.weight ? 'Done' : 'Add';
  document.getElementById('workoutState').textContent = workoutCTA.accountabilityState;
  document.getElementById('progressMealAdherence').textContent = `${mealAdherence()}%`;
  document.getElementById('dataMealChecks').textContent = state.derived?.mealChecks||0;
  document.getElementById('dataMeasurements').textContent = state.measurements.length;
  const streak=document.getElementById('streakLabel'); if(streak) streak.textContent=`${state.derived?.streak||0} day${state.derived?.streak===1?'':'s'}`;
  const sessions=document.getElementById('dataSessionCount'); if(sessions) sessions.textContent=(state.derived.completedWorkouts+state.derived.completedRuns);
  const workoutCount=document.getElementById('progressWorkoutCount'); if(workoutCount) workoutCount.textContent=state.derived.completedWorkouts;
  const workoutLabel=document.getElementById('progressWorkoutLabel'); if(workoutLabel) workoutLabel.textContent=state.derived.completedWorkouts?'Saved sessions':'Not started';
  renderProofLine();

  document.querySelectorAll('.action-row').forEach(row => row.classList.remove('completed'));
  const rows = document.querySelectorAll('.action-row');
  if (state.completedToday) rows[0]?.classList.add('completed');
  if (mealCount === meals.length) rows[1]?.classList.add('completed');
  if (state.feeling) rows[2]?.classList.add('completed');
  if (state.weight) rows[3]?.classList.add('completed');
}

function renderProofLine() {
  const line=document.querySelector('.proof-line'); if(!line) return;
  const trainingDays=new Set(state.profile?.trainingDays||[]); const today=new Date(); const monday=new Date(today); const mondayOffset=(today.getDay()+6)%7; monday.setDate(today.getDate()-mondayOffset);
  const workouts=new Set(state.workoutRecords.filter(item=>item.status==='completed').map(item=>item.localDate));
  const checks=new Set(state.checkIns.filter(item=>item.feeling).map(item=>item.localDate)); const mealCounts=new Map();
  for(const item of state.mealChecks.filter(item=>item.status!=='unchecked')) mealCounts.set(item.localDate,(mealCounts.get(item.localDate)||0)+1);
  line.innerHTML=Array.from({length:7},(_,offset)=>{const date=new Date(monday);date.setDate(monday.getDate()+offset);const key=localDate(date);const day=date.toLocaleDateString('en-US',{weekday:'long'});const required=trainingDays.has(day);const qualifies=(mealCounts.get(key)||0)>=4&&checks.has(key)&&(!required||workouts.has(key));const future=date>today;const current=key===localDate(today);return `<div class="proof-day ${qualifies?'done':future?'future':current?'current':required?'':'rest'}"><span>${day[0]}</span><strong>${qualifies?'✓':current?'•':'—'}</strong><small>${required?'Workout':current?'Now':'Rest'}</small></div>`;}).join('');
  const title=document.getElementById('proof-line-title'); if(title) title.textContent=state.derived.streak?`${state.derived.streak} day${state.derived.streak===1?'':'s'} of proof`:'Start with today';
  const status=document.getElementById('proofLineStatus'); if(status) status.textContent=state.derived.streak?'On track':'No qualifying days yet';
}

function openFeeling() {
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Daily check-in</span><h2 id="modalTitle">How do you feel generally?</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>One honest tap. This is not a medical diagnosis.</p>
    <div class="choice-list" role="group" aria-label="Daily feeling">
      ${['Great','Good','Okay','Tired','Poor'].map(value => renderChoice({family:'daily-feeling',attributes:`data-feeling="${value}"`,label:value,description:value === 'Poor' ? 'Recovery guidance may appear' : 'Record and continue',selected:state.feeling===value})).join('')}
    </div>
  `);
  modalContent.querySelectorAll('[data-feeling]').forEach(button => button.addEventListener('click', async () => {
    try { const record=await persistence.saveCheckIn({ feeling:button.dataset.feeling,energy:state.readiness.energy,sleep:state.readiness.sleep,soreness:state.readiness.soreness }); state.checkIns=upsertById(state.checkIns,record); } catch(error){ return showPersistenceError(error); }
    state.feeling = button.dataset.feeling; closeModal(); updateAll(); showToast(`Feeling recorded: ${state.feeling}.`);
  }));
}

function logWeight() {
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Measurement</span><h2 id="modalTitle">Record a measurement</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>Trends appear only after enough real entries exist.</p>
    <div class="modal-form"><label>Measurement<select id="measurementType"><option value="weight">Weight (kg)</option><option value="waist">Waist (cm)</option></select></label><label>Value<input id="weightInput" type="number" min="20" max="300" step="0.1" placeholder="Enter value"></label></div>
    <div class="modal-actions"><button class="button button-ghost" data-action="close-modal">Cancel</button><button class="button button-primary" id="saveWeight">Save measurement</button></div>
  `);
  modalContent.querySelectorAll('[data-action="close-modal"]').forEach(x => x.addEventListener('click', closeModal));
  document.getElementById('saveWeight').addEventListener('click', async () => {
    const value = Number(document.getElementById('weightInput').value);
    const type=document.getElementById('measurementType').value;
    if (!Number.isFinite(value) || value < 20) return showToast('Enter a valid measurement.');
    try { const record=await persistence.saveMeasurement(type,value); state.measurements=[...(state.measurements||[]),record]; } catch(error){ return showPersistenceError(error); }
    if(type==='weight') state.weight=value; closeModal(); updateAll(); showToast(`${type==='weight'?`${value.toFixed(1)} kg`:`${value.toFixed(1)} cm waist`} recorded.`);
  });
}

function showPersistenceError(error) {
  state.persistenceError=error;
  if(state.workout.active && state.screen==='workout') {
    state.workout.persistenceMessage=`Could not save: ${error?.message||error}. Nothing advanced; retry the action.`;
    renderWorkout();
  }
  showToast(`Could not save: ${error?.message||error}. Try again.`);
}

function upsertById(items,record) { return [...items.filter(item=>item.id!==record.id),record]; }

function recalculateDerived() {
  state.derived=calculateDerived({
    profile:state.profile,workouts:state.workoutRecords,runs:state.runHistory,
    mealChecks:state.mealChecks,checkIns:state.checkIns
  });
}

function applyHydratedState(hydrated) {
  state.appMeta=hydrated.appMeta;
  state.profile=hydrated.profile;
  state.programme=hydrated.programme||state.programme;
  state.equipment=hydrated.equipment||state.equipment;
  state.measurements=hydrated.measurements||[];
  state.workoutRecords=hydrated.workouts||[];
  state.runHistory=hydrated.runs||[];
  state.mealChecks=hydrated.mealChecks||[];
  state.checkIns=hydrated.checkIns||[];
  state.progression=hydrated.progression||[];
  state.reviews=hydrated.reviews||[];
  state.transitions=hydrated.transitions||[];
  state.derived=hydrated.derived||state.derived;
  state.completedWorkoutSnapshots=state.workoutRecords.filter(item=>item.status==='completed').map(item=>item.workoutSnapshot);
  const today=localDate();
  state.completedToday=state.workoutRecords.some(item=>item.status==='completed'&&item.localDate===today);
  state.meals={};
  for(const item of state.mealChecks.filter(item=>item.localDate===today&&item.status!=='unchecked')) {
    state.meals[item.mealId]={type:item.status==='approved-alternative'?'alternative':item.status,name:item.name};
  }
  const todayCheck=state.checkIns.find(item=>item.localDate===today);
  state.feeling=todayCheck?.feeling||null;
  if(todayCheck) state.readiness={energy:todayCheck.energy||'Good',sleep:todayCheck.sleep||'Okay',soreness:todayCheck.soreness||'Low'};
  state.weight=state.measurements.findLast?.(item=>item.localDate===today&&item.type==='weight')?.value||null;
  if(hydrated.preferences) {
    state.theme=hydrated.preferences.theme||'dark';
    state.run.audioMode=hydrated.preferences.runGuidanceMode||'voice';
    state.settings.restSoundEnabled=hydrated.preferences.restSoundEnabled!==false;
    state.settings.restTone=hydrated.preferences.restTone||state.settings.restTone;
    state.settings.vibrationEnabled=hydrated.preferences.vibrationEnabled!==false;
  }
  if(hydrated.activeWorkout) restoreActiveWorkout(hydrated.activeWorkout);
  const activeRun=state.runHistory.find(item=>item.status==='active'||item.status==='paused');
  if(activeRun) restoreActiveRun(activeRun);
}

function restoreActiveWorkout(record) {
  const pausedAt=record.pausedAt?new Date(record.pausedAt).getTime():Date.now();
  const startedAt=new Date(record.startedAt).getTime();
  Object.assign(state.workout,{
    active:true,sessionId:record.id,snapshot:record.workoutSnapshot,step:record.step||'overview',
    currentExercise:record.currentExerciseIndex||0,completedSets:record.completedSets||{},
    calibration:record.calibration||{},substitutions:record.substitutions||{},readiness:record.readiness||state.readiness,
    supersededSnapshots:record.supersededSnapshots||[],skippedSets:record.skippedSets||[],skippedExercises:record.skippedExercises||[],
    warmup:new Set(record.warmup||[]),result:record.result||null,startedAt:null,
    elapsedBeforePause:record.elapsedSeconds||Math.max(0,Math.floor((pausedAt-startedAt)/1000)),
    restEndsAt:record.restDeadline?new Date(record.restDeadline).getTime():null
  });
  state.readiness={...state.readiness,...(record.readiness||{})};
  if(state.workout.restEndsAt) {
    state.workout.step='rest'; state.workout.restRemaining=Math.max(0,Math.ceil((state.workout.restEndsAt-Date.now())/1000));
  }
}

function restoreActiveRun(record) {
  Object.assign(state.run,{id:record.id,active:true,completed:false,step:'active',paused:true,
    audioMode:record.guidanceMode||'voice',phaseIndex:record.currentPhaseIndex||0,
    visualElapsedBeforePause:record.audioPositionSeconds||0});
}

function renderHistory() {
  const list=document.getElementById('historyList'); if(!list) return;
  const records=[...state.workoutRecords.filter(item=>['completed','partial'].includes(item.status)).map(item=>({
    date:item.localDate,title:item.workoutNameSnapshot||item.workoutSnapshot?.workoutName||item.templateId,type:item.status==='partial'?'Partial strength':'Strength',detail:`${item.templateId} · ${item.status}`
  })),...state.runHistory.filter(item=>item.status==='completed').map(item=>({date:item.localDate,title:starterRun.name,type:'Run–walk',detail:`${formatTime(Math.floor(item.audioPositionSeconds||RUN_TOTAL_SECONDS))} · ${item.guidanceMode||'voice'}`}))]
    .sort((a,b)=>b.date.localeCompare(a.date));
  list.innerHTML=records.length?records.map(item=>`<article class="history-card"><div><span class="eyebrow">${item.type}</span><h2>${item.title}</h2><p>${item.detail}</p></div><time>${item.date}</time></article>`).join(''):'<section class="insight-banner"><h2>No activity yet.</h2><p>Completed workouts and runs will appear here after they are saved.</p></section>';
  const count=document.getElementById('historyCount'); if(count) count.textContent=`${records.length} session${records.length===1?'':'s'}`;
}

function renderMeasurements() {
  for(const type of ['weight','waist']) {
    const values=state.measurements.filter(item=>item.type===type).sort((a,b)=>a.localDate.localeCompare(b.localDate));
    const latest=values.at(-1);
    const value=document.getElementById(type==='weight'?'progressWeight':'progressWaist');
    const trend=document.getElementById(type==='weight'?'progressWeightTrend':'progressWaistTrend');
    if(value) value.textContent=latest?`${Number(latest.value).toFixed(1)} ${type==='weight'?'kg':'cm'}`:'Not recorded';
    if(trend) {
      if(values.length<3) trend.textContent='No trend yet';
      else {
        const change=values.at(-1).value-values.at(0).value;
        const average=values.reduce((sum,item)=>sum+Number(item.value),0)/values.length;
        trend.textContent=`${change>=0?'+':''}${change.toFixed(1)} ${type==='weight'?'kg':'cm'} across ${values.length} entries${type==='weight'?` · average ${average.toFixed(1)} kg`:''}`;
      }
    }
  }
}

function renderProgressionEvidence() {
  const evidence=state.progression.find(item=>item.exerciseId==='barbell-romanian-deadlift');
  const status=document.getElementById('progressionStatus'); if(status) status.textContent=evidence?'Evidence saved':'Not started';
  const load=document.getElementById('progressionCurrentLoad'); if(load) load.textContent=evidence?.currentWorkingLoad!=null?`${evidence.currentWorkingLoad} kg`:evidence?'Calibration recorded':'Not calibrated';
  const copy=document.getElementById('progressionEvidenceCopy'); if(copy) copy.textContent=evidence?`Calibration: ${evidence.calibrationStatus}. Successful appearances: ${evidence.successfulAppearances||0}.`:'No performance evidence recorded.';
  const next=document.getElementById('progressionNextLoad'); if(next) next.textContent=evidence?.pendingRecommendation?.loadKg?`${evidence.pendingRecommendation.loadKg} kg`:'Not eligible';
}

function updateAll() {
  recalculateDerived();
  renderTodayMeals();
  renderMeals();
  updateDailyStatus();
  updateActiveWorkoutStrip();
  updateActiveRunStrip();
  updateLongTermUI();
  updateProgrammeUI();
  renderHistory();
  renderMeasurements();
  renderProgressionEvidence();
}

function updateProgrammeUI() {
  const nextTemplate = nextWorkoutTemplate();
  const workoutCTA=currentWorkoutCTA();
  const template = getWorkoutTemplate(workoutCTA.todayScheduledWorkout.id);
  const duration = estimateWorkoutDuration(template);
  const meta = document.getElementById('todayProgrammeMeta');
  if (meta) meta.textContent = `WEEK ${state.programme.currentProgrammeWeek} · ${state.programme.activePhase.toUpperCase()} · ${state.programme.scheduleMode.replaceAll('-', ' ').toUpperCase()}`;
  const name = document.getElementById('todayWorkoutName'); if (name) name.textContent = workoutCTA.todayScheduledWorkout.name;
  const summary = document.getElementById('todayWorkoutSummary');
  if (summary) summary.textContent = workoutCTA.state === 'completed'
    ? `${workoutCTA.todayScheduledWorkout.name} completed today · Next required: ${nextTemplate.name}.`
    : workoutCTA.state === 'active'
      ? `${workoutCTA.todayScheduledWorkout.name} is saved in progress on this device.`
      : workoutCTA.state === 'partial'
        ? `Partial session saved today · ${nextTemplate.name} remains the next required workout.`
        : `${duration.minutes} minute estimate · ${template.exercises.length} exercises · ${template.primaryAreas.join(', ')}.`;
  const action = document.getElementById('todayWorkoutAction'); if (action) action.textContent = workoutCTA.accountabilityLabel;
  const firstSlot = nextTemplate.exercises[0]; const first = getExercise(firstSlot.exerciseId);
  const firstExercise = document.getElementById('todayWorkoutFirstExercise'); if (firstExercise) firstExercise.textContent = workoutCTA.state === 'completed' ? `Next required: ${nextTemplate.name} · ${first.name}` : `Next: ${first.name} · ${firstSlot.sets} × ${firstSlot.repTarget}`;
  document.querySelectorAll('[data-action="start-workout"]').forEach(button => {
    button.disabled=workoutCTA.disabled;
    button.setAttribute('aria-disabled',String(workoutCTA.disabled));
    button.dataset.workoutCtaState=workoutCTA.state;
  });
  const primaryAction=document.querySelector('.hero-actions [data-action="start-workout"]');
  if(primaryAction) primaryAction.textContent=workoutCTA.ctaLabel;
  const preview = document.getElementById('todayWorkoutPreview');
  if (preview) preview.innerHTML = `<div class="section-heading-row"><div><span class="eyebrow">${workoutCTA.state==='completed'?'Next required workout':'Versioned workout preview'}</span><h2>${nextTemplate.name}</h2></div><span class="status-pill neutral">${nextTemplate.id} · v${nextTemplate.version}</span></div><p>${nextTemplate.primaryAreas.join(' · ')}</p><ol class="state-list">${nextTemplate.exercises.map((slot,index) => { const exercise = slot.conditional ? getExercise(pullupEnabledForFutureWorkouts() ? 'pull-up-progression' : slot.fallbackExerciseId) : getExercise(slot.exerciseId); return `<li><span>${String(index+1).padStart(2,'0')}</span><div><strong>${exercise.name}</strong><small>${exercise.equipmentType} · ${slot.sets} × ${slot.repTarget}${slot.optional ? ' · optional' : ''}</small></div></li>`; }).join('')}</ol>${nextTemplate.exercises.some(slot => slot.conditional) ? `<p class="substitution-note">Pull slot for the next workout: ${pullupEnabledForFutureWorkouts() ? 'current pull-up rung' : 'dumbbell pullover fallback'}. Starting creates an immutable equipment snapshot.</p>` : ''}<div class="import-summary"><div><span>Optional session</span><strong>${state.programme.activePhase === 'foundation' ? 'Run, walk, or mobility' : 'Optional E'}</strong></div><div><span>Review status</span><strong>${state.programme.activePhase === 'foundation' ? state.programme.currentProgrammeWeek >= 4 ? 'Available' : `Week 4 · ${4-state.programme.currentProgrammeWeek} week(s) away` : 'Foundation review retained'}</strong></div><div><span>Schedule mode</span><strong>${state.programme.scheduleMode}</strong></div></div>`;
}

async function startWorkout() {
  if (currentWorkoutCTA().state === 'completed') { showToast('This workout has already been completed.'); return; }
  if (state.settings.restSoundEnabled && !state.settings.audioUnlocked) await unlockRestAudio();
  if (!state.workout.snapshot) {
    const template = nextWorkoutTemplate();
    state.workout.snapshot = createWorkoutSnapshot({
      template, programmeVersion:state.programme.programmeVersion, programmePhase:state.programme.activePhase,
      scheduleMode:state.programme.scheduleMode, equipment:state.equipment, pullUpRung:state.pullupLevel
    });
  }
  try {
    if (!state.workout.sessionId) {
      const record=await persistence.startWorkout(state.workout.snapshot,{ readiness:{...state.readiness} }); state.workout.sessionId=record.id; state.workout.snapshot=record.workoutSnapshot;
    } else await persistence.updateWorkout(state.workout.sessionId,{status:'active',pausedAt:null});
  } catch(error) {
    if(error?.name==='WorkoutAlreadyCompletedError'){showToast(error.message);state.workout.snapshot=null;return;}
    showPersistenceError(error); return;
  }
  state.workout.active = true;
  if (state.workout.pullupEnabledAtStart === null) state.workout.pullupEnabledAtStart = pullupEnabledForFutureWorkouts();
  if (!state.workout.startedAt) state.workout.startedAt = Date.now();
  if (!state.workout.step) state.workout.step = 'overview';
  startWorkoutTicker();
  if(state.workout.step==='rest'&&state.workout.restEndsAt){clearInterval(restTicker);restTicker=setInterval(updateRestTimer,250);updateRestTimer();}
  renderWorkout();
  showScreen('workout');
}

function startWorkoutTicker() {
  clearInterval(workoutTicker);
  workoutTicker = setInterval(updateWorkoutClock, 1000);
  updateWorkoutClock();
}
function workoutElapsedSeconds() {
  if (!state.workout.startedAt) return state.workout.elapsedBeforePause;
  return state.workout.elapsedBeforePause + Math.floor((Date.now() - state.workout.startedAt) / 1000);
}
function updateWorkoutClock() {
  const total = workoutElapsedSeconds();
  document.getElementById('workoutElapsed').textContent = formatTime(total);
}
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2,'0');
  const s = Math.max(0, seconds % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function workoutProgress() {
  const exerciseBase = 22 + state.workout.currentExercise * 10;
  const stepMap = { overview: 5, warmup: 12, form: exerciseBase, exercise: exerciseBase + 3, rest: exerciseBase + 5, calibration: exerciseBase + 8, result: 94, receipt: 100 };
  return Math.min(100, stepMap[state.workout.step] ?? 0);
}

function restToneLabel() {
  return {
    'double-bell': 'Double bell',
    'digital-beep': 'Digital beep',
    'soft-chime': 'Soft chime'
  }[state.settings.restTone] || 'Double bell';
}

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

async function unlockRestAudio({ preview = false } = {}) {
  const context = getAudioContext();
  if (!context) {
    showToast('Audio alerts are not supported by this browser.');
    return false;
  }
  try {
    if (context.state === 'suspended') await context.resume();
    state.settings.audioUnlocked = context.state === 'running';
    if (preview && state.settings.audioUnlocked) playRestAlert({ preview: true });
    return state.settings.audioUnlocked;
  } catch (error) {
    state.settings.audioUnlocked = false;
    showToast('Tap Test alert again to allow workout sound.');
    return false;
  }
}

function scheduleTone(context, frequency, offset, duration, volume = 0.16, type = 'sine') {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startsAt = context.currentTime + offset;
  const endsAt = startsAt + duration;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(endsAt + 0.02);
}

function playRestAlert({ preview = false } = {}) {
  if (!state.settings.restSoundEnabled) return false;
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
    state.settings.audioUnlocked = false;
    if (!preview) showToast('Rest complete — next set ready. Tap Test alert once to enable sound.');
    return false;
  }

  if (state.settings.restTone === 'digital-beep') {
    scheduleTone(context, 880, 0, 0.11, 0.13, 'square');
    scheduleTone(context, 880, 0.19, 0.11, 0.13, 'square');
    scheduleTone(context, 1174, 0.38, 0.16, 0.14, 'square');
  } else if (state.settings.restTone === 'soft-chime') {
    scheduleTone(context, 659.25, 0, 0.42, 0.13, 'sine');
    scheduleTone(context, 783.99, 0.16, 0.48, 0.12, 'sine');
    scheduleTone(context, 987.77, 0.34, 0.58, 0.11, 'sine');
  } else {
    scheduleTone(context, 880, 0, 0.3, 0.15, 'sine');
    scheduleTone(context, 1174.66, 0.22, 0.42, 0.16, 'sine');
    scheduleTone(context, 880, 0.7, 0.24, 0.12, 'sine');
    scheduleTone(context, 1174.66, 0.88, 0.36, 0.14, 'sine');
  }

  if (state.settings.vibrationEnabled && 'vibrate' in navigator) {
    navigator.vibrate([180, 90, 180]);
  }
  return true;
}

function restAlertControls({ compact = false } = {}) {
  const soundStatus = state.settings.restSoundEnabled ? 'On' : 'Muted';
  const unlockStatus = state.settings.audioUnlocked ? 'Ready' : 'Tap test once';
  if (compact) {
    return `<div class="rest-alert-compact"><span><strong>${restToneLabel()}</strong> · ${soundStatus} · ${unlockStatus}</span><button class="text-button light" data-test-rest-alert>Test alert</button><button class="text-button light" data-toggle-rest-sound>${state.settings.restSoundEnabled ? 'Mute' : 'Unmute'}</button></div>`;
  }
  return `<section class="rest-alert-panel"><div><span class="eyebrow">Rest-complete alert</span><h3>${restToneLabel()}</h3><p>${state.settings.restSoundEnabled ? `Sound on · ${unlockStatus}` : 'Sound muted'}${state.settings.vibrationEnabled ? ' · vibration when supported' : ''}</p></div><div class="rest-tone-options" role="group" aria-label="Rest alert sound">${[['double-bell','Double bell'],['digital-beep','Digital beep'],['soft-chime','Soft chime']].map(([value,label])=>renderChoice({className:'rest-tone-option',family:'settings-rest-tone',attributes:`data-rest-tone="${value}"`,label,selected:state.settings.restTone===value,compact:true})).join('')}</div><div class="rest-alert-actions"><button class="workout-button" data-toggle-rest-sound>${state.settings.restSoundEnabled ? 'Mute sound' : 'Enable sound'}</button><button class="workout-button primary" data-test-rest-alert>Test alert</button></div></section>`;
}


function readinessMessage() {
  if (state.readiness.soreness === 'High') return 'High soreness selected: hold load increases and consider the lighter variation.';
  if (state.readiness.energy === 'Low' || state.readiness.sleep === 'Poor') return 'Low readiness: keep today’s load and use the full rest period.';
  return 'Readiness looks normal: follow the planned session and normal rest periods.';
}

function readinessControls() {
  const groups = [
    ['energy','Energy',['Low','Okay','Good']],
    ['sleep','Sleep',['Poor','Okay','Good']],
    ['soreness','Soreness',['Low','Moderate','High']]
  ];
  return `<section class="readiness-panel"><span class="eyebrow">Before you begin</span><h3>How are you arriving today?</h3><div class="readiness-grid">${groups.map(([key,label,values]) => `<div class="readiness-control"><span id="readiness-${key}-label">${label}</span><div class="readiness-options" role="group" aria-labelledby="readiness-${key}-label">${values.map(value => renderChoice({className:'readiness-option',family:'workout-readiness',attributes:`data-readiness-key="${key}" data-readiness-value="${value}"`,label:value,selected:state.readiness[key]===value,compact:true})).join('')}</div></div>`).join('')}</div><p class="readiness-read">${readinessMessage()}</p></section>`;
}

function compactFormRefresher(exercise) {
  return `<div class="workout-step"><span class="eyebrow">Exercise ${state.workout.currentExercise + 1} · quick refresher</span><div class="form-refresher"><div class="form-refresher-grid"><div><span class="eyebrow">You have seen this movement before</span><h2>${exercise.name}</h2><p>${exercise.cue}</p><small>${exercise.youtubeTitle}</small></div><div class="form-refresher-actions"><a class="workout-button" href="${exercise.youtubeUrl}" target="_blank" rel="noopener noreferrer">Watch 1-minute refresher ↗</a><button class="workout-button primary" data-form-remember="true">I remember — begin sets</button></div></div></div></div>`;
}

function openCalibrationSheet() {
  const exercise = currentWorkoutExercise();
  const subject = exercise.type === 'bodyweight' ? 'variation' : 'load';
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Calibration · ${exercise.name}</span><h2 id="modalTitle">How was that ${subject} with clean form?</h2></div></div><p>One tap only. The completed exercise remains visible behind this sheet.</p><div class="calibration-options" role="group" aria-labelledby="modalTitle">${[['too-light','Too light'],['appropriate','Appropriate'],['too-heavy','Too heavy']].map(([value,label])=>renderChoice({className:'calibration-option',family:'exercise-calibration',attributes:`data-sheet-calibration="${value}"`,label,compact:true})).join('')}</div>`);
  modalContent.querySelectorAll('[data-sheet-calibration]').forEach(button => button.addEventListener('click', () => {
    closeModal();
    handleCalibration(button.dataset.sheetCalibration);
  }));
}

function openSwapExercise() {
  const exercise = currentWorkoutExercise();
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Exercise substitution</span><h2 id="modalTitle">Swap ${exercise.name}?</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>Alternatives preserve the movement purpose as closely as this home setup allows.</p><div class="choice-list" role="group" aria-labelledby="modalTitle">${(exercise.substitutes || []).map((sub,index) => renderChoice({family:'exercise-substitution',attributes:`data-substitute-index="${index}"`,label:sub.name,description:sub.note,selected:state.workout.substitutions[exercise.substitutionSourceExerciseId||exercise.id]===sub.id})).join('')}</div>`);
  modalContent.querySelectorAll('[data-substitute-index]').forEach(button => button.addEventListener('click', async () => {
    const sub = exercise.substitutes[Number(button.dataset.substituteIndex)];
    const sourceId = exercise.substitutionSourceExerciseId || exercise.id;
    const template = getWorkoutTemplate(state.workout.snapshot.templateId);
    const previous = state.workout.snapshot;
    const nextSubstitutions={...state.workout.substitutions,[sourceId]:sub.id};
    const nextSnapshot = createWorkoutSnapshot({
      template, programmeVersion:previous.programmeVersion, programmePhase:previous.programmePhase,
      scheduleMode:previous.scheduleMode, equipment:previous.equipmentSnapshot,
      pullUpRung:previous.pullUpAvailabilitySnapshot.rung, substitutions:nextSubstitutions,
      selectedLoads:Object.fromEntries(previous.exercises.filter(item=>item.selectedLoad!=null).map(item=>[item.exerciseId,item.selectedLoad])),
      createdAt:previous.createdAt
    });
    const supersededSnapshots=[...state.workout.supersededSnapshots,previous];
    try { await persistence.updateWorkout(state.workout.sessionId,{workoutSnapshot:nextSnapshot,exercisesSnapshot:nextSnapshot.exercises,substitutions:nextSubstitutions,supersededSnapshots}); } catch(error){return showPersistenceError(error);}
    state.workout.persistenceMessage=''; state.workout.supersededSnapshots=supersededSnapshots; state.workout.substitutions=nextSubstitutions; state.workout.snapshot=nextSnapshot;
    closeModal(); renderWorkout(); showToast(`${exercise.name} swapped to ${sub.name} with its own prescription and identity.`);
  }));
}

function playRestWarning() {
  if (!state.settings.restSoundEnabled) return;
  const context = getAudioContext();
  if (context && context.state === 'running') scheduleTone(context, 523.25, 0, .12, .06, 'sine');
  if (state.settings.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate(70);
}

function activeWorkoutLabel() {
  const exercise = currentWorkoutExercise();
  if (!exercise) return 'Workout in progress';
  const completed = state.workout.completedSets[exercise.id] || [];
  if (state.workout.step === 'rest') return `${exercise.name} · Rest ${formatTime(state.workout.restRemaining)}`;
  if (state.workout.step === 'exercise') return `${exercise.name} · Set ${Math.min(completed.length + 1, exercise.sets)} of ${exercise.sets}`;
  return `${exercise.name} · ${state.workout.step}`;
}

function updateActiveWorkoutStrip() {
  let strip = document.getElementById('activeWorkoutStrip');
  if (!strip) {
    const hero = document.querySelector('[data-screen="today"] .editorial-hero');
    hero?.insertAdjacentHTML('afterend', `<section id="activeWorkoutStrip" class="active-workout-strip hidden"><div><small>WORKOUT ACTIVE</small><strong id="activeWorkoutText"></strong></div><button class="button" id="resumeActiveWorkout">Resume</button></section>`);
    strip = document.getElementById('activeWorkoutStrip');
    document.getElementById('resumeActiveWorkout')?.addEventListener('click', startWorkout);
  }
  const visible = state.workout.active && state.screen !== 'workout';
  strip?.classList.toggle('hidden', !visible);
  const text = document.getElementById('activeWorkoutText');
  if (text) text.textContent = activeWorkoutLabel();
}

function injectWeeklyCoach() {
  if (document.getElementById('weeklyCoach')) return;
  const metrics = document.querySelector('[data-screen="progress"] .metric-strip');
  metrics?.insertAdjacentHTML('afterend', `<section id="weeklyCoach" class="weekly-coach"><div><span class="eyebrow">Weekly coaching review</span><h2>Build real evidence first.</h2><p>Recommendations stay unavailable until persisted sessions, check-ins, meals, and measurements support a conclusion.</p></div><button class="button button-primary coach-action" id="openWeeklyReview">Review evidence</button></section>`);
  document.getElementById('openWeeklyReview')?.addEventListener('click', () => openModal(`<div class="modal-heading"><div><span class="eyebrow">Weekly review</span><h2 id="modalTitle">${state.workoutRecords.length?'Saved evidence':'No supported trend yet'}</h2></div><button class="modal-close" data-action="close-modal">×</button></div><div class="import-summary"><div><span>Completed workouts</span><strong>${state.derived.completedWorkouts}</strong></div><div><span>Calibration exercises</span><strong>${Object.keys(state.programme.calibrationByExerciseId).length}</strong></div><div><span>Measurements</span><strong>${state.measurements.length}</strong></div></div><div class="conflict-card"><strong>Evidence remains exercise-specific</strong><p>No load or schedule change is made silently. More consistent records are needed before a weekly recommendation is shown.</p></div>`));
}

function renderWorkout() {
  const stage = document.getElementById('workoutStage');
  const progress = workoutProgress();
  const pullupsActive = pullupEnabledForCurrentWorkout();
  const snapshot = state.workout.snapshot;
  const template = snapshot ? getWorkoutTemplate(snapshot.templateId) : nextWorkoutTemplate();
  const estimate = estimateWorkoutDuration(template);
  const hasPullSlot = template.exercises.some(slot => slot.conditional === 'pull-up-availability');
  const topbarLabel = document.getElementById('workoutTopbarLabel');
  if (topbarLabel) topbarLabel.textContent = `${template.name.toUpperCase()}${hasPullSlot ? pullupsActive ? ' · VERTICAL PULL' : ' · PULLOVER FALLBACK' : ''}`;
  const base = `${state.workout.persistenceMessage?`<p class="persistence-inline-error workout-persistence-error" role="alert">${state.workout.persistenceMessage}</p>`:''}<div class="workout-progress-label"><span>${state.workout.step.toUpperCase()}</span><span>${progress}%</span></div><div class="workout-progress-track"><div class="workout-progress-fill" style="width:${progress}%"></div></div>`;

  if (state.workout.step === 'overview') {
    const copy = hasPullSlot ? pullupsActive ? 'The installed-and-confirmed pull-up bar resolved this immutable workout snapshot to your current progression rung.' : 'This snapshot uses dumbbell pullover because the pull-up bar was unavailable when the workout started. Pull-up history remains separate.' : `This ${template.phase === 'foundation' ? 'Foundation' : 'Lean Athletic'} workout was resolved from the versioned programme catalog.`;
    stage.innerHTML = `<div class="workout-step">${base}<h1 class="workout-title">${template.name}</h1><p class="workout-copy">${copy}</p><div class="workout-overview-grid"><div><span>Estimated duration</span><strong>${estimate.minutes} min</strong></div><div><span>Exercises</span><strong>${template.exercises.length}</strong></div><div><span>Primary areas</span><strong>${template.primaryAreas.slice(0,3).join(', ')}</strong></div></div>${hasPullSlot && !pullupsActive ? `<div class="pullup-safety workout-equipment-note"><strong>Pull-ups unavailable in this snapshot</strong><p>Snapshot status: ${snapshot.pullUpAvailabilitySnapshot.status}. Equipment changes apply only to the next eligible workout.</p><button class="workout-button" data-action="pullup-setup">Update future bar status</button></div>` : ''}${readinessControls()}${restAlertControls()}<div class="workout-button-row"><button class="workout-button primary" data-workout-next="warmup">Begin warm-up</button><button class="workout-button" data-action="minimise-workout">Back to Today</button></div></div>`;
  }

  if (state.workout.step === 'warmup') {
    const warmups = [
      ['General movement','March, arm circles and easy bodyweight movement · 2 minutes'],
      ['Dynamic mobility','Hip hinges, reverse-lunge rehearsal and shoulder movement'],
      ['Exercise rehearsal', `Rehearse the first movement and ${hasPullSlot ? pullupsActive ? 'two scapular pull-up rehearsals' : 'a light pullover' : 'the main press or pull pattern'}`],
      ['Light warm-up set','Use the empty handles before working sets']
    ];
    stage.innerHTML = `<div class="workout-step">${base}<span class="eyebrow">Preparation</span><h1 class="workout-title">Warm up, then load.</h1><p class="workout-copy">The guidance is expanded in Weeks 1–2. The YouTube video is the primary follow-along resource; the written NHS guide remains available as a secondary reference.</p><a class="youtube-resource-card" href="${warmupResource.youtubeUrl}" target="_blank" rel="noopener noreferrer"><span class="youtube-play">▶</span><span><small>PRIMARY VIDEO · YOUTUBE</small><strong>${warmupResource.youtubeTitle}</strong><em>Open in YouTube ↗</em></span></a><div class="warmup-list">${warmups.map((item,i) => `<button class="warmup-item ${state.workout.warmup.has(i) ? 'complete' : ''}" data-warmup="${i}"><span class="warmup-number">${state.workout.warmup.has(i) ? '✓' : i+1}</span><span><strong>${item[0]}</strong><p>${item[1]}</p></span><b>${state.workout.warmup.has(i) ? 'Done' : 'Mark'}</b></button>`).join('')}</div><div class="workout-button-row"><a class="workout-button" href="${warmupResource.guideUrl}" target="_blank" rel="noopener noreferrer">Read ${warmupResource.guideSource} ↗</a><button class="workout-button primary" data-workout-next="form" ${state.workout.warmup.size < 4 ? 'disabled' : ''}>Continue to form guide</button></div></div>`;
  }

  if (state.workout.step === 'form') {
    const exercise = currentWorkoutExercise();
    const firstTime = (state.formSeen[exercise.id] || 0) === 0 || state.workout.forceFullForm;
    if (!firstTime) {
      stage.innerHTML = `${base}${compactFormRefresher(exercise)}`;
    } else {
      stage.innerHTML = `<div class="workout-step">${base}<span class="eyebrow">Exercise ${state.workout.currentExercise + 1} · first form guide</span><h1 class="workout-title">${exercise.name}</h1><div class="form-media"><a class="video-placeholder youtube-primary" href="${exercise.youtubeUrl}" target="_blank" rel="noopener noreferrer" aria-label="Watch ${exercise.youtubeTitle} on YouTube"><span class="play-button">▶</span><span class="video-resource-copy"><small>PRIMARY VIDEO · YOUTUBE</small><strong>${exercise.youtubeTitle}</strong><em>Watch in YouTube ↗</em></span></a><div class="form-notes"><div class="form-cue"><strong>Set-up</strong><span>${exercise.setup}</span></div><div class="form-cue"><strong>Main cue</strong><span>${exercise.cue}</span></div><div class="form-cue"><strong>Common mistake</strong><span>${exercise.mistake}</span></div><div class="form-cue"><strong>Easier variation</strong><span>${exercise.easier}</span></div></div></div><div class="resource-secondary"><span><small>SECONDARY WRITTEN GUIDE</small><strong>${exercise.guideSource}</strong></span><a class="workout-button" href="${exercise.guideUrl}" target="_blank" rel="noopener noreferrer">Open guide ↗</a></div><div class="workout-button-row"><button class="workout-button primary" data-form-begin="true">Begin working sets</button></div></div>`;
    }
  }

  if (state.workout.step === 'exercise') renderExercise(stage, base);

  if (state.workout.step === 'rest') {
    const exercise = currentWorkoutExercise();
    const total = Math.max(state.workout.restTotal || 75, state.workout.restRemaining);
    const pct = Math.max(0, Math.min(100, (state.workout.restRemaining / total) * 100));
    stage.innerHTML = `<div class="workout-step">${base}<span class="eyebrow">Rest · ${exercise.name}</span><div class="rest-display"><div class="rest-time">${formatTime(state.workout.restRemaining)}</div><p class="${state.workout.restRemaining <= 10 ? 'rest-warning' : ''}">${state.workout.restRemaining <= 10 ? 'Ten-second warning — prepare for the next set.' : `Your ${restToneLabel().toLowerCase()} alert will play when time is up.`}</p></div><div class="rest-progress"><div class="rest-progress-fill" style="width:${pct}%"></div></div>${restAlertControls({ compact: true })}<div class="workout-button-row"><button class="workout-button" data-rest-add="15">+15 seconds</button><button class="workout-button" data-rest-skip="true">End rest</button><button class="workout-button primary" data-rest-skip="true">Start next set</button></div></div>`;
  }

  // Calibration is presented as a bottom sheet in v0.3.

  if (state.workout.step === 'result') {
    stage.innerHTML = `<div class="workout-step">${base}<span class="eyebrow">Finish</span><h1 class="workout-title" id="sessionResultTitle">How did the session land?</h1><p class="workout-copy">This is the minimum honest evidence the progression system needs.</p><div class="choice-list dark-choice-list" role="group" aria-labelledby="sessionResultTitle">${['Completed comfortably','Completed but challenging','Missed repetitions or sets','Stopped early'].map(value => renderChoice({family:'session-result',attributes:`data-session-result="${value}"`,label:value,description:value.includes('Stopped') ? 'Creates a partial session' : 'Used as progression evidence',selected:state.workout.result===value})).join('')}</div></div>`;
  }

  if (state.workout.step === 'receipt') {
    const setCount = activeWorkoutExercises().reduce((sum, exercise) => sum + exercise.sets, 0);
    const completedSetCount=Object.values(state.workout.completedSets).reduce((sum,sets)=>sum+sets.length,0);
    const upcoming = nextRequiredWorkout({ scheduleMode:state.programme.scheduleMode, activeTemplateSetId:state.programme.activeTemplateSetId, lastCompletedTemplateId:state.workout.result==='Stopped early'?state.programme.lastCompletedRequiredTemplateId:snapshot.templateId });
    stage.innerHTML = `<div class="workout-step">${base}<div class="receipt"><div class="receipt-header"><div><span class="eyebrow">Workout receipt</span><h2>${snapshot.workoutName}</h2><p>Programme Week ${state.programme.currentProgrammeWeek} · ${snapshot.programmePhase}</p></div><div class="receipt-mark">✓</div></div><div class="receipt-dash"></div><div class="receipt-stats"><div><span>Duration</span><strong>${formatTime(workoutElapsedSeconds())}</strong></div><div><span>Exercises</span><strong>${snapshot.exercises.length}</strong></div><div><span>Sets completed</span><strong>${completedSetCount} / ${setCount}</strong></div><div><span>Session</span><strong>${state.workout.result}</strong></div><div><span>Evidence</span><strong>Exercise IDs preserved</strong></div><div><span>Template</span><strong>${snapshot.templateId} v${snapshot.templateVersion}</strong></div><div><span>Next</span><strong>${getWorkoutTemplate(upcoming.templateId).name}</strong></div></div><div class="receipt-dash"></div><button class="button button-primary full-width" data-action="finish-receipt">Return to Today</button></div></div>`;
  }

  bindWorkoutActions();
  requestAnimationFrame(() => document.querySelector('.workout-screen.active')?.scrollTo({ top: 0, behavior: 'auto' }));
}

function renderExercise(stage, base) {
  const exercise = currentWorkoutExercise();
  const completed = state.workout.completedSets[exercise.id] || [];
  const currentSet = Math.min(completed.length + 1, exercise.sets);
  const substituted = exercise.substitutionSourceExerciseId;
  const displayName = exercise.name;
  const pullupRung = substituted === 'pull-up-progression' && exercise.id !== 'dumbbell-pullover' ? pullupLevels.find(level => level.id === state.workout.snapshot.pullUpAvailabilitySnapshot.rung) : null;
  const snapshotExercise=state.workout.snapshot.exercises.find(item=>item.exerciseId===exercise.id);
  const displayLoad = pullupRung ? pullupRung.name : snapshotExercise?.selectedLoad!=null ? `${snapshotExercise.selectedLoad} kg` : exercise.load;
  const displayTarget = pullupRung ? pullupRung.prescription : exercise.target;
  const configurationLabel = pullupRung ? 'Equipment + current rung' : 'Plate configuration';
  const canSetLoad=!['bodyweight','bodyweight-assisted','timed-bodyweight','pull-up-progression'].includes(snapshotExercise?.loadingMode);
  stage.innerHTML = `<div class="workout-step">${base}<div class="exercise-header"><div><span class="eyebrow">Exercise ${state.workout.currentExercise + 1} of ${activeWorkoutExercises().length}${exercise.optional ? ' · optional' : ''}</span><h1 class="exercise-title">${displayName}</h1><p>${exercise.sets} × ${displayTarget}</p>${pullupRung ? `<span class="exercise-mode-badge">Rung ${pullupRung.id} of 4</span>` : ''}${substituted ? `<div class="substitution-note">Resolved from ${getExercise(substituted).name}; ${exercise.name} keeps its own prescription and history identity.</div>` : ''}</div><div class="exercise-load"><strong>${displayLoad}</strong><span>${exercise.qualifier}</span></div></div><div class="exercise-context-strip"><div><small>Previous evidence</small><strong>Not started</strong><span>Keyed by ${exercise.id}</span></div><div class="today"><small>Today</small><strong>${displayLoad} · Set ${currentSet}/${exercise.sets}</strong><span>${displayTarget}</span></div><div><small>Progression</small><strong>Earn two controlled appearances</strong><span>Never applied silently</span></div></div><div class="dark-load-panel"><span class="eyebrow">${configurationLabel}</span><h3>${snapshotExercise?.plateLoading?.description||exercise.plates}</h3><p>${exercise.cue}</p>${canSetLoad?'<button class="workout-button" data-action="set-load">Set today’s load</button>':''}</div><div class="set-grid">${Array.from({length:exercise.sets},(_,i) => `<button class="set-button ${completed.includes(i+1) ? 'complete' : currentSet === i+1 ? 'current' : ''}" data-set="${i+1}">${completed.includes(i+1) ? '✓' : String(i+1).padStart(2,'0')}</button>`).join('')}</div><button class="current-set-action" data-complete-current="true">Complete set ${currentSet}</button><div class="exercise-footer-actions"><button class="text-button light" data-action="review-form">Review form</button>${pullupRung ? '<button class="text-button light" data-action="choose-pullup-level">Change future rung</button>' : '<button class="text-button light" data-action="swap-exercise">Swap exercise</button>'}${exercise.optional ? '<button class="text-button light" data-action="skip-optional-exercise">Omit optional exercise</button>' : '<button class="text-button light" data-action="skip-set">Skip current set</button>'}</div></div>`;
}

function openSelectedLoad() {
  const exercise=currentWorkoutExercise();
  const current=state.workout.snapshot.exercises.find(item=>item.exerciseId===exercise.id);
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Workout snapshot</span><h2 id="modalTitle">Set load for ${exercise.name}</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>The saved plate configuration is restored with this active workout.</p><div class="modal-form"><label>Load in kilograms<input id="selectedLoadInput" type="number" min="0" step="0.5" value="${current?.selectedLoad??''}"></label><p class="persistence-inline-error" id="selectedLoadError" role="alert"></p></div><div class="modal-actions"><button class="button button-ghost" data-action="close-modal">Cancel</button><button class="button button-primary" id="saveSelectedLoad">Save load</button></div>`);
  modalContent.querySelectorAll('[data-action="close-modal"]').forEach(button=>button.addEventListener('click',closeModal));
  document.getElementById('saveSelectedLoad').addEventListener('click',async()=>{
    const value=Number(document.getElementById('selectedLoadInput').value);
    if(!Number.isFinite(value)||value<0){document.getElementById('selectedLoadError').textContent='Enter a valid load.';return;}
    const previous=state.workout.snapshot;
    const selectedLoads=Object.fromEntries(previous.exercises.filter(item=>item.selectedLoad!=null).map(item=>[item.exerciseId,item.selectedLoad]));
    selectedLoads[exercise.id]=value;
    const nextSnapshot=createWorkoutSnapshot({template:getWorkoutTemplate(previous.templateId),programmeVersion:previous.programmeVersion,programmePhase:previous.programmePhase,scheduleMode:previous.scheduleMode,equipment:previous.equipmentSnapshot,pullUpRung:previous.pullUpAvailabilitySnapshot.rung,substitutions:state.workout.substitutions,selectedLoads,createdAt:previous.createdAt});
    const updated=nextSnapshot.exercises.find(item=>item.exerciseId===exercise.id);
    if(!updated?.plateLoading){document.getElementById('selectedLoadError').textContent='That load cannot be made safely with the saved plate inventory.';return;}
    const supersededSnapshots=[...state.workout.supersededSnapshots,previous];
    try{await persistence.updateWorkout(state.workout.sessionId,{workoutSnapshot:nextSnapshot,exercisesSnapshot:nextSnapshot.exercises,supersededSnapshots});}catch(error){document.getElementById('selectedLoadError').textContent=`Could not save: ${error.message}. Retry.`;return;}
    state.workout.persistenceMessage='';state.workout.snapshot=nextSnapshot;state.workout.supersededSnapshots=supersededSnapshots;closeModal();renderWorkout();
  });
}

async function skipOptionalExercise() {
  const exercise = currentWorkoutExercise();
  if (!exercise?.optional) return;
  const skippedExercises=[...(state.workout.skippedExercises||[]),exercise.id];
  const hasNext=state.workout.currentExercise<activeWorkoutExercises().length-1; const currentExerciseIndex=hasNext?state.workout.currentExercise+1:state.workout.currentExercise; const step=hasNext?'form':'result';
  try { await persistence.updateWorkout(state.workout.sessionId,{skippedExercises,currentExerciseIndex,step}); } catch(error){return showPersistenceError(error);}
  state.workout.skippedExercises=skippedExercises;
  if (state.workout.currentExercise < activeWorkoutExercises().length - 1) {
    state.workout.currentExercise += 1; state.workout.step = 'form';
  } else state.workout.step = 'result';
  renderWorkout();
  showToast(`${exercise.name} omitted; required workout completion is unaffected.`);
}

async function completeCurrentSet() {
  if (state.settings.restSoundEnabled && !state.settings.audioUnlocked) await unlockRestAudio();
  const exercise = currentWorkoutExercise();
  const completed = state.workout.completedSets[exercise.id] || [];
  const nextSet = completed.length + 1;
  const nextCompleted=completed.includes(nextSet)?completed:[...completed,nextSet];
  const completedSets={...state.workout.completedSets,[exercise.id]:nextCompleted};
  try { await persistence.updateWorkout(state.workout.sessionId,{completedSets,currentExerciseIndex:state.workout.currentExercise,currentSetIndex:nextCompleted.length}); } catch(error){return showPersistenceError(error);}
  state.workout.persistenceMessage=''; state.workout.completedSets=completedSets;
  if (nextCompleted.length >= exercise.sets) {
    renderWorkout();
    openCalibrationSheet();
  } else {
    await startRest(exercise.restSeconds);
  }
}

async function startRest(seconds) {
  const deadline=Date.now()+seconds*1000;
  try { await persistence.updateWorkout(state.workout.sessionId,{restDeadline:new Date(deadline).toISOString(),status:'active'}); } catch(error){return showPersistenceError(error);}
  state.workout.restRemaining = seconds;
  state.workout.restTotal = seconds;
  state.workout.restEndsAt = deadline;
  state.workout.restWarningPlayed = false;
  state.workout.step = 'rest';
  clearInterval(restTicker);
  restTicker = setInterval(updateRestTimer, 250);
  renderWorkout();
}

function updateRestTimer() {
  if (state.workout.step !== 'rest' || !state.workout.restEndsAt) return;
  const nextRemaining = Math.max(0, Math.ceil((state.workout.restEndsAt - Date.now()) / 1000));
  if (nextRemaining !== state.workout.restRemaining) {
    state.workout.restRemaining = nextRemaining;
    if (nextRemaining <= 10 && nextRemaining > 0 && !state.workout.restWarningPlayed) {
      state.workout.restWarningPlayed = true;
      playRestWarning();
    }
    if (nextRemaining <= 0) endRest(true);
    else renderWorkout();
  }
}

async function addRestSeconds(seconds) {
  const deadline=(state.workout.restEndsAt || Date.now()) + seconds * 1000;
  try { await persistence.updateWorkout(state.workout.sessionId,{restDeadline:new Date(deadline).toISOString()}); } catch(error){return showPersistenceError(error);}
  state.workout.restEndsAt = deadline;
  state.workout.restTotal = (state.workout.restTotal || state.workout.restRemaining || 0) + seconds;
  updateRestTimer();
}

async function endRest(notify = false) {
  try { await persistence.updateWorkout(state.workout.sessionId,{restDeadline:null}); } catch(error){return showPersistenceError(error);}
  clearInterval(restTicker);
  restTicker = null;
  state.workout.restEndsAt = null;
  state.workout.restRemaining = 0;
  if (notify) {
    const alertPlayed = playRestAlert();
    if (alertPlayed) showToast('Rest complete — your next set is ready.');
  }
  state.workout.step = 'exercise';
  renderWorkout();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.workout.step === 'rest') updateRestTimer();
});

async function handleCalibration(value) {
  const exercise = currentWorkoutExercise();
  const calibration={...state.workout.calibration,[exercise.id]:value};
  const definition=getExercise(exercise.id); const existing=state.progression.find(item=>item.exerciseId===exercise.id&&item.exerciseVersion===definition.version);
  const progression={...existing,exerciseId:exercise.id,exerciseVersion:definition.version,currentWorkingLoad:state.workout.snapshot.exercises.find(item=>item.exerciseId===exercise.id)?.selectedLoad??null,currentRepTarget:exercise.target,calibrationStatus:value,successfulAppearances:existing?.successfulAppearances||0,unsuccessfulAppearances:existing?.unsuccessfulAppearances||0,pendingRecommendation:existing?.pendingRecommendation||null,acceptedRecommendation:existing?.acceptedRecommendation||null,deferredRecommendation:existing?.deferredRecommendation||null,rejectedRecommendation:existing?.rejectedRecommendation||null};
  const hasNext=state.workout.currentExercise<activeWorkoutExercises().length-1; const currentExerciseIndex=hasNext?state.workout.currentExercise+1:state.workout.currentExercise; const step=hasNext?'form':'result';
  let saved;
  try { saved=await persistence.updateWorkoutAndProgression(state.workout.sessionId,{calibration,currentExerciseIndex,step},progression); } catch(error){return showPersistenceError(error);}
  state.progression=upsertById(state.progression,saved.evidence);
  state.workout.calibration=calibration;
  if (state.programme.currentProgrammeWeek <= 2) {
    state.programme.calibrationByExerciseId = recordCalibration(state.programme.calibrationByExerciseId, {
      exerciseId:exercise.id, exerciseVersion:getExercise(exercise.id).version, response:value,
      workoutId:state.workout.snapshot.templateId
    });
  }
  state.formSeen[exercise.id] = (state.formSeen[exercise.id] || 0) + 1;
  state.workout.forceFullForm = false;
  if (state.workout.currentExercise < activeWorkoutExercises().length - 1) {
    state.workout.currentExercise += 1;
    state.workout.step = 'form';
  } else state.workout.step = 'result';
  renderWorkout();
}

function bindWorkoutActions() {
  document.querySelectorAll('[data-readiness-key]').forEach(button => button.addEventListener('click', async () => {
    const readiness={...state.readiness,[button.dataset.readinessKey]:button.dataset.readinessValue};
    try { await persistence.updateWorkout(state.workout.sessionId,{readiness}); } catch(error){return showPersistenceError(error);}
    state.readiness=readiness;
    renderWorkout();
  }));
  document.querySelectorAll('[data-form-begin]').forEach(button => button.addEventListener('click', async () => {
    const exercise = currentWorkoutExercise();
    try { await persistence.updateWorkout(state.workout.sessionId,{step:'exercise'}); } catch(error){return showPersistenceError(error);}
    state.formSeen[exercise.id] = Math.max(1, state.formSeen[exercise.id] || 0);
    state.workout.forceFullForm = false;
    state.workout.step = 'exercise'; renderWorkout();
  }));
  document.querySelectorAll('[data-form-remember]').forEach(button => button.addEventListener('click', async () => {
    try { await persistence.updateWorkout(state.workout.sessionId,{step:'exercise'}); } catch(error){return showPersistenceError(error);}
    state.workout.step = 'exercise'; renderWorkout();
  }));
  document.querySelectorAll('[data-workout-next]').forEach(button => button.addEventListener('click', async () => { if (!button.disabled) { try{await persistence.updateWorkout(state.workout.sessionId,{step:button.dataset.workoutNext});}catch(error){return showPersistenceError(error);} state.workout.step = button.dataset.workoutNext; renderWorkout(); }}));
  document.querySelectorAll('[data-warmup]').forEach(button => button.addEventListener('click', async () => { const index = Number(button.dataset.warmup); const warmup=new Set(state.workout.warmup); warmup.has(index) ? warmup.delete(index) : warmup.add(index); try{await persistence.updateWorkout(state.workout.sessionId,{warmup:[...warmup],step:'warmup'});}catch(error){return showPersistenceError(error);} state.workout.warmup=warmup; renderWorkout(); }));
  document.querySelectorAll('[data-complete-current]').forEach(button => button.addEventListener('click', completeCurrentSet));
  document.querySelectorAll('[data-set]').forEach(button => button.addEventListener('click', async () => {
    const exercise = currentWorkoutExercise();
    const setNo = Number(button.dataset.set);
    const completed = state.workout.completedSets[exercise.id] || [];
    let next=completed;
    if (completed.includes(setNo)) next=completed.filter(x => x !== setNo);
    else if (setNo === completed.length + 1) next=[...completed,setNo];
    const completedSets={...state.workout.completedSets,[exercise.id]:next};
    try{await persistence.updateWorkout(state.workout.sessionId,{completedSets,currentExerciseIndex:state.workout.currentExercise,currentSetIndex:next.length});}catch(error){return showPersistenceError(error);}
    state.workout.completedSets=completedSets;
    renderWorkout();
  }));
  document.querySelectorAll('[data-rest-skip]').forEach(button => button.addEventListener('click', () => endRest(false)));
  document.querySelectorAll('[data-rest-add]').forEach(button => button.addEventListener('click', () => addRestSeconds(Number(button.dataset.restAdd))));
  document.querySelectorAll('[data-test-rest-alert]').forEach(button => button.addEventListener('click', async () => { state.settings.restSoundEnabled = true; await unlockRestAudio({ preview: true }); renderWorkout(); }));
  document.querySelectorAll('[data-toggle-rest-sound]').forEach(button => button.addEventListener('click', async () => { const enabled=!state.settings.restSoundEnabled; try{await persistence.savePreference({restSoundEnabled:enabled});}catch(error){return showPersistenceError(error);} state.settings.restSoundEnabled = enabled; if (enabled) await unlockRestAudio(); renderWorkout(); }));
  document.querySelectorAll('[data-rest-tone]').forEach(button => button.addEventListener('click', async () => { try{await persistence.savePreference({restTone:button.dataset.restTone,restSoundEnabled:true});}catch(error){return showPersistenceError(error);} state.settings.restTone = button.dataset.restTone; state.settings.restSoundEnabled = true; await unlockRestAudio({ preview: true }); renderWorkout(); }));
  document.querySelectorAll('[data-calibration]').forEach(button => button.addEventListener('click', () => handleCalibration(button.dataset.calibration)));
  document.querySelectorAll('[data-session-result]').forEach(button => button.addEventListener('click', async () => { try{await persistence.updateWorkout(state.workout.sessionId,{result:button.dataset.sessionResult,step:'receipt'});}catch(error){return showPersistenceError(error);} state.workout.result = button.dataset.sessionResult; state.workout.step = 'receipt'; renderWorkout(); }));
  document.querySelectorAll('[data-action="finish-receipt"]').forEach(button => button.addEventListener('click', finishWorkout));
  document.querySelectorAll('[data-action="minimise-workout"]').forEach(button => button.addEventListener('click', minimiseWorkout));
  document.querySelectorAll('[data-action="week-four-review"]').forEach(button => button.addEventListener('click', weekFourReview));
  document.querySelectorAll('[data-action="choose-schedule"]').forEach(button => button.addEventListener('click', chooseSchedule));
  document.querySelectorAll('[data-action="preview-run"]').forEach(button => button.addEventListener('click', openRunOverview));
  document.querySelectorAll('[data-action="pullup-setup"]').forEach(button => button.addEventListener('click', pullupSetup));
  document.querySelectorAll('[data-action="choose-pullup-level"]').forEach(button => button.addEventListener('click', choosePullupLevel));
  document.querySelectorAll('[data-action="review-form"]').forEach(button => button.addEventListener('click', async () => { try{await persistence.updateWorkout(state.workout.sessionId,{step:'form'});}catch(error){return showPersistenceError(error);} state.workout.forceFullForm = true; state.workout.step = 'form'; renderWorkout(); }));
  document.querySelectorAll('[data-action="swap-exercise"]').forEach(button => button.addEventListener('click', openSwapExercise));
  document.querySelectorAll('[data-action="set-load"]').forEach(button => button.addEventListener('click', openSelectedLoad));
  document.querySelectorAll('[data-action="choose-pullup-level"]').forEach(button => button.addEventListener('click', choosePullupLevel));
  document.querySelectorAll('[data-action="skip-set"]').forEach(button => button.addEventListener('click', async () => {
    const exercise=currentWorkoutExercise(); const setNo=(state.workout.completedSets[exercise.id]||[]).length+1;
    const skippedSets=[...(state.workout.skippedSets||[]),{exerciseId:exercise.id,setNumber:setNo}];
    try{await persistence.updateWorkout(state.workout.sessionId,{skippedSets});}catch(error){return showPersistenceError(error);}
    state.workout.skippedSets=skippedSets; showToast(`Set ${setNo} recorded as skipped.`);
  }));
  document.querySelectorAll('[data-action="skip-optional-exercise"]').forEach(button => button.addEventListener('click', skipOptionalExercise));
}

async function finishWorkout() {
  const completedSnapshot = state.workout.snapshot;
  const partial=state.workout.result==='Stopped early';
  const nextProgramme=partial?{...state.programme}:{...state.programme,lastCompletedRequiredTemplateId:state.workout.snapshot.templateId};
  if (!partial&&state.programme.activePhase === 'foundation') {
    const completedRequiredWorkouts=state.workoutRecords.filter(item=>item.status==='completed'&&item.programmePhase==='foundation').length+1;
    nextProgramme.currentProgrammeWeek = Math.min(
      4 + nextProgramme.foundationExtensionWeeks,
      Math.floor(completedRequiredWorkouts / 3) + 1
    );
  }
  let completedRecord;
  try { const active=await persistence.repos.activeWorkouts.get(state.workout.sessionId); completedRecord=await persistence.completeWorkout({...active,result:state.workout.result,completedSets:state.workout.completedSets,calibration:state.workout.calibration,elapsedSeconds:workoutElapsedSeconds()},nextProgramme,partial?'partial':'completed'); } catch(error){return showPersistenceError(error);}
  state.programme=nextProgramme;
  state.completedToday = !partial;
  if(!partial) state.completedWorkoutSnapshots.push(completedSnapshot);
  state.workoutRecords.push(completedRecord);
  state.workout.finished = false;
  state.workout.active = false;
  state.workout.elapsedBeforePause = workoutElapsedSeconds();
  state.workout.startedAt = null;
  state.workout.snapshot = null;
  state.workout.step = 'overview';
  state.workout.currentExercise = 0;
  state.workout.completedSets = {};
  state.workout.warmup = new Set();
  state.workout.calibration = {};
  state.workout.result = null;
  state.workout.substitutions = {};
  state.workout.supersededSnapshots = [];
  state.workout.sessionId = null;
  clearInterval(workoutTicker);
  showScreen('today');
  updateAll();
  showToast(partial?'Partial workout saved. Your required rotation is unchanged.':'Workout logged automatically. Meals and feeling remain.');
}

async function minimiseWorkout() {
  if(!state.workout.sessionId) { showScreen('today'); return; }
  try { await persistence.updateWorkout(state.workout.sessionId,{status:'paused',pausedAt:new Date().toISOString(),step:state.workout.step,elapsedSeconds:workoutElapsedSeconds(),currentExerciseIndex:state.workout.currentExercise,completedSets:state.workout.completedSets}); } catch(error){return showPersistenceError(error);}
  state.workout.elapsedBeforePause = workoutElapsedSeconds();
  state.workout.startedAt = null;
  state.workout.active = true;
  clearInterval(workoutTicker);
  showScreen('today');
  updateAll();
  showToast('Workout paused. Every completed set is saved on this device.');
}

function openWorkoutRecovery() {
  if(!state.workout.sessionId) return;
  const completedSets=Object.values(state.workout.completedSets).reduce((sum,sets)=>sum+sets.length,0);
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Saved workout</span><h2 id="modalTitle">Continue ${state.workout.snapshot?.workoutName||'your workout'}?</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>The exact workout snapshot, substitutions, equipment, completed sets, and rest deadline are stored locally.</p>
    <div class="import-summary"><div><span>Elapsed</span><strong>${formatTime(state.workout.elapsedBeforePause)}</strong></div><div><span>Exercise</span><strong>${state.workout.currentExercise+1} / ${state.workout.snapshot?.exercises.length||0}</strong></div><div><span>Sets saved</span><strong>${completedSets}</strong></div></div>
    <div class="modal-actions"><button class="button button-ghost" id="discardWorkout">Discard</button><button class="button button-secondary" id="partialWorkout">End as partial</button><button class="button button-primary" id="resumeWorkout">Resume workout</button></div>
  `);
  document.getElementById('resumeWorkout').addEventListener('click', async () => { closeModal(); await startWorkout(); });
  document.getElementById('partialWorkout').addEventListener('click', async () => {
    try { const active=await persistence.repos.activeWorkouts.get(state.workout.sessionId); const record=await persistence.completeWorkout({...active,elapsedSeconds:state.workout.elapsedBeforePause},state.programme,'partial'); state.workoutRecords.push(record); clearRecoveredWorkout(); closeModal(); showScreen('today'); updateAll(); showToast('Partial workout saved.'); } catch(error){showPersistenceError(error);}
  });
  document.getElementById('discardWorkout').addEventListener('click', async () => {
    if(!window.confirm('Discard this saved workout? Completed sets in this session will be permanently removed.')) return;
    try { await persistence.discardWorkout(state.workout.sessionId); clearRecoveredWorkout(); closeModal(); showScreen('today'); updateAll(); showToast('Saved workout discarded.'); } catch(error){showPersistenceError(error);}
  });
}

function clearRecoveredWorkout() {
  Object.assign(state.workout,{active:false,sessionId:null,snapshot:null,step:'overview',currentExercise:0,completedSets:{},calibration:{},substitutions:{},warmup:new Set(),elapsedBeforePause:0,startedAt:null,restEndsAt:null});
}

function showProgressionRules() {
  const evidence=state.progression.find(item=>item.exerciseId==='barbell-romanian-deadlift');
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Progression rules</span><h2 id="modalTitle">Barbell Romanian deadlift · ${evidence?'Evidence saved':'Not started'}</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>${evidence?'This record is keyed to the stable exercise ID and version.':'No performance evidence has been recorded for this stable exercise ID.'}</p>
    <div class="import-summary"><div><span>Exercise ID</span><strong>barbell-romanian-deadlift</strong></div><div><span>Successful appearances</span><strong>${evidence?.successfulAppearances||0} / 2</strong></div><div><span>Automatic increase</span><strong>Never</strong></div></div>
    <div class="conflict-card"><strong>Conservative double progression</strong><p>Build controlled repetitions in range, then receive an achievable plate recommendation. Accept, defer, or reject it; no load changes silently.</p></div>
    <div class="modal-actions"><button class="button button-primary" data-action="close-modal">Understood</button></div>
  `);
  modalContent.querySelectorAll('[data-action="close-modal"]').forEach(button => button.addEventListener('click', closeModal));
}
async function exportData() {
  let payload;
  try { payload=await persistence.exportAll(PROGRAMME_VERSION); } catch(error){return showPersistenceError(error);}
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `proof-fitness-backup-${localDate()}.json`; link.click();
  URL.revokeObjectURL(url);
  const exportedAt=new Date().toISOString();
  try{state.appMeta=await persistence.repos.appMeta.put({...state.appMeta,lastExportedAt:exportedAt});const label=document.getElementById('lastBackupText');if(label)label.textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(exportedAt));}catch(error){showPersistenceError(error);}
  showToast('JSON backup created. Keep it private.');
}

function chooseImportFile() { document.getElementById('importFileInput')?.click(); }

async function importDataFile(file) {
  if(!file) return;
  let payload;
  try { payload=JSON.parse(await file.text()); } catch { return showPersistenceError(new Error('The selected file is not valid JSON.')); }
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Restore backup</span><h2 id="modalTitle">Replace local Proof Fitness data?</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>This is a replace import. It validates the backup first, then replaces all current records in one transaction.</p>
    <div class="import-summary"><div><span>Exported</span><strong>${payload.manifest?.exportedAt||'Unknown'}</strong></div><div><span>Schema</span><strong>${payload.manifest?.schemaVersion??'Unknown'}</strong></div><div><span>Workouts</span><strong>${payload.workoutSessions?.length??'Unknown'}</strong></div></div>
    <label class="confirm-reset"><input id="confirmImport" type="checkbox"> I understand my current local data will be replaced.</label>
    <div class="modal-actions"><button class="button button-ghost" data-action="close-modal">Cancel</button><button class="button button-primary" id="completeImport" disabled>Replace and restore</button></div>
  `);
  document.getElementById('confirmImport').addEventListener('change',event=>{document.getElementById('completeImport').disabled=!event.target.checked;});
  document.getElementById('completeImport').addEventListener('click', async () => { try{await persistence.importReplace(payload);window.location.reload();}catch(error){showPersistenceError(error);} });
}

function resetData() {
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Destructive reset</span><h2 id="modalTitle">Reset all Proof Fitness data</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>This permanently deletes onboarding, programme state, workouts, runs, meals, check-ins, measurements, progression, and reviews from this browser.</p><label class="modal-form">Type RESET to continue<input id="resetPhrase" autocomplete="off"></label><div class="modal-actions"><button class="button button-ghost" data-action="close-modal">Cancel</button><button class="button button-primary" id="completeReset" disabled>Delete all local data</button></div>`);
  const input=document.getElementById('resetPhrase'); const button=document.getElementById('completeReset');
  input.addEventListener('input',()=>{button.disabled=input.value!=='RESET';});
  button.addEventListener('click',async()=>{try{await persistence.resetAll();if('caches' in window){for(const key of await caches.keys()) if(key.startsWith('proof-fitness-')) await caches.delete(key);}window.location.reload();}catch(error){showPersistenceError(error);}});
}


function choosePullupLevel() {
  if (!pullupEnabledForFutureWorkouts()) {
    openModal(`<div class="modal-heading"><div><span class="eyebrow">Pull-up progression locked</span><h2 id="modalTitle">Install and confirm the bar first</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>Your current Workout C uses a dumbbell pullover. Pull-up rungs become available only after the bar is installed and the one-time safety confirmation is complete.</p><div class="pullup-safety"><strong>Current status</strong><p>${pullupStatusLabel()}</p></div><div class="modal-actions"><button class="button button-primary" id="openPullupStatus">Update bar status</button></div>`);
    document.getElementById('openPullupStatus')?.addEventListener('click', () => { closeModal(); pullupSetup(); });
    return;
  }
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Pull-up progression</span><h2 id="modalTitle">Choose the rung you can perform cleanly</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>The goal is not to force full pull-ups immediately. Start where the movement is controlled.</p><div class="pullup-ladder" role="group" aria-labelledby="modalTitle">${pullupLevels.map(level => `<button type="button" class="pullup-rung selectable-control ${state.pullupLevel === level.id ? 'selected' : ''}" data-selectable-family="pullup-rung" data-pullup-level="${level.id}" aria-pressed="${state.pullupLevel===level.id}"><span>${level.id}</span><span><strong class="selectable-control__label">${level.name}</strong><small class="selectable-control__description">${level.prescription} · ${level.note}</small></span><b>${state.pullupLevel === level.id ? '✓ CURRENT' : '○ CHOOSE'}</b></button>`).join('')}</div><div class="pullup-safety"><strong>Safety before volume</strong><p>Confirm the bar is secure before every session. Stop if the frame, fasteners or bar shift. No kipping in this home programme.</p></div>`);
  modalContent.querySelectorAll('[data-pullup-level]').forEach(button => button.addEventListener('click', async () => {
    const pullUpProgressionRung=Number(button.dataset.pullupLevel);
    try{const saved=await persistence.saveEquipment({...state.equipment,pullUpProgressionRung});state.equipment=saved;}catch(error){return showPersistenceError(error);}
    state.pullupLevel = pullUpProgressionRung;
    closeModal(); renderWorkout(); updateLongTermUI(); showToast(`${pullupLevels.find(x => x.id === state.pullupLevel).name} selected.`);
  }));
}

function renderPullupSafetyConfirmation() {
  const checks = [
    'The bar is installed according to its instructions',
    'The doorway, wall or frame is suitable and undamaged',
    'The bar does not shift under a controlled partial-load test',
    'Head and floor clearance are sufficient',
    'The rated load is suitable for me'
  ];
  openModal(`<div class="modal-heading"><div><span class="eyebrow">One-time activation</span><h2 id="modalTitle">Confirm the installed bar</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>These checks unlock pull-up programming for future workouts. They do not modify a workout already in progress.</p><div class="safety-checklist">${checks.map((text,index) => `<label><input type="checkbox" data-pullup-safety-check="${index}"><span>${text}</span></label>`).join('')}</div><div class="pullup-safety"><strong>Before every session</strong><p>Perform a quick visual and partial-load check. Stop if the bar or mounting surface moves.</p></div><div class="modal-actions"><button class="button button-secondary" id="cancelPullupActivation">Keep pullovers</button><button class="button button-primary" id="confirmPullupActivation" disabled>Enable pull-up workouts</button></div>`);
  const boxes = [...modalContent.querySelectorAll('[data-pullup-safety-check]')];
  const confirm = document.getElementById('confirmPullupActivation');
  const refresh = () => { confirm.disabled = !boxes.every(box => box.checked); };
  boxes.forEach(box => box.addEventListener('change', refresh));
  document.getElementById('cancelPullupActivation')?.addEventListener('click', closeModal);
  confirm?.addEventListener('click', async () => {
    const now=new Date().toISOString(); const equipment={...state.equipment,pullUpBarStatus:'installed-available',pullUpSafetyConfirmed:true,pullUpSafetyConfirmation:{confirmed:true,confirmedAt:now,confirmationVersion:1}};
    try{state.equipment=await persistence.saveEquipment(equipment);}catch(error){return showPersistenceError(error);}
    closeModal(); updateLongTermUI();
    showToast(state.workout.active ? 'Pull-ups enabled for the next Workout C. The current workout is unchanged.' : 'Pull-up progression enabled for your next Workout C.');
  });
}

function pullupSetup() {
  const current = pullupStatusLabel();
  const enabled = pullupEnabledForFutureWorkouts();
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Pull-up bar status</span><h2 id="modalTitle">Use what is actually available</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>Pull-up programming appears only when the bar is installed, available and safety-confirmed. Otherwise, Workout C uses a dumbbell pullover.</p><div class="import-summary"><div><span>Current status</span><strong>${current}</strong></div><div><span>Workout C now</span><strong>${enabled ? 'Pull-up progression' : 'Dumbbell pullover'}</strong></div><div><span>Pull-up history</span><strong>${enabled ? 'Active' : 'Paused, not reset'}</strong></div></div><div class="equipment-status-grid modal-equipment-grid" role="group" aria-labelledby="modalTitle">${Object.entries(pullupStatusLabels).map(([value,label]) => renderChoice({family:'pullup-status',attributes:`data-pullup-status="${value}"`,label,description:value === 'installed-available' ? 'Complete safety confirmation to activate' : value === 'temporarily-unavailable' ? 'Use the fallback without resetting pull-up progress' : value === 'owned-not-installed' ? 'Default until installation' : 'Keep pull-up programming locked',selected:state.equipment.pullUpBarStatus===value})).join('')}</div><div class="choice-list"><a class="choice-button" href="https://www.youtube.com/watch?v=aNUSgyWRJYA" target="_blank" rel="noopener noreferrer"><strong>Beginner pull-up tutorial</strong><span>FitnessFAQs · YouTube ↗</span></a>${enabled ? '<button class="choice-button" data-action="choose-pullup-level"><strong>Change progression rung</strong><span>Start with what you can control</span></button>' : ''}</div>`);
  modalContent.querySelectorAll('[data-pullup-status]').forEach(button => button.addEventListener('click', async () => {
    const value = button.dataset.pullupStatus;
    if (value === 'installed-available') { closeModal(); renderPullupSafetyConfirmation(); return; }
    try{state.equipment=await persistence.saveEquipment({...state.equipment,pullUpBarStatus:value,pullUpSafetyConfirmed:false,pullUpSafetyConfirmation:{confirmed:false,confirmedAt:null,confirmationVersion:1}});}catch(error){return showPersistenceError(error);}
    closeModal(); updateLongTermUI();
    showToast(value === 'temporarily-unavailable' ? 'Pull-up progress paused. Workout C will use dumbbell pullovers.' : `${pullupStatusLabels[value]}. Pull-up workouts remain locked.`);
  }));
  modalContent.querySelector('[data-action="choose-pullup-level"]')?.addEventListener('click', () => { closeModal(); choosePullupLevel(); });
}

async function applyScheduleChoice(choice) {
  if (choice === state.programme.scheduleMode) { closeModal(); showToast('That schedule mode is already active.'); return; }
  const currentReview=state.reviews.find(item=>item.id===state.programme.weekFourReviewId)||null;
  if (choice === 'extend-one-week' || choice === 'extend-two-weeks') {
    const reviewWithDecision = { ...state.programme.weekFourReview, userDecision:choice };
    const programme = applyFoundationExtension({ ...state.programme, weekFourReview:reviewWithDecision }, choice === 'extend-one-week' ? 1 : 2);
    const review=currentReview?{...currentReview,userDecision:choice}:null;
    try{await persistence.saveProgrammeDecision(programme,{review});}catch(error){return showPersistenceError(error);}
    state.programme=programme; if(review) state.reviews=upsertById(state.reviews,review);
    closeModal(); updateAll(); showToast(`Foundation extended by ${state.programme.foundationExtensionWeeks} week${state.programme.foundationExtensionWeeks === 1 ? '' : 's'}; A → B → C and all evidence continue.`); return;
  }
  const leavingFoundation = state.programme.activePhase === 'foundation';
  const domainTransition = createProgrammeTransition(state.programme, choice, leavingFoundation ? 'week-four-user-decision' : 'user-schedule-change');
  const transition={id:newId('transition'),programmeStateId:state.programme.id,...domainTransition,reviewId:currentReview?.id||null,initiatedBy:'user',effectiveLocalDate:localDate()};
  const programme = applyProgrammeTransition(state.programme, domainTransition);
  if (leavingFoundation) programme.currentProgrammeWeek = 5 + programme.foundationExtensionWeeks;
  programme.weekFourReview = { ...programme.weekFourReview, userDecision:choice };
  const review=currentReview?{...currentReview,userDecision:choice}:null;
  try{await persistence.saveProgrammeDecision(programme,{review,transition});}catch(error){return showPersistenceError(error);}
  state.programme=programme; state.transitions.push(transition); if(review) state.reviews=upsertById(state.reviews,review);
  closeModal(); updateAll(); showToast(`${choice === 'lean-athletic-four-day' ? 'Four-day' : 'Permanent three-day'} Lean Athletic will begin with the next workout.`);
}

function chooseSchedule() {
  const canTransition = state.programme.activePhase !== 'foundation' || state.programme.weekFourReview?.available;
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Schedule mode</span><h2 id="modalTitle">Choose the frequency that fits your life</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>Switching schedule mode preserves history, exercise progression, measurements, and any active workout snapshot.</p><div class="track-grid" role="group" aria-labelledby="modalTitle">${renderChoice({className:'track-card recommended',family:'programme-mode',attributes:'data-schedule-choice="lean-athletic-four-day"',label:'Four-day Lean Athletic',description:'Lower A → Upper A → Lower B → Upper B · 4 required strength days + optional E',badge:'DEFAULT RECOMMENDATION',selected:state.programme.scheduleMode==='lean-athletic-four-day',disabled:!canTransition})}${renderChoice({className:'track-card',family:'programme-mode',attributes:'data-schedule-choice="lean-athletic-three-day"',label:'Three-day Lean Athletic',description:'Full Body A → B → C · 3 required strength days',badge:'PERMANENT FALLBACK',selected:state.programme.scheduleMode==='lean-athletic-three-day',disabled:!canTransition})}</div>${canTransition ? '' : '<div class="conflict-card"><strong>Comparison only for now</strong><p>The Foundation transition becomes available with the end-of-Week-4 review.</p></div>'}`);
  modalContent.querySelectorAll('[data-schedule-choice]').forEach(button => button.addEventListener('click', () => { if (!button.disabled) applyScheduleChoice(button.dataset.scheduleChoice); }));
}

function weekFourReview() {
  if (state.programme.currentProgrammeWeek < 4) {
    openModal(`<div class="modal-heading"><div><span class="eyebrow">Foundation readiness review</span><h2 id="modalTitle">Available at the end of Week 4</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>This review is deterministic and uses completed required workouts, calibration coverage, reported confidence, discomfort, energy, sleep, soreness, recovery, and four-day feasibility.</p><div class="conflict-card"><strong>Current status: Week ${state.programme.currentProgrammeWeek}</strong><p>Four weeks is the default calibration period. Form practice continues throughout the programme.</p></div>`); return;
  }
  const existing=state.reviews.find(item=>item.id===state.programme.weekFourReviewId);
  if(existing) return showWeekFourReview(existing);
  const completedRequiredWorkouts=state.workoutRecords.filter(item=>item.status==='completed'&&item.programmePhase==='foundation').length;
  const calibrated=new Set(state.workoutRecords.flatMap(item=>Object.keys(item.calibration||{})));
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Foundation readiness review</span><h2 id="modalTitle">Complete the evidence window</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>Session and calibration counts come from saved records. Add the personal evidence only you can report.</p><div class="import-summary"><div><span>Required sessions</span><strong>${completedRequiredWorkouts} / 12</strong></div><div><span>Calibrated exercises</span><strong>${calibrated.size}</strong></div></div><div class="modal-form"><label>Form confidence<select id="reviewConfidence"><option value="not-yet">Not yet confident</option><option value="adequate">Adequate</option><option value="high">High</option></select></label><label>Recovery between sessions<select id="reviewRecovery"><option value="normal">Normal</option><option value="temporarily-poor">Temporarily disrupted</option><option value="poor">Poor</option></select></label><label><input type="checkbox" id="reviewDiscomfort"> I have unresolved pain or discomfort</label><label><input type="checkbox" id="reviewFourDays"> Four required strength days are feasible</label></div><div class="modal-actions"><button class="button button-primary" id="completeReview">Calculate and save review</button></div>`);
  document.getElementById('completeReview').addEventListener('click',async()=>{
    const input={currentProgrammeWeek:state.programme.currentProgrammeWeek,completedRequiredWorkouts,plannedRequiredWorkouts:12,incompleteCalibrationAreas:Math.max(0,6-calibrated.size),formConfidence:document.getElementById('reviewConfidence').value,unresolvedPainOrDiscomfort:document.getElementById('reviewDiscomfort').checked,energy:String(state.readiness.energy).toLowerCase(),sleep:String(state.readiness.sleep).toLowerCase(),recoveryBetweenSessions:document.getElementById('reviewRecovery').value,temporaryRecoveryDisruption:document.getElementById('reviewRecovery').value==='temporarily-poor',fourDayScheduleFeasible:document.getElementById('reviewFourDays').checked};
    const domainReview=foundationReadinessReview(input); const now=new Date().toISOString();
    const record={id:newId('review'),programmeStateId:state.programme.id,reviewType:'foundation-readiness',weekNumber:4,evidenceWindowStart:state.programme.startedAt,evidenceWindowEnd:now,completedWorkoutCount:completedRequiredWorkouts,plannedWorkoutCount:12,calibrationSummary:{completed:calibrated.size,incompleteAreas:input.incompleteCalibrationAreas},formConfidenceSummary:input.formConfidence,discomfortSummary:input.unresolvedPainOrDiscomfort,recoverySummary:input.recoveryBetweenSessions,scheduleFeasibility:input.fourDayScheduleFeasible,recommendation:domainReview.recommendation,userDecision:null,reasons:domainReview.reasons,completedAt:now};
    const programme={...state.programme,weekFourReviewId:record.id,weekFourReview:domainReview};
    try{await persistence.saveProgrammeDecision(programme,{review:record});}catch(error){return showPersistenceError(error);}
    state.programme=programme;state.reviews.push(record);showWeekFourReview(record);
  });
}

function showWeekFourReview(review) {
  const labels = { ready:'Ready to choose the next schedule', 'extend-one-week':'Consider one more Foundation week', 'extend-two-weeks':'Consider two more Foundation weeks' };
  openModal(`<div class="modal-heading"><div><span class="eyebrow">System recommendation</span><h2 id="modalTitle">${labels[review.recommendation]}</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>This is not a medical assessment and does not claim to evaluate technique through the screen.</p><div class="import-summary"><div><span>Required sessions</span><strong>${review.completedWorkoutCount} / ${review.plannedWorkoutCount}</strong></div><div><span>Recommendation</span><strong>${review.recommendation}</strong></div><div><span>User decision</span><strong>${review.userDecision||'Not chosen'}</strong></div></div><div class="conflict-card"><strong>Why</strong><p>${(review.reasons||[]).join(' ')}</p></div><div class="choice-list review-decision-list" role="group" aria-label="Foundation review decision">${renderChoice({family:'week-four-decision',attributes:'data-review-choice="extend-two-weeks"',label:'Extend 2 weeks',description:'Continue Foundation without resetting rotation or progression',selected:review.userDecision==='extend-two-weeks'})}${renderChoice({family:'week-four-decision',attributes:'data-review-choice="extend-one-week"',label:'Extend 1 week',description:'Continue Foundation for one additional evidence week',selected:review.userDecision==='extend-one-week'})}</div><div class="modal-actions"><button class="button button-primary" data-action="choose-schedule">Choose Lean Athletic schedule</button></div>`);
  modalContent.querySelectorAll('[data-review-choice]').forEach(button => button.addEventListener('click', () => applyScheduleChoice(button.dataset.reviewChoice)));
  modalContent.querySelector('[data-action="choose-schedule"]')?.addEventListener('click', () => { closeModal(); chooseSchedule(); });
}

function updateLongTermUI() {
  const enabled = pullupEnabledForFutureWorkouts();
  const label = document.getElementById('pullupProgressLabel');
  if (label) label.textContent = enabled ? `Rung ${state.pullupLevel} · ${pullupLevels.find(x => x.id === state.pullupLevel).short.toLowerCase()}` : `Locked · ${pullupStatusLabel().toLowerCase()}`;
  const equipmentTitle = document.getElementById('pullupEquipmentTitle');
  if (equipmentTitle) equipmentTitle.textContent = `Pull-up bar · ${pullupStatusLabel()}`;
  const equipmentCopy = document.getElementById('pullupEquipmentCopy');
  if (equipmentCopy) equipmentCopy.textContent = enabled ? 'Pull-up progression is active for future Workout C sessions.' : 'Workout C uses a dumbbell pullover until installation and safety confirmation.';
  const equipmentButton = document.getElementById('pullupEquipmentButton');
  if (equipmentButton) equipmentButton.textContent = enabled ? 'Review pull-up setup' : 'Update pull-up bar status';
  const pathButton = document.getElementById('pullupPathButton');
  if (pathButton) pathButton.textContent = enabled ? 'Change current rung' : 'Set up pull-up bar';
  const path = document.querySelector('.pullup-mini-path');
  if (path) { path.classList.toggle('locked-path', !enabled); [...path.children].forEach((item,index)=>{item.classList.toggle('done',enabled&&index+1<state.pullupLevel);item.classList.toggle('current',enabled&&index+1===state.pullupLevel);}); }
  const blockTwoStatus = document.getElementById('blockTwoStatus');
  if (blockTwoStatus) blockTwoStatus.textContent = state.programme.activePhase === 'lean-athletic' ? 'ACTIVE' : 'NEXT';
  updateProgrammeUI();
}

let runUiTicker = null;
let runWakeLock = null;

function runAudioElement() { return document.getElementById('runCoachAudio'); }
function runAudioUrl(mode = state.run.audioMode) {
  const audio = runAudioElement();
  if (mode === 'chimes') return RUN_AUDIO.chimes;
  if (mode !== 'voice') return '';
  const opusSupported = Boolean(audio?.canPlayType('audio/ogg; codecs="opus"'));
  state.run.audioFormat = opusSupported ? 'opus' : 'mp3';
  return opusSupported ? RUN_AUDIO.opus : RUN_AUDIO.mp3;
}
function currentRunTime() {
  const audio = runAudioElement();
  if (state.run.audioMode !== 'visual' && audio && Number.isFinite(audio.currentTime)) {
    if (state.run.paused && audio.currentTime === 0 && state.run.visualElapsedBeforePause > 0) return state.run.visualElapsedBeforePause;
    return audio.currentTime;
  }
  return state.run.visualStartedAt ? Math.min(RUN_TOTAL_SECONDS, state.run.visualElapsedBeforePause + (Date.now() - state.run.visualStartedAt) / 1000) : (state.run.visualElapsedBeforePause || 0);
}
function currentRunPhase(time = currentRunTime()) {
  return phaseAtTime(runPhases, time) || runPhases[runPhases.length - 1];
}
function runPhaseIndex(time = currentRunTime()) {
  return Math.max(0, phaseIndexAtTime(runPhases, time));
}
function configureRunMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.run.audioMode === 'voice' ? 'Run–Walk 01 · Voice Coach' : 'Run–Walk 01 · Phase Chimes',
      artist: 'Proof', album: 'Lean Athletic · Block 1'
    });
    navigator.mediaSession.setActionHandler('play', resumeRunAudio);
    navigator.mediaSession.setActionHandler('pause', pauseRunAudio);
    navigator.mediaSession.setActionHandler('seekbackward', () => seekRun(Math.max(0, currentRunTime() - 15)));
    navigator.mediaSession.setActionHandler('seekforward', () => seekRun(Math.min(RUN_TOTAL_SECONDS, currentRunTime() + 15)));
    navigator.mediaSession.setActionHandler('seekto', details => { if (typeof details.seekTime === 'number') seekRun(details.seekTime); });
  } catch (_) {}
}
async function requestRunWakeLock() {
  if (!state.run.keepAwake || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { runWakeLock = await navigator.wakeLock.request('screen'); }
  catch (_) { showToast('Keep-screen-awake is unavailable here. The coached audio remains the preferred mode.'); }
}
async function releaseRunWakeLock() {
  try { await runWakeLock?.release(); } catch (_) {}
  runWakeLock = null;
}
function prepareRunAudio() {
  const audio = runAudioElement();
  if (!audio || state.run.audioMode === 'visual') return;
  const wanted = runAudioUrl();
  state.run.audioError = '';
  if (audio.getAttribute('src') !== wanted) {
    audio.src = wanted;
    audio.load();
  }
  audio.preload = 'auto';
  configureRunMediaSession();
}

function offlineResourcesForMode(mode = state.run.audioMode) {
  const shared = ['/audio/coach/starter-run-coach.manifest.json', '/audio-scripts/starter-run.json'];
  if (mode === 'voice') return [...shared, RUN_AUDIO.opus, RUN_AUDIO.mp3];
  if (mode === 'chimes') return [...shared, RUN_AUDIO.chimes];
  return shared;
}

async function refreshRunOfflineStatus() {
  if (!('caches' in window)) {
    state.run.offlineStatus = 'not-downloaded';
    return;
  }
  state.run.offlineStatus = 'checking';
  try {
    const resources = offlineResourcesForMode();
    const matches = await Promise.all(resources.map((resource) => caches.match(resource)));
    state.run.offlineStatus = matches.every(Boolean) ? 'available' : 'not-downloaded';
  } catch (_) {
    state.run.offlineStatus = 'failed';
  }
  if (state.run.step === 'overview' && state.screen === 'run') renderRun();
}

async function downloadRunAudio() {
  if (!('caches' in window) || !('fetch' in window)) {
    state.run.offlineStatus = 'failed';
    state.run.audioError = 'Offline storage is unavailable in this browser context.';
    renderRun();
    return;
  }
  state.run.offlineStatus = 'downloading';
  state.run.offlineProgress = 0;
  state.run.audioError = '';
  renderRun();
  try {
    const resources = offlineResourcesForMode();
    const downloads = await Promise.all(resources.map(async (resource) => {
      const response = await fetch(resource, { cache: 'no-store' });
      if (!response.ok || !response.body) {
        throw new Error(`${resource} returned HTTP ${response.status}`);
      }
      return {
        resource,
        response,
        expectedBytes: Number(response.headers.get('content-length')) || 0
      };
    }));
    const totalBytes = downloads.reduce((total, item) => total + item.expectedBytes, 0);
    let receivedBytes = 0;
    const cache = await caches.open(RUN_CACHE_NAME);

    await Promise.all(downloads.map(async ({ resource, response }) => {
      const reader = response.body.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.byteLength;
        const nextProgress = totalBytes
          ? Math.min(99, Math.round(receivedBytes / totalBytes * 100))
          : state.run.offlineProgress;
        if (nextProgress !== state.run.offlineProgress) {
          state.run.offlineProgress = nextProgress;
          if (state.run.step === 'overview' && state.screen === 'run') renderRun();
        }
      }
      const headers = new Headers(response.headers);
      headers.set('Content-Length', String(chunks.reduce((total, chunk) => total + chunk.byteLength, 0)));
      await cache.put(resource, new Response(new Blob(chunks), {
        status: 200,
        statusText: 'OK',
        headers
      }));
    }));

    const stored = await Promise.all(resources.map((resource) => cache.match(resource)));
    if (!stored.every(Boolean)) throw new Error('Cache Storage did not retain every file');
    state.run.offlineProgress = 100;
    state.run.offlineStatus = 'available';
    showToast('Run guidance is available offline.');
  } catch (error) {
    state.run.offlineStatus = 'failed';
    state.run.offlineProgress = 0;
    state.run.audioError = `Offline download failed: ${error.message}`;
    showToast('The offline audio download failed. Check your connection and try again.');
  }
  renderRun();
}
async function openRunOverview() {
  if (state.run.completed) state.run.id = null;
  state.run.step = 'overview'; state.run.completed = false;
  renderRun(); showScreen('run');
  refreshRunOfflineStatus();
}
async function startRunSession() {
  const id=state.run.id||newId('run'); const startedAt=new Date().toISOString();
  try{const record=await persistence.saveRun({id,status:'active',startedAt,audioPositionSeconds:0,currentPhaseIndex:0,paused:false,guidanceMode:state.run.audioMode,lastPersistedAt:startedAt});state.runHistory=upsertById(state.runHistory,record);state.run.id=id;}catch(error){return showPersistenceError(error);}
  state.run.active = true; state.run.completed = false; state.run.step = 'active'; state.run.paused = false;
  prepareRunAudio();
  if (state.run.audioMode === 'visual') {
    state.run.visualStartedAt = Date.now();
    state.run.visualElapsedBeforePause = state.run.visualElapsedBeforePause || 0;
  } else {
    const audio = runAudioElement();
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch (_) {
      state.run.active = false;
      state.run.paused = true;
      state.run.audioError = 'Coach audio could not start. Retry the download or choose Visual only.';
      await persistRunProgress('paused',{audioPositionSeconds:0,paused:true,startFailure:true}).catch(showPersistenceError);
      showToast('Audio could not start. Tap Test coach, confirm the volume, then start again.');
      state.run.step = 'overview';
      renderRun();
      return;
    }
  }
  clearInterval(runUiTicker); runUiTicker = setInterval(updateRunUi, 500);
  await requestRunWakeLock();
  renderRun(); showScreen('run'); updateAll();
}
function updateRunUi() {
  const time = currentRunTime();
  state.run.phaseIndex = runPhaseIndex(time);
  if(state.run.id&&Date.now()-(state.run.lastPersistedAt||0)>=5000){state.run.lastPersistedAt=Date.now();persistRunProgress(state.run.paused?'paused':'active').catch(showPersistenceError);}
  const elapsed = document.getElementById('runElapsed'); if (elapsed) elapsed.textContent = formatTime(Math.floor(time));
  if ('mediaSession' in navigator && state.run.audioMode !== 'visual' && navigator.mediaSession.setPositionState) {
    try {
      navigator.mediaSession.setPositionState({
        duration: RUN_TOTAL_SECONDS,
        playbackRate: runAudioElement()?.playbackRate || 1,
        position: Math.min(time, RUN_TOTAL_SECONDS)
      });
    } catch (_) {}
  }
  if (time >= RUN_TOTAL_SECONDS || (state.run.audioMode !== 'visual' && runAudioElement()?.ended)) finishRunSession(true);
  else if (state.screen === 'run' && state.run.step === 'active') renderRun();
  updateActiveRunStrip();
}
function seekRun(time) {
  const bounded = Math.max(0, Math.min(RUN_TOTAL_SECONDS, time));
  const audio = runAudioElement();
  if (state.run.audioMode === 'visual') {
    state.run.visualElapsedBeforePause = bounded; state.run.visualStartedAt = state.run.paused ? null : Date.now();
  } else if (audio) audio.currentTime = bounded;
  updateRunUi();
  persistRunProgress(state.run.paused?'paused':'active').catch(showPersistenceError);
}
function advanceRunPhase() {
  const index = runPhaseIndex();
  const next = runPhases[Math.min(runPhases.length - 1, index + 1)];
  seekRun(next.start);
}
async function pauseRunAudio() {
  const position=currentRunTime();
  try{await persistRunProgress('paused',{audioPositionSeconds:position,paused:true});}catch(error){return showPersistenceError(error);}
  state.run.paused = true;
  if (state.run.audioMode === 'visual') {
    state.run.visualElapsedBeforePause = currentRunTime(); state.run.visualStartedAt = null;
  } else runAudioElement()?.pause();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  renderRun(); updateAll();
}
async function resumeRunAudio() {
  try{await persistRunProgress('active',{paused:false});}catch(error){return showPersistenceError(error);}
  state.run.paused = false;
  if (state.run.audioMode === 'visual') state.run.visualStartedAt = Date.now();
  else { try { await runAudioElement()?.play(); } catch (_) { showToast('Tap Resume inside Proof to restart audio.'); } }
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  clearInterval(runUiTicker); runUiTicker = setInterval(updateRunUi, 500);
  renderRun(); updateAll();
}
async function finishRunSession(natural = false) {
  if(state.run.completed||!state.run.id) return;
  const position=natural?RUN_TOTAL_SECONDS:currentRunTime();
  try{const record=await persistRunProgress('completed',{audioPositionSeconds:position,paused:false,completedAt:new Date().toISOString()});state.runHistory=upsertById(state.runHistory,record);}catch(error){return showPersistenceError(error);}
  clearInterval(runUiTicker); runUiTicker = null;
  const audio = runAudioElement(); if (audio) { audio.pause(); if (!natural) audio.currentTime = 0; }
  state.run.completed = true; state.run.active = false; state.run.paused = false; state.run.step = 'receipt';
  state.run.visualStartedAt = null; state.run.visualElapsedBeforePause = 0;
  releaseRunWakeLock();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
  renderRun(); updateAll();
}

async function persistRunProgress(status,patch={}) {
  if(!state.run.id) return null;
  const now=new Date().toISOString();
  return persistence.saveRun({id:state.run.id,status,audioPositionSeconds:currentRunTime(),currentPhaseIndex:runPhaseIndex(),paused:state.run.paused,guidanceMode:state.run.audioMode,lastPersistedAt:now,...patch});
}
async function testRunCoach() {
  if (state.run.audioMode === 'visual') return;
  prepareRunAudio();
  const audio = runAudioElement();
  if (!audio) return;
  try {
    audio.currentTime = 0;
    await audio.play();
    state.run.audioTested = true;
    showToast('Coach preview playing. Lock the screen briefly now if you want to test your device.');
    renderRun();
    window.setTimeout(() => {
      if (!state.run.active && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    }, 15000);
  } catch (_) {
    state.run.audioError = 'Coach audio is unavailable. Check the local assets or choose Visual only.';
    showToast('The coach audio could not play. Check media volume or choose Visual only.');
    renderRun();
  }
}
function runModeCard(mode, title, description, badge='') {
  return renderChoice({className:'run-audio-mode',family:'run-guidance',attributes:`data-run-audio-mode="${mode}"`,label:title,description,badge,selected:state.run.audioMode===mode});
}
function runOfflineLabel() {
  if (state.run.offlineStatus === 'downloading') {
    return `Downloading ${state.run.offlineProgress}%`;
  }
  return {
    checking: 'Checking…',
    available: 'Available offline',
    'not-downloaded': 'Not downloaded',
    failed: 'Download failed'
  }[state.run.offlineStatus] || 'Not downloaded';
}
function runOfflineButtonLabel() {
  if (state.run.offlineStatus === 'available') return 'Downloaded';
  if (state.run.offlineStatus === 'downloading') return `Downloading ${state.run.offlineProgress}%`;
  return 'Download for offline';
}
function renderRun() {
  const stage = document.getElementById('runStage'); if (!stage) return;
  if (state.run.step === 'overview') {
    stage.innerHTML = `<div class="run-hero"><span class="eyebrow light-eyebrow">Week 3 · coached aerobic foundation</span><h1>${starterRun.name}</h1><p>The session is driven by one continuous audio programme so phase instructions can keep playing through media controls when the screen is locked.</p><div class="run-overview"><div><span>Total time</span><strong>${formatTime(RUN_TOTAL_SECONDS)}</strong></div><div><span>Structure</span><strong>5-min warm-up · 6 rounds · 5-min cool-down</strong></div><div><span>Recommended</span><strong>Voice coach + earpiece</strong></div></div><section class="run-audio-setup"><div class="section-heading-row compact-row"><div><span class="eyebrow light-eyebrow">Audio guidance</span><h2>Choose how Proof coaches you.</h2></div><span class="status-pill ${state.run.audioTested ? 'success' : 'effort'}">${state.run.audioTested ? 'Audio tested' : 'Test before leaving'}</span></div><div class="run-audio-modes">${runModeCard('voice','Voice coach','Spoken phase changes, round numbers, ten-second warnings, pace cues, and cool-down instructions.','RECOMMENDED')}${runModeCard('chimes','Chimes only','Continuous media track with distinct run, walk, warning, and completion tones.','LESS TALK')}${runModeCard('visual','Visual only','No audio. Keep the screen awake and read each phase. Not suitable for a locked phone.','FALLBACK')}</div><div class="run-offline-row"><span class="status-pill ${state.run.offlineStatus === 'available' ? 'success' : state.run.offlineStatus === 'failed' ? 'danger' : 'effort'}">${runOfflineLabel()}</span><button class="workout-button" data-run-download ${state.run.offlineStatus === 'downloading' || state.run.offlineStatus === 'available' ? 'disabled' : ''}>${runOfflineButtonLabel()}</button></div>${state.run.audioError ? `<p class="run-audio-error" role="alert">${state.run.audioError}</p>` : ''}<div class="run-lockscreen-check"><div><strong>Before the first outdoor run</strong><p>Connect your earpiece, set a safe volume, tap Test coach, then briefly lock the phone. Confirm that you still hear the sample on your device.</p></div><button class="workout-button" data-run-test ${state.run.audioMode === 'visual' ? 'disabled' : ''}>Test coach</button><label><input type="checkbox" data-run-lock-confirm ${state.run.lockScreenConfirmed ? 'checked' : ''}> I heard the coach with my screen locked</label></div><label class="run-wake-option"><input type="checkbox" data-run-keep-awake ${state.run.keepAwake ? 'checked' : ''}> <span><strong>Keep screen awake as a fallback</strong><small>Only available in the installed HTTPS app while Proof remains visible.</small></span></label></section><div class="run-cue-card"><strong>Earphone and road awareness</strong><p>Keep the volume low enough to hear your surroundings. Around traffic, use transparency/ambient mode or leave one ear open. The coach never tells you to cross a road or ignore the environment.</p></div><div class="run-phase-preview">${runPhases.filter((p,i)=>i===0||p.id==='run-round-1'||p.id==='walk-round-1'||p.id==='cooldown').map(p=>`<div><span>${p.label}</span><strong>${Math.round((p.end-p.start)/60)} min${p.id==='run-round-1'?' × 6':''}</strong><p>${p.cue}</p></div>`).join('')}</div><div class="workout-button-row"><button class="workout-button primary" data-run-start ${state.run.audioMode !== 'visual' && !state.run.audioTested ? 'disabled title="Test the coach first"' : ''}>Start coached run</button><button class="workout-button" data-action="minimise-run">Back to Plan</button></div></div>`;
  } else if (state.run.step === 'active') {
    const time = currentRunTime(); const phase = currentRunPhase(time); const index = runPhaseIndex(time);
    const remaining = Math.max(0, Math.ceil(phase.end - time)); const roundsDone = runPhases.filter((p,i)=>i<index && p.mode==='run').length;
    stage.innerHTML = `<div class="run-live"><div class="run-live-meta"><span class="run-phase ${phase.mode}">${phase.label}</span><span>${state.run.audioMode === 'voice' ? 'VOICE COACH' : state.run.audioMode === 'chimes' ? 'CHIMES ONLY' : 'VISUAL ONLY'}</span></div><div class="run-clock">${formatTime(remaining)}</div><p class="run-interval-count">${phase.round ? `Round ${phase.round} of 6` : phase.instruction}</p><div class="run-timeline">${Array.from({length:6},(_,i)=>`<span class="${i < roundsDone ? 'done' : phase.round===i+1 ? 'current' : ''}"></span>`).join('')}</div><div class="run-cue-card"><strong>${phase.instruction}</strong><p>${phase.cue}</p></div><div class="run-media-status"><span>${state.run.paused ? 'PAUSED' : 'PLAYING'}</span><strong>${formatTime(Math.floor(time))} / ${formatTime(RUN_TOTAL_SECONDS)}</strong><small>${state.run.audioMode === 'visual' ? 'Keep Proof visible.' : 'Use your lock-screen or earpiece media controls to pause and resume where supported.'}</small></div><div class="workout-button-row"><button class="workout-button" data-run-toggle>${state.run.paused ? 'Resume' : 'Pause'}</button><button class="workout-button" data-run-switch>Skip to next phase</button><button class="workout-button primary" data-run-finish>Finish run</button></div></div>`;
  } else {
    stage.innerHTML = `<div class="run-receipt"><span class="eyebrow">Run receipt</span><h2>Easy work, completed.</h2><p>${starterRun.name} · audio-guided phases · strength schedule preserved.</p><div class="receipt-dash"></div><div class="receipt-stats"><div><span>Planned</span><strong>${formatTime(RUN_TOTAL_SECONDS)}</strong></div><div><span>Run rounds</span><strong>6</strong></div><div><span>Run type</span><strong>Conversational</strong></div><div><span>Guidance</span><strong>${state.run.audioMode === 'voice' ? 'Voice coach' : state.run.audioMode === 'chimes' ? 'Chimes only' : 'Visual'}</strong></div></div><div class="receipt-dash"></div><button class="button button-primary full-width" data-run-done>Return to Plan</button></div>`;
  }
  bindRunActions(); updateRunClockDisplayOnly();
}
function updateRunClockDisplayOnly() { const elapsed = document.getElementById('runElapsed'); if (elapsed) elapsed.textContent = formatTime(Math.floor(currentRunTime())); }
function bindRunActions() {
  document.querySelectorAll('[data-run-audio-mode]').forEach(b => b.addEventListener('click', () => {
    state.run.audioMode = b.dataset.runAudioMode;
    state.run.audioTested = state.run.audioMode === 'visual';
    saveRunMode(state.run.audioMode);
    prepareRunAudio();
    refreshRunOfflineStatus();
    renderRun();
  }));
  document.querySelectorAll('[data-run-test]').forEach(b => b.addEventListener('click', testRunCoach));
  document.querySelectorAll('[data-run-download]').forEach(b => b.addEventListener('click', downloadRunAudio));
  document.querySelectorAll('[data-run-lock-confirm]').forEach(input => input.addEventListener('change', () => { state.run.lockScreenConfirmed = input.checked; renderRun(); }));
  document.querySelectorAll('[data-run-keep-awake]').forEach(input => input.addEventListener('change', () => { state.run.keepAwake = input.checked; renderRun(); }));
  document.querySelectorAll('[data-run-start]').forEach(b => b.addEventListener('click', () => { if (!b.disabled) startRunSession(); }));
  document.querySelectorAll('[data-run-toggle]').forEach(b => b.addEventListener('click', () => state.run.paused ? resumeRunAudio() : pauseRunAudio()));
  document.querySelectorAll('[data-run-switch]').forEach(b => b.addEventListener('click', advanceRunPhase));
  document.querySelectorAll('[data-run-finish]').forEach(b => b.addEventListener('click', () => finishRunSession(false)));
  document.querySelectorAll('[data-run-done]').forEach(b => b.addEventListener('click', () => { state.run.id = null; state.run.step = 'overview'; state.run.completed = false; showScreen('plan'); updateAll(); }));
  document.querySelectorAll('[data-action="minimise-run"]').forEach(b => b.addEventListener('click', minimiseRun));
  document.querySelectorAll('[data-action="end-run"]').forEach(b => b.addEventListener('click', () => finishRunSession(false)));
}
function minimiseRun() {
  if (state.run.step === 'overview') { showScreen('plan'); updateAll(); return; }
  showScreen('plan'); updateAll();
  showToast(state.run.paused ? 'Run is paused. Resume from the active-run strip.' : 'Audio coaching continues. Use lock-screen or earpiece media controls where supported.');
}
function updateActiveRunStrip() {
  let strip = document.getElementById('activeRunStrip');
  if (!strip) {
    const week = document.getElementById('weekPlanView');
    week?.insertAdjacentHTML('afterbegin', `<section id="activeRunStrip" class="run-active-strip hidden"><div><small>RUN ACTIVE</small><strong id="activeRunText"></strong></div><button class="button" id="resumeActiveRun">Open run</button></section>`);
    strip = document.getElementById('activeRunStrip'); document.getElementById('resumeActiveRun')?.addEventListener('click', () => { renderRun(); showScreen('run'); });
  }
  const visible = state.run.active && !state.run.completed && state.screen !== 'run'; strip?.classList.toggle('hidden', !visible);
  const phase = currentRunPhase(); const text = document.getElementById('activeRunText');
  if (text) text.textContent = `${state.run.paused ? 'Paused' : phase.label} · ${formatTime(Math.max(0, Math.ceil(phase.end-currentRunTime())))}${phase.round ? ` · round ${phase.round}/6` : ''}`;
}

function bindRunAudioEvents() {
  const audio = runAudioElement(); if (!audio) return;
  audio.addEventListener('play', () => { state.run.paused = false; if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });
  audio.addEventListener('pause', () => { if (state.run.active && !state.run.completed) state.run.paused = true; if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; updateAll(); });
  audio.addEventListener('ended', () => finishRunSession(true));
  audio.addEventListener('timeupdate', updateRunUi);
  audio.addEventListener('loadedmetadata', () => {
    if (state.run.paused && state.run.visualElapsedBeforePause > 0 && audio.currentTime === 0) {
      audio.currentTime = Math.min(state.run.visualElapsedBeforePause, RUN_TOTAL_SECONDS);
    }
    if (Number.isFinite(audio.duration) && Math.abs(audio.duration - RUN_TOTAL_SECONDS) > 0.25) {
      state.run.audioError = `Coach audio has an unexpected duration (${audio.duration.toFixed(1)} seconds).`;
      if (state.run.step === 'overview') renderRun();
    }
  });
  audio.addEventListener('error', async () => {
    const failedSource = audio.currentSrc || audio.src;
    if (state.run.audioMode === 'voice' && failedSource.endsWith('.opus')) {
      const shouldResume = state.run.active && !state.run.paused;
      state.run.audioFormat = 'mp3';
      audio.src = RUN_AUDIO.mp3;
      audio.load();
      if (shouldResume) {
        try { await audio.play(); return; } catch (_) {}
      } else {
        state.run.audioError = '';
        return;
      }
    }
    state.run.audioError = 'Coach audio is unavailable. Retry the offline download or choose Visual only.';
    if (state.run.active) pauseRunAudio();
    if (state.run.step === 'overview') renderRun();
  });
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'RUN_AUDIO_CACHE_STATUS') return;
    state.run.offlineStatus = event.data.ok ? 'available' : 'failed';
    if (!event.data.ok) showToast('The offline audio download failed. Check your connection and try again.');
    if (state.run.step === 'overview') renderRun();
  });
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden' && state.run.active) await persistRunProgress(state.run.paused?'paused':'active').catch(showPersistenceError);
  if (document.visibilityState === 'visible' && state.run.active && state.run.keepAwake) await requestRunWakeLock();
});
window.addEventListener('pagehide',()=>{if(state.run.active) persistRunProgress(state.run.paused?'paused':'active').catch(()=>{});});

function bindGlobalActions() {
  document.querySelectorAll('[data-action="start-workout"]').forEach(button => button.addEventListener('click', startWorkout));
  document.querySelectorAll('[data-action="open-feeling"]').forEach(button => button.addEventListener('click', openFeeling));
  document.querySelectorAll('[data-action="log-weight"]').forEach(button => button.addEventListener('click', logWeight));
  document.querySelectorAll('[data-action="preview-progression"]').forEach(button => button.addEventListener('click', showProgressionRules));
  document.querySelectorAll('[data-action="export-data"]').forEach(button => button.addEventListener('click', exportData));
  document.querySelectorAll('[data-action="import-data"]').forEach(button => button.addEventListener('click', chooseImportFile));
  document.querySelectorAll('[data-action="reset-data"]').forEach(button => button.addEventListener('click', resetData));
  document.getElementById('importFileInput')?.addEventListener('change',event=>{importDataFile(event.target.files?.[0]);event.target.value='';});
  document.querySelectorAll('[data-action="end-workout-menu"]').forEach(button => button.addEventListener('click', openWorkoutRecovery));
  document.querySelectorAll('[data-action="minimise-workout"]').forEach(button => button.addEventListener('click', minimiseWorkout));
  document.querySelectorAll('[data-action="week-four-review"]').forEach(button => button.addEventListener('click', weekFourReview));
  document.querySelectorAll('[data-action="choose-schedule"]').forEach(button => button.addEventListener('click', chooseSchedule));
  document.querySelectorAll('[data-action="preview-run"]').forEach(button => button.addEventListener('click', openRunOverview));
  document.querySelectorAll('[data-action="pullup-setup"]').forEach(button => button.addEventListener('click', pullupSetup));
  document.querySelectorAll('[data-action="choose-pullup-level"]').forEach(button => button.addEventListener('click', choosePullupLevel));
}

document.querySelectorAll('[data-plan-view]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-plan-view]').forEach(x => { const selected=x===button; x.classList.toggle('selected',selected); x.setAttribute('aria-pressed',String(selected)); });
  document.getElementById('mealPlanView').classList.toggle('hidden', button.dataset.planView !== 'meals');
  document.getElementById('weekPlanView').classList.toggle('hidden', button.dataset.planView !== 'week');
  document.getElementById('blockPlanView').classList.toggle('hidden', button.dataset.planView !== 'blocks');
}));

function hydrateOnboardingDraft(draft) {
  if(!draft) return;
  Object.assign(onboardingState,draft,{days:[...(draft.days||onboardingState.days)],exclusions:new Set(draft.exclusions||[])});
}

function showRunRecovery() {
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Saved run</span><h2 id="modalTitle">Resume your coached run?</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>The last saved audio position is ${formatTime(Math.floor(state.run.visualElapsedBeforePause||0))}. It may be a few seconds behind the exact interruption point.</p><div class="modal-actions"><button class="button button-secondary" id="endRecoveredRun">End run</button><button class="button button-primary" id="resumeRecoveredRun">Open run</button></div>`);
  document.getElementById('resumeRecoveredRun').addEventListener('click',()=>{closeModal();prepareRunAudio();const audio=runAudioElement();if(audio&&state.run.audioMode!=='visual')audio.currentTime=state.run.visualElapsedBeforePause||0;renderRun();showScreen('run');});
  document.getElementById('endRecoveredRun').addEventListener('click',async()=>{await finishRunSession(false);closeModal();showScreen('plan');});
}

function renderPersistenceFailure(result) {
  const loading=document.getElementById('persistenceLoading');
  loading.innerHTML=`<section class="persistence-recovery"><span class="eyebrow">Local storage unavailable</span><h1>Proof Fitness could not open your records.</h1><p>This is not treated as a new installation. Retry first; export any accessible data before considering a destructive reset.</p><pre id="persistenceDiagnostics">${JSON.stringify(result.diagnostics,null,2)}</pre><div class="button-row"><button class="button button-primary" id="retryPersistence">Retry</button><button class="button button-secondary" id="copyDiagnostics">Copy diagnostics</button><button class="button button-secondary" id="recoveryExport">Export data</button><button class="button button-ghost" id="recoveryReset">Reset as last resort</button></div></section>`;
  document.getElementById('retryPersistence').addEventListener('click',()=>window.location.reload());
  document.getElementById('copyDiagnostics').addEventListener('click',()=>navigator.clipboard?.writeText(JSON.stringify(result.diagnostics,null,2)).then(()=>showToast('Diagnostics copied.')).catch(()=>{}));
  document.getElementById('recoveryExport').addEventListener('click',exportData);
  document.getElementById('recoveryReset').addEventListener('click',async()=>{
    if(window.prompt('Last resort: type RESET to permanently delete all Proof Fitness records.')!=='RESET') return;
    try{await persistence.resetAll();if('caches' in window){for(const key of await caches.keys())if(key.startsWith('proof-fitness-'))await caches.delete(key);}window.location.reload();}catch(error){document.getElementById('persistenceDiagnostics').textContent+=`\nReset failed: ${error.message}`;}
  });
}

async function initialiseApplication() {
  bindGlobalActions(); bindRunAudioEvents();
  const result=await bootstrapApplication();
  if(!result.ok){renderPersistenceFailure(result);return;}
  applyHydratedState(result.state); state.persistenceReady=true;
  state.pullupLevel=state.equipment.pullUpProgressionRung||2;
  setTheme(state.theme);
  const dateText=new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  document.getElementById('todayLocalDate').textContent=dateText.toUpperCase();
  document.getElementById('mealPlanDay').textContent=`${new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(new Date())} plan`;
  document.getElementById('mealPageTitle').textContent=`${new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(new Date())} fuel`;
  if(state.appMeta?.lastExportedAt) document.getElementById('lastBackupText').textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(state.appMeta.lastExportedAt));
  document.getElementById('persistenceLoading').classList.add('hidden');
  if(!state.appMeta?.onboardingCompletedAt){hydrateOnboardingDraft(state.appMeta?.onboardingDraft);renderOnboarding();document.getElementById('onboardingLayer').classList.remove('completed');return;}
  if(!state.programme) return renderPersistenceFailure({diagnostics:{name:'ProgrammeStateError',message:'Onboarding is complete but the active programme state is missing.',time:new Date().toISOString()}});
  prepareRunAudio(); injectWeeklyCoach(); updateAll();
  if(state.workout.sessionId) openWorkoutRecovery(); else if(state.run.id) showRunRecovery();
}

initialiseApplication();
