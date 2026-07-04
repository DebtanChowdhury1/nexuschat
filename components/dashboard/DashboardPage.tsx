import { useEffect, useMemo, useState } from 'react';

import { AmbientBackground } from '../landing/AmbientBackground';
import { GreetingHeader } from './GreetingHeader';
import { ModelStatusWidget } from './ModelStatusWidget';
import { QuickActions } from './QuickActions';
import { RecentConversations } from './RecentConversations';
import { StatsRow } from './StatsRow';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

/** Web-only cinematic dashboard — greeting, live stats, recent conversations, quick actions, model routing status. */
export function DashboardPage() {
  const session = useAuthStore((s) => s.session);
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const activeProvider = useChatStore((s) => s.activeProvider);
  const [messageCount, setMessageCount] = useState(0);
  const [displayName, setDisplayName] = useState(() => session?.user.email?.split('@')[0] ?? 'there');
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    if (session?.user.id) loadConversations(session.user.id);
  }, [session?.user.id, loadConversations]);

  useEffect(() => {
    if (!session?.user.id) return;
    // Supabase's query builder returns a PromiseLike, not a real Promise —
    // .then() on it doesn't type-check a chained .catch(), so wrap it in a
    // real Promise first.
    Promise.resolve(
      supabase.from('profiles').select('display_name').eq('user_id', session.user.id).single()
    )
      .then(({ data }) => {
        const name = data?.display_name || session.user.email?.split('@')[0];
        if (name) setDisplayName(name);
      })
      .catch(() => {
        // Non-critical — the email-derived fallback name already covers this.
      });
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) return;
    setStatsError(false);
    Promise.resolve(
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('role', 'user')
    )
      .then(({ count, error }) => {
        if (error) throw error;
        setMessageCount(count ?? 0);
      })
      .catch(() => {
        // Previously silent — a network blip or RLS denial would leave the
        // stat frozen at 0 with no indication anything went wrong.
        setStatsError(true);
      });
  }, [session?.user.id]);

  const daysActive = useMemo(() => {
    const days = new Set(conversations.map((c) => c.created_at.slice(0, 10)));
    return days.size;
  }, [conversations]);

  return (
    <div className="bg-bg-light dark:bg-bg-dark" style={{ position: 'relative', height: '100%', overflowY: 'auto' }}>
      <AmbientBackground />
      <GreetingHeader name={displayName} />
      <StatsRow
        conversationCount={conversations.length}
        messageCount={messageCount}
        daysActive={daysActive}
        messageCountError={statsError}
      />
      <QuickActions />
      <RecentConversations conversations={conversations} />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-4">
        <ModelStatusWidget lastProvider={activeProvider} />
      </div>
    </div>
  );
}
