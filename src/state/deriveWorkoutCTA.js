function completedAt(record) {
  return new Date(record.completedAt || record.updatedAt || 0).getTime();
}

function recordTemplate(record) {
  const snapshot = record?.workoutSnapshot;
  if (!record || !snapshot) return null;
  return {
    id: snapshot.templateId || record.templateId,
    version: snapshot.templateVersion || record.templateVersion,
    name: snapshot.workoutName || record.workoutNameSnapshot || record.templateId,
    snapshot
  };
}

export function deriveWorkoutCTA({ activeWorkout, workoutRecords = [], nextRequiredWorkout, localDate }) {
  if (!nextRequiredWorkout) throw new Error('A next required workout is required to derive the Today action.');

  if (activeWorkout?.active && activeWorkout.snapshot) {
    const scheduled = {
      id: activeWorkout.snapshot.templateId,
      version: activeWorkout.snapshot.templateVersion,
      name: activeWorkout.snapshot.workoutName,
      snapshot: activeWorkout.snapshot
    };
    return {
      state: 'active',
      todayScheduledWorkout: scheduled,
      nextRequiredWorkout,
      ctaLabel: 'Resume workout',
      accountabilityLabel: `Continue ${scheduled.name}`,
      accountabilityState: 'Resume',
      disabled: false
    };
  }

  const recordsToday = workoutRecords.filter(record => record.localDate === localDate);
  const completed = recordsToday
    .filter(record => record.status === 'completed')
    .sort((a, b) => completedAt(a) - completedAt(b))
    .at(-1);
  const completedTemplate = recordTemplate(completed);
  if (completedTemplate) {
    return {
      state: 'completed',
      todayScheduledWorkout: completedTemplate,
      nextRequiredWorkout,
      completedRecord: completed,
      ctaLabel: 'Workout complete',
      accountabilityLabel: `Complete ${completedTemplate.name}`,
      accountabilityState: 'Done',
      disabled: true
    };
  }

  const partial = recordsToday
    .filter(record => record.status === 'partial' && record.templateId === nextRequiredWorkout.id)
    .sort((a, b) => completedAt(a) - completedAt(b))
    .at(-1);

  return {
    state: partial ? 'partial' : 'not-started',
    todayScheduledWorkout: nextRequiredWorkout,
    nextRequiredWorkout,
    partialRecord: partial || null,
    ctaLabel: 'Start workout',
    accountabilityLabel: `Complete ${nextRequiredWorkout.name}`,
    accountabilityState: partial ? 'Partial' : 'Start',
    disabled: false
  };
}
