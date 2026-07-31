export const SCHEDULE_MODES = Object.freeze(['foundation-three-day','lean-athletic-four-day','lean-athletic-three-day']);
export function phaseForScheduleMode(mode) { return mode === 'foundation-three-day' ? 'foundation' : 'lean-athletic'; }
