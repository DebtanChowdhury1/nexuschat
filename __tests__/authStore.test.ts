// Regression test for a real bug: authStore.init() called
// supabase.auth.getSession().then(...) with no .catch(). If that promise
// ever rejected (network blip, storage-access exception in a stricter
// browser), `initializing` stayed true forever — the entire app stuck on
// the boot spinner before any route, including a room join link, could
// even mount. See store/authStore.ts for the fix.

function loadAuthStoreWithFakeSupabase(getSessionImpl: () => Promise<{ data: { session: null } }>) {
  const fakeSupabase = {
    auth: {
      getSession: getSessionImpl,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
  jest.doMock('../lib/supabase', () => ({ supabase: fakeSupabase }));
  let useAuthStore: typeof import('../store/authStore').useAuthStore;
  jest.isolateModules(() => {
    ({ useAuthStore } = require('../store/authStore'));
  });
  return useAuthStore!;
}

describe('authStore.init', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../lib/supabase');
  });

  it('clears initializing when getSession resolves', async () => {
    const useAuthStore = loadAuthStoreWithFakeSupabase(() => Promise.resolve({ data: { session: null } }));
    const unsubscribe = useAuthStore.getState().init();
    await new Promise((r) => setTimeout(r, 0));
    expect(useAuthStore.getState().initializing).toBe(false);
    unsubscribe();
  });

  it('still clears initializing when getSession rejects, instead of hanging forever', async () => {
    const useAuthStore = loadAuthStoreWithFakeSupabase(() => Promise.reject(new Error('network blip')));
    const unsubscribe = useAuthStore.getState().init();
    await new Promise((r) => setTimeout(r, 0));
    expect(useAuthStore.getState().initializing).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
    unsubscribe();
  });
});
