import { env } from './env';
import type { AIProvider } from '../types/db';

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onToken: (delta: string, provider: AIProvider) => void;
  onProviderStart?: (provider: AIProvider) => void;
}

export interface StreamResult {
  provider: AIProvider;
  content: string;
}

class ProviderError extends Error {
  constructor(
    message: string,
    public readonly retriable: boolean
  ) {
    super(message);
  }
}

const GROQ_MODEL = 'llama-3.3-70b-versatile';
// gemini-1.5-flash was retired (404s on generateContent) — verified
// gemini-2.5-flash works in both streaming and non-streaming mode.
const GEMINI_MODEL = 'gemini-2.5-flash';
// llama-3.1-8b-instruct:free was retired by OpenRouter (now 404s) — verified
// against the live API before switching; this model returns clean content
// immediately in both streaming and non-streaming mode, unlike some other
// free-tier options that stream a slow hidden "reasoning" phase first.
const OPENROUTER_MODEL = 'google/gemma-4-26b-a4b-it:free';

// How long to wait for the connection to even establish (headers received)
// before giving up and failing over. Separate from the stall timeout below
// since a provider that never answers at all behaves differently from one
// that starts answering then goes silent mid-stream.
const CONNECT_TIMEOUT_MS = 15000;
// How long to wait between successive stream chunks before treating the
// connection as hung. Without this, a provider that accepts the connection
// but then sends nothing (no error, no data) would hang the request
// forever — the `catch` block that releases the is_generating lock and
// shows a failure message never runs because the underlying promise never
// rejects. Resets on every chunk, so a legitimately slow-but-alive stream
// is never cut off.
const STALL_TIMEOUT_MS = 20000;

/**
 * Reads a fetch Response's SSE body, invoking `onLine` for every
 * "data: ..." payload. Shared by the OpenAI-compatible providers (Groq,
 * OpenRouter) since they emit the same wire format. Aborts `controller` if
 * no chunk arrives within STALL_TIMEOUT_MS of the last one.
 */
async function consumeSSE(
  response: Response,
  onLine: (data: string) => void,
  controller: AbortController
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    // Environments without a streaming body (some RN fetch polyfills) —
    // fall back to reading the whole payload at once.
    const text = await response.text();
    text.split('\n').forEach(onLine);
    return;
  }
  const decoder = new TextDecoder();
  let buffer = '';
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  const resetStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
  };

  try {
    resetStallTimer();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      resetStallTimer();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) onLine(line);
    }
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
  }
}

function throwIfNotOk(res: Response, provider: string): void {
  if (res.ok) return;
  // 429/5xx are transient — worth failing over to the next provider.
  const retriable = res.status === 429 || res.status >= 500;
  throw new ProviderError(`${provider} responded ${res.status}`, retriable);
}

/**
 * Wraps a provider's fetch+stream call with a connect-phase timeout, and
 * translates an aborted request (timeout OR the stall guard in consumeSSE)
 * into a retriable ProviderError instead of letting the raw AbortError
 * propagate — the fallback chain only knows how to interpret ProviderError.
 *
 * The connect timer must be cleared the moment `fetch()` resolves (headers
 * received), not only once the whole call finishes — otherwise it would
 * double as a hard ceiling on total streaming time, capping every response
 * at CONNECT_TIMEOUT_MS regardless of the separate, longer stall timeout
 * meant to govern the body-reading phase. `run` is responsible for calling
 * `clearConnectTimeout()` right after its fetch call resolves.
 */
async function withTimeout<T>(
  provider: string,
  run: (controller: AbortController, clearConnectTimeout: () => void) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const connectTimer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
  let cleared = false;
  const clearConnectTimeout = () => {
    if (cleared) return;
    cleared = true;
    clearTimeout(connectTimer);
  };
  try {
    return await run(controller, clearConnectTimeout);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderError(`${provider}: timed out (no response)`, true);
    }
    throw err;
  } finally {
    clearConnectTimeout();
  }
}

async function streamGroq(turns: ChatTurn[], cb: StreamCallbacks): Promise<string> {
  if (!env.GROQ_API_KEY) throw new ProviderError('groq: no api key configured', true);
  return withTimeout('groq', async (controller, clearConnectTimeout) => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages: turns, stream: true }),
      signal: controller.signal,
    });
    clearConnectTimeout();
    throwIfNotOk(res, 'groq');

    let full = '';
    await consumeSSE(
      res,
      (line) => {
        if (!line.startsWith('data: ')) return;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            cb.onToken(delta, 'groq');
          }
        } catch {
          // ignore malformed keep-alive lines
        }
      },
      controller
    );
    if (!full) throw new ProviderError('groq: empty response', true);
    return full;
  });
}

async function streamGemini(turns: ChatTurn[], cb: StreamCallbacks): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new ProviderError('gemini: no api key configured', true);
  const contents = turns
    .filter((t) => t.role !== 'system')
    .map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));
  const systemInstruction = turns.find((t) => t.role === 'system')?.content;

  return withTimeout('gemini', async (controller, clearConnectTimeout) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
      }),
      signal: controller.signal,
    });
    clearConnectTimeout();
    throwIfNotOk(res, 'gemini');

    let full = '';
    await consumeSSE(
      res,
      (line) => {
        if (!line.startsWith('data: ')) return;
        const data = line.slice(6).trim();
        if (!data) return;
        try {
          const parsed = JSON.parse(data);
          const delta: string | undefined = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (delta) {
            full += delta;
            cb.onToken(delta, 'gemini');
          }
        } catch {
          // ignore malformed keep-alive lines
        }
      },
      controller
    );
    if (!full) throw new ProviderError('gemini: empty response', true);
    return full;
  });
}

async function streamOpenRouter(turns: ChatTurn[], cb: StreamCallbacks): Promise<string> {
  if (!env.OPENROUTER_API_KEY) throw new ProviderError('openrouter: no api key configured', false);
  return withTimeout('openrouter', async (controller, clearConnectTimeout) => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({ model: OPENROUTER_MODEL, messages: turns, stream: true }),
      signal: controller.signal,
    });
    clearConnectTimeout();
    throwIfNotOk(res, 'openrouter');

    let full = '';
    await consumeSSE(
      res,
      (line) => {
        if (!line.startsWith('data: ')) return;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            cb.onToken(delta, 'openrouter');
          }
        } catch {
          // ignore malformed keep-alive lines
        }
      },
      controller
    );
    if (!full) throw new ProviderError('openrouter: empty response', false);
    return full;
  });
}

const PROVIDER_CHAIN: Array<{ name: AIProvider; run: typeof streamGroq }> = [
  { name: 'groq', run: streamGroq },
  { name: 'gemini', run: streamGemini },
  { name: 'openrouter', run: streamOpenRouter },
];

/**
 * Streams a chat completion, silently failing over Groq -> Gemini ->
 * OpenRouter on transient errors (rate limits, 5xx, missing keys, or a
 * connection that never responds/goes silent mid-stream — see
 * CONNECT_TIMEOUT_MS/STALL_TIMEOUT_MS). Each provider gets one retry with
 * backoff before the chain moves on. Throws only if every provider in the
 * chain is exhausted.
 */
export async function streamChatCompletion(
  turns: ChatTurn[],
  callbacks: StreamCallbacks
): Promise<StreamResult> {
  const errors: string[] = [];

  for (const provider of PROVIDER_CHAIN) {
    const attempts = provider.name === 'groq' ? 2 : 1; // give the primary provider one retry
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        callbacks.onProviderStart?.(provider.name);
        const content = await provider.run(turns, callbacks);
        return { provider: provider.name, content };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(message);
        const retriable = err instanceof ProviderError ? err.retriable : true;
        if (!retriable || attempt === attempts) break;
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(' | ')}`);
}
