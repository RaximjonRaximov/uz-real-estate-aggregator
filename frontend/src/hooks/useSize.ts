import { useEffect, useRef, useState } from 'react';

export function useSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize({ width: Math.max(width, 300), height: Math.max(height, 300) });
    };
    update();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return [ref, size] as const;
}
