import { supabase, supabaseEnabled } from './supabase';

export async function loadSubtasks(taskId) {
  if (!supabaseEnabled || !taskId) return [];
  const { data, error } = await supabase.from('subtasks').select('id,task_id,title,completed,position,created_at,updated_at').eq('task_id', taskId).order('position', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createSubtask(taskId, title) {
  if (!supabaseEnabled || !taskId || !title?.trim()) return null;
  const { data: last } = await supabase.from('subtasks').select('position').eq('task_id', taskId).order('position', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from('subtasks').insert({ task_id: taskId, title: title.trim(), position: (last?.position ?? -1) + 1 }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSubtask(id, patch) {
  if (!supabaseEnabled || !id) return null;
  const row = {};
  if ('title' in patch) row.title = patch.title?.trim() || '';
  if ('completed' in patch) row.completed = Boolean(patch.completed);
  if ('position' in patch) row.position = Number(patch.position) || 0;
  const { data, error } = await supabase.from('subtasks').update(row).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSubtask(id) {
  if (!supabaseEnabled || !id) return;
  const { error } = await supabase.from('subtasks').delete().eq('id', id);
  if (error) throw error;
}
