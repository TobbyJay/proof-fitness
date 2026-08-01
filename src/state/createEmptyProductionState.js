import { DEFAULT_EQUIPMENT, normaliseEquipment } from '../domain/equipment/equipmentCatalog.js';

export function createEmptyProductionState() {
  return {
    appMeta:null, profile:null, preferences:{ theme:'dark', runGuidanceMode:'voice', notificationsEnabled:false },
    equipment:normaliseEquipment(DEFAULT_EQUIPMENT), programme:null,
    transitions:[], reviews:[], activeWorkout:null, workouts:[], runs:[], mealChecks:[], checkIns:[], measurements:[], progression:[],
    derived:{ streak:0, completedWorkouts:0, completedRuns:0, mealChecks:0 }
  };
}
