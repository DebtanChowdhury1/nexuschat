import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { env } from './env';
import type { Database } from '../types/db';

// On web we let Supabase use its default (localStorage-backed) storage since
// AsyncStorage's web shim does not persist across tabs the same way. On
// native we back sessions with AsyncStorage so auth survives app restarts.
export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    lock: Platform.OS === 'web' ? undefined : processLock,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
