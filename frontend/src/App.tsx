import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StatsSection } from './components/StatsSection';
import { ListingsSection } from './components/ListingsSection';
import { MapSection } from './components/MapSection';
import { Footer } from './components/Footer';
import { api } from './lib/api';
import type { Listing, StatsSummary, RegionStat, PriceBucket, TypeStat } from './types';

export default function App() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [regionStats, setRegionStats] = useState<RegionStat[]>([]);
  const [priceBuckets, setPriceBuckets] = useState<PriceBucket[]>([]);
  const [typeStats, setTypeStats] = useState<TypeStat[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    api.get('/stats/summary').then((r) => setStats(r.data));
    api.get('/stats/by-region').then((r) => setRegionStats(r.data));
    api.get('/stats/price-distribution').then((r) => setPriceBuckets(r.data));
    api.get('/stats/by-type').then((r) => setTypeStats(r.data));
    api.get('/listings', { params: { limit: 24 } }).then((r) => setListings(r.data));
  }, []);

  return (
    <div className="min-h-screen relative">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="mesh-grid" />

      <Header />

      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-20">
        <Hero regions={regionStats} />

        <StatsSection
          stats={stats}
          regionStats={regionStats}
          priceBuckets={priceBuckets}
          typeStats={typeStats}
        />

        <ListingsSection stats={stats} />

        <section id="map" className="space-y-6">
          <MapSection listings={listings} />
        </section>

        <section className="glass rounded-3xl p-8 md:p-12 text-center space-y-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow">Ko'proq imkoniyatlarga tayyormisiz?</h2>
            <p className="text-white/90 text-lg max-w-2xl mx-auto">
              Loyiha ochiq kodda. Yangi scraperlar, filtrlar va statistikani oson qo'shish mumkin.
            </p>
            <a
              href="https://github.com/RaximjonRaximov/uz-real-estate-aggregator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl bg-white text-violet-700 font-bold shadow-lg hover:scale-105 transition-transform"
            >
              GitHub'da ko'rish →
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
