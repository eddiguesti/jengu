"""Automatic enrichment pipeline for booking data"""
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import httpx
import holidays as holidays_lib
from tenacity import retry, stop_after_attempt, wait_exponential

from ..utils.logging import get_logger
from ..models.business_profile import BusinessProfile

logger = get_logger(__name__)


class EnrichmentCache:
    """Cache for weather and holiday data"""

    def __init__(self, cache_dir: Path = Path("data/cache")):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_weather_cache_path(self, country: str, start_date: str, end_date: str) -> Path:
        """Get weather cache file path"""
        return self.cache_dir / f"weather_{country}_{start_date}_{end_date}.parquet"

    def get_holidays_cache_path(self, country: str, year: int) -> Path:
        """Get holidays cache file path"""
        return self.cache_dir / f"holidays_{country}_{year}.parquet"


class WeatherEnricher:
    """Fetch and cache historical weather data"""

    ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

    def __init__(self, cache: EnrichmentCache):
        self.cache = cache

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def fetch_weather(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
        country: str
    ) -> pd.DataFrame:
        """
        Fetch historical weather data from Open-Meteo

        Args:
            latitude: Latitude
            longitude: Longitude
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            country: Country code for caching

        Returns:
            DataFrame with daily weather data
        """
        # Check cache first
        cache_path = self.cache.get_weather_cache_path(country, start_date, end_date)

        if cache_path.exists():
            logger.info("weather_cache_hit", start=start_date, end=end_date)
            return pd.read_parquet(cache_path)

        logger.info("fetching_weather", lat=latitude, lon=longitude, start=start_date, end=end_date)

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "daily": [
                "temperature_2m_max",
                "temperature_2m_min",
                "temperature_2m_mean",
                "precipitation_sum",
                "rain_sum",
                "snowfall_sum",
                "precipitation_hours",
                "windspeed_10m_max",
                "sunshine_duration",
            ],
            "timezone": "UTC"
        }

        with httpx.Client(timeout=60.0) as client:
            response = client.get(self.ARCHIVE_URL, params=params)
            response.raise_for_status()
            data = response.json()

        # Convert to DataFrame
        daily = data.get("daily", {})
        df = pd.DataFrame({
            "date": pd.to_datetime(daily["time"]),
            "temp_max": daily.get("temperature_2m_max", []),
            "temp_min": daily.get("temperature_2m_min", []),
            "temp_mean": daily.get("temperature_2m_mean", []),
            "precipitation": daily.get("precipitation_sum", []),
            "rain": daily.get("rain_sum", []),
            "snow": daily.get("snowfall_sum", []),
            "precip_hours": daily.get("precipitation_hours", []),
            "windspeed_max": daily.get("windspeed_10m_max", []),
            "sunshine_hours": daily.get("sunshine_duration", []),
        })

        # Add derived features
        df["temp_range"] = df["temp_max"] - df["temp_min"]
        df["is_rainy"] = (df["precipitation"] > 1.0).astype(int)
        df["is_snowy"] = (df["snow"] > 0.5).astype(int)

        # Weather quality score (0-100)
        temp_score = 100 - np.abs(df["temp_mean"] - 21.5) * 4
        temp_score = np.clip(temp_score, 0, 100)

        precip_score = 100 - (df["precipitation"] * 10)
        precip_score = np.clip(precip_score, 0, 100)

        sunshine_score = (df["sunshine_hours"] / 3600 / 12) * 100  # Convert to hours, max 12h
        sunshine_score = np.clip(sunshine_score, 0, 100)

        df["weather_quality"] = (temp_score * 0.4 + precip_score * 0.3 + sunshine_score * 0.3)

        # Cache the result
        df.to_parquet(cache_path, index=False)
        logger.info("weather_cached", rows=len(df), path=str(cache_path))

        return df


class HolidayEnricher:
    """Fetch and cache holiday data"""

    def __init__(self, cache: EnrichmentCache):
        self.cache = cache

    def fetch_holidays(
        self,
        country_code: str,
        start_date: str,
        end_date: str
    ) -> pd.DataFrame:
        """
        Fetch holidays for date range

        Args:
            country_code: ISO-2 country code
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)

        Returns:
            DataFrame with date, is_holiday, holiday_name
        """
        start = pd.to_datetime(start_date)
        end = pd.to_datetime(end_date)

        # Get all years in range
        years = range(start.year, end.year + 1)

        all_holidays = []

        for year in years:
            # Check cache
            cache_path = self.cache.get_holidays_cache_path(country_code, year)

            if cache_path.exists():
                year_holidays = pd.read_parquet(cache_path)
                all_holidays.append(year_holidays)
                continue

            # Fetch from library
            try:
                country_holidays = holidays_lib.country_holidays(country_code, years=year)
                holiday_dates = []

                for date, name in country_holidays.items():
                    holiday_dates.append({
                        "date": pd.to_datetime(date),
                        "is_holiday": 1,
                        "holiday_name": name
                    })

                if holiday_dates:
                    year_df = pd.DataFrame(holiday_dates)
                    year_df.to_parquet(cache_path, index=False)
                    all_holidays.append(year_df)
                    logger.info("holidays_cached", country=country_code, year=year, count=len(holiday_dates))

            except Exception as e:
                logger.warning("holiday_fetch_failed", country=country_code, year=year, error=str(e))

        if not all_holidays:
            # Return empty DataFrame with correct schema
            return pd.DataFrame(columns=["date", "is_holiday", "holiday_name"])

        # Combine all years
        df = pd.concat(all_holidays, ignore_index=True)

        # Filter to date range
        df = df[(df["date"] >= start) & (df["date"] <= end)]

        logger.info("holidays_loaded", country=country_code, count=len(df))

        return df


class EnrichmentPipeline:
    """Main enrichment pipeline orchestrator"""

    def __init__(self, profile: BusinessProfile):
        self.profile = profile
        self.cache = EnrichmentCache()
        self.weather_enricher = WeatherEnricher(self.cache)
        self.holiday_enricher = HolidayEnricher(self.cache)

    def enrich_bookings(
        self,
        bookings_df: pd.DataFrame,
        date_col: str = "booking_date",
        progress_callback=None
    ) -> Tuple[pd.DataFrame, Dict]:
        """
        Enrich booking data with weather and holidays

        Args:
            bookings_df: Booking DataFrame
            date_col: Date column name
            progress_callback: Optional callback for progress updates

        Returns:
            Tuple of (enriched_df, summary_stats)
        """
        logger.info("starting_enrichment", rows=len(bookings_df))

        # Ensure date column is datetime
        bookings_df[date_col] = pd.to_datetime(bookings_df[date_col])

        # Get date range
        start_date = bookings_df[date_col].min().strftime("%Y-%m-%d")
        end_date = bookings_df[date_col].max().strftime("%Y-%m-%d")

        num_days = (pd.to_datetime(end_date) - pd.to_datetime(start_date)).days + 1

        logger.info("date_range_detected", start=start_date, end=end_date, days=num_days)

        # Fetch weather
        if progress_callback:
            progress_callback("Fetching weather data...")

        weather_df = self.weather_enricher.fetch_weather(
            latitude=self.profile.latitude,
            longitude=self.profile.longitude,
            start_date=start_date,
            end_date=end_date,
            country=self.profile.country
        )

        # Fetch holidays
        if progress_callback:
            progress_callback("Fetching holiday data...")

        holidays_df = self.holiday_enricher.fetch_holidays(
            country_code=self.profile.country,
            start_date=start_date,
            end_date=end_date
        )

        # Merge weather
        if progress_callback:
            progress_callback("Merging weather data...")

        enriched = bookings_df.merge(
            weather_df,
            left_on=date_col,
            right_on="date",
            how="left"
        )

        # Merge holidays (left join to keep all bookings)
        if not holidays_df.empty:
            enriched = enriched.merge(
                holidays_df,
                left_on=date_col,
                right_on="date",
                how="left",
                suffixes=('', '_holiday')
            )
            enriched["is_holiday"] = enriched["is_holiday"].fillna(0).astype(int)
            enriched["holiday_name"] = enriched["holiday_name"].fillna("")
        else:
            enriched["is_holiday"] = 0
            enriched["holiday_name"] = ""

        # Add temporal features
        if progress_callback:
            progress_callback("Adding temporal features...")

        enriched["year"] = enriched[date_col].dt.year
        enriched["month"] = enriched[date_col].dt.month
        enriched["day_of_week"] = enriched[date_col].dt.dayofweek
        enriched["day_of_month"] = enriched[date_col].dt.day
        enriched["week_of_year"] = enriched[date_col].dt.isocalendar().week
        enriched["quarter"] = enriched[date_col].dt.quarter
        enriched["is_weekend"] = enriched["day_of_week"].isin([5, 6]).astype(int)

        # Season
        enriched["season"] = enriched["month"].map({
            12: "winter", 1: "winter", 2: "winter",
            3: "spring", 4: "spring", 5: "spring",
            6: "summer", 7: "summer", 8: "summer",
            9: "fall", 10: "fall", 11: "fall"
        })

        # Cyclical encoding
        enriched["month_sin"] = np.sin(2 * np.pi * enriched["month"] / 12)
        enriched["month_cos"] = np.cos(2 * np.pi * enriched["month"] / 12)
        enriched["dow_sin"] = np.sin(2 * np.pi * enriched["day_of_week"] / 7)
        enriched["dow_cos"] = np.cos(2 * np.pi * enriched["day_of_week"] / 7)

        # Calculate summary stats
        weather_coverage = (enriched["temp_mean"].notna().sum() / len(enriched)) * 100
        holiday_count = enriched["is_holiday"].sum()

        summary = {
            "total_days": num_days,
            "total_bookings": len(enriched),
            "date_range": f"{start_date} to {end_date}",
            "weather_coverage_pct": round(weather_coverage, 1),
            "holidays_detected": int(holiday_count),
            "features_added": len(enriched.columns) - len(bookings_df.columns)
        }

        logger.info("enrichment_complete", **summary)

        return enriched, summary

    def enrich(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> pd.DataFrame:
        """
        Simplified enrich method for backward compatibility

        Args:
            df: DataFrame to enrich
            column_mapping: Column mapping dict with 'date' key

        Returns:
            Enriched DataFrame
        """
        date_col = column_mapping.get('date', 'date')
        enriched_df, summary = self.enrich_bookings(df, date_col=date_col)
        return enriched_df

    def save_enriched_data(self, df: pd.DataFrame, filename: str = "bookings_enriched.parquet") -> Path:
        """Save enriched data to parquet"""
        output_dir = Path("data/enriched")
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / filename

        df.to_parquet(output_path, index=False)
        logger.info("enriched_data_saved", path=str(output_path), rows=len(df))

        return output_path
