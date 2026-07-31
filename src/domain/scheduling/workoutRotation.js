import { getTemplateSet } from '../programmes/programmeCatalog.js';

export function nextRequiredWorkout({ scheduleMode, activeTemplateSetId = scheduleMode, lastCompletedTemplateId = null, activeWorkoutSnapshot = null }) {
  if (activeWorkoutSnapshot) return { templateId: activeWorkoutSnapshot.templateId, resumeActive: true };
  const templateSet = getTemplateSet(activeTemplateSetId);
  const index = templateSet.rotation.indexOf(lastCompletedTemplateId);
  return { templateId: templateSet.rotation[index < 0 ? 0 : (index + 1) % templateSet.rotation.length], resumeActive: false };
}
