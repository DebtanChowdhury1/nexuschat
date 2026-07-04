import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

/**
 * Opens the system image picker, uploads the result to the "avatars"
 * storage bucket under the user's own folder (RLS keys off that path
 * segment — see supabase/migrations/0002_avatars_bucket.sql), and returns
 * the new public URL. Returns null if the user cancelled the picker.
 */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo library permission was denied.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const extension = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: asset.mimeType ?? `image/${extension}`, upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
