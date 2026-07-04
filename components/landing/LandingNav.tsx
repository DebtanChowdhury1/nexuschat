import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { motion, AnimatePresence } from 'framer-motion';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Sun, Moon, Menu, X } from 'lucide-react-native';

import { OrbIcon } from '../OrbIcon';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { color } from '../../constants/theme';

export interface NavLink {
  label: string;
  onClick: () => void;
}

interface LandingNavProps {
  links: NavLink[];
}

/** Sticky glassmorphic nav that hides on scroll-down, reappears on scroll-up — now with a real menu linking to every section. */
export function LandingNav({ links }: LandingNavProps) {
  const { colorScheme } = useColorScheme();
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const session = useAuthStore((s) => s.session);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastY = useRef(0);
  const { width } = useWindowDimensions();
  const isNarrow = width < 860;
  const goToApp = () => router.push(session ? '/(app)/dashboard' : '/login');

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY.current && y > 80 && !menuOpen);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  const handleLinkClick = (link: NavLink) => {
    setMenuOpen(false);
    link.onClick();
  };

  return (
    <motion.div
      animate={{ y: hidden ? -90 : 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
      }}
      className="w-full border-b border-border-light bg-white/70 dark:border-border dark:bg-black/40"
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <OrbIcon size={28} />
          <span className="text-ink-primary-light dark:text-ink-primary" style={{ fontSize: 16, fontWeight: 600 }}>
            NexusChat
          </span>
        </div>

        {!isNarrow && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 28 }}>
            {links.map((link) => (
              <span
                key={link.label}
                onClick={link.onClick}
                className="text-ink-secondary-light dark:text-ink-secondary"
                style={{ fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
              >
                {link.label}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          {!isNarrow && !session && (
            <span
              onClick={() => router.push('/login')}
              className="text-ink-secondary-light dark:text-ink-secondary"
              style={{ fontSize: 14, cursor: 'pointer' }}
            >
              Log in
            </span>
          )}
          <motion.button
            onClick={() => setThemePreference(colorScheme === 'dark' ? 'light' : 'dark')}
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'row' }}
          >
            {colorScheme === 'dark' ? <Sun size={18} color={color.brand.light} /> : <Moon size={18} color={color.brand.DEFAULT} />}
          </motion.button>
          {!isNarrow && (
            <motion.button
              onClick={goToApp}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
              }}
            >
              {session ? 'Dashboard' : 'Sign up'}
            </motion.button>
          )}
          {isNarrow && (
            <motion.button
              onClick={() => setMenuOpen((v) => !v)}
              whileTap={{ scale: 0.9 }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'row' }}
            >
              {menuOpen ? <X size={22} color={color.brand.DEFAULT} /> : <Menu size={22} color={color.brand.DEFAULT} />}
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isNarrow && menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
            className="border-t border-border-light dark:border-border"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 24px' }}>
              {links.map((link) => (
                <span
                  key={link.label}
                  onClick={() => handleLinkClick(link)}
                  className="text-ink-primary-light dark:text-ink-primary"
                  style={{ fontSize: 15, fontWeight: 500, cursor: 'pointer', padding: '10px 0' }}
                >
                  {link.label}
                </span>
              ))}
              {!session && (
                <span
                  onClick={() => router.push('/login')}
                  className="text-ink-primary-light dark:text-ink-primary"
                  style={{ fontSize: 15, fontWeight: 500, cursor: 'pointer', padding: '10px 0' }}
                >
                  Log in
                </span>
              )}
              <motion.button
                onClick={goToApp}
                whileTap={{ scale: 0.97 }}
                style={{
                  marginTop: 8,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 10,
                  padding: '12px 18px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
                }}
              >
                {session ? 'Dashboard' : 'Sign up'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
