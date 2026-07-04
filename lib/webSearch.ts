import { env } from './env';

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

export interface WebSearchOutcome {
  results: WebSearchResult[];
  answer: string | null;
}

// Heuristics for "this question probably needs live/current data" — kept
// deliberately conservative (specific phrases, not just any question mark)
// since a false positive burns a Tavily quota call and adds latency for no
// benefit. Time-relative words ("today", "latest") and clearly-current-events
// topics (prices, scores, weather, news) are the strongest signals; general
// knowledge questions ("what is photosynthesis") never match these.
const TRIGGER_PATTERNS = [
  /\b(today|tonight|this week|this month|this year|right now|currently|at the moment)\b/i,
  /\b(latest|newest|recent|upcoming)\b/i,
  /\b(current|live)\s+(price|rate|score|weather|status|version)\b/i,
  /\b(stock price|exchange rate|weather (in|for|today)|who won|score of)\b/i,
  /\b(news about|breaking news|happened (today|this week|recently))\b/i,
  /\bin \d{4}\b.*\b(now|currently)\b/i,
];

// A short or clearly-continuing message ("tomorrow?", "and next week?",
// "what about in London") reads as a follow-up to whatever was just being
// discussed rather than a fresh, standalone question — it won't match
// TRIGGER_PATTERNS on its own (there's no "today"/"latest"/etc in "tomorrow?"),
// but if the *previous* user turn was itself live-data-shaped, the
// conversation is still on a live-data topic and the follow-up should
// inherit that.
const FOLLOWUP_PATTERNS = [/^(and|what about|how about|what's|whats|then|also|in)\b/i];

function isFollowupShaped(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.split(/\s+/).length <= 5) return true;
  return FOLLOWUP_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * @param recentUserMessages Prior user turns in this conversation, oldest
 * first, most recent last — used only to let a follow-up inherit its
 * predecessor's live-data need. Pass none for a fresh/first message.
 */
export function shouldSearchWeb(query: string, recentUserMessages: string[] = []): boolean {
  if (!env.TAVILY_API_KEY) return false;
  if (TRIGGER_PATTERNS.some((pattern) => pattern.test(query))) return true;
  if (!isFollowupShaped(query)) return false;
  const lastPrior = recentUserMessages[recentUserMessages.length - 1];
  return lastPrior ? TRIGGER_PATTERNS.some((pattern) => pattern.test(lastPrior)) : false;
}

/**
 * Resolves a follow-up into a standalone search query by prepending its
 * predecessor's topic — "weather today" + "tomorrow?" becomes a query that
 * actually returns tomorrow's forecast, instead of Tavily searching for the
 * word "tomorrow" in isolation and finding nothing relevant.
 */
export function buildSearchQuery(currentContent: string, recentUserMessages: string[]): string {
  const lastPrior = recentUserMessages[recentUserMessages.length - 1];
  if (!lastPrior || !isFollowupShaped(currentContent)) return currentContent;
  return `${lastPrior} — follow-up: ${currentContent}`;
}

/**
 * Tavily is purpose-built for feeding LLMs (returns pre-cleaned snippets
 * rather than raw HTML/SERP markup), so results can go almost directly into
 * a prompt with minimal extra formatting work.
 */
export async function searchWeb(query: string): Promise<WebSearchOutcome> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      include_answer: true,
      max_results: 5,
    }),
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = await res.json();
  const results: WebSearchResult[] = (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
    title: r.title,
    url: r.url,
    content: r.content,
  }));
  return { results, answer: data.answer ?? null };
}

/** Formats search results as a system-turn prompt instructing the model to ground its answer and cite sources. */
export function formatSearchContext(query: string, outcome: WebSearchOutcome): string {
  const sourceLines = outcome.results
    .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.content}`)
    .join('\n\n');
  return [
    `You have live web search results for the query: "${query}"`,
    outcome.answer ? `Quick summary: ${outcome.answer}` : null,
    'Sources:',
    sourceLines,
    [
      'Rules for using these sources:',
      '- Only state facts that actually appear in the source content above — never invent specific scores, dates, or numbers that aren\'t there.',
      '- Cite inline, immediately next to the specific claim it supports, as a markdown link using the source\'s real title as the link text, e.g. "France won 3-1 ([France vs Poland recap](url))." — never a bare number like "[1](url)".',
      '- Do NOT add a separate "Sources" / "References" / "For more information" list at the end of your answer — every citation must already be inline, so a trailing list would just be a redundant, undecorated pile of links.',
      "- If the results don't actually answer the question, say so and answer from your own knowledge instead — don't force a citation onto an unrelated source.",
    ].join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');
}
