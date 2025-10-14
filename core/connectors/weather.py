"""Weather data connector using Open-Meteo API"""
import pandas as pd
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .base import BaseConnector, register_connector
from ..utils.logging import get_logger

logger = get_logger(__name__)


@register_connector('weather')
class WeatherConnector(BaseConnector):
    """Connector for Open-Meteo weather API"""

    BASE_URL = "https://archive-api.open-meteo.com/v1/archive"
    FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

    # City coordinates (latitude, longitude)
    CITY_COORDS = {
        'Paris': (48.8566, 2.3522),
        'Tokyo': (35.6762, 139.6503),
        'New York': (40.7128, -74.0060),
        'London': (51.5074, -0.1278),
        'Sydney': (-33.8688, 151.2093),
        'Dubai': (25.2048, 55.2708)
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.client: Optional[httpx.Client] = None

    def connect(self) -> bool:
        """Initialize HTTP client"""
        self.client = httpx.Client(timeout=30.0)
        self._is_connected = True
        logger.info("weather_connector_connected")
        return True

    def disconnect(self):
        """Close HTTP client"""
        if self.client:
            self.client.close()
        self._is_connected = False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _fetch_weather_api(
        self,
        latitude: float,
        longitude: float,
        start_date: date,
        end_date: date,
        is_forecast: bool = False
    ) -> Dict[str, Any]:
        """
        Fetch weather data from API with retry logic

        Args:
            latitude: Location latitude
            longitude: Location longitude
            start_date: Start date
            end_date: End date
            is_forecast: Use forecast API instead of historical

        Returns:
            API response JSON
        """
        url = self.FORECAST_URL if is_forecast else self.BASE_URL

        params = {
            'latitude': latitude,
            'longitude': longitude,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'daily': 'temperature_2m_mean,precipitation_sum,windspeed_10m_max',
            'timezone': 'auto'
        }

        response = self.client.get(url, params=params)
        response.raise_for_status()

        return response.json()

    def fetch_data(
        self,
        city: str,
        start_date: date,
        end_date: date,
        is_forecast: bool = False
    ) -> pd.DataFrame:
        """
        Fetch weather data for a city and date range

        Args:
            city: City name
            start_date: Start date
            end_date: End date
            is_forecast: Fetch forecast instead of historical

        Returns:
            DataFrame with weather data
        """
        if not self._is_connected:
            raise RuntimeError("Not connected. Call connect() first.")

        if city not in self.CITY_COORDS:
            raise ValueError(f"City '{city}' not found. Available cities: {list(self.CITY_COORDS.keys())}")

        latitude, longitude = self.CITY_COORDS[city]

        logger.info(
            "fetching_weather",
            city=city,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat()
        )

        # Fetch from API
        data = self._fetch_weather_api(latitude, longitude, start_date, end_date, is_forecast)

        # Parse response
        daily = data.get('daily', {})

        df = pd.DataFrame({
            'date': pd.to_datetime(daily['time']),
            'city': city,
            'temperature_mean': daily.get('temperature_2m_mean', []),
            'precipitation_sum': daily.get('precipitation_sum', []),
            'windspeed_max': daily.get('windspeed_10m_max', [])
        })

        logger.info("weather_data_fetched", rows=len(df))
        return df

    def fetch_historical(
        self,
        city: str,
        start_date: date,
        end_date: date
    ) -> pd.DataFrame:
        """Fetch historical weather data"""
        return self.fetch_data(city, start_date, end_date, is_forecast=False)

    def fetch_forecast(
        self,
        city: str,
        days_ahead: int = 7
    ) -> pd.DataFrame:
        """
        Fetch weather forecast

        Args:
            city: City name
            days_ahead: Number of days to forecast

        Returns:
            DataFrame with forecast data
        """
        start_date = date.today()
        end_date = start_date + timedelta(days=days_ahead)

        return self.fetch_data(city, start_date, end_date, is_forecast=True)

    def validate(self) -> bool:
        """Validate connector by fetching sample data"""
        try:
            if not self.connect():
                return False

            # Test with Paris, last 7 days
            end_date = date.today()
            start_date = end_date - timedelta(days=7)

            df = self.fetch_historical('Paris', start_date, end_date)

            if len(df) > 0:
                logger.info("weather_validation_passed")
                return True
            else:
                logger.error("weather_validation_failed", reason="no data returned")
                return False

        except Exception as e:
            logger.error("weather_validation_failed", error=str(e))
            return False


def get_weather_for_bookings(
    bookings_df: pd.DataFrame,
    destination_col: str = 'destination',
    date_col: str = 'booking_date'
) -> pd.DataFrame:
    """
    Enrich bookings with weather data

    Args:
        bookings_df: Bookings DataFrame
        destination_col: Column with destination names
        date_col: Column with dates

    Returns:
        DataFrame with weather features added
    """
    connector = WeatherConnector()

    with connector:
        # Get unique city-date combinations
        unique_combos = bookings_df[[destination_col, date_col]].drop_duplicates()

        weather_data_list = []

        for city in unique_combos[destination_col].unique():
            city_dates = unique_combos[unique_combos[destination_col] == city][date_col]

            if len(city_dates) == 0:
                continue

            start_date = city_dates.min()
            end_date = city_dates.max()

            # Fetch weather
            try:
                weather_df = connector.fetch_historical(city, start_date, end_date)
                weather_data_list.append(weather_df)
            except Exception as e:
                logger.warning("weather_fetch_failed", city=city, error=str(e))

        if weather_data_list:
            all_weather = pd.concat(weather_data_list, ignore_index=True)

            # Merge with bookings
            result = bookings_df.merge(
                all_weather,
                left_on=[destination_col, date_col],
                right_on=['city', 'date'],
                how='left'
            )

            return result
        else:
            return bookings_df
