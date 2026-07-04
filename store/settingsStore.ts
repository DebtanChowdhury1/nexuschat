import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ResponseLength, ResponseTone } from '../lib/responseStyle';

interface SettingsState {
  voiceModeEnabled: boolean;
  setVoiceModeEnabled: (enabled: boolean) => void;
  /** ChatGPT/Claude-style "extended thinking" — model reasons in a collapsible block before answering. Persisted like a mode you switch on, not a one-off per-message toggle. */
  deepThinkEnabled: boolean;
  setDeepThinkEnabled: (enabled: boolean) => void;
  responseLength: ResponseLength;
  setResponseLength: (length: ResponseLength) => void;
  tone: ResponseTone;
  setTone: (tone: ResponseTone) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      voiceModeEnabled: true,
      setVoiceModeEnabled: (enabled) => set({ voiceModeEnabled: enabled }),
      deepThinkEnabled: false,
      setDeepThinkEnabled: (enabled) => set({ deepThinkEnabled: enabled }),
      responseLength: 'descriptive',
      setResponseLength: (length) => set({ responseLength: length }),
      tone: 'balanced',
      setTone: (tone) => set({ tone }),
    }),
    {
      name: 'nexuschat.settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
