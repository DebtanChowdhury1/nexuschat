#!/usr/bin/env node
// Dev-only helper: mints a magic-link sign-in token for a test account
// without sending a real email, using Supabase's admin API. The service
// role key never leaves this script/your machine — it is NOT prefixed with
// EXPO_PUBLIC_, so Metro never inlines it into the app bundle.
//
// Usage: node scripts/dev-magic-link.mjs you@test.com
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (see
// .env.example). Get the service role key from Supabase Dashboard ->
// Project Settings -> API -> service_role secret. Never commit it, never
// give it an EXPO_PUBLIC_ prefix, never use it anywhere in app code.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = { ...loadEnv(envPath), ...process.env };
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const appUrl = env.DEV_LOGIN_APP_URL || 'http://localhost:8081';

if (!email) {
  console.error('Usage: node scripts/dev-magic-link.mjs you@test.com');
  process.exit(1);
}
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.\n' +
      'Add SUPABASE_SERVICE_ROLE_KEY (no EXPO_PUBLIC_ prefix — see .env.example) from ' +
      'Supabase Dashboard -> Project Settings -> API -> service_role secret.'
  );
  process.exit(1);
}

const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify({ type: 'magiclink', email }),
});

const data = await response.json();
if (!response.ok) {
  console.error('Failed to generate link:', data);
  process.exit(1);
}

const tokenHash = data.hashed_token ?? data.properties?.hashed_token;
if (!tokenHash) {
  console.error('No hashed_token in response:', data);
  process.exit(1);
}

console.log('\nOpen this URL to sign in instantly (dev only, single-use):\n');
console.log(`${appUrl}/dev-login?token_hash=${tokenHash}&email=${encodeURIComponent(email)}\n`);
