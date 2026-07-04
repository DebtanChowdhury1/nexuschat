import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { HeroOrb } from '../landing/HeroOrb';

function timeOfDayGreeting(hour: number): { label: string; hueRotate: number } {
  if (hour < 5) return { label: 'Up late', hueRotate: 220 };
  if (hour < 12) return { label: 'Good morning', hueRotate: 0 };
  if (hour < 17) return { label: 'Good afternoon', hueRotate: -20 };
  if (hour < 21) return { label: 'Good evening', hueRotate: -40 };
  return { label: 'Good night', hueRotate: 220 };
}

/** Dashboard's greeting banner — a time-of-day-tinted orb (via CSS hue-rotate, not a shader rewrite) next to an animated headline. */
export function GreetingHeader({ name }: { name: string }) {
  const { label, hueRotate } = useMemo(() => timeOfDayGreeting(new Date().getHours()), []);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center gap-6 px-6 pb-4 pt-10" style={{ display: 'flex', flexDirection: 'row' }}>
      <div style={{ filter: `hue-rotate(${hueRotate}deg)`, flexShrink: 0 }}>
        <HeroOrb size={88} />
      </div>
      <div style={{ flex: 1 }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-ink-primary-light dark:text-ink-primary"
          style={{ fontSize: 30, fontWeight: 700, margin: 0 }}
        >
          {label}, {name}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-ink-secondary-light dark:text-ink-secondary"
          style={{ fontSize: 15, margin: '4px 0 0' }}
        >
          Here's where you left off.
        </motion.p>
      </div>
    </div>
  );
}
