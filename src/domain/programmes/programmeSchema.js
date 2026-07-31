import { assertPositiveVersion } from '../shared.js';

export function validateTemplateSet(templateSet) {
  assertPositiveVersion(templateSet, 'Template set');
  if (!Array.isArray(templateSet.rotation) || templateSet.rotation.length === 0) throw new Error(`${templateSet.id} needs a rotation.`);
  if (!Array.isArray(templateSet.templates) || templateSet.templates.length === 0) throw new Error(`${templateSet.id} needs templates.`);
  if (new Set(templateSet.rotation).size !== templateSet.rotation.length) throw new Error(`${templateSet.id} rotation contains duplicates.`);
  return true;
}
