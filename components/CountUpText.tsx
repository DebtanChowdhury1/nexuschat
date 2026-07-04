import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';

const EASE_OUT_EXPO = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Cross-platform (no framer-motion) count-up — plain rAF loop, works on native and web alike. */
export function CountUpText({ value, duration = 900, ...rest }: { value: number; duration?: number } & TextProps) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = Date.now();
    let frame: ReturnType<typeof requestAnimationFrame>;

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      setDisplay(Math.round(from + (value - from) * EASE_OUT_EXPO(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    fromRef.current = value;
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <Text {...rest}>{display}</Text>;
}
