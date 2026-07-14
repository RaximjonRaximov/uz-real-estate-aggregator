import React, { useEffect, useMemo, useRef, useState, useCallback, Children, cloneElement, isValidElement } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Globe from 'react-globe.gl';
import {
  Search,
  Home,
  MapPin,
  Banknote,
  TrendingUp,
  Filter,
  Layers,
  Building2,
  Sparkles,
  MousePointer2,
  Globe as GlobeIcon,
  Zap,
  BarChart3,
} from 'lucide-react';

const api = axios.create({ baseURL: '/api' });

interface Listing {
  id: number;
  external_id: string;
  source: string;
  source_url: string;
  title: string;
  description?: string;
  listing_type: 'sale' | 'rent';
  property_type: 'apartment' | 'house' | 'land' | 'commercial';
  region?: string;
  district?: string;
  address?: string;
  rooms?: number;
  area_sqm?: number;
  floor?: number;
  total_floors?: number;
  price_uzs?: number;
  price_usd?: number;
  currency: string;
  contact_phone?: string;
  lat?: number;
  lon?: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

interface StatsSummary {
  total: number;
  avg_price_uzs?: number;
  avg_price_usd?: number;
  min_price_uzs?: number;
  max_price_uzs?: number;
  regions: string[];
}

interface RegionStat {
  region: string;
  count: number;
  avg_price_uzs?: number;
  avg_area_sqm?: number;
}

interface PriceBucket {
  min: number;
  max: number;
  count: number;
}

interface Filters {
  q: string;
  region: string;
  district: string;
  listing_type: string;
  property_type: string;
  min_price: string;
  max_price: string;
  min_area: string;
  max_area: string;
  rooms: string;
}

const initialFilters: Filters = {
  q: '',
  region: '',
  district: '',
  listing_type: '',
  property_type: '',
  min_price: '',
  max_price: '',
  min_area: '',
  max_area: '',
  rooms: '',
};

const ACCENTS = ['#06b6d4', '#8b5cf6', '#d946ef', '#f59e0b', '#84cc16', '#fb7185'];

function formatPriceUZS(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  const v = Math.round(value);
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} mlrd so‘m`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln so‘m`;
  return v.toLocaleString('uz-UZ') + ' so‘m';
}

function formatPriceUSD(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return '$' + Math.round(value).toLocaleString('uz-UZ');
}

function AnimatedCounter({
  value,
  format,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1600;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, value]);

  const text = format ? format(display) : Math.round(display).toLocaleString('uz-UZ');
  return <span ref={ref}>{text}</span>;
}

function SpotlightCard({
  children,
  className = '',
  glow = 'cyan',
}: {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'rose' | 'violet' | 'lime';
}) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--x', `${e.clientX - rect.left}px`);
    target.style.setProperty('--y', `${e.clientY - rect.top}px`);
  };

  const glowMap = {
    cyan: '',
    rose: 'glass-card-rose',
    violet: '',
    lime: '',
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`glass-card ${glowMap[glow]} ${className}`}
    >
      {children}
    </motion.div>
  );
}

function TiltCard({
  children,
  className = '',
  glow = 'cyan',
}: {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'rose' | 'violet' | 'lime';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty('--x', `${x}px`);
    ref.current.style.setProperty('--y', `${y}px`);
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -7;
    const ry = ((x - cx) / cx) * 7;
    setStyle({
      transform: `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`,
    });
  };

  const handleLeave = () => {
    if (ref.current) {
      ref.current.style.setProperty('--x', '50%');
      ref.current.style.setProperty('--y', '50%');
    }
    setStyle({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)' });
  };

  const glowMap = {
    cyan: '',
    rose: 'glass-card-rose',
    violet: '',
    lime: '',
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      style={{ ...style, transformStyle: 'preserve-3d' }}
      className={`card-3d glass-card transition-transform duration-100 ease-out ${glowMap[glow]} ${className}`}
    >
      <div className="card-3d-content h-full w-full">{children}</div>
    </div>
  );
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [regionStats, setRegionStats] = useState<RegionStat[]>([]);
  const [priceDist, setPriceDist] = useState<PriceBucket[]>([]);
  const [globeSize, setGlobeSize] = useState(520);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setGlobeSize(width < 768 ? Math.min(width - 48, 360) : 520);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const buildParams = useCallback((f: Filters) => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    params.append('limit', '100');
    return params.toString();
  }, []);

  const fetchDashboard = useCallback(
    async (f: Filters) => {
      setLoading(true);
      setError(null);
      try {
        const [listRes, statsRes, regionRes, distRes] = await Promise.all([
          api.get(`/listings?${buildParams(f)}`),
          api.get('/stats/summary'),
          api.get('/stats/by-region'),
          api.get('/stats/price-distribution'),
        ]);
        setListings(listRes.data);
        setStats(statsRes.data);
        setRegionStats(regionRes.data);
        setPriceDist(distRes.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err.message || 'Xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  useEffect(() => {
    fetchDashboard(filters);
  }, [filters, fetchDashboard]);

  const globePoints = useMemo(
    () =>
      listings
        .filter((l) => typeof l.lat === 'number' && typeof l.lon === 'number')
        .map((l) => ({
          lat: l.lat,
          lon: l.lon,
          label: `${l.title}\n${formatPriceUZS(l.price_uzs)}`,
          color: l.listing_type === 'sale' ? '#06b6d4' : '#d946ef',
          radius: 0.55,
          altitude: 0.03,
        })),
    [listings]
  );

  const globeArcs = useMemo(() => {
    const tashkent: [number, number] = [41.2995, 69.2401];
    return listings
      .filter((l) => typeof l.lat === 'number' && typeof l.lon === 'number')
      .slice(0, 40)
      .map((l, i) => ({
        startLat: tashkent[0],
        startLng: tashkent[1],
        endLat: l.lat,
        endLng: l.lon,
        color: ACCENTS[i % ACCENTS.length],
        dash: Math.random() * 0.4 + 0.2,
      }));
  }, [listings]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const priceDistData = useMemo(() => {
    return priceDist.map((b) => ({
      label:
        b.min >= 1_000_000_000
          ? `${(b.min / 1_000_000_000).toFixed(0)}B`
          : `${(b.min / 1_000_000).toFixed(0)}M`,
      count: b.count,
    }));
  }, [priceDist]);

  const regionData = useMemo(() => {
    return regionStats
      .map((r) => ({
        name: r.region,
        avg: r.avg_price_uzs ? r.avg_price_uzs / 1_000_000 : 0,
        count: r.count,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 12);
  }, [regionStats]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.district) set.add(l.district);
    });
    return Array.from(set).sort();
  }, [listings]);

  const mapCenter: LatLngExpression = [41.2995, 69.2401];

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-900">
      {/* Digital aurora background */}
      <div className="fixed inset-0 -z-20 digital-grid opacity-60" />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-cyan-400/30 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 22, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full bg-fuchsia-500/25 blur-[140px]"
        />
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          className="absolute -bottom-40 left-1/3 w-[550px] h-[550px] rounded-full bg-lime-400/20 blur-[120px]"
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-2xl"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
              <Home size={22} />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              Uz<span className="gradient-text">Realty</span>
              <span className="text-slate-400 font-light">.ag</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#globe" className="hover:text-cyan-600 transition">Globus</a>
            <a href="#filters" className="hover:text-cyan-600 transition">Qidiruv</a>
            <a href="#map" className="hover:text-cyan-600 transition">Xarita</a>
            <a href="#listings" className="hover:text-cyan-600 transition">E’lonlar</a>
          </nav>
          <a href="#filters" className="neo-btn text-sm py-2 px-4">
            <Zap size={16} /> Topish
          </a>
        </div>
      </motion.header>

      <main className="pt-24">
        {/* Hero */}
        <section className="relative max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-7"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-cyan-200 text-cyan-700 text-xs font-semibold shadow-sm"
              >
                <Sparkles size={14} />
                Yangi "Digital Aurora" interfeys
              </motion.div>

              <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tight">
                O‘zbekiston ko‘chmas mulk{' '}
                <span className="gradient-text text-glow">3D tahlil va narxlari</span>
              </h1>

              <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
                Yorqin, interaktiv va zamonaviy platforma. Barcha mintaqalardagi uy-joy
                e’lonlarini 3D globus va xaritada ko‘ring, solishtiring, eng mosini toping.
              </p>

              <div className="flex flex-wrap gap-4">
                <a href="#filters" className="neo-btn">
                  <Search size={18} /> Qidirish
                </a>
                <a href="#map" className="neo-btn-secondary">
                  <MapPin size={18} /> Xaritada ko‘rish
                </a>
              </div>

              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <HeroStat label="E’lonlar" value={stats.total} icon={<Layers size={18} />} />
                  <HeroStat label="O‘rtacha narx" value={stats.avg_price_uzs || 0} format={formatPriceUZS} icon={<Banknote size={18} />} />
                  <HeroStat label="O‘rtacha $" value={stats.avg_price_usd || 0} format={formatPriceUSD} icon={<TrendingUp size={18} />} />
                  <HeroStat label="Mintaqa" value={stats.regions.length} icon={<GlobeIcon size={18} />} />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative flex justify-center"
            >
              <SpotlightCard className="p-2 rounded-3xl shadow-glow-cyan" glow="cyan">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-50 to-violet-50">
                  <Globe
                    width={globeSize}
                    height={globeSize}
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
                    backgroundColor="rgba(248,250,252,0)"
                    atmosphereColor="#38bdf8"
                    atmosphereAltitude={0.2}
                    pointsData={globePoints}
                    pointLat="lat"
                    pointLng="lon"
                    pointLabel="label"
                    pointColor="color"
                    pointRadius="radius"
                    pointAltitude="altitude"
                    arcsData={globeArcs}
                    arcStartLat="startLat"
                    arcStartLng="startLng"
                    arcEndLat="endLat"
                    arcEndLng="endLng"
                    arcColor="color"
                    arcStroke={1.2}
                    arcDashLength={0.4}
                    arcDashGap={0.2}
                    arcDashAnimateTime={2200}
                  />
                </div>
              </SpotlightCard>

              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 md:top-4 md:-right-8 glass-card px-4 py-2 text-sm font-bold text-cyan-700 shadow-glow-cyan"
              >
                120+ e’lon
              </motion.div>
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-4 md:bottom-8 md:-left-8 glass-card px-4 py-2 text-sm font-bold text-fuchsia-700 shadow-glow-rose"
              >
                14 mintaqa
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <TiltCard glow="cyan">
              <div className="p-6 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-cyan-100 text-cyan-600">
                  <Layers size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Jami e’lonlar</p>
                  <p className="text-3xl font-black text-slate-800 mt-1">
                    <AnimatedCounter value={stats?.total || 0} />
                  </p>
                </div>
              </div>
            </TiltCard>
            <TiltCard glow="violet">
              <div className="p-6 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-violet-100 text-violet-600">
                  <Banknote size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">O‘rtacha narx</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    <AnimatedCounter value={stats?.avg_price_uzs || 0} format={formatPriceUZS} />
                  </p>
                </div>
              </div>
            </TiltCard>
            <TiltCard glow="rose">
              <div className="p-6 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">O‘rtacha $</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    <AnimatedCounter value={stats?.avg_price_usd || 0} format={formatPriceUSD} />
                  </p>
                </div>
              </div>
            </TiltCard>
            <TiltCard glow="lime">
              <div className="p-6 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-lime-100 text-lime-600">
                  <Building2 size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Mintaqa</p>
                  <p className="text-3xl font-black text-slate-800 mt-1">
                    <AnimatedCounter value={stats?.regions.length || 0} />
                  </p>
                </div>
              </div>
            </TiltCard>
          </div>
        </section>

        {/* Filters */}
        <section id="filters" className="max-w-7xl mx-auto px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-md">
                <Filter size={20} />
              </div>
              <h2 className="text-2xl font-bold">Qidiruv filtrlari</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1 lg:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Qidiruv</label>
                <div className="relative group">
                  <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-cyan-500 transition" size={18} />
                  <input
                    type="text"
                    placeholder="Sarlavha, tavsif, manzil..."
                    value={filters.q}
                    onChange={(e) => updateFilter('q', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition"
                  />
                </div>
              </div>

              <FilterField label="Mintaqa">
                <select value={filters.region} onChange={(e) => updateFilter('region', e.target.value)}>
                  <option value="">Barchasi</option>
                  {stats?.regions.map((r) => <option value={r} key={r}>{r}</option>)}
                </select>
              </FilterField>

              <FilterField label="Tuman / Shahar">
                <select value={filters.district} onChange={(e) => updateFilter('district', e.target.value)}>
                  <option value="">Barchasi</option>
                  {districts.map((d) => <option value={d} key={d}>{d}</option>)}
                </select>
              </FilterField>

              <FilterField label="Tur (sotish/ijara)">
                <select value={filters.listing_type} onChange={(e) => updateFilter('listing_type', e.target.value)}>
                  <option value="">Barchasi</option>
                  <option value="sale">Sotiladi</option>
                  <option value="rent">Ijaraga</option>
                </select>
              </FilterField>

              <FilterField label="Mulk turi">
                <select value={filters.property_type} onChange={(e) => updateFilter('property_type', e.target.value)}>
                  <option value="">Barchasi</option>
                  <option value="apartment">Kvartira</option>
                  <option value="house">Hovli</option>
                  <option value="land">Yer uchastkasi</option>
                  <option value="commercial">Tijorat binosi</option>
                </select>
              </FilterField>

              <FilterField label="Xonalar">
                <select value={filters.rooms} onChange={(e) => updateFilter('rooms', e.target.value)}>
                  <option value="">Barchasi</option>
                  {[1, 2, 3, 4, 5, '6+'].map((r) => (
                    <option value={r.toString()} key={r}>{r} xona</option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Min narx (so‘m)">
                <input type="number" placeholder="0" value={filters.min_price} onChange={(e) => updateFilter('min_price', e.target.value)} />
              </FilterField>

              <FilterField label="Max narx (so‘m)">
                <input type="number" placeholder="∞" value={filters.max_price} onChange={(e) => updateFilter('max_price', e.target.value)} />
              </FilterField>

              <FilterField label="Min maydon (m²)">
                <input type="number" placeholder="0" value={filters.min_area} onChange={(e) => updateFilter('min_area', e.target.value)} />
              </FilterField>

              <FilterField label="Max maydon (m²)">
                <input type="number" placeholder="∞" value={filters.max_area} onChange={(e) => updateFilter('max_area', e.target.value)} />
              </FilterField>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setFilters(initialFilters)}
                className="text-sm font-medium text-slate-500 hover:text-cyan-600 underline underline-offset-4 transition"
              >
                Filtrlarni tozalash
              </button>
            </div>
          </motion.div>
        </section>

        {/* Charts */}
        <section className="max-w-7xl mx-auto px-4 pb-10">
          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="text-cyan-500" size={22} />
                <h3 className="text-lg font-bold">Mintaqa bo‘yicha o‘rtacha narx</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionData} margin={{ top: 10, right: 20, left: 0, bottom: 70 }}>
                    <defs>
                      <linearGradient id="gradRegion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      angle={-40}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                      formatter={(v: number) => [`${v.toFixed(1)} mln so‘m`, 'O‘rtacha narx']}
                    />
                    <Bar dataKey="avg" radius={[8, 8, 0, 0]} fill="url(#gradRegion)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <MousePointer2 className="text-fuchsia-500" size={22} />
                <h3 className="text-lg font-bold">Narx oralig‘i bo‘yicha taqsimot</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceDistData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                    <defs>
                      <linearGradient id="gradDist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#84cc16" />
                        <stop offset="100%" stopColor="#d946ef" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                      formatter={(v: number) => [v, 'E’lonlar soni']}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="url(#gradDist)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Map */}
        <section id="map" className="max-w-7xl mx-auto px-4 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <MapPin size={20} />
              </div>
              <h3 className="text-2xl font-bold">Interaktiv xarita</h3>
            </div>
            <div className="h-[520px] w-full rounded-2xl overflow-hidden shadow-inner bg-slate-100">
              <MapContainer center={mapCenter} zoom={6} scrollWheelZoom className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {listings
                  .filter((l) => typeof l.lat === 'number' && typeof l.lon === 'number')
                  .map((l) => (
                    <CircleMarker
                      key={l.id}
                      center={[l.lat!, l.lon!]}
                      radius={7}
                      pathOptions={{
                        color: '#fff',
                        weight: 2,
                        fillColor: l.listing_type === 'sale' ? '#06b6d4' : '#d946ef',
                        fillOpacity: 0.9,
                      }}
                    >
                      <Popup>
                        <div className="min-w-[200px] text-slate-800">
                          <h4 className="font-bold text-base mb-1">{l.title}</h4>
                          <p className="text-sm text-slate-500 mb-2">{l.address}</p>
                          <p className="font-bold text-cyan-600 text-lg">{formatPriceUZS(l.price_uzs)}</p>
                          <p className="text-sm text-slate-500">
                            {l.rooms ? `${l.rooms} xona` : ''} {l.area_sqm ? `• ${l.area_sqm} m²` : ''}
                          </p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
              </MapContainer>
            </div>
          </motion.div>
        </section>

        {/* Listings */}
        <section id="listings" className="max-w-7xl mx-auto px-4 pb-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-black"
            >
              So‘nggi <span className="gradient-text">e’lonlar</span>
            </motion.h2>
            <div className="flex items-center gap-3">
              {loading && (
                <span className="text-sm text-slate-500 animate-pulse">Yuklanmoqda...</span>
              )}
              <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-sm font-semibold">
                {listings.length} ta natija
              </span>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 mb-6">
              {error}
            </div>
          )}

          <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {listings.map((l) => (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.35 }}
                >
                  <ListingCard listing={l} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {!loading && listings.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="text-xl font-bold text-slate-700">Hech qanday e’lon topilmadi</p>
              <p className="text-slate-500">Filtrlarni o‘zgartirib ko‘ring</p>
            </motion.div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/60 bg-white/60 backdrop-blur-xl py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p className="font-semibold text-slate-700 mb-1">UzRealty.ag</p>
          <p>© {new Date().getFullYear()} — O‘zbekiston ko‘chmas mulk 3D agregatori</p>
        </div>
      </footer>
    </div>
  );
}

function HeroStat({
  label,
  value,
  icon,
  format,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  format?: (n: number) => string;
}) {
  return (
    <div className="glass-card p-3 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-100 text-cyan-600">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
        <p className="text-base font-bold text-slate-800">
          <AnimatedCounter value={value} format={format} />
        </p>
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-white/80 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition';
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {Children.map(children, (child) =>
        isValidElement(child)
          ? cloneElement(child as React.ReactElement<{ className?: string }>, { className: inputClass })
          : child
      )}
    </div>
  );
}

function ListingCard({ listing: l }: { listing: Listing }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--x', `${e.clientX - rect.left}px`);
    target.style.setProperty('--y', `${e.clientY - rect.top}px`);
  };

  const typeColors: Record<string, string> = {
    apartment: 'bg-cyan-100 text-cyan-700',
    house: 'bg-violet-100 text-violet-700',
    land: 'bg-lime-100 text-lime-700',
    commercial: 'bg-amber-100 text-amber-700',
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-card h-full flex flex-col group"
    >
      <div className="h-44 relative overflow-hidden rounded-t-2xl">
        <img
          src={l.image_url}
          alt={l.title}
          className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
        <span
          className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold ${
            l.listing_type === 'sale'
              ? 'bg-cyan-500 text-white shadow-glow-cyan'
              : 'bg-fuchsia-500 text-white shadow-glow-rose'
          }`}
        >
          {l.listing_type === 'sale' ? 'Sotiladi' : 'Ijaraga'}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h4 className="font-bold text-lg leading-snug mb-2 line-clamp-2" title={l.title}>
          {l.title}
        </h4>
        <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
          <MapPin size={14} className="text-cyan-500" />
          <span className="truncate">{l.district || l.region || '—'}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {l.rooms ? (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
              {l.rooms} xona
            </span>
          ) : null}
          {l.area_sqm ? (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
              {l.area_sqm} m²
            </span>
          ) : null}
          {l.floor ? (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
              {l.floor}/{l.total_floors} q
            </span>
          ) : null}
          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${typeColors[l.property_type] || 'bg-slate-100 text-slate-600'}`}>
            {l.property_type}
          </span>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100">
          <p className="text-xl font-black gradient-text">{formatPriceUZS(l.price_uzs)}</p>
          <p className="text-sm text-slate-500">{formatPriceUSD(l.price_usd)}</p>
        </div>
      </div>
    </motion.div>
  );
}
