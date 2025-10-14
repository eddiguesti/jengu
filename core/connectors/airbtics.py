"""
Airbtics API Connector (with AirDNA fallback)
For Airbnb-style market data: ADR, occupancy, revenue
Docs: https://airbtics.com/
"""
import os
import asyncio
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from core.utils.logging import get_logger

logger = get_logger(__name__)


class AirbticsAPIError(Exception):
    """Airbtics API error"""
    pass


class AirbticsConnector:
    """
    Connector for Airbtics Airbnb Market Data API
    Falls back to AirDNA if Airbtics key not available
    """

    AIRBTICS_BASE_URL = "https://api.airbtics.com/v1"
    AIRDNA_BASE_URL = "https://api.airdna.co/v1"

    def __init__(
        self,
        airbtics_key: Optional[str] = None,
        airdna_key: Optional[str] = None,
        mock_mode: bool = False
    ):
        """
        Initialize Airbtics/AirDNA connector

        Args:
            airbtics_key: Airbtics API key (or from AIRBTICS_API_KEY env var)
            airdna_key: AirDNA API key (or from AIRDNA_API_KEY env var)
            mock_mode: If True, return mock data
        """
        self.airbtics_key = airbtics_key or os.getenv("AIRBTICS_API_KEY")
        self.airdna_key = airdna_key or os.getenv("AIRDNA_API_KEY")

        # Determine which API to use
        if self.airbtics_key:
            self.provider = "airbtics"
            self.base_url = self.AIRBTICS_BASE_URL
            self.api_key = self.airbtics_key
        elif self.airdna_key:
            self.provider = "airdna"
            self.base_url = self.AIRDNA_BASE_URL
            self.api_key = self.airdna_key
        else:
            self.provider = "mock"
            self.base_url = None
            self.api_key = None

        self.mock_mode = mock_mode or self.provider == "mock"

        if self.mock_mode:
            logger.warning(
                "airbtics_mock_mode",
                message="No Airbtics/AirDNA key found, using mock data"
            )
        else:
            logger.info("airbtics_provider", provider=self.provider)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def _make_request(
        self,
        endpoint: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make async HTTP request with retries"""
        if self.mock_mode:
            return self._get_mock_response(endpoint, params)

        url = f"{self.base_url}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()

                logger.info(
                    "airbtics_request_success",
                    provider=self.provider,
                    endpoint=endpoint,
                    status=response.status_code
                )

                return response.json()

            except httpx.HTTPStatusError as e:
                logger.error(
                    "airbtics_http_error",
                    provider=self.provider,
                    endpoint=endpoint,
                    status=e.response.status_code,
                    error=str(e)
                )
                raise AirbticsAPIError(f"HTTP {e.response.status_code}: {str(e)}")

            except Exception as e:
                logger.error(
                    "airbtics_request_failed",
                    provider=self.provider,
                    endpoint=endpoint,
                    error=str(e)
                )
                raise AirbticsAPIError(f"Request failed: {str(e)}")

    def _get_mock_response(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate mock response for testing"""
        if endpoint == "markets" or endpoint == "market/search":
            return self._mock_search_markets(params)
        elif endpoint == "market/data" or endpoint == "market/metrics":
            return self._mock_get_market_data(params)
        else:
            return {"error": "Unknown endpoint"}

    def _mock_search_markets(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mock market search response"""
        city = params.get("city", "Paris")
        region = params.get("region", city)

        # Generate mock market regions
        markets = [
            {
                "market_id": f"market_{city.lower()}_central",
                "name": f"{city} - City Center",
                "region": region,
                "city": city,
                "country": params.get("country", "FR"),
                "lat": params.get("lat", 43.4204),
                "lon": params.get("lon", 6.7713),
                "num_listings": 1250,
                "market_type": "urban"
            },
            {
                "market_id": f"market_{city.lower()}_beach",
                "name": f"{city} - Beach Area",
                "region": region,
                "city": city,
                "country": params.get("country", "FR"),
                "lat": params.get("lat", 43.4204) + 0.02,
                "lon": params.get("lon", 6.7713) + 0.02,
                "num_listings": 850,
                "market_type": "coastal"
            }
        ]

        return {
            "results": markets,
            "total": len(markets),
            "mock": True
        }

    def _mock_get_market_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mock market metrics response"""
        import random
        import numpy as np

        market_id = params.get("market_id")
        start_date = datetime.fromisoformat(params.get("start_date", "2023-01-01"))
        end_date = datetime.fromisoformat(params.get("end_date", "2024-01-01"))

        days = (end_date - start_date).days
        base_adr = random.randint(100, 180)
        base_occupancy = 0.65

        # Generate realistic time series
        metrics = []
        current_date = start_date

        for i in range(days):
            # Seasonal patterns
            seasonal_adr = 40 * np.sin(2 * np.pi * i / 365)
            seasonal_occ = 0.15 * np.sin(2 * np.pi * i / 365)

            # Weekly patterns (weekends higher)
            weekly_adr = 15 * np.sin(2 * np.pi * i / 7)
            weekly_occ = 0.08 * np.sin(2 * np.pi * i / 7)

            # Noise
            noise_adr = random.gauss(0, 8)
            noise_occ = random.gauss(0, 0.03)

            adr = base_adr + seasonal_adr + weekly_adr + noise_adr
            adr = max(50, adr)

            occupancy = base_occupancy + seasonal_occ + weekly_occ + noise_occ
            occupancy = max(0.2, min(0.95, occupancy))

            metrics.append({
                "date": current_date.date().isoformat(),
                "adr": round(adr, 2),
                "occupancy": round(occupancy, 3),
                "revenue": round(adr * occupancy * random.randint(800, 1200), 2),
                "available_listings": random.randint(500, 900),
                "booked_listings": int(random.randint(500, 900) * occupancy)
            })

            current_date += timedelta(days=1)

        return {
            "market_id": market_id,
            "metrics": metrics,
            "mock": True
        }

    # ===== Public API Methods =====

    async def search_markets(
        self,
        city: str,
        region: Optional[str] = None,
        country: str = "FR",
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for Airbnb market regions

        Args:
            city: City name
            region: Optional region name
            country: Country code
            lat: Optional latitude for proximity search
            lon: Optional longitude for proximity search

        Returns:
            List of market dictionaries
        """
        if self.provider == "airbtics":
            endpoint = "markets"
        else:  # airdna or mock
            endpoint = "market/search"

        params = {
            "city": city,
            "country": country
        }

        if region:
            params["region"] = region
        if lat is not None and lon is not None:
            params["lat"] = lat
            params["lon"] = lon

        response = await self._make_request(endpoint, params)
        return response.get("results", [])

    async def get_market_data(
        self,
        market_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        Fetch daily market metrics (ADR, occupancy, revenue)

        Args:
            market_id: Market identifier
            start_date: Start date
            end_date: End date

        Returns:
            List of daily market metrics
        """
        if self.provider == "airbtics":
            endpoint = "market/data"
        else:  # airdna or mock
            endpoint = "market/metrics"

        params = {
            "market_id": market_id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }

        response = await self._make_request(endpoint, params)
        return response.get("metrics", [])

    async def get_live_market_snapshot(
        self,
        market_ids: List[str],
        target_date: date
    ) -> List[Dict[str, Any]]:
        """
        Get current/recent market snapshot for multiple markets

        Args:
            market_ids: List of market IDs
            target_date: Target date (usually today or upcoming)

        Returns:
            List of market snapshots
        """
        tasks = [
            self.get_market_data(market_id, target_date, target_date)
            for market_id in market_ids
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        snapshots = []
        for market_id, result in zip(market_ids, results):
            if not isinstance(result, Exception) and result:
                snapshot = result[0]  # First day
                snapshot["market_id"] = market_id
                snapshots.append(snapshot)

        return snapshots


# ===== Convenience Functions =====

async def fetch_market_regions(
    city: str,
    country: str = "FR",
    mock_mode: bool = False
) -> List[Dict[str, Any]]:
    """
    Convenience function to fetch Airbnb market regions for a city

    Args:
        city: City name
        country: Country code
        mock_mode: Use mock data

    Returns:
        List of markets
    """
    connector = AirbticsConnector(mock_mode=mock_mode)
    return await connector.search_markets(city, country=country)


async def fetch_market_data_batch(
    market_ids: List[str],
    start_date: date,
    end_date: date,
    mock_mode: bool = False
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Fetch market data for multiple markets in parallel

    Args:
        market_ids: List of market IDs
        start_date: Start date
        end_date: End date
        mock_mode: Use mock data

    Returns:
        Dictionary mapping market_id to metrics
    """
    connector = AirbticsConnector(mock_mode=mock_mode)

    tasks = [
        connector.get_market_data(market_id, start_date, end_date)
        for market_id in market_ids
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    return {
        market_id: result if not isinstance(result, Exception) else []
        for market_id, result in zip(market_ids, results)
    }
