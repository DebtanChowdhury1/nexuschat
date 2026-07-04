import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Sets the browser tab title on web; a no-op on native, which has no tab to title. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const previous = document.title;
    document.title = title ? `${title} · NexusChat` : 'NexusChat';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
