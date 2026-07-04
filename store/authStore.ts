import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  initializing: boolean;
  setSession: (session: Session | null) => void;
  init: () => () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initializing: true,

  setSession: (session) => set({ session }),

  init: () => {
    // No .catch() here used to mean: if this promise ever rejected (a
    // network blip, or a storage-access exception in a browser with
    // stricter cookie/storage policies), `initializing` would stay true
    // forever — the entire app stuck on the boot spinner, silently, with
    // no error surfaced. Reported as "the join room link just spins
    // forever" on a fresh/other browser with no existing session. The
    // timeout race covers the other half of that failure mode: a request
    // that hangs outright (rejects nor resolves) rather than erroring.
    let timeoutHandle: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('getSession timed out')), 8000);
    });
    Promise.race([supabase.auth.getSession(), timeout])
      .finally(() => clearTimeout(timeoutHandle))
      .then(({ data }) => {
        set({ session: data.session, initializing: false });
      })
      .catch((err) => {
        console.warn('[auth] getSession failed, continuing as logged out', err);
        set({ session: null, initializing: false });
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });

      // First time this user is seen, make sure a profile row exists.
      // Magic-link signup creates the auth user automatically, so there's
      // no separate signup screen to do this from.
      if (session?.user) {
        await supabase
          .from('profiles')
          .upsert(
            { user_id: session.user.id, display_name: session.user.email?.split('@')[0] ?? null },
            { onConflict: 'user_id', ignoreDuplicates: true }
          );
      }
    });

    return () => sub.subscription.unsubscribe();
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
