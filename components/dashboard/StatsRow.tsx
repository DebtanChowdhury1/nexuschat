import { motion } from 'framer-motion';
import { MessageSquare, MessagesSquare, CalendarDays } from 'lucide-react-native';

import { CountUp } from './CountUp';
import { color } from '../../constants/theme';

interface Stat {
  key: string;
  label: string;
  value: number;
  Icon: typeof MessageSquare;
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const { label, value, Icon } = stat;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, boxShadow: `0 14px 34px -14px ${color.brand.DEFAULT}55` }}
      className="border-border-light bg-white dark:border-border dark:bg-surface"
      style={{ flex: '1 1 200px', borderRadius: 16, border: '1px solid', padding: 20, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14 }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}33, ${color.accent2.DEFAULT}33)`,
        }}
      >
        <Icon size={20} color={color.brand.DEFAULT} strokeWidth={2} />
      </div>
      <div>
        <p className="text-ink-primary-light dark:text-ink-primary" style={{ fontSize: 26, fontWeight: 700, margin: 0, lineHeight: '30px' }}>
          <CountUp value={value} />
        </p>
        <p className="text-ink-secondary-light dark:text-ink-secondary" style={{ fontSize: 13, margin: 0 }}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}

export function StatsRow({
  conversationCount,
  messageCount,
  daysActive,
  messageCountError,
}: {
  conversationCount: number;
  messageCount: number;
  daysActive: number;
  /** True if the message-count query failed — shown as a note rather than silently reading as "0 messages sent". */
  messageCountError?: boolean;
}) {
  const stats: Stat[] = [
    { key: 'conversations', label: 'Conversations', value: conversationCount, Icon: MessagesSquare },
    { key: 'messages', label: 'Messages sent', value: messageCount, Icon: MessageSquare },
    { key: 'days', label: 'Days active', value: daysActive, Icon: CalendarDays },
  ];

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-4">
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {stats.map((stat, i) => (
          <StatCard key={stat.key} stat={stat} index={i} />
        ))}
      </div>
      {messageCountError && (
        <p className="text-red-400" style={{ fontSize: 12, marginTop: 8 }}>
          Couldn't load your message count — try refreshing shortly.
        </p>
      )}
    </div>
  );
}
