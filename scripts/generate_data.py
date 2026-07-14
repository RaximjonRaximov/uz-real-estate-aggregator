import json
import random
from pathlib import Path

random.seed(42)

REGIONS = {
    "Toshkent": {
        "center": (41.2995, 69.2401),
        "districts": [
            "Yunusobod", "Shayxontohur", "Mirabad", "Yashnobod",
            "Mirobod", "Uchtepa", "Chilonzor", "Bektemir", "Sergeli",
            "Yakkasaroy", "Yashnabad",
        ],
    },
    "Toshkent viloyati": {
        "center": (41.25, 69.35),
        "districts": ["Chirchiq", "Yangiyo‘l", "Angren", "Bekobod", "Nurafshon", "Olmaliq"],
    },
    "Samarqand": {
        "center": (39.65, 66.97),
        "districts": ["Samarqand shahri", "Urgut", "Jomboy", "Ishtixon", "Kattaqo‘rg‘on"],
    },
    "Buxoro": {
        "center": (39.77, 64.43),
        "districts": ["Buxoro shahri", "G‘ijduvon", "Kogon", "Olot", "Qorako‘l"],
    },
    "Andijon": {
        "center": (40.78, 72.35),
        "districts": ["Andijon shahri", "Asaka", "Shahrixon", "Marhamat", "Xonobod"],
    },
    "Farg‘ona": {
        "center": (40.38, 71.78),
        "districts": ["Farg‘ona shahri", "Qo‘qon", "Marg‘ilon", "Rishton", "Beshariq"],
    },
    "Namangan": {
        "center": (40.99, 71.67),
        "districts": ["Namangan shahri", "Chortoq", "Pop", "Uychi", "Kosonsoy"],
    },
    "Xorazm": {
        "center": (41.38, 60.36),
        "districts": ["Urganch", "Xiva", "Gurlan", "Xonqa", "Shovot"],
    },
    "Qashqadaryo": {
        "center": (38.86, 65.80),
        "districts": ["Qarshi", "Shahrisabz", "Kitob", "Koson", "Muborak"],
    },
    "Surxondaryo": {
        "center": (37.23, 67.28),
        "districts": ["Termiz", "Denov", "Sherobod", "Sariosiyo", "Boysun"],
    },
    "Navoiy": {
        "center": (40.09, 65.38),
        "districts": ["Navoiy shahri", "Zarafshon", "Uchquduq", "Konimex", "Tomdi"],
    },
    "Jizzax": {
        "center": (40.12, 67.84),
        "districts": ["Jizzax shahri", "Arnasoy", "Forish", "G‘allaorol", "Zomin"],
    },
    "Sirdaryo": {
        "center": (40.49, 68.78),
        "districts": ["Guliston", "Sirdaryo", "Oqoltin", "Mehnatobod", "Xovos"],
    },
    "Qoraqalpog‘iston": {
        "center": (42.46, 59.61),
        "districts": ["Nukus", "Xo‘jayli", "To‘rtko‘l", "Bo‘zatau", "Qong‘irot"],
    },
}

PROPERTY_WEIGHTS = {
    "apartment": 0.55,
    "house": 0.25,
    "land": 0.10,
    "commercial": 0.10,
}

PRICE_RANGES = {
    "sale": {
        "apartment": (250_000_000, 2_500_000_000),
        "house": (800_000_000, 8_000_000_000),
        "land": (500_000_000, 5_000_000_000),
        "commercial": (1_500_000_000, 10_000_000_000),
    },
    "rent": {
        "apartment": (3_000_000, 25_000_000),
        "house": (8_000_000, 60_000_000),
        "land": (5_000_000, 30_000_000),
        "commercial": (15_000_000, 120_000_000),
    },
}

AREA_RANGES = {
    "apartment": (36, 140),
    "house": (80, 350),
    "land": (200, 1500),
    "commercial": (50, 500),
}

ROOMS_RANGES = {
    "apartment": (1, 5),
    "house": (3, 8),
    "land": (0, 0),
    "commercial": (0, 4),
}

REGION_PRICE_MULTIPLIER = {
    "Toshkent": 1.6,
    "Toshkent viloyati": 0.85,
    "Samarqand": 0.75,
    "Buxoro": 0.70,
    "Andijon": 0.65,
    "Farg‘ona": 0.65,
    "Namangan": 0.60,
    "Xorazm": 0.55,
    "Qashqadaryo": 0.55,
    "Surxondaryo": 0.50,
    "Navoiy": 0.55,
    "Jizzax": 0.50,
    "Sirdaryo": 0.48,
    "Qoraqalpog‘iston": 0.45,
}

UZS_TO_USD = 12_500  # approximate rate


def pick_property_type():
    return random.choices(
        list(PROPERTY_WEIGHTS.keys()),
        weights=list(PROPERTY_WEIGHTS.values()),
    )[0]


def phone():
    prefixes = ["90", "91", "93", "94", "95", "97", "98", "99", "88", "33"]
    return f"+998 {random.choice(prefixes)} {random.randint(100, 999)} {random.randint(10, 99)} {random.randint(10, 99)}"


def title(rooms, property_type, district, region):
    type_names = {
        "apartment": "kvartira",
        "house": "hovli",
        "land": "yer uchastkasi",
        "commercial": "tijorat binosi",
    }
    rooms_text = f"{rooms}-xona " if rooms else ""
    return f"{rooms_text}{type_names[property_type]}, {district} ({region})".capitalize()


def description(rooms, area, floor, total_floors, property_type, listing_type):
    action = "sotiladi" if listing_type == "sale" else "ijaraga beriladi"
    extras = random.choice([
        "Remont qilingan, keng va yorug‘.",
        "Markaziy joylashuv, transport uchun qulay.",
        "Maktab va bog‘cha yaqinida.",
        "Yangi uydagi kvartira, tezlashtirilgan hujjat.",
        "Hovli va ovqatxona bilan, zamonaviy dizayn.",
        "Tijorat faoliyati uchun ideal joy.",
    ])
    floor_text = f"{floor}/{total_floors} qavat" if floor and total_floors and property_type in ("apartment", "commercial") else ""
    return f"{action}. {rooms} xona, {area} m². {floor_text} {extras}"


def generate_listing(idx):
    region = random.choice(list(REGIONS.keys()))
    district = random.choice(REGIONS[region]["districts"])
    lat, lon = REGIONS[region]["center"]
    lat += random.uniform(-0.08, 0.08)
    lon += random.uniform(-0.10, 0.10)

    property_type = pick_property_type()
    listing_type = "rent" if random.random() < 0.12 else "sale"

    area = random.randint(*AREA_RANGES[property_type])
    rooms_min, rooms_max = ROOMS_RANGES[property_type]
    rooms = random.randint(rooms_min, rooms_max) if rooms_max > 0 else None

    floor = None
    total_floors = None
    if property_type in ("apartment", "commercial") and random.random() < 0.85:
        total_floors = random.randint(3, 18)
        floor = random.randint(1, total_floors)

    low, high = PRICE_RANGES[listing_type][property_type]
    price_uzs = random.randint(low, high)
    price_uzs = int(price_uzs * REGION_PRICE_MULTIPLIER[region] / 1_000_000) * 1_000_000
    price_usd = round(price_uzs / UZS_TO_USD, 2)

    listing_title = title(rooms, property_type, district, region)
    listing_desc = description(rooms, area, floor, total_floors, property_type, listing_type)

    image_url = f"https://placehold.co/640x480/0f172a/ffffff?text={idx+1}"

    return {
        "external_id": f"sample-{idx+1:04d}",
        "source": "sample",
        "source_url": "#",
        "title": listing_title,
        "description": listing_desc,
        "listing_type": listing_type,
        "property_type": property_type,
        "region": region,
        "district": district,
        "address": f"{district}, {region}",
        "rooms": rooms,
        "area_sqm": area,
        "floor": floor,
        "total_floors": total_floors,
        "price_uzs": price_uzs,
        "price_usd": price_usd,
        "currency": "UZS",
        "contact_phone": phone(),
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "image_url": image_url,
    }


def main():
    listings = [generate_listing(i) for i in range(120)]
    out = Path(__file__).resolve().parent.parent / "data" / "sample_listings.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(listings, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(listings)} sample listings to {out}")


if __name__ == "__main__":
    main()
