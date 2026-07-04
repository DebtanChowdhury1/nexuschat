import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Android-only measured keyboard height, applied as manual bottom padding
 * on the chat screen instead of KeyboardAvoidingView. Android's
 * windowSoftInputMode behaves inconsistently inside Expo Go — behavior
 * 'height' on top of an already-resized window double-subtracts the
 * keyboard height and can push the input fully off-screen, while
 * `undefined` leaves it hidden behind the keyboard entirely. Measuring the
 * keyboard directly and applying padding ourselves sidesteps guessing which
 * resize mode is active. iOS keeps using KeyboardAvoidingView's 'padding'
 * behavior, which is reliable there.
 *
 * This only accounts for the chat screen's own content — the app shell's
 * bottom tab bar is a separate, keyboard-unaware sibling (see
 * useAndroidKeyboardVisible, used to hide it while typing) that would
 * otherwise eat into this same space and leave a gap between the input and
 * the keyboard.
 */
export function useAndroidKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/** Whether the keyboard is currently visible — Android-only, see useAndroidKeyboardHeight. */
export function useAndroidKeyboardVisible(): boolean {
  return useAndroidKeyboardHeight() > 0;
}
