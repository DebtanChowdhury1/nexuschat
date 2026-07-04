import { motion } from 'framer-motion';
import * as Linking from 'expo-linking';

import { color } from '../../constants/theme';

const LINKS = [
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'Privacy', url: 'https://example.com/privacy' },
  { label: 'Terms', url: 'https://example.com/terms' },
];

function FooterLink({ label, url }: { label: string; url: string }) {
  return (
    <motion.span
      onClick={() => Linking.openURL(url)}
      initial="rest"
      whileHover="hover"
      className="text-ink-muted-light dark:text-ink-muted"
      style={{ fontSize: 13, cursor: 'pointer', position: 'relative', display: 'inline-block' }}
    >
      {label}
      <motion.span
        variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -2,
          height: 1,
          transformOrigin: 'left',
          backgroundImage: `linear-gradient(90deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
        }}
      />
    </motion.span>
  );
}

export function LandingFooter() {
  return (
    <div className="relative z-10 border-t border-border-light px-6 py-8 dark:border-border">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <span className="text-ink-muted-light dark:text-ink-muted" style={{ fontSize: 12 }}>
          © 2026 NexusChat
        </span>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 24 }}>
          {LINKS.map((link) => (
            <FooterLink key={link.label} {...link} />
          ))}
        </div>
      </div>
    </div>
  );
}
