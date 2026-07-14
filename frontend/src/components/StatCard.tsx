import { useRef } from 'react';
import { useTilt } from '../hooks/useTilt';
import { useSpotlight } from '../hooks/useSpotlight';
import { useCountUp } from '../hooks/useCountUp';

export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  suffixLabel,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  suffixLabel?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const tilt = useTilt(cardRef);
  const spot = useSpotlight(cardRef);
  const count = useCountUp(value);

  return (
    <div
      ref={cardRef}
      className="glass tilt-card spotlight rounded-2xl p-5 flex flex-col gap-2 relative"
      {...tilt}
      {...spot}
    >
      <div className="flex items-center gap-3 text-slate-500">
        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
          <Icon size={18} />
        </div>
        <span className="text-sm font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-extrabold text-gradient leading-tight">
        {new Intl.NumberFormat('ru-RU').format(count)}{suffix}
      </div>
      {suffixLabel && <div className="text-xs text-slate-500 font-medium">{suffixLabel}</div>}
    </div>
  );
}
