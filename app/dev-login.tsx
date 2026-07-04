import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { supabase } from '../lib/supabase';

/**
 * Dev-only shortcut: exchanges a token_hash minted by
 * scripts/dev-magic-link.mjs for a real session, so local testing doesn't
 * need a live inbox round-trip. Hard-disabled outside __DEV__ — this must
 * never be reachable in a production build.
 */
export default function DevLoginScreen() {
  const { token_hash: tokenHash } = useLocalSearchParams<{ token_hash?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!__DEV__ || !tokenHash) return;
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' }).then(({ error: verifyError }) => {
      if (verifyError) setError(verifyError.message);
      else setDone(true);
    });
  }, [tokenHash]);

  if (!__DEV__) return <Redirect href="/login" />;
  if (done) return <Redirect href="/(app)/chat" />;

  return (
    <View className="flex-1 items-center justify-center bg-bg-light px-6 dark:bg-bg-dark">
      <Text className="text-ink-primary-light dark:text-ink-primary">
        {error ? `Dev login failed: ${error}` : tokenHash ? 'Signing in…' : 'Missing token_hash param.'}
      </Text>
    </View>
  );
}
