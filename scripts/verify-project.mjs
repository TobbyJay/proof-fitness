import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const requiredFiles = [
  'index.html',
  'src/main.js',
  'src/app.js',
  'src/run-phase.js',
  'src/styles.css',
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

console.log('Proof Fitness project structure verified.');
