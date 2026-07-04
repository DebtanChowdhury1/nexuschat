import { motion } from 'framer-motion';
import { Radio, ShieldCheck, GitBranch, Mic, CloudOff, Ghost, Users2, Orbit } from 'lucide-react-native';

import { color } from '../../constants/theme';

// The three features that get a dedicated scroll-driven showcase further
// down the page (PipelineDemo, RoomsShowcase, MemoryMapShowcase respectively)
// are pulled out here as "hero" cards so the grid previews what's coming
// instead of flattening every feature — including ones with no deep-dive at
// all — into one undifferentiated wall of 8 identical boxes.
const HERO_FEATURES = [
  {
    key: 'mirror',
    title: 'Mirror Mode',
    description: 'One conversation, driven live from two devices at once — with typing indicators, not just synced history.',
    Icon: Radio,
  },
  {
    key: 'room',
    title: 'Live Collaborative Room',
    description: 'Invite someone into your conversation with a link — you both talk to the same AI, together, in real time.',
    Icon: Users2,
  },
  {
    key: 'memory-map',
    title: 'Conversation DNA',
    description: 'A living 3D galaxy of every conversation you\'ve had, clustered by topic — watch your own knowledge map grow.',
    Icon: Orbit,
  },
];

const SECONDARY_FEATURES = [
  {
    key: 'model',
    title: 'Always-on reliability',
    description: 'If one AI provider is slow or unavailable, NexusChat automatically falls back to the next.',
    Icon: ShieldCheck,
  },
  {
    key: 'branch',
    title: 'Conversation branching',
    description: 'Edit any past message and branch from it — the original stays reachable, like Git for chat.',
    Icon: GitBranch,
  },
  {
    key: 'voice',
    title: 'Voice mode',
    description: 'Talk instead of type, with a reactive avatar that visibly responds to your voice.',
    Icon: Mic,
  },
  {
    key: 'offline',
    title: 'Offline draft queue',
    description: 'Lose connectivity mid-thought? Keep typing — it sends itself the moment you reconnect.',
    Icon: CloudOff,
  },
  {
    key: 'ghost',
    title: 'Ghost mode',
    description: 'Temporary chats that never touch your history — gone the moment you leave, on purpose.',
    Icon: Ghost,
  },
];

function HeroFeatureCard({ title, description, Icon, index }: { title: string; description: string; Icon: typeof Radio; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, boxShadow: `0 20px 48px -14px ${color.brand.DEFAULT}66` }}
      className="border-border-light bg-white dark:border-border dark:bg-surface"
      style={{
        flex: '1 1 300px',
        minWidth: 280,
        borderRadius: 20,
        border: `1.5px solid ${color.brand.DEFAULT}55`,
        padding: 28,
        cursor: 'default',
        backgroundImage: `linear-gradient(160deg, ${color.brand.DEFAULT}14, transparent 60%)`,
      }}
    >
      <motion.div
        whileHover={{ scale: 1.12, rotate: 6 }}
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
          backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
        }}
      >
        <Icon size={26} color="#fff" strokeWidth={2} />
      </motion.div>
      <p className="text-ink-primary-light dark:text-ink-primary" style={{ fontWeight: 700, fontSize: 19, margin: '0 0 8px' }}>
        {title}
      </p>
      <p className="text-ink-secondary-light dark:text-ink-secondary" style={{ fontSize: 14.5, lineHeight: '22px', margin: 0 }}>
        {description}
      </p>
    </motion.div>
  );
}

function SecondaryFeatureCard({ title, description, Icon, index }: { title: string; description: string; Icon: typeof Radio; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay: (index % 3) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="border-border-light bg-white dark:border-border dark:bg-surface"
      style={{
        flex: '1 1 220px',
        minWidth: 220,
        borderRadius: 14,
        border: '1px solid',
        padding: 18,
        cursor: 'default',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}22, ${color.accent2.DEFAULT}22)`,
        }}
      >
        <Icon size={17} color={color.brand.DEFAULT} strokeWidth={2} />
      </div>
      <p className="text-ink-primary-light dark:text-ink-primary" style={{ fontWeight: 600, fontSize: 14.5, margin: '0 0 4px' }}>
        {title}
      </p>
      <p className="text-ink-secondary-light dark:text-ink-secondary" style={{ fontSize: 13, lineHeight: '19px', margin: 0 }}>
        {description}
      </p>
    </motion.div>
  );
}

export function FeatureGrid() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-ink-primary-light dark:text-ink-primary"
        style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}
      >
        Not just another chat template
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-ink-secondary-light dark:text-ink-secondary"
        style={{ fontSize: 15, textAlign: 'center', marginBottom: 40 }}
      >
        Three things you won&apos;t find in a template — see them in action below.
      </motion.p>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 20 }}>
        {HERO_FEATURES.map(({ key, ...feature }, i) => (
          <HeroFeatureCard key={key} index={i} {...feature} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {SECONDARY_FEATURES.map(({ key, ...feature }, i) => (
          <SecondaryFeatureCard key={key} index={i} {...feature} />
        ))}
      </div>
    </div>
  );
}
