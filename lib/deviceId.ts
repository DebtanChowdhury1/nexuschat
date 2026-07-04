import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'nexuschat.device_id';

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let cachedId: string | null = null;

/** Stable per-install identifier used to tell devices apart in Mirror Mode. */
export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) {
    cachedId = existing;
    return existing;
  }
  const id = randomId();
  await AsyncStorage.setItem(STORAGE_KEY, id);
  cachedId = id;
  return id;
}

export function getDeviceLabel(): string {
  return Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iPhone' : 'Android';
}
