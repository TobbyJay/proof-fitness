import { deepFreeze } from '../shared.js';
import { validateTemplateSet } from './programmeSchema.js';
import { foundationProgramme } from './foundationProgramme.js';
import { leanAthleticProgramme } from './leanAthleticProgramme.js';
import { threeDayFallback } from './threeDayFallback.js';

const sets = [foundationProgramme, leanAthleticProgramme, threeDayFallback];
sets.forEach(validateTemplateSet);
const templateSets = Object.fromEntries(sets.map(set => [set.id, set]));
const templates = Object.fromEntries(sets.flatMap(set => set.templates.map(template => [template.id, template])));
if (Object.keys(templates).length !== sets.reduce((sum, set) => sum + set.templates.length, 0)) throw new Error('Workout-template IDs must be unique.');

export const PROGRAMME_ID = 'proof-fitness';
export const PROGRAMME_VERSION = 1;
export const programmeCatalog = deepFreeze({
  programmeId: PROGRAMME_ID, programmeVersion: PROGRAMME_VERSION,
  phases: ['foundation','lean-athletic'], templateSets, templates,
  longTermSpine: [
    { block:1, name:'Foundation and Calibration', defaultWeeks:'1–4', extensionWeeks:'5–6 when chosen' },
    { block:2, name:'Lean Athletic Base', begins:'Week 5 when ready; shifted by any Foundation extension' },
    { block:3, name:'Lean Athletic development', detailStatus:'structure retained; prescriptions pending versioning' },
    { block:4, name:'Strength emphasis', detailStatus:'pending versioning' },
    { block:5, name:'Physique emphasis', detailStatus:'pending versioning' },
    { block:6, name:'Hybrid consolidation', detailStatus:'pending versioning' },
    { block:'review', name:'Annual review and reset', defaultWeeks:'49–52', detailStatus:'preserved' }
  ]
});

export function getTemplateSet(id) {
  const value = programmeCatalog.templateSets[id];
  if (!value) throw new Error(`Unknown template set: ${id}`);
  return value;
}
export function getWorkoutTemplate(id) {
  const value = programmeCatalog.templates[id];
  if (!value) throw new Error(`Unknown workout template: ${id}`);
  return value;
}
