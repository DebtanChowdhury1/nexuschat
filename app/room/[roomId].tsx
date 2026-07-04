import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { OrbIcon } from '../../components/OrbIcon';
import { getRoom, isRoomActive, joinRoom, signInAsGuest } from '../../lib/rooms';
import { usePageTitle } from '../../lib/usePageTitle';
import { useAuthStore } from '../../store/authStore';
import type { Room } from '../../types/db';

/**
 * Public join screen for a Live Room link — lives outside the (auth)/(app)
 * groups so it never gets redirected before the visitor has a chance to
 * join. Works whether the visitor already has a NexusChat session or not:
 * an anonymous guest session is created on the spot if needed.
 */
export default function JoinRoomScreen() {
  usePageTitle('Join room');
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const session = useAuthStore((s) => s.session);

  const [room, setRoom] = useState<Room | null | undefined>(undefined); // undefined = still checking
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    getRoom(roomId)
      .then(setRoom)
      .catch(() => setRoom(null));
  }, [roomId]);

  const handleJoin = async () => {
    if (!room || !roomId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name so the host knows who joined.');
      return;
    }
    setError(null);
    setJoining(true);
    try {
      const userId = session?.user.id ?? (await signInAsGuest());
      await joinRoom(roomId, userId, trimmed);
      router.replace(`/(app)/chat/${room.conversation_id}?room=${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join this room.');
      setJoining(false);
    }
  };

  if (room === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light dark:bg-bg-dark">
        <ActivityIndicator color="#FF5A36" />
      </View>
    );
  }

  if (!room || !isRoomActive(room)) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light px-6 dark:bg-bg-dark">
        <Text className="mb-2 text-xl font-bold text-ink-primary-light dark:text-ink-primary">
          This room link has expired
        </Text>
        <Text className="max-w-sm text-center text-ink-secondary-light dark:text-ink-secondary">
          Ask whoever shared it with you to start a new room from their conversation.
        </Text>
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Go to NexusChat"
          className="mt-6 items-center py-2"
        >
          <Text className="text-brand-light">Go to NexusChat</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-bg-light px-6 dark:bg-bg-dark">
      <OrbIcon size={40} />
      <Text className="mb-2 mt-4 text-2xl font-bold text-ink-primary-light dark:text-ink-primary">
        Join this conversation
      </Text>
      <Text className="mb-8 max-w-sm text-center text-ink-secondary-light dark:text-ink-secondary">
        You're about to join a live, shared NexusChat conversation. Everyone here talks to the same AI together.
      </Text>
      <View className="w-full max-w-sm gap-3">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#8888a0"
          autoCapitalize="words"
          maxLength={32}
          accessibilityLabel="Your name"
          className="rounded-xl border border-border-light bg-black/5 px-4 py-3 text-ink-primary-light dark:border-border dark:bg-white/10 dark:text-ink-primary"
        />
        {error && <Text className="text-red-400">{error}</Text>}
        <Pressable
          onPress={handleJoin}
          disabled={joining || !name.trim()}
          accessibilityRole="button"
          accessibilityLabel="Join room"
          className="mt-2 items-center rounded-xl bg-brand py-3 active:opacity-80 disabled:opacity-50"
        >
          {joining ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Join room</Text>}
        </Pressable>
        {!session && (
          <Text className="mt-1 text-center text-xs text-ink-muted-light dark:text-ink-muted">
            Joining as a guest — no account needed. Already have one? Log in first, then reopen this link.
          </Text>
        )}
      </View>
    </View>
  );
}
