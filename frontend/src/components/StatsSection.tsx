import { MapPin, Layers, Banknote, Home, Building2 } from 'lucide-react';
import { StatCard } from './StatCard';
import { PriceChart } from './PriceChart';
import { RegionCards } from './RegionCards';
import { useInView } from '../hooks/useInView';
import { formatPriceShort } from '../lib/utils';
import type { StatsSummary, RegionStat, PriceBucket, TypeStat } from '../types';

export function StatsSection({
  stats,
  regionStats,
  priceBuckets,
  typeStats,
}: {
  stats: StatsSummary | null;
  regionStats: RegionStat[];
  priceBuckets: PriceBucket[];
  typeStats: TypeStat[];
}) {
  const [ref, visible] = useInView<HTMLDivElement>();
  const saleCount = typeStats.find((t) => t.listing_type === 'sale')?.count ?? 0;
  const rentCount = typeStats.find((t) => t.listing_type === 'rent')?.count ?? 0;

  return (
    <section id="stats" ref={ref} className={`reveal ${visible ? 'visible' : ''} space-y-8`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami e'lonlar" value={stats?.total ?? 0} icon={Layers} />
        <StatCard label="O'rtacha narx" value={Math.round(stats?.avg_price_uzs ?? 0)} suffix="" icon={Banknote} suffixLabel={formatPriceShort(stats?.avg_price_uzs)} />
        <StatCard label="Sotish" value={saleCount} icon={Home} />
        <StatCard label="Ijara" value={rentCount} icon={Building2} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriceChart buckets={priceBuckets} />
        </div>
        <div className="glass rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <MapPin size={20} className="text-fuchsia-500" />
            <h3 className="font-bold text-slate-800">Hududlar bo'yicha</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[280px] space-y-2 pr-2">
            {regionStats.slice(0, 12).map((r) => (
              <div key={r.region} className="flex items-center justify-between p-3 rounded-xl bg-white/40 hover:bg-white/70 transition-colors">
                <div className="font-semibold text-slate-700 text-sm">{r.region}</div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold text-slate-500">{r.count}</div>
                  <div className="text-xs font-extrabold text-gradient-2">{formatPriceShort(r.avg_price_uzs)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RegionCards regions={regionStats.slice(0, 8)} />
    </section>
  );
}
