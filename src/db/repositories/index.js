import { createRepository } from './createRepository.js';

export function createRepositories(database) {
  return Object.freeze({
    appMeta:createRepository(database,'appMeta'), profile:createRepository(database,'userProfile'),
    preferences:createRepository(database,'preferences'), equipment:createRepository(database,'equipment'),
    programme:createRepository(database,'programmeStates'), transitions:createRepository(database,'programmeTransitions'),
    reviews:createRepository(database,'programmeReviews'), scheduleOverrides:createRepository(database,'scheduleOverrides'),
    activeWorkouts:createRepository(database,'activeWorkoutSessions'), workouts:createRepository(database,'workoutSessions'),
    runs:createRepository(database,'runSessions'), runningProgression:createRepository(database,'runProgressionStates'), meals:createRepository(database,'mealChecks'),
    checkIns:createRepository(database,'dailyCheckIns'), measurements:createRepository(database,'measurements'),
    progression:createRepository(database,'exerciseProgressionStates'), audit:createRepository(database,'auditEvents')
  });
}
