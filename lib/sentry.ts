import { env } from './env';

// Crash reporting is entirely optional — the app has zero telemetry of any
// kind without a DSN configured (a real gap flagged in the pre-release
// review: no way to see production errors after shipping). Guarded with a
// try/catch the same way expo-speech-recognition is (see
// lib/nativeSpeechRecognition.ts) since @sentry/react-native also ships a
// native module; while its JS-only capture path is designed to degrade
// gracefully without that native module linked (e.g. running in plain
// Expo Go), there's no reason to risk it crashing app boot if a given SDK
// version behaves differently.
let Sentry: typeof import('@sentry/react-native') | null = null;
let sentryAvailable = false;

if (env.SENTRY_DSN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require('@sentry/react-native');
    Sentry!.init({
      dsn: env.SENTRY_DSN,
      // Keep this a pure crash/error reporter, not a full performance
      // monitoring pipeline — no free-tier project needs to burn its quota
      // on trace sampling for a hobby-scale app.
      tracesSampleRate: 0,
    });
    sentryAvailable = true;
  } catch {
    // Native module unavailable (e.g. Expo Go without the dev client) or
    // some other init failure — app continues without crash reporting.
  }
}

/** Reports an error to Sentry if configured; always a safe no-op otherwise. */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!sentryAvailable || !Sentry) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Never let telemetry itself become a source of crashes.
  }
}

// Catches uncaught JS exceptions app-wide — a React ErrorBoundary only
// catches errors thrown during render, not e.g. an unhandled error in an
// event handler or async callback, which is where most of this app's logic
// actually runs (Supabase calls, AI streaming, etc). RN's global handler is
// the broader net; called once from app/_layout.tsx.
export function installGlobalErrorHandlers(): void {
  if (!sentryAvailable) return;
  const g = globalThis as { ErrorUtils?: { setGlobalHandler: (fn: (error: Error, isFatal?: boolean) => void) => void; getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void } };
  if (!g.ErrorUtils) return;
  const previousHandler = g.ErrorUtils.getGlobalHandler?.();
  g.ErrorUtils.setGlobalHandler((error, isFatal) => {
    captureException(error, { isFatal: !!isFatal });
    previousHandler?.(error, isFatal);
  });
}

export { sentryAvailable };
