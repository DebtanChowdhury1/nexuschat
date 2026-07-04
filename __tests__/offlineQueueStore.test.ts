import { useOfflineQueueStore } from '../store/offlineQueueStore';

describe('offlineQueueStore.markAttemptFailed', () => {
  beforeEach(() => {
    useOfflineQueueStore.setState({ queue: [] });
  });

  it('does not mark an item failed before exhausting retries', () => {
    const item = useOfflineQueueStore.getState().enqueue('conv-1', 'hello');
    useOfflineQueueStore.getState().markAttemptFailed(item.id);
    useOfflineQueueStore.getState().markAttemptFailed(item.id);

    const updated = useOfflineQueueStore.getState().queue.find((m) => m.id === item.id);
    expect(updated?.attempts).toBe(2);
    expect(updated?.failed).toBe(false);
  });

  it('marks an item failed once MAX_QUEUE_ATTEMPTS is reached, so it stops blocking the rest of the queue', () => {
    const item = useOfflineQueueStore.getState().enqueue('conv-1', 'a message that can never send');
    useOfflineQueueStore.getState().markAttemptFailed(item.id);
    useOfflineQueueStore.getState().markAttemptFailed(item.id);
    useOfflineQueueStore.getState().markAttemptFailed(item.id);

    const updated = useOfflineQueueStore.getState().queue.find((m) => m.id === item.id);
    expect(updated?.failed).toBe(true);
  });

  it('does not disturb other queued items', () => {
    const a = useOfflineQueueStore.getState().enqueue('conv-1', 'first');
    const b = useOfflineQueueStore.getState().enqueue('conv-1', 'second');
    useOfflineQueueStore.getState().markAttemptFailed(a.id);
    useOfflineQueueStore.getState().markAttemptFailed(a.id);
    useOfflineQueueStore.getState().markAttemptFailed(a.id);

    const bAfter = useOfflineQueueStore.getState().queue.find((m) => m.id === b.id);
    expect(bAfter?.attempts).toBe(0);
    expect(bAfter?.failed).toBe(false);
  });
});
