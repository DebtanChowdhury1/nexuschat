import { motion } from 'framer-motion';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

import { HeroOrb } from './HeroOrb';
import { color } from '../../constants/theme';
import { useInView } from '../../lib/useInView';

export function ClosingCta() {
  const [orbRef, orbHasBeenInView, orbIsCurrentlyInView] = useInView<HTMLDivElement>();

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-28 text-center">
      <motion.div
        ref={orbRef}
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        style={{ marginBottom: 24, width: 160, height: 160 }}
      >
        {orbHasBeenInView && <HeroOrb size={160} active={orbIsCurrentlyInView} />}
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-ink-primary-light dark:text-ink-primary"
        style={{ fontSize: 30, fontWeight: 700, maxWidth: 520, margin: 0 }}
      >
        Your next conversation is waiting on every device.
      </motion.p>
      <motion.button
        onClick={() => router.push('/login')}
        whileHover={{ scale: 1.05, boxShadow: `0 0 32px ${color.brand.DEFAULT}77` }}
        whileTap={{ scale: 0.96 }}
        style={{
          marginTop: 32,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          border: 'none',
          cursor: 'pointer',
          borderRadius: 14,
          padding: '16px 32px',
          fontWeight: 600,
          fontSize: 15,
          color: '#fff',
          backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
        }}
      >
        Get started free <ArrowRight size={17} color="#fff" />
      </motion.button>
    </div>
  );
}
