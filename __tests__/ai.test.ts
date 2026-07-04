jest.mock('../lib/env', () => ({
  env: {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key',
    GROQ_API_KEY: 'groq-key',
    GEMINI_API_KEY: 'gemini-key',
    OPENROUTER_API_KEY: 'openrouter-key',
  },
}));

import { streamChatCompletion } from '../lib/ai';

function sseResponse(ok: boolean, status: number, body: string) {
  return { ok, status, body: undefined, text: async () => body } as unknown as Response;
}

function groqSSE(tokens: string[]) {
  const lines = tokens.map(
    (t) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}`
  );
  return [...lines, 'data: [DONE]'].join('\n');
}

describe('streamChatCompletion fallback chain', () => {
  const turns = [{ role: 'user' as const, content: 'hi' }];

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the groq result when groq succeeds on the first try', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(sseResponse(true, 200, groqSSE(['Hello', ' world'])));

    const onToken = jest.fn();
    const result = await streamChatCompletion(turns, { onToken });

    expect(result.provider).toBe('groq');
    expect(result.content).toBe('Hello world');
    expect(onToken).toHaveBeenCalledWith('Hello', 'groq');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('fails over to gemini when groq returns a rate-limit error on every attempt', async () => {
    const geminiSSE = [
      `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'From Gemini' }] } }] })}`,
      '',
    ].join('\n');

    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(sseResponse(false, 429, '')) // groq attempt 1
      .mockResolvedValueOnce(sseResponse(false, 429, '')) // groq attempt 2 (retry)
      .mockResolvedValueOnce(sseResponse(true, 200, geminiSSE)); // gemini succeeds

    const result = await streamChatCompletion(turns, { onToken: jest.fn() });

    expect(result.provider).toBe('gemini');
    expect(result.content).toBe('From Gemini');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('falls through the entire chain and throws when every provider fails', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(sseResponse(false, 500, ''));

    await expect(streamChatCompletion(turns, { onToken: jest.fn() })).rejects.toThrow(
      'All AI providers failed'
    );
    // groq gets 2 attempts, gemini and openrouter get 1 each
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it('does not retry a non-retriable error (e.g. missing OpenRouter key) before giving up on that provider', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(sseResponse(false, 500, '')) // groq attempt 1
      .mockResolvedValueOnce(sseResponse(false, 500, '')) // groq attempt 2
      .mockResolvedValueOnce(sseResponse(false, 401, '')); // gemini: non-retriable auth error

    await expect(streamChatCompletion(turns, { onToken: jest.fn() })).rejects.toThrow(
      'All AI providers failed'
    );
    // groq: 2 attempts, gemini: 1 attempt (401 is not >=500 or 429, so no retry), openrouter: 1 attempt
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it('fails over when a provider connects but then goes silent mid-stream (stall timeout)', async () => {
    jest.useFakeTimers();

    // Simulates a real fetch response whose body never yields data and
    // never completes, but whose pending read() rejects with AbortError
    // the moment its AbortSignal fires — exactly what a genuine network
    // stall looks like once our stall-timeout guard aborts the controller.
    function hangingResponse(signal: AbortSignal): Response {
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: () =>
              new Promise((_resolve, reject) => {
                signal.addEventListener('abort', () => {
                  const err = new Error('The operation was aborted');
                  err.name = 'AbortError';
                  reject(err);
                });
              }),
          }),
        },
      } as unknown as Response;
    }

    const geminiSSE = [
      `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'From Gemini' }] } }] })}`,
      '',
    ].join('\n');

    globalThis.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('groq.com')) {
        return Promise.resolve(hangingResponse(init!.signal as AbortSignal));
      }
      return Promise.resolve(sseResponse(true, 200, geminiSSE));
    });

    const resultPromise = streamChatCompletion(turns, { onToken: jest.fn() });

    // Groq gets 2 attempts, each must stall out (20s) before the 400ms
    // backoff and the next attempt — advance well past both.
    await jest.advanceTimersByTimeAsync(21000);
    await jest.advanceTimersByTimeAsync(21000);

    const result = await resultPromise;
    expect(result.provider).toBe('gemini');
    expect(result.content).toBe('From Gemini');

    jest.useRealTimers();
  });
});
