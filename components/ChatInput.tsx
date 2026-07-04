import { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, Pressable, Text, ActivityIndicator, Platform } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Sparkles, TextAlignStart, Type as TypeIcon } from 'lucide-react-native';

import { pickAndUploadAttachment, type UploadedAttachment } from '../lib/attachments';
import { color } from '../constants/theme';
import { useNetworkStatus } from '../lib/useNetworkStatus';
import { useAuthStore } from '../store/authStore';
import { useOfflineQueueStore } from '../store/offlineQueueStore';
import { useSettingsStore } from '../store/settingsStore';
import { broadcastTyping } from '../lib/realtime';

interface ChatInputProps {
  conversationId: string;
  disabled: boolean;
  disabledReason?: string;
  typingChannel: RealtimeChannel | null;
  /** Present when sent from inside a Live Room — labels the typing broadcast with a name/color instead of a device. */
  roomParticipant?: { name: string; color: string } | null;
  onSend: (content: string) => Promise<void>;
  onOpenVoice: () => void;
}

export function ChatInput({
  conversationId,
  disabled,
  disabledReason,
  typingChannel,
  roomParticipant,
  onSend,
  onOpenVoice,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<UploadedAttachment | null>(null);
  const isOnline = useNetworkStatus();
  const userId = useAuthStore((s) => s.session?.user.id);
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const dequeue = useOfflineQueueStore((s) => s.dequeue);
  const markAttemptFailed = useOfflineQueueStore((s) => s.markAttemptFailed);
  // Subscribe to the raw queue and filter locally — calling s.forConversation()
  // directly inside the selector would return a brand-new array every render
  // (same "getSnapshot should be cached" infinite-loop trap as elsewhere).
  const queue = useOfflineQueueStore((s) => s.queue);
  const queued = useMemo(
    () => queue.filter((m) => m.conversationId === conversationId),
    [queue, conversationId]
  );
  const pendingQueued = useMemo(() => queued.filter((m) => !m.failed), [queued]);
  const failedQueued = useMemo(() => queued.filter((m) => m.failed), [queued]);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOnline = useRef(isOnline);
  // A rapid double-tap on send can invoke handleSubmit twice before React
  // commits the `sending` state update from the first call — a plain state
  // check at the top of the function isn't enough since both calls read the
  // same stale `false` value. A ref is checked/set synchronously, closing
  // that window entirely.
  const sendingRef = useRef(false);
  const voiceModeEnabled = useSettingsStore((s) => s.voiceModeEnabled);
  const deepThinkEnabled = useSettingsStore((s) => s.deepThinkEnabled);
  const setDeepThinkEnabled = useSettingsStore((s) => s.setDeepThinkEnabled);
  const responseLength = useSettingsStore((s) => s.responseLength);
  const setResponseLength = useSettingsStore((s) => s.setResponseLength);

  // Flush queued drafts the moment connectivity returns. Each item is
  // tried independently — one message that can never succeed (its
  // conversation or parent was deleted while offline, so every retry fails
  // identically) used to `break` the loop and silently block every other
  // queued message behind it forever. Now a failing item just gets its
  // attempt count bumped (see markAttemptFailed) and the rest of the queue
  // still gets a chance; after MAX_QUEUE_ATTEMPTS it's marked `failed` and
  // shown in the UI below for the user to discard instead of retrying
  // forever with no visible outcome.
  useEffect(() => {
    if (!wasOnline.current && isOnline && queued.length > 0) {
      (async () => {
        for (const item of queued) {
          if (item.failed) continue;
          try {
            await onSend(item.content);
            dequeue(item.id);
          } catch {
            markAttemptFailed(item.id);
          }
        }
      })();
    }
    wasOnline.current = isOnline;
  }, [isOnline, queued, onSend, dequeue, markAttemptFailed]);

  const handleChangeText = (value: string) => {
    setText(value);
    if (!typingChannel) return;
    broadcastTyping(typingChannel, conversationId, true, roomParticipant ?? undefined);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      broadcastTyping(typingChannel, conversationId, false, roomParticipant ?? undefined);
    }, 1500);
  };

  const handleSubmit = async () => {
    if (sendingRef.current) return;
    const trimmed = text.trim();
    const attachmentLine = pendingAttachment ? `📎 [${pendingAttachment.name}](${pendingAttachment.url})` : null;
    // A file can go out with no caption at all — the attachment line alone
    // is a valid message, same as a plain text message with no attachment.
    const content = [trimmed, attachmentLine].filter(Boolean).join('\n\n');
    if (!content) return;
    sendingRef.current = true;
    setText('');
    setPendingAttachment(null);
    if (typingChannel) broadcastTyping(typingChannel, conversationId, false, roomParticipant ?? undefined);

    if (!isOnline) {
      enqueue(conversationId, content);
      sendingRef.current = false;
      return;
    }

    setSending(true);
    try {
      await onSend(content);
    } catch {
      enqueue(conversationId, content); // best effort: don't lose the draft on failure
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  // Enter sends, Shift+Enter inserts a newline — web only, since native
  // multiline inputs don't expose a physical Enter/Shift chord the same way.
  const handleKeyPress = (e: any) => {
    if (Platform.OS !== 'web') return;
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAttach = async () => {
    if (!userId) return;
    setAttachError(null);
    setAttaching(true);
    try {
      const attachment = await pickAndUploadAttachment(userId);
      if (!attachment) return;
      // Stage it rather than sending immediately — the user can now type a
      // caption to go with it, or hit send right away with no text at all.
      setPendingAttachment(attachment);
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : 'Could not upload file.');
    } finally {
      setAttaching(false);
    }
  };

  return (
    <View className="border-t border-border-light bg-bg-light p-3 dark:border-border dark:bg-black/20">
      {pendingQueued.length > 0 && (
        <Text className="mb-2 text-xs text-amber-500 dark:text-amber-400">
          {pendingQueued.length} message{pendingQueued.length > 1 ? 's' : ''} queued — will send when back online
        </Text>
      )}
      {failedQueued.map((item) => (
        <View
          key={item.id}
          className="mb-2 flex-row items-center justify-between gap-2 rounded-lg bg-red-500/10 px-3 py-2"
        >
          <Text numberOfLines={1} className="flex-1 text-xs text-red-500">
            Couldn't send: "{item.content}"
          </Text>
          <Pressable
            onPress={() => dequeue(item.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Discard message that failed to send: ${item.content}`}
          >
            <Text className="text-xs font-semibold text-red-500">Discard</Text>
          </Pressable>
        </View>
      ))}
      {attachError && <Text className="mb-2 text-xs text-red-400">{attachError}</Text>}
      {disabled && disabledReason && (
        <Text className="mb-2 text-xs text-ink-muted-light dark:text-ink-muted">{disabledReason}</Text>
      )}
      <View className="mb-2 flex-row items-center gap-1.5">
        <Pressable
          onPress={() => setDeepThinkEnabled(!deepThinkEnabled)}
          accessibilityRole="switch"
          accessibilityState={{ checked: deepThinkEnabled }}
          accessibilityLabel="Deep Think mode"
          accessibilityHint="When on, the AI reasons through its answer in a visible, collapsible thinking step before replying"
          className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
            deepThinkEnabled ? 'bg-brand/15' : 'bg-black/5 dark:bg-white/10'
          }`}
        >
          <Sparkles size={12} color={deepThinkEnabled ? color.brand.DEFAULT : '#71717A'} strokeWidth={2.2} />
          <Text
            className={`text-[11px] font-medium ${
              deepThinkEnabled ? 'text-brand' : 'text-ink-muted-light dark:text-ink-muted'
            }`}
          >
            Deep Think
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setResponseLength(responseLength === 'short' ? 'descriptive' : 'short')}
          accessibilityRole="button"
          accessibilityLabel={`Response length: ${responseLength === 'short' ? 'Short' : 'Descriptive'}`}
          accessibilityHint="Toggles between a short answer and a more detailed, descriptive one"
          className="flex-row items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/10"
        >
          {responseLength === 'short' ? (
            <TypeIcon size={12} color="#71717A" strokeWidth={2.2} />
          ) : (
            <TextAlignStart size={12} color="#71717A" strokeWidth={2.2} />
          )}
          <Text className="text-[11px] font-medium text-ink-muted-light dark:text-ink-muted">
            {responseLength === 'short' ? 'Short' : 'Descriptive'}
          </Text>
        </Pressable>
      </View>
      {pendingAttachment && (
        <View className="mb-2 flex-row items-center gap-2 self-start rounded-full bg-black/5 py-1.5 pl-3 pr-2 dark:bg-white/10">
          <Text numberOfLines={1} className="max-w-[220px] text-xs text-ink-secondary-light dark:text-ink-secondary">
            📎 {pendingAttachment.name}
          </Text>
          <Pressable
            onPress={() => setPendingAttachment(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Remove attachment"
          >
            <Text className="text-xs text-ink-muted-light dark:text-ink-muted">✕</Text>
          </Pressable>
        </View>
      )}
      <View className="flex-row items-end gap-2">
        <Pressable
          onPress={handleAttach}
          disabled={attaching || disabled}
          className="rounded-full bg-black/5 p-3 disabled:opacity-40 dark:bg-white/10"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Attach a file"
        >
          {attaching ? <ActivityIndicator size="small" /> : <Text>📎</Text>}
        </Pressable>
        {voiceModeEnabled && (
          <Pressable
            onPress={onOpenVoice}
            className="rounded-full bg-black/5 p-3 dark:bg-white/10"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open voice mode"
          >
            <Text>🎙️</Text>
          </Pressable>
        )}
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          onKeyPress={handleKeyPress}
          placeholder={
            pendingAttachment
              ? 'Add a caption (optional)…'
              : isOnline
                ? 'Message NexusChat…'
                : 'Offline — message will be queued'
          }
          placeholderTextColor="#8888a0"
          editable={!disabled}
          multiline
          accessibilityLabel="Message"
          className="max-h-32 flex-1 rounded-2xl bg-black/5 px-4 py-3 text-ink-primary-light dark:bg-white/10 dark:text-ink-primary"
        />
        <Pressable
          onPress={handleSubmit}
          disabled={disabled || sending || (!text.trim() && !pendingAttachment)}
          className="items-center justify-center rounded-full bg-brand p-3 disabled:opacity-40"
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text className="text-white">➤</Text>}
        </Pressable>
      </View>
    </View>
  );
}
