import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '../../lib/supabase';
import { useAndroidKeyboardHeight } from '../../lib/useKeyboardHeight';
import { usePageTitle } from '../../lib/usePageTitle';

// Simple sanity check, not full RFC validation — Supabase does the real
// validation server-side. This just catches obvious typos before we bother
// making a request.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^\d{6}$/;

/**
 * Passwordless auth via a one-time 6-digit code: one screen for both new
 * and returning users. signInWithOtp() creates the account on first use
 * (shouldCreateUser defaults to true) and emails a code; verifyOtp() then
 * exchanges it for a session. Deliberately avoids the clickable magic-link
 * redirect flow — it depends on a redirect URL allowlist that must be
 * platform/environment-specific (web origin vs. exp:// scheme on device),
 * while the code works identically everywhere with zero redirect config.
 */
export default function LoginScreen() {
  usePageTitle('Sign in');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autofill/autocorrect on some browsers can leave a trailing space, which
  // Supabase's server-side email validator rejects outright as "invalid" —
  // trim before both validating and sending.
  const trimmedEmail = email.trim();
  const isValidEmail = EMAIL_PATTERN.test(trimmedEmail);
  const isValidCode = CODE_PATTERN.test(code.trim());
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : undefined;
  const keyboardHeight = useAndroidKeyboardHeight();
  const keyboardVisible = Platform.OS === 'android' && keyboardHeight > 0;
  const keyboardLift = keyboardVisible ? -36 : 0;
  const contentStyle = {
    flexGrow: 1,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: keyboardVisible ? 56 : 32,
  };

  const handleSendCode = async () => {
    setError(null);
    if (!isValidEmail) {
      setError('Enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
      });
      if (otpError) throw otpError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    if (!isValidCode) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setVerifying(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: code.trim(),
        type: 'email',
      });
      if (verifyError) throw verifyError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
    } finally {
      setVerifying(false);
    }
  };

  if (sent) {
    return (
      <KeyboardAvoidingView behavior={keyboardBehavior} className="flex-1 bg-bg-light dark:bg-bg-dark">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={contentStyle}
        >
          <View style={{ transform: [{ translateY: keyboardLift }] }} className="items-center">
            <Text className="mb-2 text-2xl font-bold text-ink-primary-light dark:text-ink-primary">
              Check your email
            </Text>
            <Text className="mb-6 max-w-sm text-center text-ink-secondary-light dark:text-ink-secondary">
              We sent a 6-digit code to {trimmedEmail}. Enter it below to sign in.
            </Text>
            <View className="w-full max-w-sm gap-3">
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                placeholderTextColor="#8888a0"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="6-digit code"
                className="rounded-xl border border-border-light bg-black/5 px-4 py-3 text-center text-lg tracking-widest text-ink-primary-light dark:border-border dark:bg-white/10 dark:text-ink-primary"
              />
              {error && <Text className="text-red-400">{error}</Text>}
              <Pressable
                onPress={handleVerifyCode}
                disabled={verifying || !isValidCode}
                accessibilityRole="button"
                accessibilityLabel="Verify and sign in"
                className="mt-2 items-center rounded-xl bg-brand py-3 active:opacity-80 hover:opacity-90 disabled:opacity-50"
              >
                {verifying ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Verify & sign in</Text>}
              </Pressable>
              <Pressable
                onPress={() => {
                  setSent(false);
                  setCode('');
                  setError(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Use a different email"
                className="mt-1 items-center py-2"
              >
                <Text className="text-brand-light">Use a different email</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={keyboardBehavior} className="flex-1 bg-bg-light dark:bg-bg-dark">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentStyle}
      >
        <View style={{ transform: [{ translateY: keyboardLift }] }} className="items-center">
          <Text className="mb-8 text-3xl font-bold text-ink-primary-light dark:text-ink-primary">NexusChat</Text>
          <View className="w-full max-w-sm gap-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#8888a0"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              accessibilityLabel="Email"
              className="rounded-xl border border-border-light bg-black/5 px-4 py-3 text-ink-primary-light dark:border-border dark:bg-white/10 dark:text-ink-primary"
            />
            {error && <Text className="text-red-400">{error}</Text>}
            <Pressable
              onPress={handleSendCode}
              disabled={sending || !isValidEmail}
              accessibilityRole="button"
              accessibilityLabel="Send sign-in code"
              className="mt-2 items-center rounded-xl bg-brand py-3 active:opacity-80 hover:opacity-90 disabled:opacity-50"
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Send sign-in code</Text>}
            </Pressable>
            <Text className="mt-2 text-center text-xs text-ink-muted-light dark:text-ink-muted">
              No password needed — we'll email you a 6-digit code to sign in.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
