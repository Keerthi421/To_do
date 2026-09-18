import { supabase, supabaseEnabled } from './supabase';

export async function loadLists(userId) {
  if (!supabaseEnabled || !userId) return [];
  const { data, error } = await supabase.from('lists').select('id,name,color,created_at').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function ensureDefaultLists(userId) {
  if (!supabaseEnabled || !userId) return [];
  const defaults = [{ user_id: userId, name: 'Personal' }, { user_id: userId, name: 'Work' }];
  const { error } = await supabase.from('lists').upsert(defaults, { onConflict: 'user_id,name', ignoreDuplicates: true });
  if (error) throw error;
  return loadLists(userId);
}

export async function createList(name, userId) {
  if (!supabaseEnabled || !userId || !name?.trim()) return null;
  const { data, error } = await supabase.from('lists').insert({ user_id: userId, name: name.trim() }).select().single();
  if (error) throw error;
  return data;
}
