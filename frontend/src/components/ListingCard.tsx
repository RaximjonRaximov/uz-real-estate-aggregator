import { useRef } from 'react';
import { Home, MapPin } from 'lucide-react';
import { useTilt } from '../hooks/useTilt';
import { useSpotlight } from '../hooks/useSpotlight';
import { formatPriceUZS } from '../lib/utils';
import type { Listing } from '../types';

export function ListingCard({ item }: { item: Listing }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const tilt = useTilt(cardRef);
  const spot = useSpotlight(cardRef);
  const price = item.price_uzs ?? item.price_usd ?? 0;
  const label = item.listing_type === 'rent' ? 'Ijara' : 'Sotish';

  return (
    <a
      ref={cardRef}
      href={item.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass tilt-card spotlight rounded-2xl overflow-hidden flex flex-col group block relative"
      {...tilt}
      {...spot}
    >
      <div className="h-44 bg-slate-200 relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Home size={40} />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`pill ${item.listing_type === 'rent' ? 'pill-rent' : 'pill-sale'}`}>{label}</span>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h4 className="font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-violet-600 transition-colors">
          {item.title}
        </h4>
        <div className="text-xl font-extrabold text-gradient">{formatPriceUZS(price)}</div>
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <MapPin size={14} />
          <span className="truncate">{[item.region, item.district].filter(Boolean).join(', ') || "Aniqlanmagan"}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
          {item.rooms && <span className="px-2 py-1 rounded-md bg-slate-100">{item.rooms} xona</span>}
          {item.area_sqm && <span className="px-2 py-1 rounded-md bg-slate-100">{item.area_sqm} m²</span>}
          {item.floor && (
            <span className="px-2 py-1 rounded-md bg-slate-100">
              {item.floor}/{item.total_floors || '?'} qavat
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
