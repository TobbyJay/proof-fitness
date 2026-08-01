import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { allRunTemplates } from '../src/domain/running/runTemplates.js';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'audio-scripts/starter-run.json');
const destinationDirectory = resolve(root, 'public/audio-scripts');
await mkdir(destinationDirectory, { recursive: true });
await copyFile(source, resolve(destinationDirectory, 'starter-run.json'));

const sourceDirectory=resolve(root,'audio-scripts');
for(const template of allRunTemplates().filter(item=>item.id!=='run-walk-stage-01')){
  const phases=template.phases.map(({endSeconds,...item},index)=>({...item,encouragement:item.encouragement||item.cue,completionInstruction:item.completionInstruction||(index===template.phases.length-1?'Session complete. Continue walking until you feel settled.':template.phases[index+1]?.instruction)}));
  const script={schemaVersion:1,id:template.id,version:template.version,name:template.name,durationSeconds:template.durationSeconds,phases};
  const json=`${JSON.stringify(script,null,2)}\n`;
  await writeFile(resolve(sourceDirectory,`${template.id}.json`),json);
  await writeFile(resolve(destinationDirectory,`${template.id}.json`),json);
}
