import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_QUEUE_ATTEMPTS = 3;

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  queuedAt: string;
  attempts: number;
  /**
   * Set once retries are exhausted (e.g. the conversation or its parent
   * message was deleted while offline, so every retry fails identically).
   * Previously a single permanently-failing item would `break` the drain
   * loop and silently block every other queued message behind it forever,
   * with no way for the user to see why or discard it — see ChatInput's
   * drain effect and the "queued" banner.
   */
  failed: boolean;
}

interface OfflineQueueState {
  queue: QueuedMessage[];
  enqueue: (conversationId: string, content: string) => QueuedMessage;
  dequeue: (id: string) => void;
  /** Records a failed send attempt; marks the item `failed` once MAX_QUEUE_ATTEMPTS is exhausted rather than retrying it forever. */
  markAttemptFailed: (id: string) => void;
}

/**
 * Persisted so drafts survive an app kill while offline — the whole point
 * of the feature is "type now, it sends itself once you're back online."
 */
export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      enqueue: (conversationId, content) => {
        const item: QueuedMessage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conversationId,
          content,
          queuedAt: new Date().toISOString(),
          attempts: 0,
          failed: false,
        };
        set({ queue: [...get().queue, item] });
        return item;
      },
      dequeue: (id) => set({ queue: get().queue.filter((m) => m.id !== id) }),
      markAttemptFailed: (id) =>
        set({
          queue: get().queue.map((m) => {
            if (m.id !== id) return m;
            // `?? 0` covers items persisted before this field existed.
            const attempts = (m.attempts ?? 0) + 1;
            return { ...m, attempts, failed: attempts >= MAX_QUEUE_ATTEMPTS };
          }),
        }),
    }),
    {
      name: 'nexuschat.offline_queue',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
