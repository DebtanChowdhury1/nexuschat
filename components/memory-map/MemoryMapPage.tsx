import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { motion, AnimatePresence } from 'framer-motion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, MessageSquare } from 'lucide-react-native';

import { GalaxyScene } from './GalaxyScene';
import { buildMemoryMap, type MemoryMapData, type MemoryNode } from '../../lib/memoryMap';
import { color } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

const ONBOARDING_KEY = 'nexuschat.memoryMapOnboarded';

export function MemoryMapPage() {
  const session = useAuthStore((s) => s.session);
  const [data, setData] = useState<MemoryMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemoryNode | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    buildMemoryMap(session.user.id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [session?.user.id]);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((seen) => {
      if (!seen) setShowOnboarding(true);
    });
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    void AsyncStorage.setItem(ONBOARDING_KEY, '1');
  };

  return (
    <div className="bg-bg-light dark:bg-bg-dark" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div
        className="relative z-10 text-ink-primary-light dark:text-ink-primary"
        style={{ position: 'absolute', top: 20, left: 24, pointerEvents: 'none' }}
      >
        <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Memory Map</p>
        <p className="text-ink-secondary-light dark:text-ink-secondary" style={{ fontSize: 13, margin: '4px 0 0' }}>
          Every conversation you've had, clustered by topic.
        </p>
      </div>

      {loading ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-ink-muted-light dark:text-ink-muted" style={{ fontSize: 14 }}>
            Mapping your conversations…
          </p>
        </div>
      ) : !data || data.nodes.length === 0 ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-ink-muted-light dark:text-ink-muted" style={{ fontSize: 14 }}>
            Start a few conversations and they'll show up here as stars.
          </p>
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0 }}>
          <GalaxyScene
            nodes={data.nodes}
            clusters={data.clusters}
            selectedId={selected?.conversation.id ?? null}
            focusPosition={selected?.position ?? null}
            onSelectNode={setSelected}
          />
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="border-border-light bg-white dark:border-border dark:bg-surface"
            style={{
              position: 'absolute',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(90vw, 380px)',
              borderRadius: 16,
              border: '1px solid',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={15} color={color.brand.DEFAULT} />
                <p
                  className="text-ink-primary-light dark:text-ink-primary"
                  style={{ fontSize: 14, fontWeight: 600, margin: 0, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {selected.conversation.title}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                aria-label="Close"
              >
                <X size={16} color={color.brand.DEFAULT} />
              </button>
            </div>
            <p className="text-ink-muted-light dark:text-ink-muted" style={{ fontSize: 12, margin: '10px 0 14px' }}>
              Last active {new Date(selected.conversation.updated_at).toLocaleDateString()}
            </p>
            <button
              onClick={() => router.push(`/(app)/chat/${selected.conversation.id}`)}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 10,
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: 13.5,
                color: '#fff',
                backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
              }}
            >
              Jump to Chat
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 20 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-surface"
              style={{ borderRadius: 16, padding: 24, maxWidth: 360, textAlign: 'center' }}
            >
              <p className="text-ink-primary-light dark:text-ink-primary" style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>
                Welcome to your Memory Map
              </p>
              <p className="text-ink-secondary-light dark:text-ink-secondary" style={{ fontSize: 13.5, lineHeight: '20px', margin: '0 0 18px' }}>
                Every star is a conversation. Similar topics cluster together — drag to rotate, scroll to zoom, and click a star to jump back into it.
              </p>
              <button
                onClick={dismissOnboarding}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: '#fff',
                  backgroundImage: `linear-gradient(135deg, ${color.brand.DEFAULT}, ${color.accent2.DEFAULT})`,
                }}
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
