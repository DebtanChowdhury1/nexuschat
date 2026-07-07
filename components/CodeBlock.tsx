import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { tokenizeCode, type TokenType } from '../lib/highlightCode';

// Atom One Dark / One Light palettes — recognizable, and tuned separately
// per mode since the block's background follows the app theme rather than
// always being dark like most code viewers.
const PALETTE: Record<'dark' | 'light', Record<TokenType, string>> = {
  dark: { keyword: '#C678DD', string: '#98C379', comment: '#7A7E8C', number: '#D19A66', plain: '#DCDFE4' },
  light: { keyword: '#A626A4', string: '#50A14F', comment: '#8B8D95', number: '#986801', plain: '#383A42' },
};

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = PALETTE[isDark ? 'dark' : 'light'];

  const tokens = useMemo(() => tokenizeCode(code), [code]);

  const handleCopy = async () => {
    if (Platform.OS === 'web' && navigator?.clipboard) {
      await navigator.clipboard.writeText(code);
    } else {
      await Clipboard.setStringAsync(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View
      style={{ maxWidth: '100%' }}
      className="my-2 overflow-hidden rounded-lg border border-border-light bg-black/[0.04] dark:border-border dark:bg-black/40"
    >
      <View className="flex-row items-center justify-between border-b border-border-light px-3 py-1.5 dark:border-border">
        <Text className="text-xs text-ink-muted-light dark:text-ink-muted">{language || 'text'}</Text>
        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Copied code to clipboard' : 'Copy code'}
          className="flex-row items-center gap-1.5"
        >
          {copied ? (
            <Check size={13} color="#63A93B" strokeWidth={2.4} />
          ) : (
            <Copy size={13} color="#FF8F6B" strokeWidth={2} />
          )}
          <Text className="text-xs text-brand-light">{copied ? 'Copied!' : 'Copy'}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: '100%' }}>
        <Text
          selectable
          style={{ fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }) }}
          className="p-3 text-sm leading-5"
        >
          {tokens.map((token, i) => (
            <Text key={i} style={{ color: palette[token.type] }}>
              {token.text}
            </Text>
          ))}
        </Text>
      </ScrollView>
    </View>
  );
}
