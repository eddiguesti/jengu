"""
Competitor Data Client
=======================
Fetches competitor pricing data from the backend database.
"""

import httpx
import logging
from typing import Optional, Dict, Any
from datetime import date, datetime
import os

logger = logging.getLogger(__name__)


class CompetitorDataClient:
    """
    Client for fetching competitor pricing data from the backend API.
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize competitor data client

        Args:
            base_url: Backend API base URL (defaults to env var BACKEND_API_URL)
            api_key: API key for authentication (defaults to env var BACKEND_API_KEY)
        """
        self.base_url = base_url or os.getenv('BACKEND_API_URL', 'http://localhost:3001')
        self.api_key = api_key or os.getenv('BACKEND_API_KEY', '')
        self.timeout = 5.0  # 5 second timeout

    def get_competitor_prices(
        self,
        property_id: str,
        stay_date: str,
        user_token: Optional[str] = None
    ) -> Optional[Dict[str, float]]:
        """
        Fetch competitor price bands (P10, P50, P90) for a property and date

        Args:
            property_id: Property UUID
            stay_date: Date in ISO format (YYYY-MM-DD)
            user_token: Optional user JWT token for authentication

        Returns:
            Dict with comp_price_p10, comp_price_p50, comp_price_p90 or None if not found
        """
        try:
            # Parse and format date
            if 'T' in stay_date:
                date_obj = datetime.fromisoformat(stay_date.replace('Z', '+00:00')).date()
            else:
                date_obj = date.fromisoformat(stay_date)

            date_str = date_obj.isoformat()

            # Build request URL
            url = f"{self.base_url}/api/competitor-data/{property_id}/{date_str}"

            # Set headers
            headers = {}
            if user_token:
                headers['Authorization'] = f'Bearer {user_token}'
            elif self.api_key:
                headers['X-API-Key'] = self.api_key

            # Make request with timeout
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=headers)

                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('data'):
                        comp_data = data['data']
                        return {
                            'comp_price_p10': comp_data.get('priceP10'),
                            'comp_price_p50': comp_data.get('priceP50'),
                            'comp_price_p90': comp_data.get('priceP90'),
                            'competitor_count': comp_data.get('competitorCount', 0),
                            'source': comp_data.get('source', 'unknown'),
                        }
                    else:
                        logger.warning(f"No competitor data found for property {property_id} on {date_str}")
                        return None

                elif response.status_code == 404:
                    logger.info(f"No competitor data available for property {property_id} on {date_str}")
                    return None

                else:
                    logger.error(f"Error fetching competitor data: HTTP {response.status_code}")
                    return None

        except httpx.TimeoutException:
            logger.warning(f"Timeout fetching competitor data for {property_id}")
            return None

        except Exception as e:
            logger.error(f"Error fetching competitor data: {str(e)}")
            return None

    async def get_competitor_prices_async(
        self,
        property_id: str,
        stay_date: str,
        user_token: Optional[str] = None
    ) -> Optional[Dict[str, float]]:
        """
        Async version of get_competitor_prices

        Args:
            property_id: Property UUID
            stay_date: Date in ISO format (YYYY-MM-DD)
            user_token: Optional user JWT token for authentication

        Returns:
            Dict with comp_price_p10, comp_price_p50, comp_price_p90 or None if not found
        """
        try:
            # Parse and format date
            if 'T' in stay_date:
                date_obj = datetime.fromisoformat(stay_date.replace('Z', '+00:00')).date()
            else:
                date_obj = date.fromisoformat(stay_date)

            date_str = date_obj.isoformat()

            # Build request URL
            url = f"{self.base_url}/api/competitor-data/{property_id}/{date_str}"

            # Set headers
            headers = {}
            if user_token:
                headers['Authorization'] = f'Bearer {user_token}'
            elif self.api_key:
                headers['X-API-Key'] = self.api_key

            # Make async request with timeout
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)

                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('data'):
                        comp_data = data['data']
                        return {
                            'comp_price_p10': comp_data.get('priceP10'),
                            'comp_price_p50': comp_data.get('priceP50'),
                            'comp_price_p90': comp_data.get('priceP90'),
                            'competitor_count': comp_data.get('competitorCount', 0),
                            'source': comp_data.get('source', 'unknown'),
                        }
                    else:
                        logger.warning(f"No competitor data found for property {property_id} on {date_str}")
                        return None

                elif response.status_code == 404:
                    logger.info(f"No competitor data available for property {property_id} on {date_str}")
                    return None

                else:
                    logger.error(f"Error fetching competitor data: HTTP {response.status_code}")
                    return None

        except httpx.TimeoutException:
            logger.warning(f"Timeout fetching competitor data for {property_id}")
            return None

        except Exception as e:
            logger.error(f"Error fetching competitor data: {str(e)}")
            return None
