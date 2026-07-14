import { useCallback, type RefObject } from 'react';

export function useSpotlight(ref: RefObject<HTMLElement | null>) {
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      ref.current?.style.setProperty('--x', `${e.clientX - rect.left}px`);
      ref.current?.style.setProperty('--y', `${e.clientY - rect.top}px`);
    },
    [ref]
  );

  return { onMouseMove };
}
