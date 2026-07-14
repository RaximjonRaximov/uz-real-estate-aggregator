"""Uzbekistan Real Estate Aggregator — FastAPI backend."""
from __future__ import annotations

import json
import os
import random
from datetime import datetime
from pathlib import Path
from typing import Any, List, Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Session, declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    database_url: str = "sqlite:///./uzrealty.db"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:5173,http://localhost:8000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, unique=True, index=True, nullable=True)
    source = Column(String, index=True, default="manual")
    source_url = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    listing_type = Column(String, index=True, default="sale")  # sale / rent
    property_type = Column(String, index=True, default="apartment")  # apartment / house / land / commercial
    region = Column(String, index=True, nullable=True)
    district = Column(String, index=True, nullable=True)
    address = Column(String, nullable=True)
    rooms = Column(Integer, nullable=True)
    area_sqm = Column(Float, nullable=True)
    floor = Column(Integer, nullable=True)
    total_floors = Column(Integer, nullable=True)
    price_uzs = Column(Float, nullable=True)
    price_usd = Column(Float, nullable=True)
    currency = Column(String, default="UZS")
    contact_phone = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# --- Pydantic schemas ---

class ListingBase(BaseModel):
    title: str
    source: str = "manual"
    source_url: Optional[str] = None
    listing_type: str = "sale"
    property_type: str = "apartment"
    region: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    rooms: Optional[int] = None
    area_sqm: Optional[float] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    price_uzs: Optional[float] = None
    price_usd: Optional[float] = None
    currency: str = "UZS"
    contact_phone: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    image_url: Optional[str] = None
    description: Optional[str] = None


class ListingCreate(ListingBase):
    external_id: Optional[str] = None


class ListingResponse(ListingBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ListingFilter(BaseModel):
    region: Optional[str] = None
    district: Optional[str] = None
    listing_type: Optional[str] = None
    property_type: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_area: Optional[float] = None
    max_area: Optional[float] = None
    rooms: Optional[int] = None
    q: Optional[str] = None
    skip: int = 0
    limit: int = 50


class StatsSummary(BaseModel):
    total: int
    avg_price_uzs: Optional[float] = None
    avg_price_usd: Optional[float] = None
    min_price_uzs: Optional[float] = None
    max_price_uzs: Optional[float] = None
    regions: List[str]


class RegionStat(BaseModel):
    region: str
    count: int
    avg_price_uzs: Optional[float] = None
    avg_area_sqm: Optional[float] = None


class PriceBucket(BaseModel):
    min: float
    max: float
    count: int


# --- DB helpers ---

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Scraper / data import ---

def import_sample_data(db: Session, path: Path) -> int:
    """Load listings from a JSON file. Skip duplicates by external_id."""
    if not path.exists():
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    added = 0
    for item in data:
        external_id = item.get("external_id") or str(random.randint(10_000_000, 99_999_999))
        existing = db.query(Listing).filter(Listing.external_id == external_id).first()
        if existing:
            continue
        payload = dict(item)
        payload["external_id"] = external_id
        payload.pop("id", None)
        payload.pop("created_at", None)
        payload.pop("updated_at", None)
        db.add(Listing(**payload))
        added += 1
    db.commit()
    return added


def run_scrapers(source: Optional[str] = None) -> dict:
    """Run enabled scrapers. For the MVP it loads sample data; real adapters can be added."""
    db = SessionLocal()
    results: dict[str, Any] = {}
    try:
        # Sample data is always available and idempotent
        if source is None or source == "sample":
            added = import_sample_data(db, BASE_DIR / "data" / "sample_listings.json")
            results["sample"] = {"added": added}

        # Real scraping adapters can be registered here behind feature flags.
        # Example:
        # if source is None or source == "olx":
        #     results["olx"] = scrape_olx(db)
    finally:
        db.close()
    return results


def seed_sample_data() -> None:
    db = SessionLocal()
    try:
        if db.query(Listing).first() is not None:
            return
        import_sample_data(db, BASE_DIR / "data" / "sample_listings.json")
    finally:
        db.close()


# --- FastAPI app ---

Base.metadata.create_all(bind=engine)
seed_sample_data()

app = FastAPI(
    title="Uzbekistan Real Estate Aggregator",
    version="0.1.0",
    description="3D modern real estate price aggregator for Uzbekistan",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- API endpoints ---

@app.get(f"{settings.api_prefix}/listings", response_model=List[ListingResponse])
def list_listings(
    region: Optional[str] = None,
    district: Optional[str] = None,
    listing_type: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    rooms: Optional[int] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Listing).filter(Listing.is_active == 1)
    if region:
        query = query.filter(Listing.region.ilike(region))
    if district:
        query = query.filter(Listing.district.ilike(district))
    if listing_type:
        query = query.filter(Listing.listing_type == listing_type)
    if property_type:
        query = query.filter(Listing.property_type == property_type)
    if min_price is not None:
        query = query.filter(Listing.price_uzs >= min_price)
    if max_price is not None:
        query = query.filter(Listing.price_uzs <= max_price)
    if min_area is not None:
        query = query.filter(Listing.area_sqm >= min_area)
    if max_area is not None:
        query = query.filter(Listing.area_sqm <= max_area)
    if rooms is not None:
        query = query.filter(Listing.rooms == rooms)
    if q:
        pattern = f"%{q}%"
        query = query.filter(
            (Listing.title.ilike(pattern))
            | (Listing.description.ilike(pattern))
            | (Listing.address.ilike(pattern))
        )
    return (
        query.order_by(Listing.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@app.get(f"{settings.api_prefix}/listings/{{listing_id}}", response_model=ListingResponse)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(Listing).get(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@app.get(f"{settings.api_prefix}/stats/summary", response_model=StatsSummary)
def stats_summary(db: Session = Depends(get_db)):
    base = db.query(Listing).filter(Listing.is_active == 1)
    total = base.count()
    avg_uzs = base.with_entities(func.avg(Listing.price_uzs)).scalar()
    avg_usd = base.with_entities(func.avg(Listing.price_usd)).scalar()
    min_uzs = base.with_entities(func.min(Listing.price_uzs)).scalar()
    max_uzs = base.with_entities(func.max(Listing.price_uzs)).scalar()
    regions = sorted(
        {r[0] for r in db.query(Listing.region).distinct().all() if r[0]}
    )
    return StatsSummary(
        total=total,
        avg_price_uzs=round(float(avg_uzs), 2) if avg_uzs else None,
        avg_price_usd=round(float(avg_usd), 2) if avg_usd else None,
        min_price_uzs=float(min_uzs) if min_uzs else None,
        max_price_uzs=float(max_uzs) if max_uzs else None,
        regions=regions,
    )


@app.get(f"{settings.api_prefix}/stats/by-region", response_model=List[RegionStat])
def stats_by_region(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Listing.region,
            func.count(Listing.id),
            func.avg(Listing.price_uzs),
            func.avg(Listing.area_sqm),
        )
        .filter(Listing.is_active == 1, Listing.region.isnot(None))
        .group_by(Listing.region)
        .all()
    )
    out = []
    for region, count, avg_price, avg_area in rows:
        out.append(
            RegionStat(
                region=region or "Noma'lum",
                count=count,
                avg_price_uzs=round(float(avg_price), 2) if avg_price else None,
                avg_area_sqm=round(float(avg_area), 2) if avg_area else None,
            )
        )
    return sorted(out, key=lambda x: x.count, reverse=True)


@app.get(
    f"{settings.api_prefix}/stats/price-distribution",
    response_model=List[PriceBucket],
)
def price_distribution(db: Session = Depends(get_db)):
    # buckets in UZS (50M, 100M, 200M, 400M, 1B, 2B+)
    buckets = [
        (0, 50_000_000),
        (50_000_000, 100_000_000),
        (100_000_000, 200_000_000),
        (200_000_000, 400_000_000),
        (400_000_000, 1_000_000_000),
        (1_000_000_000, 2_000_000_000),
        (2_000_000_000, 20_000_000_000),
    ]
    result = []
    for low, high in buckets:
        count = (
            db.query(Listing)
            .filter(Listing.is_active == 1, Listing.price_uzs >= low, Listing.price_uzs < high)
            .count()
        )
        result.append(PriceBucket(min=low, max=high, count=count))
    return result


@app.post(f"{settings.api_prefix}/scrape")
def trigger_scrape(
    background_tasks: BackgroundTasks,
    source: Optional[str] = Query(None),
):
    background_tasks.add_task(run_scrapers, source)
    return {"message": "Scraping started", "source": source or "all"}


# --- Static frontend mount ---
static_dir = BASE_DIR / "app" / "static"
if static_dir.exists() and any(static_dir.iterdir()):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
