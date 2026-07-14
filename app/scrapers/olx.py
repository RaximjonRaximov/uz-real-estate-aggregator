"""OLX.uz real-estate scraper.

Only public listing cards are parsed. No AI, no browser automation, no paid APIs.
"""
from __future__ import annotations
import logging
import random
import re
import time
from typing import Any

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.scrapers.geocode import geocode_location
from app.main import Listing

logger = logging.getLogger(__name__)

_OLX_BASE = "https://www.olx.uz"
_OLX_LISTING_URL = f"{_OLX_BASE}/nedvizhimost/kvartiry/"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.olx.uz/",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

_PRICE_RE = re.compile(r"([\d\s]+)\s*(сум|у\.е\.|\$)", re.IGNORECASE)
_LOCATION_RE = re.compile(r"\s+-\s+")

_RENT_KEYWORDS = [
    "sdaetsya", "sdaetsa", "sdaem", "sdaete", "sdaetsya", "sdaiutsya",
    "ijara", "arenda", "ijaraga", "sdayu", "sdaetsya",
    "srochno sda", "srochno sdayu", "sdaem kvartiru",
    "сдается", "сдаётся", "сдаю", "сдам", "аренда", "в аренду",
    "ijaraga beriladi", "srochno sdaetsya",
]

_SALE_KEYWORDS = [
    "sotiladi", "sotiladi", "prodaetsya", "prodaju", "prodam",
    "sotib", "sotaman", "sotuvda", "sotiladi", "sotuvga",
    "продается", "продаётся", "продам", "продаю", "продажа",
    "sotiladi kvartira",
]

_HOUSE_KEYWORDS = [
    "uy", "dom", "hovli", "uchastka", "uchastok", "земельный", "дом",
    "коттедж", "дача", "участок",
]

_APARTMENT_KEYWORDS = [
    "kvartira", "kvartir", "komnat", "комнат", "квартира", "kvartira",
]


def _extract_external_id(href: str) -> str | None:
    m = re.search(r"-ID([A-Za-z0-9]+)\.html", href)
    return m.group(1) if m else None


def _extract_price(card: BeautifulSoup) -> tuple[float | None, str | None] | None:
    """Return (numeric_price, currency_code) or None."""
    for p in card.find_all("p"):
        text = p.get_text(" ", strip=True)
        if "Договорная" in text and _PRICE_RE.search(text) is None:
            return None
        m = _PRICE_RE.search(text)
        if m:
            digits = m.group(1).replace(" ", "").replace("\xa0", "")
            if not digits.isdigit():
                continue
            amount = float(digits)
            raw_cur = m.group(2).lower()
            currency = "UZS" if raw_cur == "сум" else ("USD" if raw_cur in {"у.е.", "уе", "$"} else "UZS")
            return (amount, currency)
    return None


def _extract_location(card: BeautifulSoup) -> str | None:
    for p in card.find_all("p"):
        text = p.get_text(" ", strip=True)
        if _LOCATION_RE.search(text):
            return text
    return None


def _parse_location(raw: str) -> tuple[str | None, str | None, str | None]:
    if not raw:
        return (None, None, None)
    left = raw.split(" - ")[0]
    parts = [p.strip() for p in left.split(",") if p.strip()]
    region = parts[0] if parts else None
    district = parts[1] if len(parts) > 1 else None
    return (region, district, left)


def _infer_listing_type(title: str) -> str:
    low = title.lower()
    for kw in _RENT_KEYWORDS:
        if kw in low:
            return "rent"
    for kw in _SALE_KEYWORDS:
        if kw in low:
            return "sale"
    return "sale"


def _infer_property_type(title: str) -> str:
    low = title.lower()
    has_apartment = any(kw in low for kw in _APARTMENT_KEYWORDS)
    has_house = any(kw in low for kw in _HOUSE_KEYWORDS)
    if has_house and not has_apartment:
        return "house"
    return "apartment"


def _extract_rooms(title: str) -> int | None:
    low = title.lower()
    # Common patterns: "2 xonali", "2-х комнатная", "3х комн", "1/2/2"
    patterns = [
        r"(\d{1,2})\s*[-/]?\s*xonali",
        r"(\d{1,2})\s*[-/]?\s*komnat",
        r"(\d{1,2})\s*[-/]?\s*комнат",
        r"(\d{1,2})\s*[-/]?\s*х\s*ком",
        r"(\d{1,2})\s*[-/]?\s*x\s*kom",
        r"(\d{1,2})\s*х\s*ком",
        r"(\d{1,2})\s*x\s*kom",
        r"(\d{1,2})\s*[-/]?\s*х\s*к",
    ]
    for pat in patterns:
        m = re.search(pat, low)
        if m:
            rooms = int(m.group(1))
            if 0 < rooms <= 10:
                return rooms
    # "1/2/2" style: often floor/total/rooms; try last number.
    m = re.search(r"(\d)/(\d+)/(\d{1,2})", title)
    if m:
        rooms = int(m.group(3))
        if 0 < rooms <= 10:
            return rooms
    return None


def _extract_area(title: str) -> float | None:
    m = re.search(r"(\d{2,4})\s*(?:m2|kvm|kv\.m|кв\.м|м2|kv\.m|kv m)", title.lower())
    if m:
        return float(m.group(1))
    return None


def _extract_floor(title: str) -> tuple[int | None, int | None]:
    # Skip room/floor/total patterns; focus on "3/9" or "5/12" floor/total.
    m = re.search(r"(?<!\d/)(\d{1,2})/(\d{1,2})(?!/\d)", title)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if 0 < a <= b and b <= 35:
            return (a, b)
    return (None, None)


def _parse_card(card: BeautifulSoup) -> dict[str, Any] | None:
    link = card.find("a", href=re.compile(r"/d/obyavlenie/"))
    if not link:
        return None
    href = link.get("href", "")
    if not href:
        return None

    external_id = _extract_external_id(href)
    if not external_id:
        return None

    title_tag = card.find("h4")
    title = title_tag.get_text(strip=True) if title_tag else ""
    if not title:
        return None

    image_tag = card.find("img")
    image_url = image_tag.get("src") if image_tag else None

    price_info = _extract_price(card)
    if not price_info:
        return None
    amount, currency = price_info

    location_raw = _extract_location(card)
    region, district, address = _parse_location(location_raw)

    lat, lon = geocode_location(location_raw)

    listing_type = _infer_listing_type(title)
    property_type = _infer_property_type(title)
    rooms = _extract_rooms(title)
    area_sqm = _extract_area(title)
    floor, total_floors = _extract_floor(title)

    return {
        "external_id": external_id,
        "source": "olx.uz",
        "source_url": href if href.startswith("http") else f"{_OLX_BASE}{href}",
        "title": title,
        "description": None,
        "listing_type": listing_type,
        "property_type": property_type,
        "region": region,
        "district": district,
        "address": address,
        "rooms": rooms,
        "area_sqm": area_sqm,
        "floor": floor,
        "total_floors": total_floors,
        "price_uzs": amount if currency == "UZS" else None,
        "price_usd": amount if currency == "USD" else None,
        "currency": currency,
        "lat": lat,
        "lon": lon,
        "image_url": image_url,
        "is_active": 1,
    }


def _fetch_page(client: httpx.Client, page: int) -> BeautifulSoup | None:
    params = {"page": page} if page > 1 else {}
    try:
        resp = client.get(_OLX_LISTING_URL, params=params, timeout=20.0)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except httpx.HTTPError as exc:
        logger.warning(f"OLX page {page} fetch failed: {exc}")
        return None


def scrape_olx(db: Session, pages: int = 3) -> dict[str, Any]:
    """Scrape OLX.uz apartments/houses and upsert into the database.

    Args:
        db: SQLAlchemy session.
        pages: Number of search pages to traverse (each page has ~30-40 listings).

    Returns:
        {"added": int, "updated": int, "errors": int}
    """
    added = 0
    updated = 0
    errors = 0
    seen: set[str] = set()

    with httpx.Client(headers=_HEADERS, follow_redirects=True, http2=False) as client:
        for page in range(1, pages + 1):
            soup = _fetch_page(client, page)
            if soup is None:
                break

            cards = soup.find_all("div", {"data-cy": "l-card"})
            if not cards:
                break

            for card in cards:
                try:
                    payload = _parse_card(card)
                    if not payload:
                        continue
                    if payload["external_id"] in seen:
                        continue
                    seen.add(payload["external_id"])

                    existing = (
                        db.query(Listing)
                        .filter(Listing.external_id == payload["external_id"])
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
                    logger.warning(f"OLX card parse error: {exc}")
                    errors += 1

            db.commit()
            if page < pages:
                time.sleep(random.uniform(1.5, 3.5))

    db.commit()
    return {"added": added, "updated": updated, "errors": errors}
