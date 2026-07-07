import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

/** Android-only measured keyboard height for small, local layout adjustments while the native window handles pan/resize. */
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

/**
 * Height for a spacer rendered after a bottom input.
 *
 * Android can either pan the whole app or resize the window depending on
 * native mode/Expo Go behavior. If the window already shrank, only keep the
 * requested visual gap. If it did not shrink, reserve the keyboard height
 * plus the gap so the input sits just above the keyboard.
 */
export function useAndroidKeyboardSpacer(gap = 10): number {
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const baselineHeight = useRef(windowHeight);

  useEffect(() => {
    if (keyboardHeight === 0) {
      baselineHeight.current = Math.max(baselineHeight.current, windowHeight);
    }
  }, [keyboardHeight, windowHeight]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS !== 'android' || keyboardHeight === 0) return 0;
  const resizedBy = Math.max(0, baselineHeight.current - windowHeight);
  const neededSpace = Math.max(gap, keyboardHeight - resizedBy + gap);
  return Math.min(18, neededSpace);
}
