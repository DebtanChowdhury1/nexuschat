import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_MAX_WIDTH = 420;
export const SIDEBAR_DEFAULT_WIDTH = 280;

interface UiState {
  sidebarWidth: number;
  chatInputFocused: boolean;
  setSidebarWidth: (width: number) => void;
  setChatInputFocused: (focused: boolean) => void;
}

/** Persists the web sidebar's user-resized width across sessions. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      chatInputFocused: false,
      setSidebarWidth: (width) =>
        set({ sidebarWidth: Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width)) }),
      setChatInputFocused: (chatInputFocused) => set({ chatInputFocused }),
    }),
    {
      name: 'nexuschat.ui',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ sidebarWidth: state.sidebarWidth }),
    }
  )
);
