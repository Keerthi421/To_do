const timers = new Map();
const PREFIX = 'anyday.reminder.';

export function requestReminderPermission() {
  if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  return Notification.requestPermission();
}

export function cancelReminder(taskId) {
  const key = String(taskId);
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);
  try { localStorage.removeItem(PREFIX + key); } catch {}
}

export function scheduleReminder(task) {
  if (typeof window === 'undefined' || !task?.id || !task.reminderAt || task.done) return;
  cancelReminder(task.id);
  const at = new Date(task.reminderAt).getTime();
  const delay = at - Date.now();
  if (!Number.isFinite(at) || delay <= 0) return;
  const timer = window.setTimeout(async () => {
    if (Date.now() < at) { scheduleReminder(task); return; }
    timers.delete(String(task.id));
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('AnyDay reminder', { body: task.title, tag: `anyday-${task.id}` }); } catch {}
    }
    try { localStorage.removeItem(PREFIX + String(task.id)); } catch {}
  }, Math.min(delay, 2147483647));
  timers.set(String(task.id), timer);
  try { localStorage.setItem(PREFIX + String(task.id), String(at)); } catch {}
}

export function syncReminders(tasks) {
  const activeIds = new Set();
  for (const task of tasks || []) {
    if (task.reminderAt && !task.done) {
      activeIds.add(String(task.id));
      scheduleReminder(task);
    }
  }
  for (const id of timers.keys()) if (!activeIds.has(id)) cancelReminder(id);
}
