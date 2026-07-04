# NexusChat

A cross-platform AI chat app (web + Android, one Expo codebase) with real-time
cross-device sync, passwordless magic-link auth, streaming AI responses with
an automatic Groq → Gemini → OpenRouter fallback chain, and a handful of
features ChatGPT doesn't have: live multi-device co-editing of a single
conversation ("Mirror Mode"), Git-style conversation branching, an offline
draft queue, and voice-to-voice mode with a 3D reactive orb.

Everything runs on free tiers: Supabase (Auth/Postgres/Realtime/Storage),
Groq, Gemini, OpenRouter, Vercel, and EAS Build.

## Stack

- **App**: Expo (Router) + TypeScript, NativeWind (Tailwind for RN), Zustand
- **Backend**: Supabase — Postgres, Auth (passwordless email magic link), Realtime
- **AI**: Groq (primary, streaming) → Gemini → OpenRouter free router (silent failover)
- **Animation**: Reanimated + Skia (native avatar), Three.js via `@react-three/fiber` (web-only 3D avatar)

## Project layout

```
app/                    Expo Router routes
  (auth)/                 login (single passwordless email screen)
  (app)/chat/              chat list + [id] conversation screen
components/             Sidebar, MessageBubble, AIOrb (+ .web variant), VoiceMode, ...
lib/                    ai.ts (fallback chain), realtime.ts, supabase.ts, branching.ts, authRedirect.ts
store/                  Zustand stores: auth, chat, theme, offline queue
supabase/migrations/    SQL schema + RLS policies
types/db.ts             Shared DB types
__tests__/              Jest tests (AI fallback, branching, message persistence)
```

## 1. Set up Supabase (free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates `profiles`, `conversations`, `messages`, `typing_status`,
   enables Row Level Security on every table, and adds them to the
   `supabase_realtime` publication.
3. In **Authentication → Providers**, keep Email enabled.
4. In **Authentication → URL Configuration**, add the URL(s) the app runs at
   (e.g. `http://localhost:8081` for local dev, your Vercel domain for
   production, and `nexuschat://` for native) to **Redirect URLs**, or the
   magic link will fail to redirect back into the app.
5. Copy your Project URL and anon public key into `.env` (see below).

## 2. Get free AI API keys

| Provider | Where | Notes |
|---|---|---|
| Groq | https://console.groq.com/keys | Primary — fast streaming, generous free tier |
| Gemini | https://aistudio.google.com/apikey | Fallback #1 |
| OpenRouter | https://openrouter.ai/keys | Fallback #2 — uses a `:free` model, no card required |

## 3. Configure environment

```bash
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
# EXPO_PUBLIC_GROQ_API_KEY, EXPO_PUBLIC_GEMINI_API_KEY, EXPO_PUBLIC_OPENROUTER_API_KEY
```

`EXPO_PUBLIC_*` vars are inlined into the client bundle at build time — fine
for these keys since they're all free-tier client SDKs, but don't put
server-only secrets behind this prefix.

## 4. Install & run

```bash
npm install
npm run web       # web (opens in browser)
npm run ios       # iOS simulator
npm run android   # Android emulator / device
```

> Voice mode's speech-to-text only works on **web** (Web Speech API). Native
> text-to-speech (spoken AI replies) works everywhere via `expo-speech`.
> Native speech-to-text needs a real on-device recognizer, which isn't part
> of Expo's managed, free-tier surface — see `components/VoiceMode.tsx` for
> where to wire one in if you eject or add a dev client.

### Skipping the magic-link email during local testing

Auth is passwordless, so testing normally means round-tripping through a
real inbox on every login. For local dev only, `scripts/dev-magic-link.mjs`
mints a one-time session token via Supabase's admin API — no email sent:

```bash
# one-time setup: add SUPABASE_SERVICE_ROLE_KEY to .env (see .env.example —
# it deliberately has no EXPO_PUBLIC_ prefix, so it never enters the app bundle)
npm run dev:login you@test.com
# prints a URL like http://localhost:8081/dev-login?token_hash=...
# open it in your browser while `npm run web` is running to sign in instantly
```

`app/dev-login.tsx` is hard-disabled outside `__DEV__` and the service role
key is only ever read by the Node script — app code never touches it. Don't
commit a real service role key, and don't ever give it an `EXPO_PUBLIC_`
prefix.

## 5. Run tests

```bash
npm test
```

Covers the Groq → Gemini → OpenRouter fallback/retry logic (`__tests__/ai.test.ts`),
the conversation branching/tree helpers (`__tests__/branching.test.ts`), and
the `is_generating` concurrency guard plus message persistence flow
(`__tests__/chatStore.test.ts`).

## 6. Deploy the web build to Vercel (free)

```bash
npm run build:web    # expo export -p web -> dist/
```

Then either:
- `vercel --prod` from the project root (Vercel auto-detects the `dist/` static output), or
- connect the repo in the Vercel dashboard with:
  - Build command: `npm run build:web`
  - Output directory: `dist`

Add the same `EXPO_PUBLIC_*` env vars in the Vercel project settings.

## 7. Build Android with EAS (free tier)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview   # produces an installable APK
```

For a signed production AAB (Play Store):

```bash
eas build -p android --profile production
```

EAS's free tier includes a limited number of builds/month, which is enough
for personal projects and testing.

## How auth works

One screen (`app/(auth)/login.tsx`) handles both new and returning users:
enter an email, get a "click to sign in" link. `supabase.auth.signInWithOtp()`
sends the link and creates the account on first use (`shouldCreateUser`
defaults to `true`); there's no password and no separate signup flow.
Clicking the link redirects back to `getAuthRedirectUrl()`'s URL (the app's
own origin on web, an `expo-linking` deep link on native) with the session
already established — Supabase's client picks it up automatically via
`detectSessionInUrl` on web. `store/authStore.ts` upserts a `profiles` row
the first time a session appears for a given user, since there's no
separate signup step to do that from. `(app)/_layout.tsx` only checks that a
session exists; there's no extra verification gate beyond the link itself.

Note: the link must be opened **on the same device/browser** the request
was made from, since sessions aren't shared across browser profiles or
devices — this is standard behavior for magic-link auth, not a bug.

## How the unique features work

- **Mirror Mode** — `lib/realtime.ts` opens a Supabase Realtime *broadcast*
  channel per conversation (`typing:<id>`) so "typing on Web…" indicators are
  near-instant, backed by the `typing_status` table for late joiners.
  Message content itself syncs via `postgres_changes` on the `messages`
  table, so two devices with the same conversation open see every new
  message and every streamed token update live.
- **Concurrency guard** — sending a message first does a conditional update
  (`is_generating = true WHERE is_generating = false`) on the conversation
  row. If that returns no row, another device already holds the lock and the
  UI disables input with a "responding…" state until it's released.
- **Model transparency badge** — every assistant message stores which
  provider actually generated it (`model_used`); `components/ModelBadge.tsx`
  renders it under the reply.
- **Conversation branching** — messages form a tree via `parent_message_id`
  (see `lib/branching.ts`). Editing a past message inserts a *sibling* under
  the same parent instead of overwriting anything, so the original branch
  stays reachable via the branch switcher on each bubble or the tree/timeline
  modal (🌳 Branches).
- **Offline draft queue** — `store/offlineQueueStore.ts` persists unsent
  drafts to `AsyncStorage`; `components/ChatInput.tsx` watches network status
  and auto-drains the queue the moment connectivity returns.
- **Voice mode** — `components/VoiceMode.tsx` + `components/AIOrb*.tsx`; a
  Web Audio `AnalyserNode` on web feeds live mic amplitude into the 3D orb's
  shader uniforms so it visibly reacts to your voice.

## Non-functional notes

- Three.js (`@react-three/fiber`, `@react-three/drei`, `three`) is only
  imported by `components/AIOrb.web.tsx`. Metro's platform-extension
  resolution means the native bundle never pulls it in — Android gets the
  lightweight Reanimated + Skia orb in `components/AIOrb.tsx` instead.
- RLS is enabled on every table in `supabase/migrations/0001_init.sql`;
  policies scope `conversations`/`messages`/`typing_status` through
  `auth.uid()` ownership so users can only ever see their own data.
