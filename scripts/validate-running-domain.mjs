import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { allRunTemplates } from '../src/domain/running/runTemplates.js';
import { validateRunningDomain } from '../src/domain/running/runValidation.js';

const root=resolve(import.meta.dirname,'..');
const result=validateRunningDomain();
for(const template of allRunTemplates()){
  const scriptPath=resolve(root,'audio-scripts',template.audio.assetId==='starter-run'?'starter-run.json':`${template.id}.json`);
  const script=JSON.parse(await readFile(scriptPath,'utf8'));
  if(script.durationSeconds!==template.durationSeconds)throw new Error(`${template.id} audio script duration does not match.`);
  if(script.phases.length!==template.phases.length)throw new Error(`${template.id} audio script phase count does not match.`);
  for(const asset of [template.audio.voice,template.audio.chimes,template.audio.manifest].filter(Boolean))await access(resolve(root,'public',asset.slice(1)));
}
console.log(`Running domain valid: programme v1, ${result.stages} progression stages, ${result.templates} templates, static audio timelines present.`);
