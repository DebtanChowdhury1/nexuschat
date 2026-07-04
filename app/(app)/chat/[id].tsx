import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { DoorOpen, Ghost, GitBranch, Link, XCircle } from 'lucide-react-native';

import { AIOrb } from '../../../components/AIOrb';
import { AppHeader } from '../../../components/nav/AppHeader';
import { color } from '../../../constants/theme';
import { BranchTreeModal } from '../../../components/BranchTreeModal';
import { ChatInput } from '../../../components/ChatInput';
import { MessageBubble } from '../../../components/MessageBubble';
import { RoomAvatarBubbles } from '../../../components/room/RoomAvatarBubbles';
import { ShareRoomModal } from '../../../components/room/ShareRoomModal';
import { Skeleton } from '../../../components/Skeleton';
import { TypingIndicator, type TypingLabel } from '../../../components/TypingIndicator';
import { VoiceMode } from '../../../components/VoiceMode';
import { defaultLeaf, pathToLeaf } from '../../../lib/branching';
import { getDeviceId } from '../../../lib/deviceId';
import { splitThinking } from '../../../lib/responseStyle';
import { useAndroidKeyboardHeight } from '../../../lib/useKeyboardHeight';
import {
  broadcastRoomMessage,
  subscribeToConversation,
  subscribeToMessages,
  subscribeToRoom,
  subscribeToRoomMessages,
  subscribeToRoomPresence,
  subscribeToTyping,
  unsubscribe,
} from '../../../lib/realtime';
import { endRoom, getOrCreateActiveRoom, getRoom, getRoomParticipants, joinRoom, leaveRoom, roomShareUrl } from '../../../lib/rooms';
import { useAuthStore } from '../../../store/authStore';
import { useNavStore } from '../../../store/navStore';
import { useChatStore, EMPTY_MESSAGES } from '../../../store/chatStore';
import { useRoomStore } from '../../../store/roomStore';
import { usePageTitle } from '../../../lib/usePageTitle';
import type { Conversation } from '../../../types/db';

export default function ChatScreen() {
  const { id, voice, room: roomParam } = useLocalSearchParams<{ id: string; voice?: string; room?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const androidKeyboardHeight = useAndroidKeyboardHeight();
  const openDrawer = useNavStore((s) => s.openDrawer);
  const session = useAuthStore((s) => s.session);
  const activeRoom = useRoomStore((s) => s.activeRoom);
  const setActiveRoom = useRoomStore((s) => s.setActiveRoom);
  const roomParticipants = useRoomStore((s) => s.participants);
  const setRoomParticipants = useRoomStore((s) => s.setParticipants);

  const applyRemoteMessage = useChatStore((s) => s.applyRemoteMessage);
  const applyRemoteConversation = useChatStore((s) => s.applyRemoteConversation);
  const clearStaleGenerationLock = useChatStore((s) => s.clearStaleGenerationLock);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const conversations = useChatStore((s) => s.conversations);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const editAndBranch = useChatStore((s) => s.editAndBranch);
  const activeProvider = useChatStore((s) => s.activeProvider);
  // Derived locally with useMemo rather than via a store selector that calls
  // getActivePath() — that returns a brand-new array on every render, which
  // trips React's "getSnapshot should be cached" check and infinite-loops.
  const messages = useChatStore((s) => s.messagesByConversation[id] ?? EMPTY_MESSAGES);
  const messagesLoading = useChatStore((s) => s.messagesLoadingByConversation[id] ?? false);
  const activeLeaf = useChatStore((s) => s.activeLeafByConversation[id]);
  const activePath = useMemo(() => {
    const leaf = activeLeaf ?? defaultLeaf(messages);
    return leaf ? pathToLeaf(messages, leaf) : [];
  }, [messages, activeLeaf]);

  const conversation = conversations.find((c) => c.id === id);
  const [remoteConversation, setRemoteConversation] = useState<Conversation | null>(null);
  const isGenerating = remoteConversation?.is_generating ?? conversation?.is_generating ?? false;
  usePageTitle(conversation?.title ?? 'Chat');

  // Self-healing watchdog: if a previous generation attempt crashed/hung on
  // some device without ever releasing the lock, opening the conversation
  // here clears it once it's old enough to be unambiguously stale — see
  // clearStaleGenerationLock's comment for why this can't be mistaken for a
  // real in-progress generation.
  useEffect(() => {
    if (conversation) void clearStaleGenerationLock(conversation);
  }, [conversation, clearStaleGenerationLock]);

  const [typingDevices, setTypingDevices] = useState<Record<string, TypingLabel>>({});
  const [voiceVisible, setVoiceVisible] = useState(voice === '1');
  const [treeVisible, setTreeVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const roomMessagesChannelRef = useRef<RealtimeChannel | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const isTemporaryRef = useRef(false);

  useEffect(() => {
    isTemporaryRef.current = conversation?.is_temporary ?? false;
  }, [conversation?.is_temporary]);

  // Temporary chats (ChatGPT-style) are discarded the moment you navigate
  // away — not just hidden from the sidebar. Uses a ref for the latest
  // is_temporary value so this doesn't need to resubscribe on every change.
  useEffect(() => {
    return () => {
      if (isTemporaryRef.current) deleteConversation(id).catch(() => {});
    };
  }, [id, deleteConversation]);

  useEffect(() => {
    if (!id) return;
    loadMessages(id);

    const messagesChannel = subscribeToMessages(
      id,
      (msg) => applyRemoteMessage(msg),
      (msg) => applyRemoteMessage(msg)
    );
    const conversationChannel = subscribeToConversation(id, (conv) => {
      setRemoteConversation(conv);
      applyRemoteConversation(conv);
    });

    const typingChannel = subscribeToTyping(id, ({ deviceId, deviceLabel, isTyping, participantName, participantColor }) => {
      if (deviceId === deviceIdRef.current) return; // ignore our own broadcast echo
      setTypingDevices((prev) => {
        const next = { ...prev };
        if (isTyping) next[deviceId] = { label: participantName ?? deviceLabel, color: participantColor };
        else delete next[deviceId];
        return next;
      });
    });
    typingChannelRef.current = typingChannel;

    getDeviceId().then((deviceId) => {
      deviceIdRef.current = deviceId;
    });

    return () => {
      unsubscribe(messagesChannel);
      unsubscribe(conversationChannel);
      unsubscribe(typingChannel);
    };
  }, [id, loadMessages, applyRemoteMessage, applyRemoteConversation]);

  // Resolves the `?room=` deep link into full room state (identity + color)
  // once a participant row exists for the current user — that row is
  // created either by the join screen (guests) or by handleShareRoom
  // (the host, right after creating the room).
  useEffect(() => {
    let cancelled = false;
    if (!roomParam || !session?.user.id) {
      setActiveRoom(null);
      return;
    }
    (async () => {
      const room = await getRoom(roomParam).catch(() => null);
      if (!room || cancelled) return;
      const participants = await getRoomParticipants(roomParam).catch(() => []);
      const me = participants.find((p) => p.user_id === session.user.id);
      if (!me || cancelled) return;
      setActiveRoom({
        roomId: roomParam,
        conversationId: room.conversation_id,
        isHost: session.user.id === room.host_user_id,
        myUserId: session.user.id,
        myDisplayName: me.display_name,
        myColor: me.color,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [roomParam, session?.user.id, setActiveRoom]);

  // Live presence (avatar bubbles) + gets everyone out the moment the host ends the room.
  useEffect(() => {
    if (!activeRoom) return;
    const presenceChannel = subscribeToRoomPresence(
      activeRoom.roomId,
      { userId: activeRoom.myUserId, displayName: activeRoom.myDisplayName, color: activeRoom.myColor },
      setRoomParticipants
    );
    const roomChannel = subscribeToRoom(activeRoom.roomId, (updatedRoom) => {
      if (updatedRoom.ended_at) {
        setActiveRoom(null);
        router.replace(activeRoom.isHost ? `/(app)/chat/${activeRoom.conversationId}` : '/');
      }
    });
    // See lib/realtime.ts's subscribeToRoomMessages comment — this is the
    // fallback path that actually delivers other participants' messages
    // live, since postgres_changes doesn't reliably do it for room guests.
    const roomMessagesChannel = subscribeToRoomMessages(activeRoom.roomId, applyRemoteMessage);
    roomMessagesChannelRef.current = roomMessagesChannel;
    return () => {
      unsubscribe(presenceChannel);
      unsubscribe(roomChannel);
      unsubscribe(roomMessagesChannel);
      roomMessagesChannelRef.current = null;
    };
  }, [activeRoom, setActiveRoom, setRoomParticipants, applyRemoteMessage]);

  const handleShareRoom = async () => {
    if (!session?.user.id || !id) return;
    setShareModalVisible(true);
    setCreatingRoom(true);
    setShareError(null);
    try {
      const newRoom = await getOrCreateActiveRoom(id, session.user.id);
      const hostName = session.user.email?.split('@')[0] ?? 'Host';
      await joinRoom(newRoom.id, session.user.id, hostName);
      setShareUrl(roomShareUrl(newRoom.id));
      router.setParams({ room: newRoom.id });
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Could not create a room.');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    await leaveRoom(activeRoom.roomId, activeRoom.myUserId).catch(() => {});
    setActiveRoom(null);
    router.replace('/');
  };

  const handleEndRoom = async () => {
    if (!activeRoom) return;
    await endRoom(activeRoom.roomId).catch(() => {});
    setActiveRoom(null);
    router.replace(`/(app)/chat/${id}`);
  };

  const disabledReason = useMemo(() => {
    if (!isGenerating) return undefined;
    return activeProvider ? 'NexusChat AI is responding…' : 'Another device is generating a response…';
  }, [isGenerating, activeProvider]);

  const handleSend = async (content: string) => {
    if (!id) return;
    const sender = activeRoom ? { name: activeRoom.myDisplayName, color: activeRoom.myColor } : null;
    const { userMessage, assistantMessage } = await sendMessage(id, content, activePath.at(-1)?.id ?? null, sender);

    // Broadcast our own just-sent user message + the assistant's finished
    // reply to the rest of the room — see subscribeToRoomMessages for why
    // this is necessary rather than relying on postgres_changes alone.
    // sendMessage now hands back the assistant message with its final
    // content already resolved, rather than us re-deriving it from local
    // state right after — reading local state here raced the sender's own
    // postgres_changes UPDATE landing and regularly caught the still-empty
    // placeholder instead of the finished reply.
    const roomChannel = roomMessagesChannelRef.current;
    if (activeRoom && roomChannel) {
      void broadcastRoomMessage(roomChannel, userMessage);
      void broadcastRoomMessage(roomChannel, assistantMessage);
    }
  };

  const handleEdit = async (messageId: string, newContent: string) => {
    if (!id) return;
    await editAndBranch(id, messageId, newContent);
  };

  const lastAssistantMessage = [...activePath].reverse().find((m) => m.role === 'assistant');

  if (!id) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingBottom: androidKeyboardHeight }}
      className="flex-1 bg-bg-light dark:bg-bg-dark"
    >
      <AppHeader
        title={conversation?.title ?? 'Conversation'}
        onMenuPress={isWide ? undefined : openDrawer}
        right={
          <>
            {conversation?.is_temporary && (
              <View
                accessible
                accessibilityLabel="Temporary chat — not saved to history"
                className="flex-row items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/10"
              >
                <Ghost size={13} color="#71717A" strokeWidth={2} />
                {isWide && (
                  <Text className="text-xs text-ink-secondary-light dark:text-ink-secondary">Temporary</Text>
                )}
              </View>
            )}
            {isWide && <AIOrb active={isGenerating} size={32} />}
            {activeRoom && <RoomAvatarBubbles participants={roomParticipants} />}
            <Pressable
              onPress={() => setTreeVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="View conversation branches and versions"
              className="flex-row items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 active:opacity-70 dark:bg-white/10"
            >
              <GitBranch size={14} color="#71717A" strokeWidth={2} />
              {isWide && <Text className="text-sm text-ink-secondary-light dark:text-ink-secondary">Versions</Text>}
            </Pressable>
            {!activeRoom && !conversation?.is_temporary && (
              <Pressable
                onPress={handleShareRoom}
                accessibilityRole="button"
                accessibilityLabel="Share this conversation as a Live Room"
                className="flex-row items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 active:opacity-70 dark:bg-white/10"
              >
                <Link size={14} color="#71717A" strokeWidth={2} />
                {isWide && <Text className="text-sm text-ink-secondary-light dark:text-ink-secondary">Share Room</Text>}
              </Pressable>
            )}
            {activeRoom?.isHost && (
              <Pressable
                onPress={handleEndRoom}
                accessibilityRole="button"
                accessibilityLabel="End this Live Room for everyone"
                className="flex-row items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 active:opacity-70"
              >
                <XCircle size={14} color={color.semantic.danger} strokeWidth={2} />
                {isWide && <Text className="text-sm font-semibold text-red-500">End Room</Text>}
              </Pressable>
            )}
            {activeRoom && !activeRoom.isHost && (
              <Pressable
                onPress={handleLeaveRoom}
                accessibilityRole="button"
                accessibilityLabel="Leave this Live Room"
                className="flex-row items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 active:opacity-70 dark:bg-white/10"
              >
                <DoorOpen size={14} color="#71717A" strokeWidth={2} />
                {isWide && <Text className="text-sm text-ink-secondary-light dark:text-ink-secondary">Leave Room</Text>}
              </Pressable>
            )}
          </>
        }
      />

      <ShareRoomModal
        visible={shareModalVisible}
        url={shareUrl}
        loading={creatingRoom}
        error={shareError}
        onClose={() => setShareModalVisible(false)}
      />

      {messagesLoading && activePath.length === 0 ? (
        <View style={{ padding: 16, gap: 16 }}>
          <Skeleton height={44} width="60%" radius={16} />
          <Skeleton height={64} width="75%" radius={16} />
          <View style={{ alignItems: 'flex-end' }}>
            <Skeleton height={40} width="50%" radius={16} />
          </View>
        </View>
      ) : (
        <Animated.FlatList
          data={activePath}
          keyExtractor={(m: (typeof activePath)[number]) => m.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          renderItem={({ item, index }: { item: (typeof activePath)[number]; index: number }) => (
            <Animated.View entering={FadeInUp.springify().damping(16).stiffness(180)}>
              <MessageBubble
                conversationId={id}
                message={item}
                onEdit={item.role === 'user' ? handleEdit : undefined}
                streaming={isGenerating && index === activePath.length - 1 && item.role === 'assistant'}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center">
              <AIOrb active={false} />
              <Text className="mt-4 text-ink-muted-light dark:text-ink-muted">
                Say hello to start the conversation
              </Text>
            </View>
          }
        />
      )}

      <TypingIndicator devices={Object.values(typingDevices)} />

      <ChatInput
        conversationId={id}
        disabled={isGenerating}
        disabledReason={disabledReason}
        typingChannel={typingChannelRef.current}
        roomParticipant={activeRoom ? { name: activeRoom.myDisplayName, color: activeRoom.myColor } : null}
        onSend={handleSend}
        onOpenVoice={() => setVoiceVisible(true)}
      />

      <VoiceMode
        visible={voiceVisible}
        onClose={() => setVoiceVisible(false)}
        onTranscript={(text) => {
          setVoiceVisible(false);
          handleSend(text);
        }}
        speakText={
          lastAssistantMessage ? splitThinking(lastAssistantMessage.content).answer || undefined : undefined
        }
      />

      <BranchTreeModal visible={treeVisible} onClose={() => setTreeVisible(false)} conversationId={id} />
    </KeyboardAvoidingView>
  );
}
