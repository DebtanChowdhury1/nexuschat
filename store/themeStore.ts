import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  /** The user's stored preference — may be 'system', unlike the resolved scheme. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Only persists the user's chosen preference. The actual light/dark
 * resolution (including live system-theme changes) is delegated entirely to
 * nativewind's `colorScheme`, which every component should read via
 * `useColorScheme()` from 'nativewind' so it re-renders on system changes —
 * not from this store.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'dark',
      setPreference: (preference) => {
        colorScheme.set(preference);
        set({ preference });
      },
    }),
    {
      name: 'nexuschat.theme',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) colorScheme.set(state.preference);
      },
    }
  )
);
