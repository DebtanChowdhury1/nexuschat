import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

/** Animates a number counting up from 0 to `value` whenever `value` changes. */
export function CountUp({ value, duration = 1.1 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return <>{display}</>;
}
