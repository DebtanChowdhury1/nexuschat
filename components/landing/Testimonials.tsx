import { motion } from 'framer-motion';

// Honest framing: this product hasn't launched publicly yet, so these are
// capability highlights, not fabricated customer quotes with invented
// names/photos — that would be a deceptive dark pattern on a real page.
const HIGHLIGHTS = [
  '"Never lose your place switching from phone to laptop mid-conversation."',
  '"If one AI provider stumbles, it just quietly falls back to the next — the conversation never stops."',
  '"Branch a conversation instead of losing your original train of thought."',
  '"Keep typing offline — it sends itself the second you\'re back online."',
  '"A temporary chat that actually disappears, on purpose."',
  '"Two devices, one live conversation — typing indicators and all."',
];

const LOOP = [...HIGHLIGHTS, ...HIGHLIGHTS];

export function Testimonials() {
  return (
    <div className="relative z-10 w-full overflow-hidden py-16">
      <p
        className="text-ink-primary-light dark:text-ink-primary"
        style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}
      >
        What NexusChat is built for
      </p>
      <div style={{ overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)' }}>
        <motion.div
          style={{ display: 'flex', flexDirection: 'row', gap: 16, width: 'max-content' }}
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        >
          {LOOP.map((quote, i) => (
            <div
              key={i}
              className="border-border-light bg-white dark:border-border dark:bg-surface"
              style={{ border: '1px solid', borderRadius: 14, padding: '16px 20px', minWidth: 300, maxWidth: 340 }}
            >
              <p className="text-ink-secondary-light dark:text-ink-secondary" style={{ fontSize: 14, lineHeight: '21px', margin: 0 }}>
                {quote}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
