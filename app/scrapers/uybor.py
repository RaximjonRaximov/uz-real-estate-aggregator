"""Uybor.uz real-estate scraper.

Uses the public https://api.uybor.uz REST API. No AI, no browser automation,
no paid APIs.
"""
from __future__ import annotations
import logging
import random
import re
import time
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.scrapers.geocode import geocode_location
from app.main import Listing

logger = logging.getLogger(__name__)

_UYBOR_BASE = "https://uybor.uz"
_UYBOR_API = "https://api.uybor.uz"
_UYBOR_LISTINGS_URL = f"{_UYBOR_API}/api/v1/listings"
_UYBOR_EXCHANGE_URL = f"{_UYBOR_API}/api/v1/listings/exchange-rate"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": f"{_UYBOR_BASE}/listings",
    "Origin": _UYBOR_BASE,
}

# Uybor categoryId -> our property_type
_CATEGORY_MAP: dict[int, str] = {
    7: "apartment",   # Apartment
    26: "apartment",  # Room
    8: "house",       # House
    9: "house",       # Cottage
    27: "house",      # Country house
    28: "house",      # Private house
    11: "land",       # Land
    23: "land",       # Residential land
    24: "land",       # Non-residential land
    10: "commercial", # Commercial parent
    12: "commercial", # Office
    17: "commercial", # Production
    18: "commercial", # Business
    19: "commercial", # Building
    21: "commercial", # Warehouse
}

_EMBED = "category,subCategory,region,city,district,zone,street,metro,media"


def _property_type(category_id: int | None, sub_category_id: int | None) -> str:
    if category_id is not None and category_id in _CATEGORY_MAP:
        return _CATEGORY_MAP[category_id]
    if sub_category_id is not None and sub_category_id in _CATEGORY_MAP:
        return _CATEGORY_MAP[sub_category_id]
    return "apartment"


def _parse_rooms(value: str | int | None) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    m = re.search(r"(\d{1,2})", text)
    if m:
        rooms = int(m.group(1))
        if 0 < rooms <= 50:
            return rooms
    return None


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _first_image(media: list[dict[str, Any]] | None) -> str | None:
    if not media:
        return None
    for item in media:
        if item.get("url"):
            return item["url"]
    return None


def _name(obj: dict[str, Any] | None, lang: str = "ru") -> str | None:
    if not obj:
        return None
    name = obj.get("name")
    if isinstance(name, dict):
        return name.get(lang) or name.get("en") or name.get("uz") or next(iter(name.values()), None)
    if isinstance(name, str):
        return name
    return None


def _build_title(item: dict[str, Any], property_type: str) -> str:
    description = (item.get("description") or "").strip()
    if description:
        first_line = description.split("\n")[0].strip()
        if first_line:
            return first_line[:160]

    region = _name(item.get("region"))
    district = _name(item.get("district")) or _name(item.get("city"))
    rooms = _parse_rooms(item.get("room"))
    parts = []
    if rooms:
        parts.append(f"{rooms}-комн.")
    type_labels = {
        "apartment": "квартира",
        "house": "дом",
        "land": "участок",
        "commercial": "коммерция",
    }
    parts.append(type_labels.get(property_type, "недвижимость"))
    if district:
        parts.append(district)
    elif region:
        parts.append(region)
    title = " ".join(parts)
    return title or "Ko'chmas mulk e'lon"


def _fetch_usd_rate(client: httpx.Client) -> float:
    try:
        resp = client.get(
            _UYBOR_EXCHANGE_URL,
            params={"limit": 1, "code__eq": "840"},
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("results"):
            rate = _as_float(data["results"][0].get("rate"))
            if rate:
                return rate
    except Exception as exc:
        logger.warning(f"Uybor exchange rate fetch failed: {exc}")
    return 12_500.0


def _parse_listing(item: dict[str, Any], usd_rate: float) -> dict[str, Any] | None:
    listing_id = item.get("id")
    if not listing_id:
        return None

    category_id = _as_int(item.get("categoryId"))
    sub_category_id = _as_int(item.get("subCategoryId"))
    property_type = _property_type(category_id, sub_category_id)

    region = _name(item.get("region"))
    district = _name(item.get("district")) or _name(item.get("city"))
    address = (item.get("address") or "").strip() or None

    lat = _as_float(item.get("lat"))
    lon = _as_float(item.get("lng"))
    if (not lat or not lon) and (region or district):
        location = ", ".join(p for p in [region, district, address] if p)
        lat, lon = geocode_location(location)

    prices = item.get("prices") or {}
    price_usd = _as_float(prices.get("usd")) if isinstance(prices, dict) else None
    price_uzs = _as_float(prices.get("uzs")) if isinstance(prices, dict) else None

    if price_usd is None and price_uzs is None:
        raw_price = _as_float(item.get("price"))
        currency = (item.get("priceCurrency") or "").lower()
        if raw_price:
            if currency in ("usd", "у.е.", "$"):
                price_usd = raw_price
                price_uzs = raw_price * usd_rate
            elif currency in ("sum", "uzs", "сум"):
                price_uzs = raw_price
            else:
                price_uzs = raw_price

    if price_uzs is None and price_usd:
        price_uzs = price_usd * usd_rate

    area = _as_float(item.get("square"))
    if area is None and property_type == "land":
        ground = _as_float(item.get("squareGround"))
        if ground:
            area = ground * 100.0

    floor = _as_int(item.get("floor"))
    total_floors = _as_int(item.get("floorTotal"))

    title = _build_title(item, property_type)
    description = (item.get("description") or "").strip() or None

    return {
        "external_id": f"uybor-{listing_id}",
        "source": "uybor.uz",
        "source_url": f"{_UYBOR_BASE}/listings/{listing_id}",
        "title": title,
        "description": description,
        "listing_type": item.get("operationType") or "sale",
        "property_type": property_type,
        "region": region,
        "district": district,
        "address": address,
        "rooms": _parse_rooms(item.get("room")),
        "area_sqm": area,
        "floor": floor,
        "total_floors": total_floors,
        "price_uzs": price_uzs,
        "price_usd": price_usd,
        "currency": "UZS" if price_uzs else "USD",
        "lat": lat,
        "lon": lon,
        "image_url": _first_image(item.get("media")),
        "is_active": 1 if item.get("isActive") else 0,
    }


def _fetch_page(
    client: httpx.Client,
    operation_type: str,
    category_id: int,
    page: int,
    limit: int,
) -> dict[str, Any] | None:
    params: dict[str, Any] = {
        "limit": limit,
        "page": page,
        "operationType__eq": operation_type,
        "category__eq": category_id,
        "order": "upAt",
        "embed": _EMBED,
    }
    try:
        resp = client.get(_UYBOR_LISTINGS_URL, params=params)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.warning(f"Uybor page fetch failed (op={operation_type}, cat={category_id}, page={page}): {exc}")
        return None


def scrape_uybor(db: Session, pages: int = 5, limit: int = 24) -> dict[str, Any]:
    """Import public Uybor.uz listings into the local DB.

    Fetches `pages` pages for each operationType / category combination
    selected below. Duplicate `external_id` values are skipped or updated.
    """
    added = 0
    updated = 0
    errors = 0
    seen: set[str] = set()

    categories = [
        ("sale", 7),   # apartments for sale
        ("rent", 7),   # apartments for rent
        ("sale", 8),   # houses for sale
        ("rent", 8),   # houses for rent
        ("sale", 11),  # land for sale
        ("sale", 10),  # commercial for sale
        ("rent", 10),  # commercial for rent
    ]

    with httpx.Client(headers=_HEADERS, follow_redirects=True, timeout=30.0) as client:
        usd_rate = _fetch_usd_rate(client)
        logger.info(f"Uybor USD rate: {usd_rate}")

        for operation_type, category_id in categories:
            for page in range(1, pages + 1):
                data = _fetch_page(client, operation_type, category_id, page, limit)
                if not data:
                    break
                results = data.get("results") or []
                if not results:
                    break

                for item in results:
                    try:
                        payload = _parse_listing(item, usd_rate)
                        if not payload:
                            continue
                        if payload["is_active"] != 1:
                            continue

                        ext_id = payload["external_id"]
                        if ext_id in seen:
                            continue
                        seen.add(ext_id)

                        existing = (
                            db.query(Listing)
                            .filter(Listing.external_id == ext_id)
                            .first()
                        )
                        if existing:
                            for key, value in payload.items():
                                setattr(existing, key, value)
                            updated += 1
                        else:
                            db.add(Listing(**payload))
                            added += 1
                    except Exception as exc:
                        logger.warning(f"Uybor listing parse error: {exc}")
                        errors += 1

                db.commit()
                if page < pages:
                    time.sleep(random.uniform(0.8, 2.0))

    db.commit()
    return {"added": added, "updated": updated, "errors": errors}
