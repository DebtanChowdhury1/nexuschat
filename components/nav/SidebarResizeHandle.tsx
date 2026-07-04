import { useRef } from 'react';
import { View, Platform } from 'react-native';

import { useUiStore } from '../../store/uiStore';

/**
 * Thin drag handle on the sidebar's right edge — web only (mouse-drag
 * resize doesn't map cleanly to touch, and the sidebar itself is hidden on
 * narrow/mobile layouts anyway).
 */
export function SidebarResizeHandle() {
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  if (Platform.OS !== 'web') return null;

  const handlePointerDown = (e: any) => {
    startXRef.current = e.nativeEvent.pageX ?? e.nativeEvent.clientX ?? 0;
    startWidthRef.current = useUiStore.getState().sidebarWidth;

    const onMove = (moveEvent: PointerEvent) => {
      const currentX = moveEvent.pageX || moveEvent.clientX || 0;
      setSidebarWidth(startWidthRef.current + (currentX - startXRef.current));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const webOnlyStyle = {
    width: 6,
    marginLeft: -3,
    cursor: 'col-resize',
    touchAction: 'none',
  } as unknown as import('react-native').ViewStyle;

  return (
    <View
      onPointerDown={handlePointerDown}
      style={webOnlyStyle}
      className="z-10 h-full active:bg-brand/30 hover:bg-brand/20"
    />
  );
}
