import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Pulls every conversation + message the user owns and triggers a download.
 * Web-only for now — native would need expo-file-system/expo-sharing, which
 * isn't part of this project's dependency set yet.
 */
export async function exportChatHistory(userId: string): Promise<void> {
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId);
  if (convError) throw convError;

  const conversationIds = (conversations ?? []).map((c) => c.id);
  const { data: messages, error: msgError } =
    conversationIds.length > 0
      ? await supabase.from('messages').select('*').in('conversation_id', conversationIds)
      : { data: [], error: null };
  if (msgError) throw msgError;

  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), conversations, messages }, null, 2);

  if (Platform.OS === 'web') {
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexuschat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  throw new Error('Export is currently available on web only.');
}

/** Deletes every conversation the user owns (messages cascade via FK). */
export async function clearAllConversations(userId: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('user_id', userId);
  if (error) throw error;
}

/**
 * Deletes all of the user's owned data (conversations, messages via
 * cascade, profile) and signs them out. Note: this does not remove the
 * underlying auth.users row itself — that requires the Supabase service-role
 * admin API, which has no place in a client-only app. A full "right to be
 * forgotten" flow would need a server-side function (e.g. a Supabase Edge
 * Function) to call `auth.admin.deleteUser`.
 */
export async function deleteAccountData(userId: string): Promise<void> {
  await clearAllConversations(userId);
  const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
  if (error) throw error;
  await supabase.auth.signOut();
}
