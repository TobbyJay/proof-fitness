import { persistence } from './persistenceCoordinator.js';
import { getWorkoutTemplate } from '../domain/programmes/programmeCatalog.js';
import { getExercise } from '../domain/exercises/exerciseCatalog.js';

export function validateHydratedDomainReferences(state) {
  const sessions=[...(state.workouts||[]),...(state.activeWorkout?[state.activeWorkout]:[])];
  for(const session of sessions) {
    try { getWorkoutTemplate(session.templateId); }
    catch { throw new Error(`Stored workout references unavailable template ${session.templateId} v${session.templateVersion}. Export your data before resetting.`); }
    for(const exercise of session.exercisesSnapshot||session.workoutSnapshot?.exercises||[]) {
      try { getExercise(exercise.exerciseId); }
      catch { throw new Error(`Stored workout references unavailable exercise ${exercise.exerciseId} v${exercise.exerciseVersion}. Export your data before resetting.`); }
    }
  }
  return state;
}

export async function bootstrapApplication() {
  try { return { ok:true, state:validateHydratedDomainReferences(await persistence.initialise()) }; }
  catch (error) { return { ok:false, error, diagnostics:{ name:error?.name||'DatabaseError', message:error?.message||String(error), time:new Date().toISOString() } }; }
}
