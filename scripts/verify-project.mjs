import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const requiredFiles = [
  'index.html',
  'src/main.js',
  'src/app.js',
  'src/run-phase.js',
  'src/db/database.js',
  'src/db/schema.js',
  'src/db/migrations.js',
  'src/db/transactions.js',
  'src/state/createEmptyProductionState.js',
  'src/state/applicationBootstrap.js',
  'src/state/hydrateState.js',
  'src/state/persistenceCoordinator.js',
  'src/styles.css',
  'src/domain/exercises/exerciseCatalog.js',
  'src/domain/programmes/programmeCatalog.js',
  'src/domain/programmes/foundationProgramme.js',
  'src/domain/programmes/leanAthleticProgramme.js',
  'src/domain/programmes/threeDayFallback.js',
  'src/domain/workouts/createWorkoutSnapshot.js',
  'src/domain/loading/plateInventory.js',
  'src/domain/loading/plateCombinations.js',
  'src/domain/loading/barbellLoading.js',
  'src/domain/loading/dumbbellLoading.js',
  'src/domain/loading/achievableLoads.js',
  'src/domain/loading/loadDisplay.js',
  'src/domain/reviews/foundationReadinessReview.js',
  'scripts/validate-programme-domain.mjs',
  'docs/PROGRAMME_DOMAIN.md',
  'docs/LOAD_GUIDANCE.md',
  'docs/PROGRESSIVE_OVERLOAD.md',
  'docs/EXERCISE_CATALOG.md',
  'audio-scripts/starter-run.json',
  'audio-scripts/phrase-library.json',
  'config/audio-coach.json',
  'docs/audio-generation.md',
  'THIRD_PARTY_NOTICES.md',
  'scripts/audio/generate_samples.py',
  'scripts/audio/generate_phrases.py',
  'scripts/audio/assemble_session.py',
  'scripts/audio/verify_audio.py',
  'scripts/audio/requirements.txt',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/audio/coach/starter-run-coach.opus',
  'public/audio/coach/starter-run-coach.mp3',
  'public/audio/coach/starter-run-coach.manifest.json',
  'public/audio/chimes/starter-run-chimes.opus'
];

await Promise.all(requiredFiles.map((file) => access(resolve(root, file))));

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
if (packageJson.name !== 'proof-fitness') {
  throw new Error('package.json must use the package name "proof-fitness".');
}

const html = await readFile(resolve(root, 'index.html'), 'utf8');
for (const reference of [
  '/src/main.js',
  '/audio/coach/starter-run-coach.opus',
  '/audio/coach/starter-run-coach.mp3'
]) {
  if (!html.includes(reference)) throw new Error(`Missing index.html reference: ${reference}`);
}

const app = await readFile(resolve(root, 'src/app.js'), 'utf8');
const foundation = await readFile(resolve(root, 'src/domain/programmes/foundationProgramme.js'), 'utf8');
const lean = await readFile(resolve(root, 'src/domain/programmes/leanAthleticProgramme.js'), 'utf8');
const fallback = await readFile(resolve(root, 'src/domain/programmes/threeDayFallback.js'), 'utf8');
const exercises = await readFile(resolve(root, 'src/domain/exercises/exerciseCatalog.js'), 'utf8');
const snapshot = await readFile(resolve(root, 'src/domain/workouts/createWorkoutSnapshot.js'), 'utf8');
const emptyState = await readFile(resolve(root, 'src/state/createEmptyProductionState.js'), 'utf8');
const schema = await readFile(resolve(root, 'src/db/schema.js'), 'utf8');
const transactions = await readFile(resolve(root, 'src/db/transactions.js'), 'utf8');
const serviceWorker = await readFile(resolve(root, 'public/sw.js'), 'utf8');

if (/Weeks? 1.?[–-]8|Week 8/i.test(`${app}\n${html}`)) throw new Error('The active app still presents the obsolete eight-week Foundation.');
for (const id of ['foundation-a','foundation-b','foundation-c']) if (!foundation.includes(`id: '${id}'`)) throw new Error(`Missing ${id}.`);
for (const id of ['lean-lower-a','lean-upper-a','lean-lower-b','lean-upper-b']) if (!lean.includes(`id: '${id}'`)) throw new Error(`Missing ${id}.`);
for (const id of ['lean-three-day-a','lean-three-day-b','lean-three-day-c']) if (!fallback.includes(`id:'${id}'`) && !fallback.includes(`id: '${id}'`)) throw new Error(`Missing ${id}.`);
if (!exercises.includes("id:'barbell-curl'")) throw new Error('Barbell curl is not a first-class exercise.');
if (!app.includes('createWorkoutSnapshot') || !snapshot.includes('deepFreeze')) throw new Error('Immutable active-workout snapshots are absent.');
if (!app.includes('nextRequiredWorkout')) throw new Error('The active app does not use programme rotation.');
if (!lean.includes('optionalE') || !fallback.includes('threeDayFallback')) throw new Error('Lean Athletic optional or fallback programming is missing.');
for (const label of ['Populated demo','0.4-demo','export-demo','import-demo','Preview recovery flow','Fake 12-day streak']) {
  if (`${app}\n${html}`.toLowerCase().includes(label.toLowerCase())) throw new Error(`Production still contains demo label: ${label}`);
}
for (const store of ['appMeta','userProfile','preferences','equipment','programmeStates','programmeTransitions','programmeReviews','scheduleOverrides','activeWorkoutSessions','workoutSessions','runSessions','mealChecks','dailyCheckIns','measurements','exerciseProgressionStates','auditEvents']) {
  if (!schema.includes(store)) throw new Error(`IndexedDB schema is missing ${store}.`);
}
if (!emptyState.includes('streak:0') || !emptyState.includes('workouts:[]') || !emptyState.includes('measurements:[]')) throw new Error('Production defaults are not genuinely empty.');
if (!app.includes('bootstrapApplication') || !app.includes('onboardingCompletedAt')) throw new Error('Asynchronous persistence bootstrap is missing.');
if (!app.includes('workoutSnapshot') || !transactions.includes("product:'proof-fitness'")) throw new Error('Snapshot persistence or export identity is missing.');
if (!snapshot.includes('loadingGuidanceSnapshot') || !snapshot.includes('progressionContextSnapshot')) throw new Error('Workout snapshots do not preserve loading and progression context.');
if (!app.includes('setPerformance') || !app.includes('completedAt')) throw new Error('Actual set performance evidence is not captured.');
for(const decision of ['accept','defer','reject']) if(!app.includes(`data-progression-decision="${decision}"`)) throw new Error(`User-confirmed ${decision} progression decision is missing.`);
if (!app.includes('validateEquipmentWeight') || !app.includes('collarWeight')) throw new Error('Equipment mass confidence or collar handling is missing.');
if (/deleteDatabase|indexedDB\.delete/i.test(serviceWorker)) throw new Error('The service worker must never delete IndexedDB.');
if (!packageJson.dependencies?.dexie) throw new Error('Dexie must be a production dependency.');

console.log('Proof Fitness project structure verified.');
