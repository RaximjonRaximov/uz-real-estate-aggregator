import { Zap, TrendingUp, Layers, Banknote, MapPin, ArrowRight } from 'lucide-react';
import { GlobeSection } from './GlobeSection';
import { useInView } from '../hooks/useInView';
import type { RegionStat } from '../types';

export function Hero({ regions }: { regions: RegionStat[] }) {
  const [ref, visible] = useInView<HTMLDivElement>();

  return (
    <section className="grid lg:grid-cols-2 gap-10 items-center min-h-[520px]">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm font-bold text-violet-600">
          <Zap size={14} className="text-amber-500" />
          Haqiqiy OLX.uz ma'lumotlari bilan
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-balance leading-[1.1]">
          O'zbekiston ko'chmas <span className="text-gradient">mulk narxlarini</span> kuzating
        </h1>
        <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
          Sotish va ijaraga berish e'lonlarini bitta hududdan qidiring. Narx statistikasi, 3D globus va interaktiv xarita — barchasi tez, zamonaviy va AI-siz.
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          <a href="#listings" className="neo-btn">
            E'lonlarni ko'rish <ArrowRight size={18} />
          </a>
          <a href="#map" className="neo-btn-secondary">
            <MapPin size={18} /> Xaritada ko'rish
          </a>
        </div>
        <div className="flex flex-wrap gap-6 pt-4 text-sm font-semibold text-slate-600">
          <div className="flex items-center gap-2"><TrendingUp size={18} className="text-cyan-500" /> <span>Real vaqt narxlar</span></div>
          <div className="flex items-center gap-2"><Layers size={18} className="text-fuchsia-500" /> <span>3D vizualizatsiya</span></div>
          <div className="flex items-center gap-2"><Banknote size={18} className="text-lime-500" /> <span>Pul birliklari</span></div>
        </div>
      </div>

      <div ref={ref} className={`reveal ${visible ? 'visible' : ''} rounded-3xl`}>
        <GlobeSection regions={regions} />
      </div>
    </section>
  );
}
