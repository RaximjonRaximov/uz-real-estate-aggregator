import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
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
  ArrowRight,
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

function formatPriceUZS(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} mlrd so‘m`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mln so‘m`;
  return value.toLocaleString('uz-UZ') + ' so‘m';
}

function formatPriceUSD(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return '$' + value.toLocaleString('uz-UZ');
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

export default function App() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [regionStats, setRegionStats] = useState<RegionStat[]>([]);
  const [priceDist, setPriceDist] = useState<PriceBucket[]>([]);
  const [globeSize, setGlobeSize] = useState(500);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setGlobeSize(width < 768 ? Math.min(width - 32, 360) : 520);
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

  const fetchDashboard = useCallback(async (f: Filters) => {
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
  }, [buildParams]);

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
          color: l.listing_type === 'sale' ? '#34d399' : '#60a5fa',
          radius: 0.5,
          altitude: 0.04,
          price: l.price_uzs || 0,
        })),
    [listings]
  );

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Home size={22} />
            </div>
            <h1 className="text-lg md:text-xl font-bold gradient-text hidden sm:block">
              UzRealty<span className="text-slate-300">.ag</span>
            </h1>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-400">
            <a href="#globe" className="hover:text-indigo-300 transition">3D Globus</a>
            <a href="#filters" className="hover:text-indigo-300 transition">Qidiruv</a>
            <a href="#map" className="hover:text-indigo-300 transition">Xarita</a>
            <a href="#listings" className="hover:text-indigo-300 transition">E’lonlar</a>
          </nav>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero + 3D Globe */}
        <section
          id="globe"
          className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-slate-950 to-slate-900"
        >
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-medium border border-indigo-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Yangi versiya — 3D + narx statistikasi
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
                O‘zbekiston ko‘chmas mulk{' '}
                <span className="gradient-text">narxlari va tahlili</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-lg">
                Barcha mintaqalardagi uy-joy e’lonlarini bir joyda to‘plang, solishtiring va
                qulay filtrlar orqali eng mos variantni toping.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#filters"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                >
                  Qidirish <ArrowRight size={18} />
                </a>
                <a
                  href="#map"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass text-slate-200 hover:bg-white/10 transition"
                >
                  <MapPin size={18} /> Xaritada ko‘rish
                </a>
              </div>

              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <StatCard label="E’lonlar" value={stats.total.toString()} icon={<Layers size={18} />} />
                  <StatCard label="O‘rtacha narx" value={formatPriceUZS(stats.avg_price_uzs)} icon={<Banknote size={18} />} />
                  <StatCard label="O‘rtacha $" value={formatPriceUSD(stats.avg_price_usd)} icon={<TrendingUp size={18} />} />
                  <StatCard label="Mintaqa" value={stats.regions.length.toString()} icon={<MapPin size={18} />} />
                </div>
              )}
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative rounded-2xl overflow-hidden glass p-2 shadow-2xl">
                <Globe
                  width={globeSize}
                  height={globeSize}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                  backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                  atmosphereColor="#818cf8"
                  atmosphereAltitude={0.15}
                  pointsData={globePoints}
                  pointLat="lat"
                  pointLng="lon"
                  pointLabel="label"
                  pointColor="color"
                  pointRadius="radius"
                  pointAltitude="altitude"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section id="filters" className="max-w-7xl mx-auto px-4 py-10">
          <div className="glass rounded-2xl p-5 md:p-6 space-y-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Filter size={20} className="text-indigo-400" />
              <h3>Filtrlar</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Qidiruv</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Sarlavha, tavsif, manzil..."
                    value={filters.q}
                    onChange={(e) => updateFilter('q', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Mintaqa</label>
                <select
                  value={filters.region}
                  onChange={(e) => updateFilter('region', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Barcha mintaqalar</option>
                  {stats?.regions.map((r) => (
                    <option value={r} key={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Tuman / Shahar</label>
                <select
                  value={filters.district}
                  onChange={(e) => updateFilter('district', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Barcha tumanlar</option>
                  {districts.map((d) => (
                    <option value={d} key={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Tur (sotish/ijara)</label>
                <select
                  value={filters.listing_type}
                  onChange={(e) => updateFilter('listing_type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Barchasi</option>
                  <option value="sale">Sotish</option>
                  <option value="rent">Ijara</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Ko‘chmas mulk turi</label>
                <select
                  value={filters.property_type}
                  onChange={(e) => updateFilter('property_type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Barchasi</option>
                  <option value="apartment">Kvartira</option>
                  <option value="house">Hovli</option>
                  <option value="land">Yer uchastkasi</option>
                  <option value="commercial">Tijorat binosi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Xonalar soni</label>
                <select
                  value={filters.rooms}
                  onChange={(e) => updateFilter('rooms', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Barchasi</option>
                  {[1, 2, 3, 4, 5, '6+'].map((r) => (
                    <option value={r.toString()} key={r}>
                      {r} xona
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Min narx (so‘m)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.min_price}
                  onChange={(e) => updateFilter('min_price', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Max narx (so‘m)</label>
                <input
                  type="number"
                  placeholder="∞"
                  value={filters.max_price}
                  onChange={(e) => updateFilter('max_price', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Min maydon (m²)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.min_area}
                  onChange={(e) => updateFilter('min_area', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Max maydon (m²)</label>
                <input
                  type="number"
                  placeholder="∞"
                  value={filters.max_area}
                  onChange={(e) => updateFilter('max_area', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setFilters(initialFilters)}
                className="text-sm text-slate-400 hover:text-white underline underline-offset-4"
              >
                Filtrni tozalash
              </button>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="max-w-7xl mx-auto px-4 pb-10">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-lg font-semibold mb-4">Mintaqa bo‘yicha o‘rtacha narx (mln so‘m)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                      formatter={(v: number) => [`${v.toFixed(1)} mln so‘m`, 'O‘rtacha narx']}
                    />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                      {regionData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={i % 2 === 0 ? '#6366f1' : '#38bdf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="text-lg font-semibold mb-4">Narx oralig‘i bo‘yicha taqsimot</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceDistData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
                    <YAxis tick={{ fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                      formatter={(v: number) => [v, 'E’lonlar soni']}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Map */}
        <section id="map" className="max-w-7xl mx-auto px-4 pb-10">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-emerald-400" /> Xarita — e’lonlar joylashuvi
            </h3>
            <div className="h-[500px] w-full rounded-xl overflow-hidden">
              <MapContainer center={mapCenter} zoom={6} scrollWheelZoom className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {listings
                  .filter((l) => typeof l.lat === 'number' && typeof l.lon === 'number')
                  .map((l) => (
                    <CircleMarker
                      key={l.id}
                      center={[l.lat!, l.lon!]}
                      radius={6}
                      pathOptions={{
                        color: l.listing_type === 'sale' ? '#34d399' : '#60a5fa',
                        fillColor: l.listing_type === 'sale' ? '#34d399' : '#60a5fa',
                        fillOpacity: 0.85,
                        weight: 1,
                      }}
                    >
                      <Popup>
                        <div className="text-slate-900 min-w-[200px]">
                          <h4 className="font-semibold">{l.title}</h4>
                          <p className="text-sm text-slate-600">{l.address}</p>
                          <p className="font-bold mt-1">{formatPriceUZS(l.price_uzs)}</p>
                          <p className="text-sm text-slate-500">
                            {l.rooms ? `${l.rooms} xona` : ''} {l.area_sqm ? `• ${l.area_sqm} m²` : ''}
                          </p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
              </MapContainer>
            </div>
          </div>
        </section>

        {/* Listings */}
        <section id="listings" className="max-w-7xl mx-auto px-4 pb-20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">E’lonlar</h3>
            {loading && <span className="text-slate-400">Yuklanmoqda...</span>}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 mb-6">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((l) => (
              <div
                key={l.id}
                className="glass rounded-2xl overflow-hidden hover:-translate-y-1 transition duration-300 group"
              >
                <div className="h-40 bg-slate-800 relative overflow-hidden">
                  <img
                    src={l.image_url}
                    alt={l.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-300"
                    loading="lazy"
                  />
                  <span
                    className={`absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-medium ${
                      l.listing_type === 'sale'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                    }`}
                  >
                    {l.listing_type === 'sale' ? 'Sotiladi' : 'Ijaraga'}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <h4 className="font-semibold line-clamp-2" title={l.title}>
                    {l.title}
                  </h4>
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <MapPin size={14} />
                    <span className="truncate">{l.district || l.region || '—'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    {l.rooms ? (
                      <span className="px-2 py-1 rounded-md bg-slate-800">{l.rooms} xona</span>
                    ) : null}
                    {l.area_sqm ? (
                      <span className="px-2 py-1 rounded-md bg-slate-800">{l.area_sqm} m²</span>
                    ) : null}
                    {l.floor ? (
                      <span className="px-2 py-1 rounded-md bg-slate-800">{l.floor}/{l.total_floors} qavat</span>
                    ) : null}
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-lg font-bold text-emerald-400">{formatPriceUZS(l.price_uzs)}</p>
                    <p className="text-sm text-slate-400">{formatPriceUSD(l.price_usd)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && listings.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <p className="text-lg">Hech qanday e’lon topilmadi</p>
              <p className="text-sm">Filtrlarni o‘zgartirib ko‘ring</p>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} UzRealty.ag — O‘zbekiston ko‘chmas mulk agregatori</p>
      </footer>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-800 text-indigo-300">{icon}</div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-100">{value}</p>
      </div>
    </div>
  );
}
