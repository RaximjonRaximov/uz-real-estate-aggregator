import { useCallback, type RefObject } from 'react';

export function useTilt(ref: RefObject<HTMLElement | null>) {
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      el.style.setProperty('--rx', `${(0.5 - y) * 16}deg`);
      el.style.setProperty('--ry', `${(x - 0.5) * 16}deg`);
    },
    [ref]
  );

  const onMouseLeave = useCallback(() => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  }, [ref]);

  return { onMouseMove, onMouseLeave };
}
