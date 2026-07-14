import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { formatPriceUZS } from '../lib/utils';
import { api } from '../lib/api';
import type { Listing } from '../types';

export function MapSection({ listings }: { listings: Listing[] }) {
  const [allListings, setAllListings] = useState<Listing[]>(listings);

  useEffect(() => {
    api.get('/listings', { params: { limit: 200 } }).then((r) => setAllListings(r.data));
  }, []);

  const withCoords = allListings.filter((l) => l.lat && l.lon);
  const center: LatLngExpression = [41.2995, 69.2401];

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4 text-slate-700">
        <MapPin size={20} className="text-cyan-500" />
        <h3 className="font-bold text-slate-800 text-xl">Interaktiv xarita</h3>
      </div>
      <div className="rounded-2xl overflow-hidden h-[420px] lg:h-[520px]">
        <MapContainer center={center} zoom={11} scrollWheelZoom className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {withCoords.map((l) => (
            <CircleMarker
              key={l.id}
              center={[l.lat!, l.lon!]}
              radius={6}
              fillColor={l.listing_type === 'rent' ? '#d946ef' : '#06b6d4'}
              color="#fff"
              weight={2}
              fillOpacity={0.9}
            >
              <Popup>
                <div className="font-bold text-slate-800 text-sm max-w-[200px]">{l.title}</div>
                <div className="text-violet-600 font-bold">{formatPriceUZS(l.price_uzs ?? l.price_usd)}</div>
                <div className="text-xs text-slate-500">{[l.region, l.district].filter(Boolean).join(', ')}</div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
