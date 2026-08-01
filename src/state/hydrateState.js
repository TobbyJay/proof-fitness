import { createEmptyProductionState } from './createEmptyProductionState.js';
import { createRepositories } from '../db/repositories/index.js';
import { normaliseEquipment } from '../domain/equipment/equipmentCatalog.js';

export function calculateDerived(records, today = new Date()) {
  return { streak:calculateStreak(records,today), completedWorkouts:records.workouts.filter(x=>x.status==='completed').length, completedRuns:records.runs.filter(x=>x.status==='completed').length, mealChecks:records.mealChecks.filter(x=>x.status!=='unchecked').length };
}

export function calculateStreak({ workouts=[], mealChecks=[], checkIns=[], profile=null }, today = new Date()) {
  const workoutsByDate = new Set(workouts.filter(x=>x.status==='completed').map(x=>x.localDate));
  const mealsByDate = new Map();
  for (const item of mealChecks.filter(x=>['planned','approved-alternative','missed','other'].includes(x.status))) mealsByDate.set(item.localDate,(mealsByDate.get(item.localDate)||0)+1);
  const checkDates = new Set(checkIns.filter(x=>x.feeling).map(x=>x.localDate));
  let streak=0;
  for (let offset=0; offset<366; offset+=1) {
    const date=new Date(today); date.setDate(today.getDate()-offset);
    const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const dayName=date.toLocaleDateString('en-US',{weekday:'long'});
    const requiredWorkoutDay=(profile?.trainingDays||[]).includes(dayName);
    const qualifies=(mealsByDate.get(key)||0)>=4 && checkDates.has(key) && (!requiredWorkoutDay || workoutsByDate.has(key));
    if (!qualifies) break; streak+=1;
  }
  return streak;
}

export async function hydrateState(database) {
  const repos=createRepositories(database); const state=createEmptyProductionState();
  const [appMeta,profile,preferences,equipment,programmes,transitions,reviews,activeWorkouts,workouts,runs,runningProgression,mealChecks,checkIns,measurements,progression] = await Promise.all([
    repos.appMeta.get('app'),repos.profile.get('profile'),repos.preferences.get('preferences'),repos.equipment.get('equipment'),repos.programme.all(),repos.transitions.all(),repos.reviews.all(),repos.activeWorkouts.all(),repos.workouts.all(),repos.runs.all(),repos.runningProgression.get('primary-running'),repos.meals.all(),repos.checkIns.all(),repos.measurements.all(),repos.progression.all()
  ]);
  Object.assign(state,{appMeta,profile,preferences:preferences||state.preferences,equipment:normaliseEquipment(equipment||state.equipment),programme:programmes.find(x=>x.id===appMeta?.activeProgrammeStateId)||null,transitions,reviews,activeWorkout:activeWorkouts.find(x=>x.status==='active'||x.status==='paused')||null,workouts,runs,runningProgression:runningProgression||state.runningProgression,mealChecks,checkIns,measurements,progression});
  state.derived=calculateDerived(state); return state;
}
