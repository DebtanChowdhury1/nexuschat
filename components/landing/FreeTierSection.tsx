import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react-native';
import { router } from 'expo-router';

import { color } from '../../constants/theme';

const CATEGORIES = {
  core: ['Unlimited conversations', 'Streaming replies with automatic fallback', 'Cross-device sync via Mirror Mode', 'Conversation branching'],
  advanced: ['Voice mode', 'Offline draft queue', 'Ghost mode (temporary chats)', 'Full data export, anytime'],
};

export function FreeTierSection() {
  const [tab, setTab] = useState<'core' | 'advanced'>('core');

  return (
    <div className="relative z-10 mx-auto w-full max-w-3xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="border-border-light bg-white dark:border-border dark:bg-surface"
        style={{ borderRadius: 24, border: '1px solid', padding: 40, textAlign: 'center' }}
      >
        <p className="text-ink-primary-light dark:text-ink-primary" style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>
          Free. Actually free.
        </p>
        <p className="text-ink-secondary-light dark:text-ink-secondary" style={{ fontSize: 15, margin: '10px 0 28px' }}>
          Built entirely on free tiers — no credit card, no trial countdown.
        </p>

        <div
          style={{
            display: 'inline-flex',
            padding: 4,
            borderRadius: 10,
            background: 'rgba(128,128,128,0.12)',
            marginBottom: 24,
          }}
        >
          {(['core', 'advanced'] as const).map((key) => (
            <motion.button
              key={key}
              onClick={() => setTab(key)}
              style={{
                position: 'relative',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                background: 'transparent',
                color: tab === key ? '#fff' : undefined,
              }}
              className={tab === key ? '' : 'text-ink-secondary-light dark:text-ink-secondary'}
            >
              {tab === key && (
                <motion.div
                  layoutId="tierTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 8,
                    backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
                  }}
                />
              )}
              <span style={{ position: 'relative' }}>{key === 'core' ? 'Core' : 'Advanced'}</span>
            </motion.button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, textAlign: 'left' }}>
          {CATEGORIES[tab].map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Check size={16} color={color.brand.DEFAULT} />
              <span className="text-ink-primary-light dark:text-ink-primary" style={{ fontSize: 14 }}>
                {item}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.button
          onClick={() => router.push('/login')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            marginTop: 32,
            border: 'none',
            cursor: 'pointer',
            borderRadius: 12,
            padding: '14px 28px',
            fontWeight: 600,
            fontSize: 14,
            color: '#fff',
            backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
          }}
        >
          Get started free
        </motion.button>
      </motion.div>
    </div>
  );
}
