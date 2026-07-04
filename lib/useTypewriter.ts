import { useEffect, useRef, useState } from 'react';

/**
 * Reveals `text` progressively instead of dumping the whole buffer the
 * instant it updates. Groq in particular streams so fast that raw
 * token-by-token DOM updates still look like the whole reply appeared at
 * once for anything short — this decouples the visible reveal pace from
 * actual network/token arrival speed, closer to ChatGPT's feel. Automatically
 * catches up if `text` grows faster than the reveal rate, so it never
 * permanently lags behind, and jumps to full length instantly once `active`
 * goes false (a historical message loaded from the DB must never replay
 * the typewriter on every re-render).
 */
export function useTypewriter(text: string, active: boolean): string {
  const [revealed, setRevealed] = useState(() => (active ? 0 : text.length));
  const wasActive = useRef(active);

  useEffect(() => {
    // A fresh streaming session starting (inactive -> active) restarts the
    // reveal from zero rather than carrying over stale progress.
    if (active && !wasActive.current) setRevealed(0);
    if (!active) setRevealed(text.length);
    wasActive.current = active;
  }, [active, text.length]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setRevealed((prev) => (prev < text.length ? Math.min(text.length, prev + 3) : prev));
    }, 20);
    return () => clearInterval(id);
  }, [active, text.length]);

  return text.slice(0, revealed);
}
