import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { phaseAtTime, phaseIndexAtTime } from '../src/run-phase.js';

const session = JSON.parse(
  await readFile(new URL('../audio-scripts/starter-run.json', import.meta.url), 'utf8')
);
const phases = session.phases;
const audioManifest = JSON.parse(
  await readFile(new URL('../public/audio/coach/starter-run-coach.manifest.json', import.meta.url), 'utf8')
);

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

test('starter run remains the approved 28-minute programme with ten-second warnings and audio modes',()=>{
  assert.equal(session.durationSeconds,1680);
  assert.equal(phases[0].type,'warm-up-walk');
  assert.equal(phases[0].durationSeconds,300);
  const runs=phases.filter(phase=>phase.type==='easy-run');
  const walks=phases.filter(phase=>phase.type==='recovery-walk');
  assert.equal(runs.length,6); assert.ok(runs.every(phase=>phase.durationSeconds===60));
  assert.equal(walks.length,6); assert.ok(walks.every(phase=>phase.durationSeconds===120));
  assert.equal(phases.at(-1).type,'cool-down-walk');
  assert.equal(phases.at(-1).durationSeconds,300);
  assert.ok(phases.every(phase=>/Ten seconds remaining/i.test(phase.warning)));
  assert.equal(audioManifest.durationSeconds,1680);
  assert.match(audioManifest.files.opus.path,/\.opus$/);
  assert.match(audioManifest.files.mp3.path,/\.mp3$/);
  assert.match(audioManifest.files.chimes.path,/chimes.*\.opus$/);
  assert.ok(audioManifest.cues.filter(cue=>cue.kind==='warning').every(cue=>{
    const phase=phases.find(item=>item.id===cue.id.replace(/-warning$/,''));
    return phase && cue.timeSeconds===phase.startSeconds+phase.durationSeconds-10;
  }));
});
