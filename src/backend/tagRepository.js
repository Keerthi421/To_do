import { supabase, supabaseEnabled } from './supabase';

export async function loadTags(userId) {
  if (!supabaseEnabled || !userId) return [];
  const { data, error } = await supabase.from('tags').select('id,name,color,created_at').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createTag(name, userId) {
  if (!supabaseEnabled || !userId || !name?.trim()) return null;
  const { data, error } = await supabase.from('tags').upsert(
    { user_id: userId, name: name.trim() },
    { onConflict: 'user_id,name' }
  ).select().single();
  if (error) throw error;
  return data;
}
