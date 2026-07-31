export function phaseIndexAtTime(phases, currentTime) {
  if (!Array.isArray(phases) || phases.length === 0) return -1;
  const time = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
  const index = phases.findIndex((phase) => {
    const end = phase.startSeconds + phase.durationSeconds;
    return time >= phase.startSeconds && time < end;
  });
  return index === -1 ? phases.length - 1 : index;
}

export function phaseAtTime(phases, currentTime) {
  const index = phaseIndexAtTime(phases, currentTime);
  return index < 0 ? null : phases[index];
}
