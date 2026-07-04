import Constants from 'expo-constants';

// Babel's inline-environment-variables plugin only rewrites static
// `process.env.EXACT_NAME` member expressions at build time — a dynamic
// `process.env[key]` lookup survives untouched into the bundle, and browsers
// have no runtime `process` object, so every var silently reads back empty
// in a static web export (though `expo start`'s dev server happens to expose
// a live `process.env`, masking the bug there). Each call below must spell
// out the literal env var name so it can actually be inlined.
function readEnv(name: string, value: string | undefined): string {
  const resolved = value ?? (Constants.expoConfig?.extra?.[name] as string | undefined);
  if (!resolved) {
    console.warn(`[env] Missing ${name} — check your .env file (see .env.example).`);
  }
  return resolved ?? '';
}

// Unlike the required keys above, these are optional features — missing
// one should silently disable that feature rather than warn on every boot.
// (Previously this always fell back to reading EXPO_PUBLIC_TAVILY_API_KEY's
// `extra` field regardless of which optional var was being requested —
// harmless while Tavily was the only caller, but a real bug waiting to
// surface the moment a second optional var was added, which is now.)
function readOptionalEnv(name: string, value: string | undefined): string {
  return (value ?? (Constants.expoConfig?.extra?.[name] as string | undefined)) ?? '';
}

export const env = {
  SUPABASE_URL: readEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  GROQ_API_KEY: readEnv('EXPO_PUBLIC_GROQ_API_KEY', process.env.EXPO_PUBLIC_GROQ_API_KEY),
  GEMINI_API_KEY: readEnv('EXPO_PUBLIC_GEMINI_API_KEY', process.env.EXPO_PUBLIC_GEMINI_API_KEY),
  OPENROUTER_API_KEY: readEnv('EXPO_PUBLIC_OPENROUTER_API_KEY', process.env.EXPO_PUBLIC_OPENROUTER_API_KEY),
  TAVILY_API_KEY: readOptionalEnv('EXPO_PUBLIC_TAVILY_API_KEY', process.env.EXPO_PUBLIC_TAVILY_API_KEY),
  SENTRY_DSN: readOptionalEnv('EXPO_PUBLIC_SENTRY_DSN', process.env.EXPO_PUBLIC_SENTRY_DSN),
};
