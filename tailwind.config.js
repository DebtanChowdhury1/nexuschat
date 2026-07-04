/** @type {import('tailwindcss').Config} */
// Values here must stay in sync with constants/theme.ts (the single source
// of truth for JS-side token usage, e.g. Skia/Three.js colors). Tailwind's
// config loads in plain Node without a TS transpile step, so the palette is
// duplicated here rather than imported directly — don't let them drift.
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // "Ember -> Nova": NexusChat's signature gradient (warm orange-red
        // to hot magenta) — deliberately not another purple/blue AI cliché.
        brand: {
          DEFAULT: '#FF5A36',
          dark: '#C23A1D',
          light: '#FF8F6B',
        },
        accent2: {
          DEFAULT: '#FF2D78',
          light: '#FF6FA8',
          dark: '#C11857',
        },
        surface: {
          DEFAULT: '#111114',
          elevated: '#1A1A1F',
          light: '#F7F7F8',
          'light-elevated': '#FFFFFF',
        },
        bg: {
          dark: '#08080B',
          light: '#FFFFFF',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.14)',
          light: 'rgba(0,0,0,0.08)',
          'light-strong': 'rgba(0,0,0,0.14)',
        },
        ink: {
          primary: '#F5F5F7',
          secondary: '#A1A1AA',
          muted: '#71717A',
          'primary-light': '#0A0A0C',
          'secondary-light': '#52525B',
          'muted-light': '#A1A1AA',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};
