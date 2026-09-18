export function nextOccurrence(task) {
  if (!task?.recurrenceRule) return null;
  const source = task.dueAt || (task.date && /^\d{4}-\d{2}-\d{2}$/.test(task.date) ? `${task.date}T00:00:00` : null);
  if (!source) return null;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  const rule = String(task.recurrenceRule).toLowerCase().trim();
  if (rule === 'daily' || rule === 'every day') date.setDate(date.getDate() + 1);
  else if (rule === 'weekly' || rule === 'every week') date.setDate(date.getDate() + 7);
  else if (rule === 'monthly' || rule === 'every month') date.setMonth(date.getMonth() + 1);
  else {
    const weekly = rule.match(/^weekly:(\d+)$/);
    const daily = rule.match(/^daily:(\d+)$/);
    const monthly = rule.match(/^monthly:(\d+)$/);
    if (weekly) date.setDate(date.getDate() + 7 * Math.max(1, Number(weekly[1])));
    else if (daily) date.setDate(date.getDate() + Math.max(1, Number(daily[1])));
    else if (monthly) date.setMonth(date.getMonth() + Math.max(1, Number(monthly[1])));
    else return null;
  }
  return date.toISOString();
}

export function makeRecurringCopy(task, dueAt) {
  return {
    ...task,
    id: undefined,
    dueAt,
    date: dueAt.slice(0, 10),
    done: false,
    completedAt: null,
    reminderAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
