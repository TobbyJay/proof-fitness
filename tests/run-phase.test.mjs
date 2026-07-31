import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { phaseAtTime, phaseIndexAtTime } from '../src/run-phase.js';

const session = JSON.parse(
  await readFile(new URL('../audio-scripts/starter-run.json', import.meta.url), 'utf8')
);
const phases = session.phases;

test('maps every phase boundary to the phase that begins there', () => {
  phases.forEach((phase, index) => {
    assert.equal(phaseIndexAtTime(phases, phase.startSeconds), index);
    assert.equal(phaseAtTime(phases, phase.startSeconds).id, phase.id);
  });
});

test('keeps the final phase at the exact session end', () => {
  assert.equal(phaseAtTime(phases, session.durationSeconds).id, 'cooldown');
});

test('handles fractional audio time and invalid values safely', () => {
  assert.equal(phaseAtTime(phases, 359.999).id, 'run-round-1');
  assert.equal(phaseAtTime(phases, 360).id, 'walk-round-1');
  assert.equal(phaseAtTime(phases, Number.NaN).id, 'warmup');
});
