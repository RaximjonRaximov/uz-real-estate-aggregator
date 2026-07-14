export interface Listing {
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

export interface StatsSummary {
  total: number;
  avg_price_uzs?: number;
  avg_price_usd?: number;
  min_price_uzs?: number;
  max_price_uzs?: number;
  regions: string[];
}

export interface RegionStat {
  region: string;
  count: number;
  avg_price_uzs?: number;
  avg_area_sqm?: number;
}

export interface PriceBucket {
  min: number;
  max: number;
  count: number;
}

export interface TypeStat {
  listing_type: string;
  count: number;
  avg_price_uzs?: number;
}

export interface Filters {
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
