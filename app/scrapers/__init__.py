"""Scrapers for real Uzbekistan real-estate listings."""
from .olx import scrape_olx
from .uybor import scrape_uybor

__all__ = ["scrape_olx", "scrape_uybor"]
