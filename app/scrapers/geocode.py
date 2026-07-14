"""Geocoding helpers for Uzbekistan real-estate listings.

Only coarse, manually-curated coordinates are used so the project stays
free of paid API keys and AI services."""
from __future__ import annotations
import random
import re


def _normalize(text: str | None) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"['ʻ’]", "", text)
    text = re.sub(r"[^a-zа-яё0-9\s]", "", text)
    return " ".join(text.split())


_CITY_CENTERS: dict[str, tuple[float, float]] = {
    "toshkent": (41.2995, 69.2401),
    "ташкент": (41.2995, 69.2401),
    "samarkand": (39.6270, 66.9750),
    "samarqand": (39.6270, 66.9750),
    "самарканд": (39.6270, 66.9750),
    "bukhara": (39.7680, 64.4210),
    "buxoro": (39.7680, 64.4210),
    "бухара": (39.7680, 64.4210),
    "andijan": (40.7820, 72.3440),
    "andijon": (40.7820, 72.3440),
    "андижан": (40.7820, 72.3440),
    "ferghana": (40.3840, 71.7840),
    "fargona": (40.3840, 71.7840),
    "фергана": (40.3840, 71.7840),
    "namangan": (40.9980, 71.6726),
    "наманган": (40.9980, 71.6726),
    "karshi": (38.8610, 65.7890),
    "qarshi": (38.8610, 65.7890),
    "карши": (38.8610, 65.7890),
    "nukus": (42.4600, 59.6160),
    "nukus": (42.4600, 59.6160),
    "нукус": (42.4600, 59.6160),
    "urgench": (41.5500, 60.6330),
    "urganch": (41.5500, 60.6330),
    "ургенч": (41.5500, 60.6330),
    "navoi": (40.1030, 65.3730),
    "navoiy": (40.1030, 65.3730),
    "навои": (40.1030, 65.3730),
    "jizzakh": (39.7740, 67.8300),
    "jizzax": (39.7740, 67.8300),
    "джизак": (39.7740, 67.8300),
    "gulistan": (40.4900, 68.7810),
    "guliston": (40.4900, 68.7810),
    "гулистан": (40.4900, 68.7810),
    "termez": (37.2240, 67.2760),
    "termiz": (37.2240, 67.2760),
    "термез": (37.2240, 67.2760),
    "kokand": (40.5280, 70.9420),
    "qoqon": (40.5280, 70.9420),
    "коканд": (40.5280, 70.9420),
    "angren": (41.0170, 70.1430),
    "ангрен": (41.0170, 70.1430),
    "chirchiq": (41.4680, 69.5750),
    "чирчик": (41.4680, 69.5750),
    "bekabad": (40.2200, 69.1230),
    "bekobod": (40.2200, 69.1230),
    "бекабад": (40.2200, 69.1230),
    "olmaliq": (40.8460, 69.5980),
    "almalyk": (40.8460, 69.5980),
    "алмалык": (40.8460, 69.5980),
    "yangiyol": (41.1170, 69.0500),
    "yangiyo'l": (41.1170, 69.0500),
    "yangiyul": (41.1170, 69.0500),
    "янгиюль": (41.1170, 69.0500),
    "zangiota": (41.1800, 69.1400),
    "zangiata": (41.1800, 69.1400),
    "nazarbek": (41.1800, 69.1400),
    "nazarbek": (41.1800, 69.1400),
    "parkent": (41.2940, 70.9980),
    "паркент": (41.2940, 70.9980),
    "ohangaron": (40.9660, 69.6420),
    "ахангаран": (40.9660, 69.6420),
    "nurafshon": (41.1700, 69.2400),
    "нурафшон": (41.1700, 69.2400),
    "tashkent viloyati": (41.2500, 69.3500),
    "toshkent viloyati": (41.2500, 69.3500),
    "ташкентская область": (41.2500, 69.3500),
    "sirdaryo": (40.4800, 68.7000),
    "guliston": (40.4900, 68.7810),
    "сирдарья": (40.4800, 68.7000),
    "qashqadaryo": (38.8600, 65.8000),
    "kashkadarya": (38.8600, 65.8000),
    "кашкадарья": (38.8600, 65.8000),
    "surxondaryo": (37.2300, 67.2800),
    "surkhandarya": (37.2300, 67.2800),
    "сурхандарья": (37.2300, 67.2800),
    "xorazm": (41.3800, 60.3600),
    "khorezm": (41.3800, 60.3600),
    "хорезм": (41.3800, 60.3600),
    "qoraqalpogiston": (42.4600, 59.6160),
    "karakalpakstan": (42.4600, 59.6160),
    "каракалпакстан": (42.4600, 59.6160),
    "jizzakh": (39.7740, 67.8300),
}


# Tashkent districts: Russian -> (lat, lon)
_TASHKENT_DISTRICTS: dict[str, tuple[float, float]] = {
    "mirobod": (41.3000, 69.2800),
    "миробод": (41.3000, 69.2800),
    "mirobad": (41.3000, 69.2800),
    "мирабадский": (41.3000, 69.2800),
    "mirabad": (41.3000, 69.2800),
    "yashnobod": (41.2900, 69.3300),
    "yashnabad": (41.2900, 69.3300),
    "яшнабадский": (41.2900, 69.3300),
    "яшнобод": (41.2900, 69.3300),
    "yunusobod": (41.3700, 69.2850),
    "yunusabad": (41.3700, 69.2850),
    "юнусабадский": (41.3700, 69.2850),
    "shayxontohur": (41.3200, 69.2050),
    "shaykhantakhur": (41.3200, 69.2050),
    "шайхантахурский": (41.3200, 69.2050),
    "chilonzor": (41.2700, 69.2050),
    "chilanzar": (41.2700, 69.2050),
    "чиланзарский": (41.2700, 69.2050),
    "yakkasaroy": (41.2950, 69.2550),
    "yakkasaray": (41.2950, 69.2550),
    "яккасарайский": (41.2950, 69.2550),
    "uchtepa": (41.3200, 69.1650),
    "учтепинский": (41.3200, 69.1650),
    "bektemir": (41.2200, 69.3300),
    "бектемирский": (41.2200, 69.3300),
    "mirzo ulugbek": (41.3050, 69.3300),
    "мирзо улугбек": (41.3050, 69.3300),
    "мирзо-улугбекский": (41.3050, 69.3300),
    "mirzo-ulugbek": (41.3050, 69.3300),
    "sergeli": (41.2100, 69.2050),
    "sergely": (41.2100, 69.2050),
    "сергелийский": (41.2100, 69.2050),
    "olmazar": (41.3400, 69.2450),
    "olmazar": (41.3400, 69.2450),
    "алмазарский": (41.3400, 69.2450),
    "uzun": (41.2800, 69.1200),
    "kibray": (41.3200, 69.4700),
    "zangiota": (41.1800, 69.1400),
    "zangiata": (41.1800, 69.1400),
    "зангиотинский": (41.1800, 69.1400),
    "yashnobod": (41.2900, 69.3300),
    "yunusobod": (41.3700, 69.2850),
}


_FALLBACK_CENTER = (41.2995, 69.2401)


def _jitter(value: float, spread: float = 0.035) -> float:
    return value + random.uniform(-spread, spread)


def geocode_location(raw_location: str) -> tuple[float | None, float | None]:
    """Return approximate (lat, lon) for an OLX/Uybor location string.

    Examples:
        'Ташкент, Яшнабадский район - Сегодня в 07:34'
        'Карши - 13 июля 2026 г.'
    """
    if not raw_location:
        return (None, None)

    # Drop the date part after the dash.
    left = raw_location.split(" - ")[0]
    parts = [p.strip() for p in left.split(",") if p.strip()]

    city_key = _normalize(parts[0]) if parts else ""
    district_key = _normalize(parts[1]) if len(parts) > 1 else ""

    # If we know the district inside Tashkent, prefer it.
    if district_key:
        for d in (district_key, district_key.replace("район", "").strip(), district_key.replace("", "")):
            if d in _TASHKENT_DISTRICTS:
                lat, lon = _TASHKENT_DISTRICTS[d]
                return (_jitter(lat, 0.012), _jitter(lon, 0.012))

    # City-level match.
    if city_key in _CITY_CENTERS:
        lat, lon = _CITY_CENTERS[city_key]
        return (_jitter(lat, 0.035), _jitter(lon, 0.035))

    # Fuzzy: the first token may be the city name.
    first_token = city_key.split()[0]
    if first_token in _CITY_CENTERS:
        lat, lon = _CITY_CENTERS[first_token]
        return (_jitter(lat, 0.035), _jitter(lon, 0.035))

    # Last resort: put it near Tashkent with a large random spread so the map
    # still shows something.
    lat, lon = _FALLBACK_CENTER
    return (_jitter(lat, 0.25), _jitter(lon, 0.25))
