import { supabase, supabaseEnabled } from './supabase';

const BUCKET = 'task-attachments';

export async function loadAttachments(taskId) {
  if (!supabaseEnabled || !taskId) return [];
  const { data, error } = await supabase
    .from('task_attachments')
    .select('id,task_id,file_name,storage_path,mime_type,size_bytes,created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function uploadAttachment(taskId, file) {
  if (!supabaseEnabled || !taskId || !file) return null;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Sign in before uploading attachments.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${taskId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.from('task_attachments').insert({
    task_id: taskId,
    file_name: file.name,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size || 0,
  }).select().single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data;
}

export async function removeAttachment(attachment) {
  if (!supabaseEnabled || !attachment?.id) return;
  const { error } = await supabase.from('task_attachments').delete().eq('id', attachment.id);
  if (error) throw error;
  if (attachment.storage_path) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.storage_path]);
    if (storageError) throw storageError;
  }
}

export async function getAttachmentUrl(storagePath) {
  if (!supabaseEnabled || !storagePath) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data?.signedUrl || null;
}
