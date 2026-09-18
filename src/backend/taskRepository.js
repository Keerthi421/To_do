import { supabase, supabaseEnabled } from './supabase';

const toClientTask = row => ({
  id: row.id,
  title: row.title,
  notes: row.notes || '',
  date: row.due_at ? row.due_at.slice(0, 10) : 'upcoming',
  time: row.due_at && row.due_at.length >= 16 ? new Date(row.due_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '',
  list: row.list_id || 'Personal',
  tag: '',
  priority: row.priority || 'none',
  pinned: Boolean(row.pinned),
  done: Boolean(row.completed),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
});

const toRow = task => ({
  id: String(task.id),
  title: task.title,
  notes: task.notes || '',
  due_at: task.date && !['today', 'tomorrow', 'upcoming'].includes(task.date) ? task.date : null,
  priority: task.priority || 'none',
  pinned: Boolean(task.pinned),
  completed: Boolean(task.done),
  completed_at: task.completedAt || null,
});

export async function loadTasks() {
  if (!supabaseEnabled) return null;
  const { data, error } = await supabase
    .from('tasks')
    .select('id,title,notes,due_at,list_id,priority,pinned,completed,completed_at,created_at,updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toClientTask);
}

export async function insertTask(task, userId) {
  if (!supabaseEnabled || !userId) return null;
  const payload = { ...toRow(task), user_id: userId };
  const { data, error } = await supabase.from('tasks').insert(payload).select().single();
  if (error) throw error;
  return toClientTask(data);
}

export async function updateTaskRemote(id, patch) {
  if (!supabaseEnabled) return null;
  const row = {};
  if ('title' in patch) row.title = patch.title;
  if ('notes' in patch) row.notes = patch.notes || '';
  if ('priority' in patch) row.priority = patch.priority || 'none';
  if ('pinned' in patch) row.pinned = Boolean(patch.pinned);
  if ('done' in patch) {
    row.completed = Boolean(patch.done);
    row.completed_at = patch.done ? new Date().toISOString() : null;
  }
  if ('date' in patch && !['today', 'tomorrow', 'upcoming'].includes(patch.date)) row.due_at = patch.date || null;
  const { error } = await supabase.from('tasks').update(row).eq('id', id);
  if (error) throw error;
}

export async function softDeleteTask(id) {
  if (!supabaseEnabled) return null;
  const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
