"""Geocoding service for business location detection"""
import httpx
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
import asyncio

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class GeocodingResult:
    """Result from geocoding service"""
    name: str
    latitude: float
    longitude: float
    country: str
    country_code: str
    admin1: Optional[str] = None  # State/Region
    timezone: Optional[str] = None
    elevation: Optional[float] = None


class GeocodingService:
    """
    Geocoding service using Open-Meteo Geocoding API
    Free, no API key required, includes timezone
    """

    GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
    TIMEZONE_URL = "https://timeapi.io/api/timezone/coordinate"

    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()

    async def geocode_city(
        self,
        city: str,
        country_code: Optional[str] = None,
        language: str = "en"
    ) -> List[GeocodingResult]:
        """
        Geocode a city name to coordinates

        Args:
            city: City name (e.g., "Fréjus", "Paris")
            country_code: Optional ISO-2 country code to narrow results
            language: Language for results

        Returns:
            List of geocoding results (best matches first)
        """
        if not self.client:
            raise RuntimeError("Service not initialized. Use async with context.")

        params = {
            "name": city,
            "count": 10,
            "language": language,
            "format": "json"
        }

        logger.info("geocoding_request", city=city, country=country_code)

        try:
            response = await self.client.get(self.GEOCODING_URL, params=params)
            response.raise_for_status()
            data = response.json()

            if "results" not in data or not data["results"]:
                logger.warning("geocoding_no_results", city=city)
                return []

            results = []
            for item in data["results"]:
                # Filter by country if specified
                if country_code and item.get("country_code") != country_code:
                    continue

                result = GeocodingResult(
                    name=item.get("name", city),
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    country=item.get("country", ""),
                    country_code=item.get("country_code", ""),
                    admin1=item.get("admin1"),
                    timezone=item.get("timezone"),
                    elevation=item.get("elevation")
                )
                results.append(result)

            logger.info(
                "geocoding_success",
                city=city,
                results_count=len(results)
            )

            return results

        except Exception as e:
            logger.error("geocoding_failed", city=city, error=str(e))
            raise

    async def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[GeocodingResult]:
        """
        Reverse geocode coordinates to location info

        Args:
            latitude: Latitude
            longitude: Longitude

        Returns:
            Geocoding result or None
        """
        # Open-Meteo doesn't have reverse geocoding, use Nominatim
        nominatim_url = "https://nominatim.openstreetmap.org/reverse"

        if not self.client:
            raise RuntimeError("Service not initialized. Use async with context.")

        params = {
            "lat": latitude,
            "lon": longitude,
            "format": "json"
        }

        headers = {
            "User-Agent": "DynamicPricingEngine/1.0"
        }

        try:
            response = await self.client.get(
                nominatim_url,
                params=params,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()

            address = data.get("address", {})

            return GeocodingResult(
                name=address.get("city") or address.get("town") or address.get("village", ""),
                latitude=latitude,
                longitude=longitude,
                country=address.get("country", ""),
                country_code=address.get("country_code", "").upper(),
                admin1=address.get("state"),
                timezone=None  # Will be fetched separately
            )

        except Exception as e:
            logger.error("reverse_geocoding_failed", lat=latitude, lon=longitude, error=str(e))
            return None

    async def get_timezone(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[str]:
        """
        Get timezone for coordinates

        Args:
            latitude: Latitude
            longitude: Longitude

        Returns:
            Timezone string (e.g., "Europe/Paris") or None
        """
        if not self.client:
            raise RuntimeError("Service not initialized. Use async with context.")

        # Use timeapi.io (free, no key required)
        params = {
            "latitude": latitude,
            "longitude": longitude
        }

        try:
            response = await self.client.get(self.TIMEZONE_URL, params=params)
            response.raise_for_status()
            data = response.json()

            timezone = data.get("timeZone")
            logger.info("timezone_detected", lat=latitude, lon=longitude, timezone=timezone)

            return timezone

        except Exception as e:
            logger.warning("timezone_detection_failed", error=str(e))
            # Fallback: estimate from longitude
            return self._estimate_timezone_from_longitude(longitude)

    def _estimate_timezone_from_longitude(self, longitude: float) -> str:
        """
        Rough timezone estimation from longitude

        Args:
            longitude: Longitude (-180 to 180)

        Returns:
            Estimated timezone string
        """
        # Very rough estimation (15 degrees per hour)
        offset_hours = round(longitude / 15)

        # Map to common timezones
        timezone_map = {
            0: "Europe/London",
            1: "Europe/Paris",
            2: "Europe/Athens",
            -5: "America/New_York",
            -6: "America/Chicago",
            -8: "America/Los_Angeles",
            9: "Asia/Tokyo",
            8: "Asia/Singapore",
        }

        return timezone_map.get(offset_hours, "UTC")


def geocode_city_sync(
    city: str,
    country_code: Optional[str] = None
) -> List[GeocodingResult]:
    """
    Synchronous wrapper for geocoding

    Args:
        city: City name
        country_code: Optional country code filter

    Returns:
        List of geocoding results
    """
    async def _run():
        async with GeocodingService() as service:
            return await service.geocode_city(city, country_code)

    return asyncio.run(_run())


def get_timezone_sync(latitude: float, longitude: float) -> Optional[str]:
    """
    Synchronous wrapper for timezone detection

    Args:
        latitude: Latitude
        longitude: Longitude

    Returns:
        Timezone string or None
    """
    async def _run():
        async with GeocodingService() as service:
            return await service.get_timezone(latitude, longitude)

    return asyncio.run(_run())
