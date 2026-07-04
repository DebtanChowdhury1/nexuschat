import { useWindowDimensions } from 'react-native';
import { motion, type Variants } from 'framer-motion';
import { router } from 'expo-router';
import { ArrowRight, PlayCircle } from 'lucide-react-native';

import { HeroOrb } from './HeroOrb';
import { color } from '../../constants/theme';

const HEADLINE_WORDS = ['The', 'AI', 'chat', 'that', 'lives', 'on', 'every', 'device'];
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const word: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};

export function Hero({ onSeeHowItWorks }: { onSeeHowItWorks: () => void }) {
  const { width } = useWindowDimensions();
  const stacked = width < 860;

  return (
    <div
      className="relative z-10 mx-auto flex w-full max-w-6xl items-center gap-8 px-6 py-24"
      style={{ flexDirection: stacked ? 'column-reverse' : 'row' }}
    >
      <div style={{ flex: 1, textAlign: stacked ? 'center' : 'left' }}>
        <motion.h1
          variants={container}
          initial="hidden"
          animate="show"
          className="font-bold text-ink-primary-light dark:text-ink-primary"
          style={{
            fontSize: stacked ? 36 : 52,
            lineHeight: stacked ? '44px' : '60px',
            margin: 0,
            justifyContent: stacked ? 'center' : 'flex-start',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '0 0.35em',
          }}
        >
          {HEADLINE_WORDS.map((w, i) => (
            <motion.span
              key={i}
              variants={word}
              style={
                i >= 4
                  ? {
                      backgroundImage: `linear-gradient(90deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }
                  : undefined
              }
            >
              {w}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mx-auto text-ink-secondary-light dark:text-ink-secondary"
          style={{ fontSize: 17, lineHeight: '26px', maxWidth: 460, marginTop: 20, marginLeft: stacked ? 'auto' : 0, marginRight: stacked ? 'auto' : 0 }}
        >
          Start a conversation on your phone, keep typing on the web — live, synced, and fully transparent about which AI answered.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          style={{ display: 'flex', flexDirection: 'row', gap: 12, marginTop: 32, justifyContent: stacked ? 'center' : 'flex-start' }}
        >
          <motion.button
            onClick={() => router.push('/login')}
            whileHover={{ scale: 1.04, boxShadow: `0 0 28px ${color.brand.DEFAULT}66` }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              cursor: 'pointer',
              borderRadius: 12,
              padding: '14px 24px',
              fontWeight: 600,
              fontSize: 14,
              color: '#fff',
              backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
            }}
          >
            Get started free <ArrowRight size={16} color="#fff" />
          </motion.button>
          <motion.button
            onClick={onSeeHowItWorks}
            whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.06)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              borderRadius: 12,
              padding: '14px 24px',
              fontWeight: 600,
              fontSize: 14,
              background: 'transparent',
              border: '1px solid rgba(128,128,128,0.3)',
            }}
            className="text-ink-primary-light dark:text-ink-primary"
          >
            <PlayCircle size={16} /> See how it works
          </motion.button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ flex: stacked ? undefined : 1, display: 'flex', flexDirection: 'row', justifyContent: 'center' }}
      >
        <HeroOrb size={stacked ? 240 : 380} />
      </motion.div>
    </div>
  );
}
