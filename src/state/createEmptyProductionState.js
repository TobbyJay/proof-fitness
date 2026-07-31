import { DEFAULT_EQUIPMENT } from '../domain/equipment/equipmentCatalog.js';

export function createEmptyProductionState() {
  return {
    appMeta:null, profile:null, preferences:{ theme:'dark', runGuidanceMode:'voice', notificationsEnabled:false },
    equipment:{ ...DEFAULT_EQUIPMENT, plates:{...DEFAULT_EQUIPMENT.plates} }, programme:null,
    transitions:[], reviews:[], activeWorkout:null, workouts:[], runs:[], mealChecks:[], checkIns:[], measurements:[], progression:[],
    derived:{ streak:0, completedWorkouts:0, completedRuns:0, mealChecks:0 }
  };
}
