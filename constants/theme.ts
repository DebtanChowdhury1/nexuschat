/**
 * Single source of truth for design tokens. Consumed by tailwind.config.js
 * (so NativeWind classes stay in sync) and importable directly wherever a
 * component needs a raw value NativeWind can't reach — Skia/Three.js colors,
 * SVG fills, etc. Don't hardcode hex values in components; add a token here.
 */

// "Ember → Nova": a warm orange-red shifting to hot magenta. Deliberately
// not another purple/blue AI-brand cliché — this is NexusChat's signature
// gradient, used for the orb, primary actions, and accents everywhere.
export const color = {
  brand: {
    DEFAULT: '#FF5A36',
    light: '#FF8F6B',
    dark: '#C23A1D',
  },
  // Second gradient stop — paired with brand for the orb/hero gradient and
  // anywhere two-tone brand emphasis is needed.
  accent2: {
    DEFAULT: '#FF2D78',
    light: '#FF6FA8',
    dark: '#C11857',
  },
  dark: {
    bg: '#08080B',
    surface: '#111114',
    elevated: '#1A1A1F',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.14)',
    textPrimary: '#F5F5F7',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
  },
  light: {
    bg: '#FFFFFF',
    surface: '#F7F7F8',
    elevated: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.14)',
    textPrimary: '#0A0A0C',
    textSecondary: '#52525B',
    textMuted: '#A1A1AA',
  },
  semantic: {
    danger: '#E24B4A',
    success: '#63A93B',
    warning: '#EF9F27',
  },
} as const;

export const orbGradient = [color.brand.light, color.brand.DEFAULT, color.accent2.DEFAULT] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;
