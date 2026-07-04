import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export async function copyToClipboard(text: string): Promise<void> {
  if (Platform.OS === 'web' && navigator?.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    await Clipboard.setStringAsync(text);
  }
}
