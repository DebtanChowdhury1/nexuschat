import { motion } from 'framer-motion';
import { Zap } from 'lucide-react-native';

import { color } from '../../constants/theme';
import type { AIProvider } from '../../types/db';

// Internal routing order only — never rendered. NexusChat never names which
// backend actually answered, on the dashboard or anywhere else; this array
// exists purely to know how many fallback tiers to draw and which one is
// currently active.
const ROUTE_ORDER: AIProvider[] = ['groq', 'gemini', 'openrouter'];
const ROUTE_LABELS = ['Primary', 'Backup', 'Backup 2'];

/**
 * Honest status widget: we don't have a real uptime-monitoring backend, so
 * this shows the actual shape of the fallback chain — without naming any
 * third-party provider — rather than a fabricated "99.9% uptime" number.
 */
export function ModelStatusWidget({ lastProvider }: { lastProvider: AIProvider | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="border-border-light bg-white dark:border-border dark:bg-surface"
      style={{ borderRadius: 16, border: '1px solid', padding: 20 }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Zap size={16} color={color.brand.DEFAULT} />
        <p className="text-ink-primary-light dark:text-ink-primary" style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
          Model routing
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ROUTE_ORDER.map((provider, i) => {
          const isActive = provider === lastProvider;
          return (
            <div
              key={provider}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '6px 12px',
                fontSize: 12,
                border: isActive ? `1px solid ${color.brand.DEFAULT}` : '1px solid rgba(128,128,128,0.25)',
                color: isActive ? color.brand.DEFAULT : undefined,
              }}
              className={isActive ? undefined : 'text-ink-secondary-light dark:text-ink-secondary'}
            >
              <span style={{ fontSize: 10 }}>{i === 0 ? '①' : i === 1 ? '②' : '③'}</span>
              {ROUTE_LABELS[i]}
              {isActive && ' · active now'}
            </div>
          );
        })}
      </div>
      <p className="text-ink-muted-light dark:text-ink-muted" style={{ fontSize: 12, margin: '12px 0 0' }}>
        Every reply comes from NexusChat AI — automatic fallback keeps the conversation going if one route is unavailable.
      </p>
    </motion.div>
  );
}
