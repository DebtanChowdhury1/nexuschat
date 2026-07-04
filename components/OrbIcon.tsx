import { Platform, View } from 'react-native';

import { color } from '../constants/theme';

/**
 * Lightweight brand-mark dot — a flat gradient approximation of the orb for
 * places that need the logo/motif small and cheap (nav bar, inline step
 * markers). Not a WebGL/Skia canvas: mounting more than one real AIOrb per
 * screen risks WebGL context exhaustion (observed as an orb silently
 * rendering blank). The real animated orb is reserved for the hero and the
 * chat screen, where it's actually communicating AI state.
 *
 * Dressed up with a soft outer glow + a glassy highlight so it reads as a
 * polished mark rather than a plain flat circle, while staying a handful of
 * Views (no extra deps, no measurable cost next to the real 3D orb).
 */
export function OrbIcon({ size = 24 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        // Soft ambient glow behind the mark — web gets a real CSS glow;
        // native gets the platform-appropriate shadow API.
        ...Platform.select({
          web: { boxShadow: `0 0 ${size * 0.5}px ${color.brand.DEFAULT}55` } as object,
          default: {
            shadowColor: color.brand.DEFAULT,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.45,
            shadowRadius: size * 0.35,
          },
        }),
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: color.brand.DEFAULT,
          backgroundImage: `radial-gradient(circle at 35% 30%, ${color.brand.light}, ${color.brand.DEFAULT} 45%, ${color.accent2.DEFAULT} 100%)`,
        }}
      >
        {/* Glassy highlight — an offset, blurred-looking light patch near the top-left, like a light source catching a sphere. */}
        <View
          style={{
            position: 'absolute',
            top: size * 0.08,
            left: size * 0.14,
            width: size * 0.55,
            height: size * 0.4,
            borderRadius: size * 0.3,
            backgroundColor: 'rgba(255,255,255,0.35)',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.55), transparent 70%)',
          }}
        />
      </View>
    </View>
  );
}
