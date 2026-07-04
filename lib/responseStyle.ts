export type ResponseLength = 'short' | 'descriptive';
export type ResponseTone = 'balanced' | 'conversational' | 'formal' | 'friendly' | 'technical';

export const TONE_OPTIONS: { value: ResponseTone; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'technical', label: 'Technical' },
];

const TONE_INSTRUCTIONS: Record<ResponseTone, string> = {
  balanced: 'Use a clear, natural, moderately warm tone — neither stiff nor overly casual.',
  conversational: 'Write like a knowledgeable friend chatting casually — contractions, plain words, a relaxed pace.',
  formal: 'Write formally and precisely — full sentences, no slang or contractions, professional register.',
  friendly: 'Write warmly and encouragingly, with light enthusiasm — approachable, upbeat, never cold.',
  technical: 'Write precisely and densely for a technical audience — exact terminology, no hand-holding or filler.',
};

const LENGTH_INSTRUCTIONS: Record<ResponseLength, string> = {
  short: 'Keep the answer short — a few sentences or a tight list, only the essential point. Expand only if the user explicitly asks for more detail.',
  descriptive: 'Give a thorough, well-structured answer — cover relevant context, examples, and caveats, using headings or lists where they help.',
};

/** "Extended thinking": the model reasons inside a <think> block first, which the UI renders as a collapsible section, then gives its real answer after. Works with any provider since it's plain prompting, not a special API. */
const DEEP_THINK_INSTRUCTION = [
  'Before answering, think through the problem carefully and thoroughly inside a single <think>...</think> block — consider the question from multiple angles, check your reasoning, and work through any steps needed.',
  'Close the </think> tag, then give your final answer as normal, well-formatted prose. The final answer must be self-contained and make sense on its own — do not refer back to "as I thought above."',
].join(' ');

export function buildResponseStyleInstruction(options: {
  length: ResponseLength;
  tone: ResponseTone;
  deepThink: boolean;
}): string {
  return [LENGTH_INSTRUCTIONS[options.length], TONE_INSTRUCTIONS[options.tone], options.deepThink ? DEEP_THINK_INSTRUCTION : null]
    .filter(Boolean)
    .join(' ');
}

/**
 * Splits a "<think>...</think>final answer" response into its parts for the
 * collapsible-thinking UI. Handles three states since this runs against
 * content that's still streaming in token-by-token: no tag at all (deep
 * think off, or the model ignored the instruction), a tag that's still open
 * (mid-stream — the closing "</think>" hasn't arrived yet), and a fully
 * closed tag. `thinkingInProgress` lets the UI show reasoning live as it
 * streams, then collapse it once the real answer starts.
 */
export function splitThinking(
  content: string
): { thinking: string | null; answer: string; thinkingInProgress: boolean } {
  const closed = content.match(/^\s*<think>([\s\S]*?)<\/think>\s*([\s\S]*)$/i);
  if (closed) return { thinking: closed[1].trim(), answer: closed[2].trim(), thinkingInProgress: false };
  const opening = content.match(/^\s*<think>([\s\S]*)$/i);
  if (opening) return { thinking: opening[1].trim(), answer: '', thinkingInProgress: true };
  return { thinking: null, answer: content, thinkingInProgress: false };
}
