import { Search, Filter, RefreshCw } from 'lucide-react';
import type { Filters } from '../types';

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

export function FilterPanel({
  filters,
  onChange,
  regions,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  regions: string[];
}) {
  const update = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-slate-600 mb-1">
        <Filter size={18} />
        <h3 className="font-bold text-slate-800">Filtrlash</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <input
          className="neo-input"
          placeholder="Qidiruv..."
          value={filters.q}
          onChange={(e) => update('q', e.target.value)}
        />
        <select className="neo-input" value={filters.region} onChange={(e) => update('region', e.target.value)}>
          <option value="">Barcha hududlar</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          className="neo-input"
          placeholder="Tuman"
          value={filters.district}
          onChange={(e) => update('district', e.target.value)}
        />
        <select className="neo-input" value={filters.listing_type} onChange={(e) => update('listing_type', e.target.value)}>
          <option value="">Sotish / Ijara</option>
          <option value="sale">Sotish</option>
          <option value="rent">Ijara</option>
        </select>
        <select className="neo-input" value={filters.property_type} onChange={(e) => update('property_type', e.target.value)}>
          <option value="">Barcha turlar</option>
          <option value="apartment">Kvartira</option>
          <option value="house">Uy / Hovli</option>
          <option value="land">Yer</option>
          <option value="commercial">Tijorat</option>
        </select>
        <select className="neo-input" value={filters.rooms} onChange={(e) => update('rooms', e.target.value)}>
          <option value="">Xonalar</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n} xona</option>
          ))}
        </select>
        <input
          className="neo-input"
          placeholder="Min narx (so'm)"
          type="number"
          value={filters.min_price}
          onChange={(e) => update('min_price', e.target.value)}
        />
        <input
          className="neo-input"
          placeholder="Max narx (so'm)"
          type="number"
          value={filters.max_price}
          onChange={(e) => update('max_price', e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <button className="neo-btn" onClick={() => onChange({ ...filters })}>
          <Search size={18} /> Qidirish
        </button>
        <button className="neo-btn-secondary" onClick={() => onChange(initialFilters)}>
          <RefreshCw size={16} /> Tozalash
        </button>
      </div>
    </div>
  );
}
