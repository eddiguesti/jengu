"""Geocoding utility with caching"""
import httpx
from typing import Optional, Dict, List
from pathlib import Path
import json
from tenacity import retry, stop_after_attempt, wait_exponential

from ..utils.logging import get_logger

logger = get_logger(__name__)


class GeocodingCache:
    """Cache for geocoding results"""

    def __init__(self, cache_dir: Path = Path("data/cache")):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_key(self, city: str, country: str) -> str:
        """Generate cache key"""
        return f"geo_{city.lower().replace(' ', '_')}_{country.lower()}.json"

    def get(self, city: str, country: str) -> Optional[dict]:
        """Get cached result"""
        cache_file = self.cache_dir / self._get_cache_key(city, country)

        if cache_file.exists():
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                logger.info("geocode_cache_hit", city=city, country=country)
                return data
            except Exception as e:
                logger.warning("geocode_cache_read_failed", error=str(e))

        return None

    def set(self, city: str, country: str, data: dict) -> None:
        """Cache result"""
        cache_file = self.cache_dir / self._get_cache_key(city, country)

        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            logger.info("geocode_cached", city=city, country=country)
        except Exception as e:
            logger.warning("geocode_cache_write_failed", error=str(e))


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _fetch_geocode_open_meteo(city: str, country: str) -> Optional[dict]:
    """Fetch geocode from Open-Meteo"""
    url = "https://geocoding-api.open-meteo.com/v1/search"

    params = {
        "name": city,
        "count": 10,
        "language": "en",
        "format": "json"
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "results" not in data or not data["results"]:
                return None

            # Find best match (prefer exact country match)
            for result in data["results"]:
                if result.get("country_code", "").upper() == country.upper():
                    return {
                        "lat": result["latitude"],
                        "lon": result["longitude"],
                        "timezone": result.get("timezone", "UTC"),
                        "name": result.get("name", city),
                        "country": result.get("country", ""),
                        "country_code": result.get("country_code", country).upper(),
                        "elevation": result.get("elevation"),
                        "source": "open-meteo"
                    }

            # Fallback to first result
            result = data["results"][0]
            return {
                "lat": result["latitude"],
                "lon": result["longitude"],
                "timezone": result.get("timezone", "UTC"),
                "name": result.get("name", city),
                "country": result.get("country", ""),
                "country_code": result.get("country_code", country).upper(),
                "elevation": result.get("elevation"),
                "source": "open-meteo"
            }

    except Exception as e:
        logger.warning("open_meteo_geocode_failed", city=city, error=str(e))
        return None


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=10))
def _fetch_geocode_nominatim(city: str, country: str) -> Optional[dict]:
    """Fetch geocode from OpenStreetMap Nominatim (fallback)"""
    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "city": city,
        "country": country,
        "format": "json",
        "limit": 1
    }

    headers = {
        "User-Agent": "DynamicPricingEngine/1.0 (contact@example.com)"
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

            if not data:
                return None

            result = data[0]
            lat = float(result["lat"])
            lon = float(result["lon"])

            # Estimate timezone from longitude
            timezone = _estimate_timezone_from_lon(lon)

            return {
                "lat": lat,
                "lon": lon,
                "timezone": timezone,
                "name": result.get("display_name", city),
                "country": country,
                "country_code": country.upper(),
                "elevation": None,
                "source": "nominatim"
            }

    except Exception as e:
        logger.warning("nominatim_geocode_failed", city=city, error=str(e))
        return None


def _estimate_timezone_from_lon(longitude: float) -> str:
    """Estimate timezone from longitude (rough approximation)"""
    # 15 degrees per hour
    offset_hours = round(longitude / 15)

    timezone_map = {
        -11: "Pacific/Midway",
        -10: "Pacific/Honolulu",
        -9: "America/Anchorage",
        -8: "America/Los_Angeles",
        -7: "America/Denver",
        -6: "America/Chicago",
        -5: "America/New_York",
        -4: "America/Santiago",
        -3: "America/Sao_Paulo",
        -2: "Atlantic/South_Georgia",
        -1: "Atlantic/Azores",
        0: "Europe/London",
        1: "Europe/Paris",
        2: "Europe/Athens",
        3: "Europe/Moscow",
        4: "Asia/Dubai",
        5: "Asia/Karachi",
        6: "Asia/Dhaka",
        7: "Asia/Bangkok",
        8: "Asia/Singapore",
        9: "Asia/Tokyo",
        10: "Australia/Sydney",
        11: "Pacific/Noumea",
        12: "Pacific/Auckland",
    }

    return timezone_map.get(offset_hours, "UTC")


def resolve_location(city: str, country: str) -> dict:
    """
    Resolve city name to lat/lon/timezone with caching

    Args:
        city: City name (e.g., "Fréjus")
        country: ISO-2 country code (e.g., "FR")

    Returns:
        dict with lat, lon, timezone, name, country_code

    Raises:
        ValueError: If location cannot be resolved
    """
    # Check cache first
    cache = GeocodingCache()
    cached = cache.get(city, country)

    if cached:
        return cached

    logger.info("resolving_location", city=city, country=country)

    # Try Open-Meteo first (includes timezone)
    result = _fetch_geocode_open_meteo(city, country)

    # Fallback to Nominatim
    if not result:
        logger.info("trying_nominatim_fallback", city=city)
        result = _fetch_geocode_nominatim(city, country)

    if not result:
        raise ValueError(f"Could not resolve location: {city}, {country}")

    # Cache the result
    cache.set(city, country, result)

    logger.info(
        "location_resolved",
        city=city,
        lat=result["lat"],
        lon=result["lon"],
        timezone=result["timezone"]
    )

    return result


def get_timezone_for_coordinates(latitude: float, longitude: float) -> str:
    """
    Get timezone for coordinates

    Args:
        latitude: Latitude
        longitude: Longitude

    Returns:
        Timezone string (e.g., "Europe/Paris")
    """
    # Use timeapi.io or estimate
    url = "https://timeapi.io/api/timezone/coordinate"
    params = {
        "latitude": latitude,
        "longitude": longitude
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("timeZone", _estimate_timezone_from_lon(longitude))
    except:
        return _estimate_timezone_from_lon(longitude)
