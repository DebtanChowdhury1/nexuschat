import { useEffect, useRef, useState } from 'react';

/**
 * Tracks viewport intersection for a ref'd element, returning two related
 * but different signals:
 *
 * - `hasBeenInView`: sticky — flips true once and stays true. For gating a
 *   one-time mount (e.g. constructing a WebGL canvas) so it doesn't happen
 *   before the section is ever scrolled near.
 * - `isCurrentlyInView`: live — toggles true/false as the element scrolls
 *   in and out. For pausing ongoing work (an R3F render loop) once it's
 *   already mounted but scrolled off-screen.
 *
 * Both exist because the landing page renders its whole section tree
 * eagerly (one long always-mounted page, not route-based), so every 3D
 * canvas on it — background, hero orb, pipeline, memory map, closing CTA —
 * would otherwise all acquire a WebGL context AND keep rendering every
 * frame simultaneously regardless of scroll position. Browsers cap
 * simultaneous WebGL contexts (silently losing the oldest, which paints
 * solid black — see OrbIcon.tsx's comment for a prior instance of this
 * exact failure), and even short of that limit, five permanently-running
 * render loops is real, continuous GPU/CPU cost that shows up as page-wide
 * jank on less powerful hardware — which reads to a user as "the page
 * froze," even though nothing is actually deadlocked.
 */
export function useInView<T extends HTMLElement>(
  margin = '200px'
): [React.RefObject<T | null>, boolean, boolean] {
  const ref = useRef<T | null>(null);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const [isCurrentlyInView, setIsCurrentlyInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCurrentlyInView(entry.isIntersecting);
        if (entry.isIntersecting) setHasBeenInView(true);
      },
      { rootMargin: margin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [margin]);

  return [ref, hasBeenInView, isCurrentlyInView];
}
