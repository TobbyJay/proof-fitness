import { database, openDatabase } from '../db/database.js';
import { createRepositories } from '../db/repositories/index.js';
import { completeOnboardingTransaction, completeWorkoutTransaction, exportDatabase, localDate, newId, persistProgrammeDecision, replaceDatabaseFromExport } from '../db/transactions.js';
import { timestamped } from '../db/migrations.js';
import { hydrateState } from './hydrateState.js';

export class PersistenceCoordinator {
  constructor(db=database) { this.db=db; this.repos=createRepositories(db); }
  async initialise() { await openDatabase(this.db); return hydrateState(this.db); }
  async saveOnboardingDraft(draft) { const meta=await this.repos.appMeta.get('app'); return this.repos.appMeta.put({ ...meta, onboardingDraft:draft }); }
  completeOnboarding(input) { return completeOnboardingTransaction(this.db,input); }
  savePreference(patch) { return this.repos.preferences.put({ id:'preferences', ...patch }); }
  saveEquipment(value) { return this.repos.equipment.put({ id:'equipment', ...value }); }
  saveProgramme(value) { return this.repos.programme.put(value); }
  saveTransition(value) { return this.repos.transitions.put({ id:value.id||newId('transition'), ...value }); }
  saveReview(value) { return this.repos.reviews.put({ id:value.id||newId('review'), ...value }); }
  saveProgrammeDecision(programme, decision={}) { return persistProgrammeDecision(this.db,programme,decision); }
  saveMeal(mealId,status,details={}) { return this.repos.meals.put({ id:`${localDate()}:${mealId}`,localDate:localDate(),mealId,status,...details }); }
  saveCheckIn(value) { return this.repos.checkIns.put({ id:localDate(),localDate:localDate(),...value }); }
  saveMeasurement(type,value,note='') { return this.repos.measurements.put({ id:newId('measurement'),localDate:localDate(),type,value,note }); }
  saveProgression(value) { return this.repos.progression.put({ id:`${value.exerciseId}@${value.exerciseVersion}`,...value }); }
  async saveProgressionAndEquipment(progression,equipment) {
    return this.db.transaction('rw',this.db.exerciseProgressionStates,this.db.equipment,async()=>{
      const savedProgression=await this.repos.progression.put({id:`${progression.exerciseId}@${progression.exerciseVersion}`,...progression});
      const savedEquipment=await this.repos.equipment.put({id:'equipment',...equipment}); return {progression:savedProgression,equipment:savedEquipment};
    });
  }
  async startWorkout(snapshot, execution={}) {
    const now=new Date().toISOString(); const today=localDate();
    return this.db.transaction('rw',this.db.activeWorkoutSessions,this.db.workoutSessions,async()=>{
      const completed=await this.db.workoutSessions.where('localDate').equals(today).filter(record=>record.status==='completed'&&record.templateId===snapshot.templateId).first();
      if(completed){const error=new Error('This workout has already been completed.');error.name='WorkoutAlreadyCompletedError';throw error;}
      const existing=await this.db.activeWorkoutSessions.where('templateId').equals(snapshot.templateId).filter(record=>record.localDate===today&&['active','paused'].includes(record.status)).first();
      if(existing) return existing;
      const record=timestamped({ id:newId('workout'),localDate:today,status:'active',workoutSnapshot:snapshot,workoutNameSnapshot:snapshot.workoutName,exercisesSnapshot:snapshot.exercises,equipmentSnapshot:snapshot.equipmentSnapshot,pullUpAvailabilitySnapshot:snapshot.pullUpAvailabilitySnapshot,programmeId:snapshot.programmeId,programmeVersion:snapshot.programmeVersion,programmePhase:snapshot.programmePhase,scheduleMode:snapshot.scheduleMode,templateSetId:snapshot.templateSetId,templateSetVersion:snapshot.templateSetVersion,templateId:snapshot.templateId,templateVersion:snapshot.templateVersion,startedAt:now,currentExerciseIndex:0,currentSetIndex:0,completedSets:{},setPerformance:{},calibration:{},substitutions:{},readiness:{},formConfidence:{},discomfortFlags:{},restDeadline:null,...execution},now);
      await this.db.activeWorkoutSessions.put(record); return record;
    });
  }
  async updateWorkout(id,patch) { const current=await this.repos.activeWorkouts.get(id); if(!current) throw new Error('Active workout could not be found.'); return this.repos.activeWorkouts.put({ ...current,...patch }); }
  async updateWorkoutAndProgression(id,patch,progression,equipment=null) {
    const tables=[this.db.activeWorkoutSessions,this.db.exerciseProgressionStates]; if(equipment) tables.push(this.db.equipment);
    return this.db.transaction('rw',tables,async()=>{
      const current=await this.repos.activeWorkouts.get(id); if(!current) throw new Error('Active workout could not be found.');
      const workout=await this.repos.activeWorkouts.put({...current,...patch});
      const evidence=await this.repos.progression.put({id:`${progression.exerciseId}@${progression.exerciseVersion}`,...progression});
      const savedEquipment=equipment?await this.repos.equipment.put({id:'equipment',...equipment}):null;
      return {workout,evidence,equipment:savedEquipment};
    });
  }
  completeWorkout(active,programme,status='completed') { return completeWorkoutTransaction(this.db,active,programme,status); }
  async discardWorkout(id) { await this.repos.activeWorkouts.delete(id); await this.repos.audit.put({id:newId('audit'),type:'workout-discarded',entityId:id}); }
  saveRun(value) { return this.repos.runs.put({ id:value.id||newId('run'),localDate:value.localDate||localDate(),runTemplateId:'starter-run',runTemplateVersion:1,...value }); }
  exportAll(programmeVersion) { return exportDatabase(this.db,programmeVersion); }
  importReplace(payload) { return replaceDatabaseFromExport(this.db,payload); }
  async resetAll() { this.db.close(); await this.db.delete(); }
}

export const persistence = new PersistenceCoordinator();
