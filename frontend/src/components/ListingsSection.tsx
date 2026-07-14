import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronDown, RefreshCw } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { ListingCard } from './ListingCard';
import { api } from '../lib/api';
import type { Listing, Filters, StatsSummary } from '../types';

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

export function ListingsSection({ stats }: { stats: StatsSummary | null }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchListings = useCallback(async (p = 0, append = false) => {
    setLoading(true);
    const params: any = { skip: p * 24, limit: 24 };
    if (filters.q) params.q = filters.q;
    if (filters.region) params.region = filters.region;
    if (filters.district) params.district = filters.district;
    if (filters.listing_type) params.listing_type = filters.listing_type;
    if (filters.property_type) params.property_type = filters.property_type;
    if (filters.min_price) params.min_price = filters.min_price;
    if (filters.max_price) params.max_price = filters.max_price;
    if (filters.min_area) params.min_area = filters.min_area;
    if (filters.max_area) params.max_area = filters.max_area;
    if (filters.rooms) params.rooms = filters.rooms;

    try {
      const { data } = await api.get('/listings', { params });
      setListings((prev) => (append ? [...prev, ...data] : data));
      setHasMore(data.length === 24);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setPage(0);
    fetchListings(0, false);
  }, [fetchListings]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchListings(next, true);
  };

  return (
    <section id="listings" className="space-y-6">
      <FilterPanel filters={filters} onChange={setFilters} regions={stats?.regions ?? []} />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800">
          E'lonlar <span className="text-gradient">({listings.length})</span>
        </h2>
        {loading && <RefreshCw size={20} className="text-violet-500 animate-spin" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>

      {!loading && listings.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <Search size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-semibold">Hech narsa topilmadi</p>
          <p>Filtrlarni o'zgartirib qayta urinib ko'ring.</p>
        </div>
      )}

      {hasMore && listings.length > 0 && (
        <div className="flex justify-center pt-6">
          <button onClick={loadMore} disabled={loading} className="neo-btn">
            {loading ? 'Yuklanmoqda...' : "Yana ko'rsatish"} <ChevronDown size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
