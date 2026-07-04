import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useColorScheme } from 'nativewind';

import { Check, ChevronDown, ChevronRight, Copy, Sparkles } from 'lucide-react-native';

import { BranchSwitcher } from './BranchSwitcher';
import { CodeBlock } from './CodeBlock';
import { ModelBadge } from './ModelBadge';
import { ThinkingDots } from './ThinkingDots';
import { color } from '../constants/theme';
import { copyToClipboard } from '../lib/clipboard';
import { splitThinking } from '../lib/responseStyle';
import { useTypewriter } from '../lib/useTypewriter';
import type { Message } from '../types/db';

const FENCE = /```(\w*)\n([\s\S]*?)```/g;

interface Segment {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function splitSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  while ((match = FENCE.exec(content))) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'code', content: match[2], language: match[1] || undefined });
    lastIndex = FENCE.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }
  return segments;
}

interface MessageBubbleProps {
  conversationId: string;
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
  /** True only for the single assistant message currently receiving live tokens — drives the typewriter reveal. Historical/completed messages render instantly. */
  streaming?: boolean;
}

export function MessageBubble({ conversationId, message, onEdit, streaming = false }: MessageBubbleProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isUser = message.role === 'user';
  const { thinking, answer, thinkingInProgress } = isUser
    ? { thinking: null, answer: message.content, thinkingInProgress: false }
    : splitThinking(message.content);
  const revealedAnswer = useTypewriter(answer, streaming && !thinkingInProgress);
  const segments = isUser ? null : splitSegments(revealedAnswer);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);
  // Auto-opens the moment reasoning starts streaming in (so the user can
  // watch it think) but only once — after that the user is free to
  // collapse it manually even while it's still streaming, without this
  // fighting them back open every render.
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  useEffect(() => {
    if (thinkingInProgress) setThinkingExpanded(true);
  }, [thinkingInProgress]);

  const markdownStyles = useMemo(() => {
    const textPrimary = isDark ? color.dark.textPrimary : color.light.textPrimary;
    const textMuted = isDark ? color.dark.textMuted : color.light.textMuted;
    const borderColor = isDark ? color.dark.border : color.light.border;
    const surface = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

    return {
      body: { color: textPrimary, fontSize: 15, lineHeight: 22 },
      paragraph: { marginTop: 2, marginBottom: 8, width: '100%' },
      heading1: { color: textPrimary, fontSize: 21, fontWeight: '700', marginTop: 10, marginBottom: 6 },
      heading2: { color: textPrimary, fontSize: 18, fontWeight: '700', marginTop: 10, marginBottom: 6 },
      heading3: { color: textPrimary, fontSize: 16.5, fontWeight: '700', marginTop: 8, marginBottom: 5 },
      heading4: { color: textPrimary, fontSize: 15.5, fontWeight: '600', marginTop: 8, marginBottom: 4 },
      heading5: { color: textPrimary, fontSize: 15, fontWeight: '600', marginTop: 6, marginBottom: 4 },
      heading6: { color: textMuted, fontSize: 14, fontWeight: '600', marginTop: 6, marginBottom: 4 },
      strong: { fontWeight: '700', color: textPrimary },
      em: { fontStyle: 'italic' },
      s: { textDecorationLine: 'line-through' },
      hr: { backgroundColor: borderColor, height: 1, marginVertical: 10 },
      blockquote: {
        backgroundColor: surface,
        borderColor: color.brand.DEFAULT,
        borderLeftWidth: 3,
        marginVertical: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
      },
      bullet_list: { marginVertical: 2 },
      ordered_list: { marginVertical: 2 },
      list_item: { marginVertical: 2, flexDirection: 'row' },
      bullet_list_icon: { marginRight: 8, color: textPrimary },
      ordered_list_icon: { marginRight: 8, color: textPrimary },
      code_inline: {
        backgroundColor: surface,
        color: color.brand.light,
        borderWidth: 0,
        borderRadius: 4,
        paddingHorizontal: 4,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
      },
      table: { borderColor, borderWidth: 1, borderRadius: 8, marginVertical: 6, overflow: 'hidden' },
      thead: { backgroundColor: surface },
      th: { padding: 6, color: textPrimary, fontWeight: '600' },
      tr: { borderColor, borderBottomWidth: 1 },
      td: { padding: 6, color: textPrimary },
      link: { color: color.brand.DEFAULT, textDecorationLine: 'underline' },
    } as const;
  }, [isDark]);

  const handleCopy = async () => {
    await copyToClipboard(isUser ? message.content : answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const commitEdit = () => {
    setEditing(false);
    if (draft.trim() && draft !== message.content) {
      onEdit?.(message.id, draft.trim());
    } else {
      setDraft(message.content);
    }
  };

  // Enter commits, Shift+Enter inserts a newline — same convention as the
  // main composer. Web only; RNW's onSubmitEditing doesn't fire on Enter
  // for multiline inputs.
  const handleEditKeyPress = (e: any) => {
    if (Platform.OS !== 'web') return;
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      commitEdit();
    }
  };

  return (
    <View className={`mb-4 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
      <BranchSwitcher conversationId={conversationId} message={message} />
      {isUser && message.sender_name && (
        <View className="mb-0.5 flex-row items-center gap-1.5 self-end px-1">
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: message.sender_color ?? undefined }} />
          <Text className="text-xs text-ink-muted-light dark:text-ink-muted">{message.sender_name}</Text>
        </View>
      )}
      <View
        className={`rounded-2xl px-4 py-3 ${
          isUser ? 'bg-brand' : 'border border-border-light bg-black/[0.03] dark:border-border dark:bg-white/5'
        }`}
      >
        {isUser && editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            multiline
            onSubmitEditing={commitEdit}
            onKeyPress={handleEditKeyPress}
            onBlur={commitEdit}
            className="min-w-[160px] text-white"
          />
        ) : isUser ? (
          <Text className="text-white">{message.content || ' '}</Text>
        ) : !message.content ? (
          <ThinkingDots />
        ) : (
          <>
            {thinking && (
              <View className="mb-3 overflow-hidden rounded-xl border border-border-light bg-black/[0.03] dark:border-border dark:bg-white/[0.04]">
                <Pressable
                  onPress={() => setThinkingExpanded((v) => !v)}
                  className="flex-row items-center gap-1.5 px-3 py-2"
                  accessibilityRole="button"
                  accessibilityLabel={thinkingInProgress ? 'Thinking' : 'Thought process'}
                  accessibilityState={{ expanded: thinkingExpanded }}
                >
                  <Sparkles size={13} color={color.brand.DEFAULT} strokeWidth={2} />
                  <Text className="flex-1 text-xs font-medium text-ink-secondary-light dark:text-ink-secondary">
                    {thinkingInProgress ? 'Thinking…' : 'Thought process'}
                  </Text>
                  {thinkingExpanded ? (
                    <ChevronDown size={14} color="#71717A" strokeWidth={2} />
                  ) : (
                    <ChevronRight size={14} color="#71717A" strokeWidth={2} />
                  )}
                </Pressable>
                {thinkingExpanded && (
                  <Text className="border-t border-border-light px-3 py-2 text-xs italic leading-5 text-ink-muted-light dark:border-border dark:text-ink-muted">
                    {thinking}
                  </Text>
                )}
              </View>
            )}
            {thinkingInProgress ? (
              !thinkingExpanded && <ThinkingDots />
            ) : !revealedAnswer ? (
              <ThinkingDots />
            ) : (
              segments!.map((seg, i) =>
                seg.type === 'code' ? (
                  <CodeBlock key={i} code={seg.content} language={seg.language} />
                ) : (
                  <Markdown key={i} style={markdownStyles}>
                    {seg.content}
                  </Markdown>
                )
              )
            )}
          </>
        )}
      </View>
      {!isUser && <ModelBadge provider={message.model_used} />}
      <View className={`mt-1 flex-row items-center gap-3 ${isUser ? 'self-end' : 'self-start'}`}>
        {isUser && !editing && onEdit && (
          <Pressable
            onPress={() => setEditing(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit message"
          >
            <Text className="text-xs text-ink-muted-light dark:text-ink-muted">✏️ Edit</Text>
          </Pressable>
        )}
        {!editing && !!(isUser ? message.content : answer) && (
          <Pressable
            onPress={handleCopy}
            className="flex-row items-center gap-1"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Copied to clipboard' : 'Copy message'}
          >
            {copied ? (
              <Check size={12} color="#63A93B" strokeWidth={2.4} />
            ) : (
              <Copy size={12} color="#71717A" strokeWidth={2} />
            )}
            <Text className="text-xs text-ink-muted-light dark:text-ink-muted">{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
