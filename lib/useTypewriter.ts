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
  const revealMode = useRef(active);

  useEffect(() => {
    if (active && !revealMode.current) {
      revealMode.current = true;
      setRevealed(0);
      return;
    }

    // Historical messages mount inactive and should render immediately.
    // A message that just finished streaming stays in reveal mode until the
    // visible text catches up, avoiding a sudden full-answer dump.
    if (!active && !revealMode.current) {
      setRevealed(text.length);
    }
  }, [active, text.length]);

  useEffect(() => {
    if (!active && !revealMode.current) return;
    const id = setInterval(() => {
      setRevealed((prev) => {
        if (prev >= text.length) {
          if (!active) revealMode.current = false;
          return prev;
        }
        return Math.min(text.length, prev + 2);
      });
    }, 28);
    return () => clearInterval(id);
  }, [active, text.length]);

  return text.slice(0, revealed);
}
