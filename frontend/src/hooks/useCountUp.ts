import { useEffect, useRef, useState } from 'react';

export function useCountUp(target = 0, duration = 1500) {
  const [value, setValue] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    let raf: number;
    const step = (ts: number) => {
      if (start.current == null) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
