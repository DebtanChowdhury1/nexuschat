import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { router } from 'expo-router';
import { MessageCircle, Pin } from 'lucide-react-native';

import { color } from '../../constants/theme';
import type { Conversation } from '../../types/db';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function TiltCard({ conversation, index }: { conversation: Conversation; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => router.push(`/(app)/chat/${conversation.id}`)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX, rotateY, transformPerspective: 800, flex: '1 1 260px', minWidth: 240, cursor: 'pointer' }}
      className="border-border-light bg-white dark:border-border dark:bg-surface"
      whileHover={{ boxShadow: `0 20px 44px -18px ${color.brand.DEFAULT}66` }}
    >
      <div style={{ borderRadius: 16, border: '1px solid transparent', padding: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}33, ${color.accent2.DEFAULT}33)`,
            }}
          >
            <MessageCircle size={15} color={color.brand.DEFAULT} />
          </div>
          {conversation.is_pinned && <Pin size={13} color={color.accent2.DEFAULT} />}
        </div>
        <p
          className="text-ink-primary-light dark:text-ink-primary"
          style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {conversation.title}
        </p>
        <p className="text-ink-muted-light dark:text-ink-muted" style={{ fontSize: 12, margin: 0 }}>
          {timeAgo(conversation.updated_at)}
        </p>
      </div>
    </motion.div>
  );
}

export function RecentConversations({ conversations }: { conversations: Conversation[] }) {
  if (conversations.length === 0) return null;

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6">
      <p className="text-ink-primary-light dark:text-ink-primary" style={{ fontSize: 16, fontWeight: 600, margin: '0 0 14px' }}>
        Recent conversations
      </p>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {conversations.slice(0, 6).map((c, i) => (
          <TiltCard key={c.id} conversation={c} index={i} />
        ))}
      </div>
    </div>
  );
}
