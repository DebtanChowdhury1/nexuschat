import { motion } from 'framer-motion';
import { Users2, Link2 } from 'lucide-react-native';

import { color } from '../../constants/theme';

function DeviceCard({ name, message, align }: { name: string; message: string; align: 'left' | 'right' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: align === 'left' ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="border-border-light bg-white dark:border-border dark:bg-surface"
      style={{ borderRadius: 18, border: '1px solid', padding: 20, width: 260 }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
          }}
        />
        <span className="text-ink-primary-light dark:text-ink-primary" style={{ fontSize: 13, fontWeight: 600 }}>
          {name}
        </span>
      </div>
      <div
        className="bg-black/[0.04] dark:bg-white/5"
        style={{ borderRadius: 12, padding: '10px 14px', fontSize: 13.5 }}
      >
        <span className="text-ink-secondary-light dark:text-ink-secondary">{message}</span>
      </div>
    </motion.div>
  );
}

function ConnectionBeam() {
  return (
    <svg width="120" height="4" style={{ overflow: 'visible', margin: '0 12px' }}>
      <motion.line
        x1="0"
        y1="2"
        x2="120"
        y2="2"
        stroke={color.brand.DEFAULT}
        strokeWidth="2"
        strokeDasharray="6 6"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: -24 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

/** Landing-page showcase for the Live Collaborative AI Room feature. */
export function RoomsShowcase() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-ink-primary-light dark:text-ink-primary"
        style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', margin: '0 0 8px' }}
      >
        Bring someone into the conversation
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-ink-secondary-light dark:text-ink-secondary"
        style={{ fontSize: 15, textAlign: 'center', maxWidth: 560, margin: '0 auto 40px' }}
      >
        Share a link — no account required — and talk to the same AI together, live. See who's typing, watch replies land for both of you instantly.
      </motion.p>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 44 }}>
        <DeviceCard name="You" message="Should we go with the blue or the orange palette?" align="left" />
        <ConnectionBeam />
        <DeviceCard name="Guest · Priya" message="Orange, definitely — it feels warmer." align="right" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 280 }}>
          <Link2 size={18} color={color.brand.DEFAULT} />
          <span className="text-ink-secondary-light dark:text-ink-secondary" style={{ fontSize: 13.5 }}>
            One link, no signup — guests join in seconds
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 280 }}>
          <Users2 size={18} color={color.brand.DEFAULT} />
          <span className="text-ink-secondary-light dark:text-ink-secondary" style={{ fontSize: 13.5 }}>
            See exactly who's present, live, with colored avatars
          </span>
        </div>
      </div>
    </div>
  );
}
