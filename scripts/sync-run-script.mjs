import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'audio-scripts/starter-run.json');
const destinationDirectory = resolve(root, 'public/audio-scripts');
await mkdir(destinationDirectory, { recursive: true });
await copyFile(source, resolve(destinationDirectory, 'starter-run.json'));
