"""
Makcorps Historical Hotel Prices API Connector
Docs: https://www.makcorps.com/historical-hotel-price.html
"""
import os
import asyncio
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from core.utils.logging import get_logger

logger = get_logger(__name__)


class MakcorpsAPIError(Exception):
    """Makcorps API error"""
    pass


class MakcorpsConnector:
    """
    Connector for Makcorps Historical Hotel Prices API
    """

    BASE_URL = "https://api.makcorps.com/hotels/v1"

    def __init__(self, api_key: Optional[str] = None, mock_mode: bool = False):
        """
        Initialize Makcorps connector

        Args:
            api_key: Makcorps API key (or from MAKCORPS_API_KEY env var)
            mock_mode: If True, return mock data instead of real API calls
        """
        self.api_key = api_key or os.getenv("MAKCORPS_API_KEY")
        self.mock_mode = mock_mode or not self.api_key

        if self.mock_mode:
            logger.warning("makcorps_mock_mode", message="No API key found, using mock data")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def _make_request(
        self,
        endpoint: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make async HTTP request to Makcorps API with retries"""
        if self.mock_mode:
            return self._get_mock_response(endpoint, params)

        url = f"{self.BASE_URL}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()

                logger.info(
                    "makcorps_request_success",
                    endpoint=endpoint,
                    status=response.status_code
                )

                return response.json()

            except httpx.HTTPStatusError as e:
                logger.error(
                    "makcorps_http_error",
                    endpoint=endpoint,
                    status=e.response.status_code,
                    error=str(e)
                )
                raise MakcorpsAPIError(f"HTTP {e.response.status_code}: {str(e)}")

            except Exception as e:
                logger.error("makcorps_request_failed", endpoint=endpoint, error=str(e))
                raise MakcorpsAPIError(f"Request failed: {str(e)}")

    def _get_mock_response(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate mock response for testing"""
        if endpoint == "search":
            return self._mock_search_hotels(params)
        elif endpoint == "prices":
            return self._mock_get_prices(params)
        elif endpoint == "hotel":
            return self._mock_get_hotel_details(params)
        else:
            return {"error": "Unknown endpoint"}

    def _mock_search_hotels(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mock hotel search response"""
        lat = params.get("lat", 43.4204)
        lon = params.get("lon", 6.7713)
        radius = params.get("radius_km", 10)

        # Generate mock hotels based on location
        import random
        random.seed(int(lat * 1000 + lon * 1000))

        num_hotels = random.randint(5, 15)
        hotels = []

        for i in range(num_hotels):
            hotel_id = f"mock_hotel_{i+1}"
            lat_offset = (random.random() - 0.5) * (radius / 111)  # ~111km per degree
            lon_offset = (random.random() - 0.5) * (radius / 111)

            hotels.append({
                "hotel_id": hotel_id,
                "name": f"Hotel {chr(65+i)} {params.get('city', 'Plaza')}",
                "lat": lat + lat_offset,
                "lon": lon + lon_offset,
                "stars": random.randint(3, 5),
                "rating": round(random.uniform(7.5, 9.5), 1),
                "amenities": random.sample(
                    ["wifi", "pool", "spa", "restaurant", "bar", "gym", "parking"],
                    k=random.randint(3, 6)
                ),
                "num_rooms": random.randint(50, 200)
            })

        return {
            "results": hotels,
            "total": len(hotels),
            "mock": True
        }

    def _mock_get_prices(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mock price history response"""
        import random
        import numpy as np

        hotel_id = params.get("hotel_id")
        start_date = datetime.fromisoformat(params.get("start_date", "2023-01-01"))
        end_date = datetime.fromisoformat(params.get("end_date", "2024-01-01"))

        # Generate realistic price series
        days = (end_date - start_date).days
        base_price = random.randint(80, 200)

        # Add seasonality + noise
        prices = []
        current_date = start_date

        for i in range(days):
            # Seasonal component (summer more expensive)
            seasonal = 30 * np.sin(2 * np.pi * i / 365)
            # Weekly component (weekends more expensive)
            weekly = 20 * np.sin(2 * np.pi * i / 7)
            # Random noise
            noise = random.gauss(0, 10)

            price = base_price + seasonal + weekly + noise
            price = max(50, price)  # Floor price

            prices.append({
                "date": current_date.date().isoformat(),
                "price": round(price, 2),
                "currency": "EUR",
                "occupancy": round(random.uniform(0.5, 0.95), 2),
                "availability": random.randint(10, 50)
            })

            current_date += timedelta(days=1)

        return {
            "hotel_id": hotel_id,
            "prices": prices,
            "mock": True
        }

    def _mock_get_hotel_details(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mock hotel details response"""
        import random

        hotel_id = params.get("hotel_id")

        return {
            "hotel_id": hotel_id,
            "name": f"Hotel {hotel_id.split('_')[-1]}",
            "stars": random.randint(3, 5),
            "rating": round(random.uniform(7.5, 9.5), 1),
            "address": "123 Main St",
            "city": "Fréjus",
            "country": "FR",
            "lat": 43.4204,
            "lon": 6.7713,
            "amenities": ["wifi", "pool", "restaurant", "parking"],
            "num_rooms": random.randint(50, 200),
            "mock": True
        }

    # ===== Public API Methods =====

    async def search_hotels(
        self,
        lat: float,
        lon: float,
        radius_km: float = 10,
        min_stars: int = 3,
        max_stars: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for hotels near coordinates

        Args:
            lat: Latitude
            lon: Longitude
            radius_km: Search radius in kilometers
            min_stars: Minimum star rating
            max_stars: Maximum star rating

        Returns:
            List of hotel dictionaries
        """
        params = {
            "lat": lat,
            "lon": lon,
            "radius_km": radius_km,
            "min_stars": min_stars,
            "max_stars": max_stars
        }

        response = await self._make_request("search", params)
        return response.get("results", [])

    async def get_hotel_details(self, hotel_id: str) -> Dict[str, Any]:
        """
        Get detailed information for a specific hotel

        Args:
            hotel_id: Makcorps hotel ID

        Returns:
            Hotel details dictionary
        """
        params = {"hotel_id": hotel_id}
        return await self._make_request("hotel", params)

    async def get_price_history(
        self,
        hotel_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        Fetch historical prices for a hotel

        Args:
            hotel_id: Makcorps hotel ID
            start_date: Start date
            end_date: End date

        Returns:
            List of daily price observations
        """
        params = {
            "hotel_id": hotel_id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }

        response = await self._make_request("prices", params)
        return response.get("prices", [])

    async def get_live_prices(
        self,
        hotel_ids: List[str],
        check_in: date,
        check_out: date
    ) -> List[Dict[str, Any]]:
        """
        Get live prices for multiple hotels (for a specific booking window)

        Args:
            hotel_ids: List of Makcorps hotel IDs
            check_in: Check-in date
            check_out: Check-out date

        Returns:
            List of current price observations
        """
        # In mock mode, just get single-day prices
        if self.mock_mode:
            results = []
            for hotel_id in hotel_ids:
                prices = await self.get_price_history(
                    hotel_id,
                    check_in,
                    check_in  # Just one day
                )
                if prices:
                    results.append({
                        "hotel_id": hotel_id,
                        "check_in": check_in.isoformat(),
                        "check_out": check_out.isoformat(),
                        **prices[0]
                    })
            return results

        # Real API call
        params = {
            "hotel_ids": ",".join(hotel_ids),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat()
        }

        response = await self._make_request("live_prices", params)
        return response.get("prices", [])


# ===== Convenience Functions =====

async def fetch_competitor_hotels(
    lat: float,
    lon: float,
    radius_km: float = 10,
    mock_mode: bool = False
) -> List[Dict[str, Any]]:
    """
    Convenience function to fetch nearby competitor hotels

    Args:
        lat: Latitude
        lon: Longitude
        radius_km: Search radius
        mock_mode: Use mock data

    Returns:
        List of hotels
    """
    connector = MakcorpsConnector(mock_mode=mock_mode)
    return await connector.search_hotels(lat, lon, radius_km)


async def fetch_price_history_batch(
    hotel_ids: List[str],
    start_date: date,
    end_date: date,
    mock_mode: bool = False
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Fetch price history for multiple hotels in parallel

    Args:
        hotel_ids: List of hotel IDs
        start_date: Start date
        end_date: End date
        mock_mode: Use mock data

    Returns:
        Dictionary mapping hotel_id to price history
    """
    connector = MakcorpsConnector(mock_mode=mock_mode)

    tasks = [
        connector.get_price_history(hotel_id, start_date, end_date)
        for hotel_id in hotel_ids
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    return {
        hotel_id: result if not isinstance(result, Exception) else []
        for hotel_id, result in zip(hotel_ids, results)
    }
