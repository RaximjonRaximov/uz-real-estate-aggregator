import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useInView } from '../hooks/useInView';
import { formatPriceUZS, formatPriceShort } from '../lib/utils';
import type { PriceBucket } from '../types';

export function PriceChart({ buckets }: { buckets: PriceBucket[] }) {
  const [ref, visible] = useInView<HTMLDivElement>();
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div ref={ref} className="glass rounded-2xl p-5 h-80 flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-slate-700">
        <BarChart3 size={20} className="text-violet-500" />
        <h3 className="font-bold text-slate-800">Narx taqsimoti</h3>
      </div>
      <div className="flex-1 flex items-end gap-2 min-h-0">
        {buckets.map((b, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
            <div className="text-[10px] font-bold text-slate-500 h-5">{b.count}</div>
            <div
              className="bar w-full"
              style={{
                height: visible ? `${(b.count / max) * 100}%` : '0%',
                transitionDelay: `${i * 60}ms`,
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            <div className="text-[9px] text-slate-500 text-center leading-tight whitespace-nowrap">
              {formatPriceShort(b.min)}
            </div>
            {hover === i && (
              <div className="absolute bottom-full mb-2 z-10 glass px-3 py-2 rounded-lg text-xs font-semibold text-slate-700">
                {formatPriceUZS(b.min)} – {formatPriceUZS(b.max)}
                <br />
                <span className="text-violet-600">{b.count} ta e'lon</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
