import * as DocumentPicker from 'expo-document-picker';

import { supabase } from './supabase';

export interface UploadedAttachment {
  name: string;
  url: string;
}

/**
 * Opens the system file picker (any file type) and uploads the result to
 * the "attachments" storage bucket under the user's own folder — same
 * ownership pattern as avatars, see supabase/migrations/0004_attachments.sql.
 * Returns null if the user cancelled the picker.
 */
export async function pickAndUploadAttachment(userId: string): Promise<UploadedAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const safeName = asset.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(path, blob, { contentType: asset.mimeType ?? 'application/octet-stream' });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('attachments').getPublicUrl(path);
  return { name: asset.name, url: data.publicUrl };
}
