import starterRun from '../audio-scripts/starter-run.json';
import { phaseAtTime, phaseIndexAtTime } from './run-phase.js';

const RUN_MODE_STORAGE_KEY = 'proof-fitness.run-guidance-mode';
const RUN_CACHE_NAME = 'proof-fitness-v0.2.0';
const RUN_AUDIO = {
  opus: '/audio/coach/starter-run-coach.opus',
  mp3: '/audio/coach/starter-run-coach.mp3',
  chimes: '/audio/chimes/starter-run-chimes.opus'
};

function savedRunMode() {
  try {
    const value = localStorage.getItem(RUN_MODE_STORAGE_KEY);
    return ['voice', 'chimes', 'visual'].includes(value) ? value : 'voice';
  } catch (_) {
    return 'voice';
  }
}

function saveRunMode(value) {
  try { localStorage.setItem(RUN_MODE_STORAGE_KEY, value); } catch (_) {}
}

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

const workoutExercises = [
  { id:'lunge', name:'Reverse lunge', sets:3, target:'8–12 each leg', load:'5 kg', qualifier:'per dumbbell', plates:'2.5 kg on each end', type:'paired-dumbbell', cue:'Step back far enough to keep the front foot planted. Drive through the full foot.', setup:'Stand tall with the dumbbells steady at your sides.', mistake:'Do not push only through the front toes or let the knee collapse inward.', easier:'Use bodyweight while learning the pattern.', youtubeTitle:'Reverse Lunge · Muscle & Strength', youtubeUrl:'https://www.youtube.com/watch?v=-EHKqzT1sU8', guideSource:'Mayo Clinic lunge guide', guideUrl:'https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/lunge/vid-20084662' },
  { id:'pushup', name:'Push-up', sets:4, target:'8–20', load:'Bodyweight', qualifier:'standard variation', plates:'No plates', type:'bodyweight', cue:'Keep ribs and hips aligned. Lower the chest without letting the hips sag.', setup:'Place hands slightly wider than shoulder width and create one line from head to heel.', mistake:'Do not let the lower back collapse or flare the elbows aggressively.', easier:'Use a stable incline or modified push-up.', youtubeTitle:'Push-up Technique · NASM', youtubeUrl:'https://www.youtube.com/watch?v=RvEgqDfh4bg', guideSource:'ACE push-up guide', guideUrl:'https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/' },
  { id:'bridge', name:'Barbell glute bridge', sets:4, target:'10–15', load:'15 kg', qualifier:'plate-only', plates:'5 kg + 2.5 kg per side', type:'barbell', cue:'Finish by squeezing the glutes, not arching the lower back.', setup:'Place the padded bar across the hips with feet planted and knees bent.', mistake:'Do not finish the movement by overextending the lower back.', easier:'Rehearse the movement without the bar.', youtubeTitle:'Barbell Glute Bridge · Muscle & Strength', youtubeUrl:'https://www.youtube.com/watch?v=QWXttb8-n50', guideSource:'ACE hip bridge guide', guideUrl:'https://www.acefitness.org/resources/everyone/exercise-library/318/hip-bridge/' },
  { id:'pullup', name:'Pull-up progression', sets:3, target:'quality reps by rung', load:'Bodyweight', qualifier:'selected progression', plates:'Pull-up bar · confirm secure fit before every session', type:'bodyweight', cue:'Start with active shoulders and drive the elbows toward the ribs. No kipping.', setup:'Use a stable step to reach the bar. Test the bar with partial bodyweight before hanging fully.', mistake:'Do not jump into uncontrolled negatives, swing, or train on a loose doorway bar.', easier:'Dead hang, scapular pull-up, flexed-arm hold or controlled negative.', youtubeTitle:'How To Do Pull-Ups For Complete Beginners · FitnessFAQs', youtubeUrl:'https://www.youtube.com/watch?v=aNUSgyWRJYA', guideSource:'FitnessFAQs pull-up tutorial library', guideUrl:'https://fitnessfaqs.com/articles/ff-video-tag/pull-up-tutorial/' },
  { id:'raise', name:'Dumbbell lateral raise', sets:3, target:'12–20', load:'2.5 kg', qualifier:'per dumbbell', plates:'1.25 kg on each end', type:'paired-dumbbell', cue:'Raise with soft elbows and stop around shoulder height. Do not shrug.', setup:'Stand tall with light dumbbells and soft elbows.', mistake:'Do not swing, shrug or lift far above shoulder height.', easier:'Use one arm at a time or reduce the load.', youtubeTitle:'Lateral Raise Technique · Renaissance Periodization', youtubeUrl:'https://www.youtube.com/watch?v=n5dsI9qQXwY', guideSource:'ACE lateral raise guide', guideUrl:'https://www.acefitness.org/resources/everyone/exercise-library/26/lateral-raise/' },
  { id:'triceps', name:'Overhead triceps extension', sets:2, target:'10–15', load:'5 kg', qualifier:'one dumbbell', plates:'2.5 kg on each end', type:'single-dumbbell', cue:'Keep the upper arms mostly vertical and control the bottom position.', setup:'Hold one dumbbell securely overhead with the ribs controlled.', mistake:'Do not flare the elbows excessively or arch the lower back.', easier:'Reduce the load and shorten the range while keeping control.', youtubeTitle:'Overhead Triceps Extension · Renaissance Periodization', youtubeUrl:'https://www.youtube.com/watch?v=iKX6vEhrGxw', guideSource:'ACE triceps extension guide', guideUrl:'https://www.acefitness.org/resources/everyone/exercise-library/74/triceps-extension/' }

];

const pullupFallbackExercise = {
  id:'pullover', name:'Dumbbell pullover', sets:3, target:'10–15', load:'7.5 kg', qualifier:'one dumbbell · plate-only',
  plates:'2.5 kg + 1.25 kg on each end', type:'single-dumbbell',
  cue:'Keep the ribs controlled and move only as far as the shoulders remain comfortable.',
  setup:'Lie securely on the floor or across a stable support, hold one dumbbell above the chest and keep a soft bend in the elbows.',
  mistake:'Do not chase excessive depth, flare the ribs or turn the movement into an uncontrolled stretch.',
  easier:'Use 5 kg plate-only or shorten the range while maintaining control.',
  youtubeTitle:'How to Properly Dumbbell Pullover · Colossus Fitness',
  youtubeUrl:'https://www.youtube.com/watch?v=Q8l6ykgnmPM',
  guideSource:'ACE lying pullover guide',
  guideUrl:'https://www.acefitness.org/resources/everyone/exercise-library/37/lying-pullovers/',
  last:'No prior pullover session', next:'8.5 kg plate-only · after two clean sessions',
  substitutes:[
    { name:'One-arm dumbbell row', note:'Horizontal pull; familiar fallback' },
    { name:'Barbell bent-over row', note:'Bilateral pulling alternative' },
    { name:'Dumbbell floor lat sweep', note:'Low-load lat-focused option' }
  ],
  replaces:'pullup'
};

const exerciseEnhancements = {
  lunge: {
    last: 'Bodyweight rehearsal · appropriate', next: '6 kg per dumbbell · after 2 successes',
    substitutes: [
      { name:'Static split squat', note:'Easier balance; same knee-dominant pattern' },
      { name:'Goblet squat', note:'Simpler setup; bilateral alternative' },
      { name:'Bulgarian split squat', note:'Harder unilateral alternative' }
    ]
  },
  pushup: {
    last: '10, 9, 8 conceptually · challenging', next: 'Three-second lowering',
    substitutes: [
      { name:'Incline push-up', note:'Easier pressing variation' },
      { name:'Dumbbell floor press', note:'Loaded horizontal press' },
      { name:'Paused push-up', note:'Same movement with more control' }
    ]
  },
  bridge: {
    last: '15 kg plates · comfortable', next: '16 kg plates · one more success',
    substitutes: [
      { name:'Dumbbell glute bridge', note:'Faster equipment setup' },
      { name:'Bodyweight hip bridge', note:'Technique or recovery option' },
      { name:'Romanian deadlift', note:'Hip-dominant alternative' }
    ]
  },
  pullup: {
    last: 'Scapular control + 3 slow negatives', next: 'Assisted pull-ups, then first strict rep',
    substitutes: [
      { name:'One-arm dumbbell row', note:'Horizontal pull; simpler loading' },
      { name:'Barbell bent-over row', note:'Bilateral pulling alternative' },
      { name:'Scapular pull-up only', note:'Technique and shoulder-control option' }
    ]
  },
  raise: {
    last: '2.5 kg each · comfortable', next: 'Tempo before 40% load jump',
    substitutes: [
      { name:'Single-arm lateral raise', note:'More control with same load' },
      { name:'Lean-away lateral raise', note:'Harder range without more plates' },
      { name:'No-load lateral raise', note:'Technique recovery option' }
    ]
  },
  triceps: {
    last: '5 kg · appropriate', next: '6 kg · after 2 clean sessions',
    substitutes: [
      { name:'Close-grip push-up', note:'Bodyweight triceps emphasis' },
      { name:'Lying dumbbell extension', note:'Different shoulder position' },
      { name:'Single-arm extension', note:'Lower effective load per side' }
    ]
  }
};
workoutExercises.forEach(exercise => Object.assign(exercise, exerciseEnhancements[exercise.id] || {}));


const pullupLevels = [
  { id:1, name:'Hang + scapular control', short:'Scapular control', prescription:'3 × 5 scapular pulls or 15–25 sec hangs', note:'Build grip and learn active shoulders.' },
  { id:2, name:'Controlled negatives', short:'Controlled negatives', prescription:'3 × 3 negatives · 3–5 sec lowering', note:'Step to the top, then lower without dropping.' },
  { id:3, name:'Assisted pull-ups', short:'Assisted reps', prescription:'3 × 5–8 assisted reps', note:'Use a band or carefully controlled foot assistance.' },
  { id:4, name:'Strict pull-ups', short:'Strict reps', prescription:'3 × 3–6 strict reps', note:'Full control, no kip; add reps before load.' }
];


const runPhases = starterRun.phases.map((phase) => ({
  ...phase,
  mode: phase.type === 'easy-run' ? 'run' : phase.type === 'cool-down-walk' ? 'cooldown' : 'walk',
  start: phase.startSeconds,
  end: phase.startSeconds + phase.durationSeconds
}));
const RUN_TOTAL_SECONDS = starterRun.durationSeconds;

const trainingTracks = [
  { id:'lean', name:'Lean Athletic', recommended:true, strength:'3 days', running:'1–2 easy runs', goal:'Build visible muscle while keeping the waist controlled and improving aerobic capacity.' },
  { id:'muscle', name:'Muscle Emphasis', strength:'3–4 days', running:'1 easy session', goal:'More weekly hypertrophy volume and slower running progression.' },
  { id:'hybrid', name:'Hybrid Runner–Strength', strength:'3 days', running:'2–3 runs', goal:'Greater endurance priority with a slower rate of muscle gain.' }
];

const state = {
  screen: 'today',
  theme: 'dark',
  meals: {},
  feeling: null,
  weight: null,
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
    pullupEnabledAtStart: null
  },
  readiness: { energy: 'Good', sleep: 'Okay', soreness: 'Low' },
  formSeen: { lunge: 0, pushup: 1, bridge: 1, pullup: 0, raise: 1, triceps: 1 },
  pullupLevel: 2,
  equipment: { pullupBarStatus: 'owned-not-installed', pullupSafetyConfirmed: false },
  longTermTrack: 'Lean Athletic',
  block: { current: 1, week: 1, nextAccepted: false },
  run: {
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
  return state.equipment.pullupBarStatus === 'installed-available' && state.equipment.pullupSafetyConfirmed;
}

function pullupEnabledForCurrentWorkout() {
  return typeof state.workout.pullupEnabledAtStart === 'boolean'
    ? state.workout.pullupEnabledAtStart
    : pullupEnabledForFutureWorkouts();
}

function activeWorkoutExercises() {
  const includePullups = pullupEnabledForCurrentWorkout();
  return workoutExercises.map(exercise => exercise.id === 'pullup' && !includePullups ? pullupFallbackExercise : exercise);
}

function currentWorkoutExercise() {
  return activeWorkoutExercises()[state.workout.currentExercise];
}

function pullupStatusLabel() {
  return pullupStatusLabels[state.equipment.pullupBarStatus] || 'Unknown';
}

const onboardingState = {
  step: 0,
  name: 'Tobby',
  weight: 69.8,
  target: 74,
  waist: 84,
  days: ['Monday','Wednesday','Friday'],
  optionalDay: 'Saturday',
  barWeight: '',
  dumbbellWeight: '',
  pullupBarStatus: 'owned-not-installed',
  exclusions: new Set()
};

const onboardingSteps = [
  {
    eyebrow: 'Goal', title: 'Start with the plan that matters now.',
    copy: 'Set the lean-gain target and begin. Food exclusions, notifications and waist tracking appear later when they are relevant.',
    render: () => `<div class="onboarding-fields two-column"><label>Name<input id="obName" value="${onboardingState.name}"></label><label>Current weight (kg)<input id="obWeight" type="number" step="0.1" value="${onboardingState.weight}"></label><label>Target weight (kg)<input id="obTarget" type="number" step="0.1" value="${onboardingState.target}"></label><label>Primary goal<select><option selected>Build muscle with controlled waist</option></select></label></div>`
  },
  {
    eyebrow: 'Schedule', title: 'Choose three days you can defend.', copy: 'The workout sequence remains A → B → C even when a day moves.',
    render: () => `<div class="option-grid">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => `<button class="option-tile ${onboardingState.days.includes(day) ? 'selected' : ''}" data-ob-day="${day}"><strong>${day}</strong><small>${onboardingState.days.includes(day) ? 'Required workout day' : 'Available'}</small></button>`).join('')}</div><div class="onboarding-fields"><label>Optional workout day<select id="obOptional">${['Saturday','Sunday','None'].map(x => `<option ${x===onboardingState.optionalDay?'selected':''}>${x}</option>`).join('')}</select></label></div>`
  },
  {
    eyebrow: 'Equipment', title: 'Make every load unambiguous.', copy: 'Your exact plate inventory is seeded. Empty implement weights are optional; plate-only loads remain explicit until entered.',
    render: () => `<div class="onboarding-summary"><div><span>0.5 kg plates</span><strong>6</strong></div><div><span>1.25 kg plates</span><strong>6</strong></div><div><span>2.5 kg plates</span><strong>4</strong></div><div><span>5 kg plates</span><strong>4</strong></div><div><span>Total removable plates</span><strong>40.5 kg</strong></div><div><span>Pull-up bar</span><strong>${pullupStatusLabels[onboardingState.pullupBarStatus]}</strong></div></div><div class="equipment-status-grid">${Object.entries(pullupStatusLabels).map(([value,label]) => `<button class="option-tile ${onboardingState.pullupBarStatus === value ? 'selected' : ''}" data-ob-pullup-status="${value}"><strong>${label}</strong><small>${value === 'installed-available' ? 'Requires a one-time safety confirmation' : value === 'owned-not-installed' ? 'Current default · pullovers remain scheduled' : value === 'temporarily-unavailable' ? 'Pull-up progression pauses without resetting' : 'Pull-up work stays locked'}</small></button>`).join('')}</div><div class="pullup-safety"><strong>Conditional programming</strong><p>Pull-up workouts appear only after the bar is marked installed and the safety check is confirmed. Until then, Workout C uses a dumbbell pullover with separate history.</p></div><div class="onboarding-fields two-column"><label>Empty barbell weight (optional)<input id="obBar" type="number" step="0.1" placeholder="Unknown" value="${onboardingState.barWeight}"></label><label>One empty dumbbell handle (optional)<input id="obDumbbell" type="number" step="0.1" placeholder="Unknown" value="${onboardingState.dumbbellWeight}"></label></div>`
  },
  {
    eyebrow: 'Ready', title: 'Begin Week 1 without more paperwork.', copy: 'Meals are ready. Food exclusions appear when Meals is opened; waist and reminders appear during the first weekly review.',
    render: () => `<div class="onboarding-summary"><div><span>Name</span><strong>${onboardingState.name}</strong></div><div><span>Goal</span><strong>${onboardingState.weight} → ${onboardingState.target} kg</strong></div><div><span>Required days</span><strong>${onboardingState.days.join(', ')}</strong></div><div><span>First workout</span><strong>Full Body A</strong></div><div><span>Workout C pull slot</span><strong>${onboardingState.pullupBarStatus === 'installed-available' ? 'Pull-up setup pending safety confirmation' : 'Dumbbell pullover until bar activation'}</strong></div><div><span>Long-term track</span><strong>Lean Athletic</strong></div><div><span>Deferred setup</span><strong>Food, waist, reminders</strong></div></div>`
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
  content.innerHTML = `<div class="onboarding-step"><span class="eyebrow">${step.eyebrow}</span><h2>${step.title}</h2><p>${step.copy}</p>${step.render()}<div class="onboarding-actions"><button class="onboarding-skip" id="skipOnboarding">Skip to populated demo</button><div class="onboarding-actions-right">${onboardingState.step > 0 ? '<button class="button button-ghost" id="onboardingBack">Back</button>' : ''}<button class="button button-primary" id="onboardingNext">${onboardingState.step === onboardingSteps.length - 1 ? 'Begin Week 1' : 'Continue'}</button></div></div></div>`;
  document.getElementById('skipOnboarding').addEventListener('click', () => layer.classList.add('completed'));
  document.getElementById('onboardingNext').addEventListener('click', () => {
    captureOnboardingStep();
    if (onboardingState.step < onboardingSteps.length - 1) { onboardingState.step += 1; renderOnboarding(); }
    else {
      state.equipment.pullupBarStatus = onboardingState.pullupBarStatus;
      state.equipment.pullupSafetyConfirmed = false;
      layer.classList.add('completed');
      updateLongTermUI();
      showToast(state.equipment.pullupBarStatus === 'installed-available' ? 'Week 1 is ready. Confirm pull-up bar safety before activation.' : 'Week 1 is ready. Dumbbell pullovers remain scheduled until the pull-up bar is activated.');
      if (state.equipment.pullupBarStatus === 'installed-available') setTimeout(pullupSetup, 180);
    }
  });
  document.getElementById('onboardingBack')?.addEventListener('click', () => { captureOnboardingStep(); onboardingState.step -= 1; renderOnboarding(); });
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
}

function captureOnboardingStep() {
  const name = document.getElementById('obName'); if (name) onboardingState.name = name.value.trim() || 'Tobby';
  const weight = document.getElementById('obWeight'); if (weight) onboardingState.weight = Number(weight.value) || 69.8;
  const target = document.getElementById('obTarget'); if (target) onboardingState.target = Number(target.value) || 74;
  const waist = document.getElementById('obWaist'); if (waist) onboardingState.waist = Number(waist.value) || 84;
  const optional = document.getElementById('obOptional'); if (optional) onboardingState.optionalDay = optional.value;
  const bar = document.getElementById('obBar'); if (bar) onboardingState.barWeight = bar.value;
  const dumbbell = document.getElementById('obDumbbell'); if (dumbbell) onboardingState.dumbbellWeight = dumbbell.value;
}

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

function openModal(html) {
  modalContent.innerHTML = html;
  modalLayer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const close = modalContent.querySelector('[data-action="close-modal"]');
  if (close) close.addEventListener('click', closeModal);
}
function closeModal() {
  modalLayer.classList.add('hidden');
  document.body.style.overflow = '';
}
modalLayer.querySelector('.modal-backdrop').addEventListener('click', closeModal);

document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modalLayer.classList.contains('hidden')) closeModal(); });

function renderTodayMeals() {
  const preview = document.getElementById('todayMealPreview');
  preview.innerHTML = meals.map(meal => {
    const status = state.meals[meal.id];
    const label = status?.type === 'planned' ? 'Planned meal' : status?.type === 'alternative' ? 'Alternative' : status?.type === 'missed' ? 'Missed' : meal.planned;
    return `<div class="meal-preview-row ${status ? 'checked' : ''}"><small>${meal.slot}</small><strong>${label}</strong><span aria-label="${status ? 'Checked' : 'Not checked'}"></span></div>`;
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
    return `
      <article class="meal-card" data-meal-card="${meal.id}">
        <div class="meal-time">${meal.time}<br><span>${meal.slot}</span></div>
        <div>
          <h2>${meal.planned}</h2>
          <span class="protein-tag">Protein: ${meal.protein}</span>
          <div class="meal-options">
            <button class="meal-option-button ${status?.type === 'planned' ? 'selected' : ''}" data-meal-action="planned" data-meal-id="${meal.id}">Ate planned</button>
            <button class="meal-option-button ${status?.type === 'alternative' ? 'selected' : ''}" data-meal-action="alternative" data-meal-id="${meal.id}">Choose alternative</button>
            <button class="meal-option-button missed ${status?.type === 'missed' ? 'selected' : ''}" data-meal-action="missed" data-meal-id="${meal.id}">Missed</button>
          </div>
        </div>
        <div class="meal-card-state">${stateLabel}</div>
      </article>`;
  }).join('');

  container.querySelectorAll('[data-meal-action]').forEach(button => button.addEventListener('click', () => handleMealAction(button.dataset.mealId, button.dataset.mealAction)));
}

function handleMealAction(mealId, action) {
  const meal = meals.find(item => item.id === mealId);
  if (action === 'planned') {
    state.meals[mealId] = { type: 'planned', name: meal.planned };
    updateAll();
    showToast(`${meal.slot} recorded.`);
    return;
  }
  if (action === 'missed') {
    state.meals[mealId] = { type: 'missed', name: 'Missed' };
    updateAll();
    showToast(`${meal.slot} recorded as missed—no lecture attached.`);
    return;
  }
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">${meal.slot}</span><h2 id="modalTitle">Choose an approved alternative</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>Alternatives are similar in training role, not claimed to be nutritionally identical.</p>
    <div class="choice-list">
      ${meal.alternatives.map((alt,index) => `<button class="choice-button" data-alt-index="${index}"><strong>${alt.name}</strong><span>${alt.note}</span></button>`).join('')}
    </div>
  `);
  modalContent.querySelectorAll('[data-alt-index]').forEach(button => button.addEventListener('click', () => {
    const alt = meal.alternatives[Number(button.dataset.altIndex)];
    state.meals[mealId] = { type: 'alternative', name: alt.name };
    closeModal(); updateAll(); showToast(`${meal.slot} alternative recorded.`);
  }));
}

function mealAdherence() {
  const adhered = Object.values(state.meals).filter(x => x.type === 'planned' || x.type === 'alternative').length;
  return Math.round((adhered / meals.length) * 100);
}

function updateDailyStatus() {
  const mealCount = Object.keys(state.meals).length;
  const completedCount = [state.workout.finished, mealCount === meals.length, Boolean(state.feeling), Boolean(state.weight)].filter(Boolean).length;
  document.getElementById('dailyDoneCount').textContent = completedCount;
  document.getElementById('mealStatusText').textContent = mealCount ? `${mealCount} of ${meals.length} checked · ${mealAdherence()}% adherence` : 'Nothing logged yet';
  document.getElementById('mealState').textContent = mealCount === meals.length ? 'Done' : 'Open';
  document.getElementById('feelingStatusText').textContent = state.feeling ? `Feeling: ${state.feeling}` : 'One tap this evening';
  document.getElementById('feelingState').textContent = state.feeling ? 'Done' : 'Log';
  document.getElementById('weightStatusText').textContent = state.weight ? `${state.weight.toFixed(1)} kg recorded` : 'Due today · weekly average matters';
  document.getElementById('weightState').textContent = state.weight ? 'Done' : 'Add';
  document.getElementById('workoutState').textContent = state.workout.finished ? 'Done' : state.workout.active ? 'Resume' : 'Start';
  document.getElementById('progressMealAdherence').textContent = `${mealAdherence()}%`;
  document.getElementById('dataMealChecks').textContent = mealCount;
  document.getElementById('dataMeasurements').textContent = state.weight ? 1 : 0;

  document.querySelectorAll('.action-row').forEach(row => row.classList.remove('completed'));
  const rows = document.querySelectorAll('.action-row');
  if (state.workout.finished) rows[0]?.classList.add('completed');
  if (mealCount === meals.length) rows[1]?.classList.add('completed');
  if (state.feeling) rows[2]?.classList.add('completed');
  if (state.weight) rows[3]?.classList.add('completed');
}

function openFeeling() {
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Daily check-in</span><h2 id="modalTitle">How do you feel generally?</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>One honest tap. This is not a medical diagnosis.</p>
    <div class="choice-list">
      ${['Great','Good','Okay','Tired','Poor'].map(value => `<button class="choice-button" data-feeling="${value}"><strong>${value}</strong><span>${value === 'Poor' ? 'Recovery guidance may appear' : 'Record and continue'}</span></button>`).join('')}
    </div>
  `);
  modalContent.querySelectorAll('[data-feeling]').forEach(button => button.addEventListener('click', () => {
    state.feeling = button.dataset.feeling; closeModal(); updateAll(); showToast(`Feeling recorded: ${state.feeling}.`);
  }));
}

function logWeight() {
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Measurement</span><h2 id="modalTitle">Record morning weight</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>The weekly average matters more than one measurement.</p>
    <div class="modal-form"><label>Weight in kilograms<input id="weightInput" type="number" min="30" max="250" step="0.1" value="69.8"></label></div>
    <div class="modal-actions"><button class="button button-ghost" data-action="close-modal">Cancel</button><button class="button button-primary" id="saveWeight">Save weight</button></div>
  `);
  modalContent.querySelectorAll('[data-action="close-modal"]').forEach(x => x.addEventListener('click', closeModal));
  document.getElementById('saveWeight').addEventListener('click', () => {
    const value = Number(document.getElementById('weightInput').value);
    if (!Number.isFinite(value) || value < 30) return showToast('Enter a valid weight.');
    state.weight = value; closeModal(); updateAll(); showToast(`${value.toFixed(1)} kg recorded.`);
  });
}

function updateAll() {
  renderTodayMeals();
  renderMeals();
  updateDailyStatus();
  updateActiveWorkoutStrip();
  updateActiveRunStrip();
  updateLongTermUI();
}

async function startWorkout() {
  if (state.settings.restSoundEnabled && !state.settings.audioUnlocked) await unlockRestAudio();
  if (state.workout.finished) { showToast('This workout is already complete in the prototype.'); return; }
  state.workout.active = true;
  if (state.workout.pullupEnabledAtStart === null) state.workout.pullupEnabledAtStart = pullupEnabledForFutureWorkouts();
  if (!state.workout.startedAt) state.workout.startedAt = Date.now();
  if (!state.workout.step) state.workout.step = 'overview';
  startWorkoutTicker();
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
  return `<section class="rest-alert-panel"><div><span class="eyebrow">Rest-complete alert</span><h3>${restToneLabel()}</h3><p>${state.settings.restSoundEnabled ? `Sound on · ${unlockStatus}` : 'Sound muted'}${state.settings.vibrationEnabled ? ' · vibration when supported' : ''}</p></div><div class="rest-tone-options" role="group" aria-label="Rest alert sound"><button class="rest-tone-option ${state.settings.restTone === 'double-bell' ? 'selected' : ''}" data-rest-tone="double-bell">Double bell</button><button class="rest-tone-option ${state.settings.restTone === 'digital-beep' ? 'selected' : ''}" data-rest-tone="digital-beep">Digital beep</button><button class="rest-tone-option ${state.settings.restTone === 'soft-chime' ? 'selected' : ''}" data-rest-tone="soft-chime">Soft chime</button></div><div class="rest-alert-actions"><button class="workout-button" data-toggle-rest-sound>${state.settings.restSoundEnabled ? 'Mute sound' : 'Enable sound'}</button><button class="workout-button primary" data-test-rest-alert>Test alert</button></div></section>`;
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
  return `<section class="readiness-panel"><span class="eyebrow">Before you begin</span><h3>How are you arriving today?</h3><div class="readiness-grid">${groups.map(([key,label,values]) => `<div class="readiness-control"><span>${label}</span><div class="readiness-options">${values.map(value => `<button class="readiness-option ${state.readiness[key] === value ? 'selected' : ''}" data-readiness-key="${key}" data-readiness-value="${value}">${value}</button>`).join('')}</div></div>`).join('')}</div><p class="readiness-read">${readinessMessage()}</p></section>`;
}

function compactFormRefresher(exercise) {
  return `<div class="workout-step"><span class="eyebrow">Exercise ${state.workout.currentExercise + 1} · quick refresher</span><div class="form-refresher"><div class="form-refresher-grid"><div><span class="eyebrow">You have seen this movement before</span><h2>${exercise.name}</h2><p>${exercise.cue}</p><small>${exercise.youtubeTitle}</small></div><div class="form-refresher-actions"><a class="workout-button" href="${exercise.youtubeUrl}" target="_blank" rel="noopener noreferrer">Watch 1-minute refresher ↗</a><button class="workout-button primary" data-form-remember="true">I remember — begin sets</button></div></div></div></div>`;
}

function openCalibrationSheet() {
  const exercise = currentWorkoutExercise();
  const subject = exercise.type === 'bodyweight' ? 'variation' : 'load';
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Calibration · ${exercise.name}</span><h2 id="modalTitle">How was that ${subject} with clean form?</h2></div></div><p>One tap only. The completed exercise remains visible behind this sheet.</p><div class="calibration-options"><button class="calibration-option" data-sheet-calibration="too-light">Too light</button><button class="calibration-option" data-sheet-calibration="appropriate">Appropriate</button><button class="calibration-option" data-sheet-calibration="too-heavy">Too heavy</button></div>`);
  modalContent.querySelectorAll('[data-sheet-calibration]').forEach(button => button.addEventListener('click', () => {
    closeModal();
    handleCalibration(button.dataset.sheetCalibration);
  }));
}

function openSwapExercise() {
  const exercise = currentWorkoutExercise();
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Exercise substitution</span><h2 id="modalTitle">Swap ${exercise.name}?</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>Alternatives preserve the movement purpose as closely as this home setup allows.</p><div class="choice-list">${(exercise.substitutes || []).map((sub,index) => `<button class="choice-button" data-substitute-index="${index}"><strong>${sub.name}</strong><span>${sub.note}</span></button>`).join('')}</div>`);
  modalContent.querySelectorAll('[data-substitute-index]').forEach(button => button.addEventListener('click', () => {
    const sub = exercise.substitutes[Number(button.dataset.substituteIndex)];
    state.workout.substitutions[exercise.id] = sub.name;
    closeModal(); renderWorkout(); showToast(`${exercise.name} swapped to ${sub.name}.`);
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
  if (state.workout.step === 'exercise') return `${state.workout.substitutions[exercise.id] || exercise.name} · Set ${Math.min(completed.length + 1, exercise.sets)} of ${exercise.sets}`;
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
  const visible = state.workout.active && !state.workout.finished && state.screen !== 'workout';
  strip?.classList.toggle('hidden', !visible);
  const text = document.getElementById('activeWorkoutText');
  if (text) text.textContent = activeWorkoutLabel();
}

function injectWeeklyCoach() {
  if (document.getElementById('weeklyCoach')) return;
  const metrics = document.querySelector('[data-screen="progress"] .metric-strip');
  metrics?.insertAdjacentHTML('afterend', `<section id="weeklyCoach" class="weekly-coach"><div><span class="eyebrow">Weekly coaching review</span><h2>Keep the plan unchanged.</h2><p>Weight is stable, waist is slightly lower in the sample trend, and three exercises are progressing. There is no evidence-based reason to change food portions yet.</p></div><button class="button button-primary coach-action" id="openWeeklyReview">Review evidence</button></section>`);
  document.getElementById('openWeeklyReview')?.addEventListener('click', () => openModal(`<div class="modal-heading"><div><span class="eyebrow">Weekly review</span><h2 id="modalTitle">One recommendation, backed by the week.</h2></div><button class="modal-close" data-action="close-modal">×</button></div><div class="import-summary"><div><span>Workouts</span><strong>3 / 3</strong></div><div><span>Meals</span><strong>84%</strong></div><div><span>Readiness</span><strong>Mostly good</strong></div></div><div class="conflict-card"><strong>Keep the plan unchanged</strong><p>Weight is stable, waist is down 0.6 cm in this prototype scenario, and strength is moving. Review again next Sunday.</p></div><p>Waist measurement and reminder preferences are requested here after the first useful week—not before the user receives value.</p>`));
}

function renderWorkout() {
  const stage = document.getElementById('workoutStage');
  const progress = workoutProgress();
  const pullupsActive = pullupEnabledForCurrentWorkout();
  const topbarLabel = document.getElementById('workoutTopbarLabel');
  if (topbarLabel) topbarLabel.textContent = pullupsActive ? 'FULL BODY C · VERTICAL PULL' : 'FULL BODY C · PULLOVER FALLBACK';
  const base = `<div class="workout-progress-label"><span>${state.workout.step.toUpperCase()}</span><span>${progress}%</span></div><div class="workout-progress-track"><div class="workout-progress-fill" style="width:${progress}%"></div></div>`;

  if (state.workout.step === 'overview') {
    stage.innerHTML = `<div class="workout-step">${base}<h1 class="workout-title">Full Body C</h1><p class="workout-copy">${pullupsActive ? 'The installed-and-confirmed pull-up bar unlocks your current progression rung.' : 'Your pull-up bar is not active yet, so this workout uses a dumbbell pullover. Pull-up history remains untouched.'}</p><div class="workout-overview-grid"><div><span>Duration</span><strong>45–50 min</strong></div><div><span>Exercises</span><strong>6</strong></div><div><span>Pull slot</span><strong>${pullupsActive ? 'Pull-up progression' : 'Dumbbell pullover'}</strong></div></div>${!pullupsActive ? `<div class="pullup-safety workout-equipment-note"><strong>Pull-ups locked</strong><p>Current bar status: ${pullupStatusLabel()}. Change it only after installation; an active workout will never be altered mid-session.</p><button class="workout-button" data-action="pullup-setup">Update bar status</button></div>` : ''}${readinessControls()}${restAlertControls()}<div class="workout-button-row"><button class="workout-button primary" data-workout-next="warmup">Begin warm-up</button><button class="workout-button" data-action="minimise-workout">Back to Today</button></div></div>`;
  }

  if (state.workout.step === 'warmup') {
    const warmups = [
      ['General movement','March, arm circles and easy bodyweight movement · 2 minutes'],
      ['Dynamic mobility','Hip hinges, reverse-lunge rehearsal and shoulder movement'],
      ['Exercise rehearsal', pullupsActive ? 'Bodyweight reverse lunges + two scapular pull-up rehearsals' : 'Bodyweight reverse lunges + light pullover rehearsal'],
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
    stage.innerHTML = `<div class="workout-step">${base}<span class="eyebrow">Finish</span><h1 class="workout-title">How did the session land?</h1><p class="workout-copy">This is the minimum honest evidence the progression system needs.</p><div class="choice-list dark-choice-list">${['Completed comfortably','Completed but challenging','Missed repetitions or sets','Stopped early'].map(value => `<button class="choice-button" data-session-result="${value}"><strong>${value}</strong><span>${value.includes('Stopped') ? 'Creates a partial session' : 'Used as progression evidence'}</span></button>`).join('')}</div></div>`;
  }

  if (state.workout.step === 'receipt') {
    stage.innerHTML = `<div class="workout-step">${base}<div class="receipt"><div class="receipt-header"><div><span class="eyebrow">Workout receipt</span><h2>Full Body C</h2><p>Friday, 31 July · Week 1 calibration</p></div><div class="receipt-mark">✓</div></div><div class="receipt-dash"></div><div class="receipt-stats"><div><span>Duration</span><strong>${formatTime(workoutElapsedSeconds())}</strong></div><div><span>Exercises</span><strong>6 / 6</strong></div><div><span>Sets</span><strong>19 / 19</strong></div><div><span>Session</span><strong>${state.workout.result}</strong></div><div><span>Progression</span><strong>Calibration saved</strong></div><div><span>Pull slot</span><strong>${pullupsActive ? pullupLevels.find(level => level.id === state.pullupLevel).short : 'Dumbbell pullover'}</strong></div><div><span>Next</span><strong>Workout A</strong></div></div><div class="receipt-dash"></div><button class="button button-primary full-width" data-action="finish-receipt">Return to Today</button></div></div>`;
  }

  bindWorkoutActions();
  requestAnimationFrame(() => document.querySelector('.workout-screen.active')?.scrollTo({ top: 0, behavior: 'auto' }));
}

function renderExercise(stage, base) {
  const exercise = currentWorkoutExercise();
  const completed = state.workout.completedSets[exercise.id] || [];
  const currentSet = Math.min(completed.length + 1, exercise.sets);
  const substituted = state.workout.substitutions[exercise.id];
  const displayName = substituted || exercise.name;
  const pullupRung = exercise.id === 'pullup' ? pullupLevels.find(level => level.id === state.pullupLevel) : null;
  const displayLoad = pullupRung ? pullupRung.name : exercise.load;
  const displayTarget = pullupRung ? pullupRung.prescription : exercise.target;
  const configurationLabel = pullupRung ? 'Equipment + current rung' : 'Plate configuration';
  stage.innerHTML = `<div class="workout-step">${base}<div class="exercise-header"><div><span class="eyebrow">Exercise ${state.workout.currentExercise + 1} of ${activeWorkoutExercises().length}</span><h1 class="exercise-title">${displayName}</h1><p>${exercise.sets} × ${displayTarget}</p>${pullupRung ? `<span class="exercise-mode-badge">Rung ${pullupRung.id} of 4</span>` : ''}${substituted ? `<div class="substitution-note">Substituted from ${exercise.name}; progression history remains separate in production.</div>` : ''}</div><div class="exercise-load"><strong>${displayLoad}</strong><span>${exercise.qualifier}</span></div></div><div class="exercise-context-strip"><div><small>Last time</small><strong>${exercise.last || 'No prior session'}</strong><span>Historical reference</span></div><div class="today"><small>Today</small><strong>${displayLoad} · Set ${currentSet}/${exercise.sets}</strong><span>${displayTarget}</span></div><div><small>Next eligible</small><strong>${exercise.next || 'Earn two clean sessions'}</strong><span>Never applied silently</span></div></div><div class="dark-load-panel"><span class="eyebrow">${configurationLabel}</span><h3>${exercise.plates}</h3><p>${exercise.cue}</p></div><div class="set-grid">${Array.from({length:exercise.sets},(_,i) => `<button class="set-button ${completed.includes(i+1) ? 'complete' : currentSet === i+1 ? 'current' : ''}" data-set="${i+1}">${completed.includes(i+1) ? '✓' : String(i+1).padStart(2,'0')}</button>`).join('')}</div><button class="current-set-action" data-complete-current="true">Complete set ${currentSet}</button><div class="exercise-footer-actions"><button class="text-button light" data-action="review-form">Review form</button>${exercise.id === 'pullup' ? '<button class="text-button light" data-action="choose-pullup-level">Change rung</button>' : '<button class="text-button light" data-action="swap-exercise">Swap exercise</button>'}<button class="text-button light" data-action="skip-set">Skip current set</button></div></div>`;
}

async function completeCurrentSet() {
  if (state.settings.restSoundEnabled && !state.settings.audioUnlocked) await unlockRestAudio();
  const exercise = currentWorkoutExercise();
  const completed = state.workout.completedSets[exercise.id] || [];
  const nextSet = completed.length + 1;
  if (!completed.includes(nextSet)) completed.push(nextSet);
  state.workout.completedSets[exercise.id] = completed;
  if (completed.length >= exercise.sets) {
    renderWorkout();
    openCalibrationSheet();
  } else {
    startRest(75);
  }
}

function startRest(seconds) {
  state.workout.restRemaining = seconds;
  state.workout.restTotal = seconds;
  state.workout.restEndsAt = Date.now() + seconds * 1000;
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

function addRestSeconds(seconds) {
  state.workout.restEndsAt = (state.workout.restEndsAt || Date.now()) + seconds * 1000;
  state.workout.restTotal = (state.workout.restTotal || state.workout.restRemaining || 0) + seconds;
  updateRestTimer();
}

function endRest(notify = false) {
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

function handleCalibration(value) {
  const exercise = currentWorkoutExercise();
  state.workout.calibration[exercise.id] = value;
  state.formSeen[exercise.id] = (state.formSeen[exercise.id] || 0) + 1;
  state.workout.forceFullForm = false;
  if (state.workout.currentExercise < activeWorkoutExercises().length - 1) {
    state.workout.currentExercise += 1;
    state.workout.step = 'form';
  } else state.workout.step = 'result';
  renderWorkout();
}

function bindWorkoutActions() {
  document.querySelectorAll('[data-readiness-key]').forEach(button => button.addEventListener('click', () => {
    state.readiness[button.dataset.readinessKey] = button.dataset.readinessValue;
    renderWorkout();
  }));
  document.querySelectorAll('[data-form-begin]').forEach(button => button.addEventListener('click', () => {
    const exercise = currentWorkoutExercise();
    state.formSeen[exercise.id] = Math.max(1, state.formSeen[exercise.id] || 0);
    state.workout.forceFullForm = false;
    state.workout.step = 'exercise'; renderWorkout();
  }));
  document.querySelectorAll('[data-form-remember]').forEach(button => button.addEventListener('click', () => {
    state.workout.step = 'exercise'; renderWorkout();
  }));
  document.querySelectorAll('[data-workout-next]').forEach(button => button.addEventListener('click', () => { if (!button.disabled) { state.workout.step = button.dataset.workoutNext; renderWorkout(); }}));
  document.querySelectorAll('[data-warmup]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.warmup); state.workout.warmup.has(index) ? state.workout.warmup.delete(index) : state.workout.warmup.add(index); renderWorkout(); }));
  document.querySelectorAll('[data-complete-current]').forEach(button => button.addEventListener('click', completeCurrentSet));
  document.querySelectorAll('[data-set]').forEach(button => button.addEventListener('click', () => {
    const exercise = currentWorkoutExercise();
    const setNo = Number(button.dataset.set);
    const completed = state.workout.completedSets[exercise.id] || [];
    if (completed.includes(setNo)) state.workout.completedSets[exercise.id] = completed.filter(x => x !== setNo);
    else if (setNo === completed.length + 1) state.workout.completedSets[exercise.id] = [...completed, setNo];
    renderWorkout();
  }));
  document.querySelectorAll('[data-rest-skip]').forEach(button => button.addEventListener('click', () => endRest(false)));
  document.querySelectorAll('[data-rest-add]').forEach(button => button.addEventListener('click', () => addRestSeconds(Number(button.dataset.restAdd))));
  document.querySelectorAll('[data-test-rest-alert]').forEach(button => button.addEventListener('click', async () => { state.settings.restSoundEnabled = true; await unlockRestAudio({ preview: true }); renderWorkout(); }));
  document.querySelectorAll('[data-toggle-rest-sound]').forEach(button => button.addEventListener('click', async () => { state.settings.restSoundEnabled = !state.settings.restSoundEnabled; if (state.settings.restSoundEnabled) await unlockRestAudio(); renderWorkout(); }));
  document.querySelectorAll('[data-rest-tone]').forEach(button => button.addEventListener('click', async () => { state.settings.restTone = button.dataset.restTone; state.settings.restSoundEnabled = true; await unlockRestAudio({ preview: true }); renderWorkout(); }));
  document.querySelectorAll('[data-calibration]').forEach(button => button.addEventListener('click', () => handleCalibration(button.dataset.calibration)));
  document.querySelectorAll('[data-session-result]').forEach(button => button.addEventListener('click', () => { state.workout.result = button.dataset.sessionResult; state.workout.step = 'receipt'; renderWorkout(); }));
  document.querySelectorAll('[data-action="finish-receipt"]').forEach(button => button.addEventListener('click', finishWorkout));
  document.querySelectorAll('[data-action="minimise-workout"]').forEach(button => button.addEventListener('click', minimiseWorkout));
  document.querySelectorAll('[data-action="week-eight-review"]').forEach(button => button.addEventListener('click', weekEightReview));
  document.querySelectorAll('[data-action="choose-track"]').forEach(button => button.addEventListener('click', chooseTrack));
  document.querySelectorAll('[data-action="preview-run"]').forEach(button => button.addEventListener('click', openRunOverview));
  document.querySelectorAll('[data-action="pullup-setup"]').forEach(button => button.addEventListener('click', pullupSetup));
  document.querySelectorAll('[data-action="choose-pullup-level"]').forEach(button => button.addEventListener('click', choosePullupLevel));
  document.querySelectorAll('[data-action="review-form"]').forEach(button => button.addEventListener('click', () => { state.workout.forceFullForm = true; state.workout.step = 'form'; renderWorkout(); }));
  document.querySelectorAll('[data-action="swap-exercise"]').forEach(button => button.addEventListener('click', openSwapExercise));
  document.querySelectorAll('[data-action="choose-pullup-level"]').forEach(button => button.addEventListener('click', choosePullupLevel));
  document.querySelectorAll('[data-action="skip-set"]').forEach(button => button.addEventListener('click', () => showToast('Prototype note: a skipped set would create partial progression evidence.')));
}

function finishWorkout() {
  state.workout.finished = true;
  state.workout.active = false;
  state.workout.elapsedBeforePause = workoutElapsedSeconds();
  state.workout.startedAt = null;
  clearInterval(workoutTicker);
  showScreen('today');
  updateAll();
  showToast('Workout logged automatically. Meals and feeling remain.');
}

function minimiseWorkout() {
  state.workout.elapsedBeforePause = workoutElapsedSeconds();
  state.workout.startedAt = null;
  state.workout.active = true;
  clearInterval(workoutTicker);
  showScreen('today');
  updateAll();
  showToast('Workout paused. Every completed set is safe in the prototype state.');
}

function recoveryDemo() {
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Recovery flow</span><h2 id="modalTitle">Workout paused</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>Your first three exercises and nine completed sets are saved.</p>
    <div class="import-summary"><div><span>Elapsed</span><strong>28:14</strong></div><div><span>Exercises</span><strong>3 / 6</strong></div><div><span>Sets</span><strong>9 saved</strong></div></div>
    <div class="modal-actions"><button class="button button-ghost" id="partialDemo">End as partial</button><button class="button button-primary" id="resumeDemo">Resume workout</button></div>
  `);
  document.getElementById('resumeDemo').addEventListener('click', () => { closeModal(); startWorkout(); });
  document.getElementById('partialDemo').addEventListener('click', () => { closeModal(); showToast('Partial session receipt would be generated.'); });
}

function progressionDemo() {
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Progression available</span><h2 id="modalTitle">Increase Romanian deadlift?</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>You completed all prescribed sets comfortably in two consecutive eligible sessions.</p>
    <div class="import-summary"><div><span>Current</span><strong>15 kg</strong></div><div><span>Proposed</span><strong>16 kg</strong></div><div><span>Change</span><strong>+6.7%</strong></div></div>
    <div class="conflict-card"><strong>Add 0.5 kg to each side</strong><p>New configuration: 5 kg + 2.5 kg + 0.5 kg per side.</p></div>
    <div class="modal-actions"><button class="button button-ghost" id="tempoInstead">Choose tempo instead</button><button class="button button-secondary" id="deferProgression">Keep current load</button><button class="button button-primary" id="acceptProgression">Accept for next session</button></div>
  `);
  document.getElementById('acceptProgression').addEventListener('click', () => { closeModal(); showToast('16 kg accepted for the next appearance.'); });
  document.getElementById('deferProgression').addEventListener('click', () => { closeModal(); showToast('Current load retained. No failure recorded.'); });
  document.getElementById('tempoInstead').addEventListener('click', () => { closeModal(); tempoDemo(); });
}
function tempoDemo() {
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Alternative overload</span><h2 id="modalTitle">Use tempo instead of more weight</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <div class="choice-list"><button class="choice-button" data-tempo="3-sec"><strong>Three-second lowering</strong><span>Keep current load</span></button><button class="choice-button" data-tempo="pause"><strong>One-second bottom pause</strong><span>Keep current load</span></button><button class="choice-button" data-tempo="hold"><strong>Hold current prescription</strong><span>No change</span></button></div>
  `);
  modalContent.querySelectorAll('[data-tempo]').forEach(button => button.addEventListener('click', () => { closeModal(); showToast(`${button.querySelector('strong').textContent} selected.`); }));
}

function exportDemo() {
  const payload = {
    manifest: { format: 'proof-fitness-prototype', exportSchemaVersion: '0.4-demo', exportedAt: new Date().toISOString() },
    meals: state.meals,
    feeling: state.feeling,
    weight: state.weight,
    workout: { finished: state.workout.finished, result: state.workout.result },
    programme: { block: state.block, track: state.longTermTrack, pullupLevel: state.pullupLevel, equipment: state.equipment },
    run: state.run,
    note: 'Prototype export. Production records and integrity checks are not implemented.'
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'proof-fitness-prototype-backup.json'; link.click();
  URL.revokeObjectURL(url);
  showToast('Prototype JSON export created.');
}

function importDemo() {
  openModal(`
    <div class="modal-heading"><div><span class="eyebrow">Import preview</span><h2 id="modalTitle">Backup from Tobby’s phone</h2></div><button class="modal-close" data-action="close-modal">×</button></div>
    <p>Exported 30 July 2026 · schema 0.1-demo</p>
    <div class="import-summary"><div><span>Workouts</span><strong>18</strong></div><div><span>Meal checks</span><strong>76</strong></div><div><span>Measurements</span><strong>12</strong></div></div>
    <div class="conflict-card"><strong>One measurement conflict</strong><p>31 July has 69.8 kg on this device and 70.0 kg in the backup.</p></div>
    <div class="choice-list"><button class="choice-button" data-conflict="current"><strong>Keep current 69.8 kg</strong><span>Recommended</span></button><button class="choice-button" data-conflict="import"><strong>Use imported 70.0 kg</strong><span>Replace conflict</span></button><button class="choice-button" data-conflict="both"><strong>Keep both</strong><span>Both measurements remain visible</span></button></div>
    <div class="modal-actions"><button class="button button-ghost" data-action="close-modal">Cancel</button><button class="button button-primary" id="completeImport" disabled>Merge records</button></div>
  `);
  let chosen = false;
  modalContent.querySelectorAll('[data-conflict]').forEach(button => button.addEventListener('click', () => {
    chosen = true; modalContent.querySelectorAll('[data-conflict]').forEach(x => x.style.borderColor = ''); button.style.borderColor = '#c7f53a'; document.getElementById('completeImport').disabled = false;
  }));
  document.getElementById('completeImport').addEventListener('click', () => { if (!chosen) return; closeModal(); showToast('Import receipt: 106 records merged, streak recalculated.'); });
}


function choosePullupLevel() {
  if (!pullupEnabledForFutureWorkouts()) {
    openModal(`<div class="modal-heading"><div><span class="eyebrow">Pull-up progression locked</span><h2 id="modalTitle">Install and confirm the bar first</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>Your current Workout C uses a dumbbell pullover. Pull-up rungs become available only after the bar is installed and the one-time safety confirmation is complete.</p><div class="pullup-safety"><strong>Current status</strong><p>${pullupStatusLabel()}</p></div><div class="modal-actions"><button class="button button-primary" id="openPullupStatus">Update bar status</button></div>`);
    document.getElementById('openPullupStatus')?.addEventListener('click', () => { closeModal(); pullupSetup(); });
    return;
  }
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Pull-up progression</span><h2 id="modalTitle">Choose the rung you can perform cleanly</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>The goal is not to force full pull-ups immediately. Start where the movement is controlled.</p><div class="pullup-ladder">${pullupLevels.map(level => `<button class="pullup-rung ${state.pullupLevel === level.id ? 'selected' : ''}" data-pullup-level="${level.id}"><span>${level.id}</span><span><strong>${level.name}</strong><small>${level.prescription} · ${level.note}</small></span><b>${state.pullupLevel === level.id ? 'CURRENT' : 'CHOOSE'}</b></button>`).join('')}</div><div class="pullup-safety"><strong>Safety before volume</strong><p>Confirm the bar is secure before every session. Stop if the frame, fasteners or bar shift. No kipping in this home programme.</p></div>`);
  modalContent.querySelectorAll('[data-pullup-level]').forEach(button => button.addEventListener('click', () => {
    state.pullupLevel = Number(button.dataset.pullupLevel);
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
  confirm?.addEventListener('click', () => {
    state.equipment.pullupBarStatus = 'installed-available';
    state.equipment.pullupSafetyConfirmed = true;
    closeModal(); updateLongTermUI();
    showToast(state.workout.active ? 'Pull-ups enabled for the next Workout C. The current workout is unchanged.' : 'Pull-up progression enabled for your next Workout C.');
  });
}

function pullupSetup() {
  const current = pullupStatusLabel();
  const enabled = pullupEnabledForFutureWorkouts();
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Pull-up bar status</span><h2 id="modalTitle">Use what is actually available</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>Pull-up programming appears only when the bar is installed, available and safety-confirmed. Otherwise, Workout C uses a dumbbell pullover.</p><div class="import-summary"><div><span>Current status</span><strong>${current}</strong></div><div><span>Workout C now</span><strong>${enabled ? 'Pull-up progression' : 'Dumbbell pullover'}</strong></div><div><span>Pull-up history</span><strong>${enabled ? 'Active' : 'Paused, not reset'}</strong></div></div><div class="equipment-status-grid modal-equipment-grid">${Object.entries(pullupStatusLabels).map(([value,label]) => `<button class="choice-button ${state.equipment.pullupBarStatus === value ? 'selected-equipment-status' : ''}" data-pullup-status="${value}"><strong>${label}</strong><span>${value === 'installed-available' ? 'Complete safety confirmation to activate' : value === 'temporarily-unavailable' ? 'Use the fallback without resetting pull-up progress' : value === 'owned-not-installed' ? 'Default until installation' : 'Keep pull-up programming locked'}</span></button>`).join('')}</div><div class="choice-list"><a class="choice-button" href="https://www.youtube.com/watch?v=aNUSgyWRJYA" target="_blank" rel="noopener noreferrer"><strong>Beginner pull-up tutorial</strong><span>FitnessFAQs · YouTube ↗</span></a>${enabled ? '<button class="choice-button" data-action="choose-pullup-level"><strong>Change progression rung</strong><span>Start with what you can control</span></button>' : ''}</div>`);
  modalContent.querySelectorAll('[data-pullup-status]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.pullupStatus;
    if (value === 'installed-available') { closeModal(); renderPullupSafetyConfirmation(); return; }
    state.equipment.pullupBarStatus = value;
    state.equipment.pullupSafetyConfirmed = false;
    closeModal(); updateLongTermUI();
    showToast(value === 'temporarily-unavailable' ? 'Pull-up progress paused. Workout C will use dumbbell pullovers.' : `${pullupStatusLabels[value]}. Pull-up workouts remain locked.`);
  }));
  modalContent.querySelector('[data-action="choose-pullup-level"]')?.addEventListener('click', () => { closeModal(); choosePullupLevel(); });
}

function chooseTrack() {
  openModal(`<div class="modal-heading"><div><span class="eyebrow">After Week 8</span><h2 id="modalTitle">Choose the next emphasis</h2></div><button class="modal-close" data-action="close-modal">×</button></div><p>Your history remains continuous. The track changes the next block’s balance, not your identity or past records.</p><div class="track-grid">${trainingTracks.map(track => `<button class="track-card ${track.recommended ? 'recommended' : ''}" data-track="${track.name}"><small>${track.recommended ? 'RECOMMENDED FOR YOU' : 'ALTERNATIVE TRACK'}</small><h3>${track.name}</h3><p>${track.goal}</p><strong>${track.strength} strength · ${track.running}</strong></button>`).join('')}</div>`);
  modalContent.querySelectorAll('[data-track]').forEach(button => button.addEventListener('click', () => {
    state.longTermTrack = button.dataset.track;
    closeModal(); updateLongTermUI(); showToast(`${state.longTermTrack} selected for the next block.`);
  }));
}

function weekEightReview() {
  openModal(`<div class="modal-heading"><div><span class="eyebrow">Block 1 review</span><h2 id="modalTitle">Eight weeks of evidence, not a transformation promise</h2></div><button class="modal-close" data-action="close-modal">×</button></div><div class="import-summary"><div><span>Strength sessions</span><strong>23 / 24</strong></div><div><span>Pull-up work</span><strong>${pullupEnabledForFutureWorkouts() ? pullupLevels.find(x => x.id === state.pullupLevel).short : 'Not activated'}</strong></div><div><span>Easy runs</span><strong>5 complete</strong></div></div><div class="review-physique"><strong>Realistic visual check</strong><ul><li>Slightly rounder shoulders and firmer arms/chest</li><li>Stronger-looking upper back from rows and ${pullupEnabledForFutureWorkouts() ? 'pull-up progression' : 'dumbbell pullovers'}</li><li>Firmer thighs and glutes</li><li>Waist stable or modestly smaller—not an automatic six-pack</li><li>You still look like yourself, but visibly more trained</li></ul></div><div class="block-two-preview"><div><span>Recommended track</span><strong>${state.longTermTrack}</strong></div><div><span>Block 2 pull slot</span><strong>${pullupEnabledForFutureWorkouts() ? 'Up to 2 pull-up exposures weekly' : 'Pullover fallback until installation'}</strong></div><div><span>Running</span><strong>1 easy run, optional second later</strong></div></div><div class="conflict-card"><strong>Recommendation: begin Block 2 without changing calories yet</strong><p>In this sample review, weight is up slowly, waist is controlled, strength is progressing and running recovery is acceptable.</p></div><div class="modal-actions"><button class="button button-secondary" id="reviewChooseTrack">Change track</button><button class="button button-primary" id="acceptBlockTwo">Accept Block 2 preview</button></div>`);
  document.getElementById('reviewChooseTrack')?.addEventListener('click', () => { closeModal(); chooseTrack(); });
  document.getElementById('acceptBlockTwo')?.addEventListener('click', () => { state.block.nextAccepted = true; closeModal(); updateLongTermUI(); showToast('Block 2 preview accepted. Production would schedule it after Week 8.'); });
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
  if (path) path.classList.toggle('locked-path', !enabled);
  document.querySelectorAll('[data-selected-track]').forEach(el => el.textContent = state.longTermTrack);
  const blockTwoStatus = document.getElementById('blockTwoStatus');
  if (blockTwoStatus) blockTwoStatus.textContent = state.block.nextAccepted ? 'ACCEPTED' : 'NEXT';
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
  if (state.run.audioMode !== 'visual' && audio && Number.isFinite(audio.currentTime)) return audio.currentTime;
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
  state.run.step = 'overview'; state.run.completed = false;
  renderRun(); showScreen('run');
  refreshRunOfflineStatus();
}
async function startRunSession() {
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
}
function advanceRunPhase() {
  const index = runPhaseIndex();
  const next = runPhases[Math.min(runPhases.length - 1, index + 1)];
  seekRun(next.start);
}
function pauseRunAudio() {
  state.run.paused = true;
  if (state.run.audioMode === 'visual') {
    state.run.visualElapsedBeforePause = currentRunTime(); state.run.visualStartedAt = null;
  } else runAudioElement()?.pause();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  renderRun(); updateAll();
}
async function resumeRunAudio() {
  state.run.paused = false;
  if (state.run.audioMode === 'visual') state.run.visualStartedAt = Date.now();
  else { try { await runAudioElement()?.play(); } catch (_) { showToast('Tap Resume inside Proof to restart audio.'); } }
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  clearInterval(runUiTicker); runUiTicker = setInterval(updateRunUi, 500);
  renderRun(); updateAll();
}
function finishRunSession(natural = false) {
  clearInterval(runUiTicker); runUiTicker = null;
  const audio = runAudioElement(); if (audio) { audio.pause(); if (!natural) audio.currentTime = 0; }
  state.run.completed = true; state.run.active = false; state.run.paused = false; state.run.step = 'receipt';
  state.run.visualStartedAt = null; state.run.visualElapsedBeforePause = 0;
  releaseRunWakeLock();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
  renderRun(); updateAll();
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
  return `<button class="run-audio-mode ${state.run.audioMode === mode ? 'selected' : ''}" data-run-audio-mode="${mode}"><span><small>${badge}</small><strong>${title}</strong><p>${description}</p></span><b>${state.run.audioMode === mode ? 'SELECTED' : 'CHOOSE'}</b></button>`;
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
  document.querySelectorAll('[data-run-done]').forEach(b => b.addEventListener('click', () => { state.run.step = 'overview'; showScreen('plan'); updateAll(); }));
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
  if (document.visibilityState === 'visible' && state.run.active && state.run.keepAwake) await requestRunWakeLock();
});

function bindGlobalActions() {
  document.querySelectorAll('[data-action="start-workout"]').forEach(button => button.addEventListener('click', startWorkout));
  document.querySelectorAll('[data-action="open-recovery-demo"]').forEach(button => button.addEventListener('click', recoveryDemo));
  document.querySelectorAll('[data-action="open-feeling"]').forEach(button => button.addEventListener('click', openFeeling));
  document.querySelectorAll('[data-action="log-weight"]').forEach(button => button.addEventListener('click', logWeight));
  document.querySelectorAll('[data-action="preview-progression"]').forEach(button => button.addEventListener('click', progressionDemo));
  document.querySelectorAll('[data-action="show-tempo"]').forEach(button => button.addEventListener('click', tempoDemo));
  document.querySelectorAll('[data-action="export-demo"]').forEach(button => button.addEventListener('click', exportDemo));
  document.querySelectorAll('[data-action="import-demo"]').forEach(button => button.addEventListener('click', importDemo));
  document.querySelectorAll('[data-action="end-workout-menu"]').forEach(button => button.addEventListener('click', recoveryDemo));
  document.querySelectorAll('[data-action="minimise-workout"]').forEach(button => button.addEventListener('click', minimiseWorkout));
  document.querySelectorAll('[data-action="week-eight-review"]').forEach(button => button.addEventListener('click', weekEightReview));
  document.querySelectorAll('[data-action="choose-track"]').forEach(button => button.addEventListener('click', chooseTrack));
  document.querySelectorAll('[data-action="preview-run"]').forEach(button => button.addEventListener('click', openRunOverview));
  document.querySelectorAll('[data-action="pullup-setup"]').forEach(button => button.addEventListener('click', pullupSetup));
  document.querySelectorAll('[data-action="choose-pullup-level"]').forEach(button => button.addEventListener('click', choosePullupLevel));
}

document.querySelectorAll('[data-plan-view]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-plan-view]').forEach(x => x.classList.toggle('selected', x === button));
  document.getElementById('mealPlanView').classList.toggle('hidden', button.dataset.planView !== 'meals');
  document.getElementById('weekPlanView').classList.toggle('hidden', button.dataset.planView !== 'week');
  document.getElementById('blockPlanView').classList.toggle('hidden', button.dataset.planView !== 'blocks');
}));

bindRunAudioEvents();
prepareRunAudio();
injectWeeklyCoach();
updateActiveWorkoutStrip();
updateActiveRunStrip();
updateLongTermUI();
setTheme('dark');
renderOnboarding();
renderMeals();
renderTodayMeals();
updateDailyStatus();
bindGlobalActions();
