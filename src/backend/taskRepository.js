import { supabase, supabaseEnabled } from './supabase';

const priorityToDb = value => ({ none: 0, low: 1, medium: 2, high: 3 }[value] ?? 0);
const priorityFromDb = value => ({ 0: 'none', 1: 'low', 2: 'medium', 3: 'high' }[value] ?? 'none');
const taskSelect = 'id,title,notes,due_at,reminder_at,recurrence_rule,list_id,priority,pinned,completed,completed_at,created_at,updated_at,lists(name),task_tags(tags(name))';

const toClientTask = row => ({
  id: row.id,
  title: row.title,
  notes: row.notes || '',
  date: row.due_at ? row.due_at.slice(0, 10) : 'upcoming',
  time: row.due_at && row.due_at.length >= 16 ? new Date(row.due_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '',
  dueAt: row.due_at || null,
  reminderAt: row.reminder_at || null,
  recurrenceRule: row.recurrence_rule || '',
  list: row.lists?.name || row.list_id || 'Personal',
  listId: row.list_id || null,
  tag: row.task_tags?.[0]?.tags?.name || '',
  priority: priorityFromDb(row.priority),
  pinned: Boolean(row.pinned),
  done: Boolean(row.completed),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
});

const toRow = task => ({
  title: task.title,
  notes: task.notes || '',
  due_at: task.dueAt || (task.date && !['today', 'tomorrow', 'upcoming'].includes(task.date) ? task.date : null),
  reminder_at: task.reminderAt || null,
  recurrence_rule: task.recurrenceRule || null,
  list_id: task.listId || null,
  priority: priorityToDb(task.priority),
  pinned: Boolean(task.pinned),
  completed: Boolean(task.done),
  completed_at: task.completedAt || null,
});

export async function getSession() { if (!supabaseEnabled) return null; const { data, error } = await supabase.auth.getSession(); if (error) throw error; return data.session; }
export async function signInWithEmail(email, password) { if (!supabaseEnabled) throw new Error('Supabase is not configured.'); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; return data.session; }
export async function signUpWithEmail(email, password) { if (!supabaseEnabled) throw new Error('Supabase is not configured.'); const { data, error } = await supabase.auth.signUp({ email, password }); if (error) throw error; return data.session; }
export async function signOut() { if (!supabaseEnabled) return; const { error } = await supabase.auth.signOut(); if (error) throw error; }

async function resolveListId(name, userId) {
  if (!supabaseEnabled || !userId || !name?.trim()) return null;
  const clean = name.trim();
  const { data: existing, error: findError } = await supabase.from('lists').select('id').eq('user_id', userId).eq('name', clean).maybeSingle();
  if (findError) throw findError;
  if (existing?.id) return existing.id;
  const { data, error } = await supabase.from('lists').insert({ user_id: userId, name: clean }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function syncTaskTag(taskId, tagName, userId) {
  if (!supabaseEnabled || !taskId || !userId) return;
  const { error: removeError } = await supabase.from('task_tags').delete().eq('task_id', taskId);
  if (removeError) throw removeError;
  if (!tagName?.trim()) return;
  const clean = tagName.trim();
  let { data: tag, error } = await supabase.from('tags').select('id').eq('user_id', userId).eq('name', clean).maybeSingle();
  if (error) throw error;
  if (!tag) {
    const result = await supabase.from('tags').insert({ user_id: userId, name: clean }).select('id').single();
    if (result.error) throw result.error;
    tag = result.data;
  }
  const { error: linkError } = await supabase.from('task_tags').insert({ task_id: taskId, tag_id: tag.id });
  if (linkError) throw linkError;
}

export async function loadTasks() {
  if (!supabaseEnabled) return null;
  const { data, error } = await supabase.from('tasks').select(taskSelect).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toClientTask);
}

export async function insertTask(task, userId) {
  if (!supabaseEnabled || !userId) return null;
  const row = toRow(task);
  if (!row.list_id && task.list) row.list_id = await resolveListId(task.list, userId);
  const { data, error } = await supabase.from('tasks').insert({ ...row, user_id: userId }).select(taskSelect).single();
  if (error) throw error;
  if (task.tag) await syncTaskTag(data.id, task.tag, userId);
  return toClientTask({ ...data, task_tags: task.tag ? [{ tags: { name: task.tag } }] : data.task_tags });
}

export async function updateTaskRemote(id, patch) {
  if (!supabaseEnabled) return null;
  const row = {};
  if ('title' in patch) row.title = patch.title;
  if ('notes' in patch) row.notes = patch.notes || '';
  if ('priority' in patch) row.priority = priorityToDb(patch.priority);
  if ('pinned' in patch) row.pinned = Boolean(patch.pinned);
  if ('done' in patch) { row.completed = Boolean(patch.done); row.completed_at = patch.done ? new Date().toISOString() : null; }
  if ('date' in patch || 'dueAt' in patch) row.due_at = patch.dueAt ?? (['today', 'tomorrow', 'upcoming'].includes(patch.date) ? null : (patch.date || null));
  if ('reminderAt' in patch) row.reminder_at = patch.reminderAt || null;
  if ('recurrenceRule' in patch) row.recurrence_rule = patch.recurrenceRule || null;
  const session = await getSession();
  const userId = session?.user?.id;
  if ('listId' in patch) row.list_id = patch.listId || null;
  else if ('list' in patch && userId) row.list_id = await resolveListId(patch.list, userId);
  const { error } = await supabase.from('tasks').update(row).eq('id', id);
  if (error) throw error;
  if ('tag' in patch && userId) await syncTaskTag(id, patch.tag, userId);
}

export async function softDeleteTask(id) { if (!supabaseEnabled) return null; const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; }
export function subscribeToTasks(userId, onChange) { if (!supabaseEnabled || !userId) return () => {}; const channel = supabase.channel(`tasks:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, onChange).subscribe(); return () => supabase.removeChannel(channel); }
