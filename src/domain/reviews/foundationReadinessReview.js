import { deepFreeze } from '../shared.js';

const POOR = new Set(['poor','persistently-poor']);

export function foundationReadinessReview(input) {
  if (!Number.isInteger(input.currentProgrammeWeek) || input.currentProgrammeWeek < 4) {
    return deepFreeze({ available: false, recommendation: null, userDecision: null, reasons: ['The review becomes available at the end of Week 4.'], isMedicalAssessment: false });
  }
  const completed = Number(input.completedRequiredWorkouts || 0);
  const planned = Number(input.plannedRequiredWorkouts || 12);
  const incompleteCalibrationAreas = Number(input.incompleteCalibrationAreas || 0);
  const unresolvedDiscomfort = Boolean(input.unresolvedPainOrDiscomfort);
  const poorRecovery = POOR.has(String(input.recoveryBetweenSessions).toLowerCase()) || [input.energy,input.sleep].filter(value => String(value).toLowerCase() === 'poor').length >= 2;
  const lowConfidence = ['low','not-yet'].includes(String(input.formConfidence).toLowerCase());
  const temporaryRecoveryDisruption = Boolean(input.temporaryRecoveryDisruption) && !poorRecovery;
  let recommendation = 'ready';
  const reasons = [];

  if (completed < 8 || incompleteCalibrationAreas > 1 || poorRecovery || unresolvedDiscomfort) {
    recommendation = 'extend-two-weeks';
    if (completed < 8) reasons.push(`Completed ${completed} of ${planned} required sessions; more programme exposure would improve the evidence.`);
    if (incompleteCalibrationAreas > 1) reasons.push('Multiple main movement patterns still need a usable starting calibration.');
    if (poorRecovery) reasons.push('Recent recovery reports remain poor.');
    if (unresolvedDiscomfort) reasons.push('An unresolved discomfort flag needs an exercise substitution or conservative follow-up.');
  } else if (completed < 10 || incompleteCalibrationAreas === 1 || temporaryRecoveryDisruption || lowConfidence) {
    recommendation = 'extend-one-week';
    if (completed < 10) reasons.push(`Completed ${completed} of ${planned} required sessions; one more rotation would add useful evidence.`);
    if (incompleteCalibrationAreas === 1) reasons.push('One important calibration area remains incomplete.');
    if (temporaryRecoveryDisruption) reasons.push('A temporary recovery disruption is improving.');
    if (lowConfidence) reasons.push('More conservative practice would support form confidence.');
  } else {
    reasons.push('Consistency, calibration, form confidence, and recovery support the next programme choice.');
  }

  return deepFreeze({
    available: true, recommendation, userDecision: input.userDecision || null, reasons,
    completedRequiredWorkouts: completed, plannedRequiredWorkouts: planned,
    fourDayScheduleFeasible: Boolean(input.fourDayScheduleFeasible), isMedicalAssessment: false
  });
}

export function withUserDecision(review, userDecision) {
  if (!review.available) throw new Error('A decision cannot be recorded before the review is available.');
  if (!['lean-athletic-four-day','lean-athletic-three-day','extend-one-week','extend-two-weeks'].includes(userDecision)) throw new Error('Unsupported Foundation decision.');
  return deepFreeze({ ...review, userDecision });
}
