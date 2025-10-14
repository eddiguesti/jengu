"""Data enrichment for correlation analysis with external factors"""
import pandas as pd
import numpy as np
from datetime import date, datetime, timedelta
from typing import Optional, Dict, List
from pathlib import Path

from ..utils.logging import get_logger
from ..connectors.weather import get_weather_for_bookings
from ..connectors.holidays import add_holiday_features

logger = get_logger(__name__)


class DataEnrichment:
    """
    Enrich booking data with external factors for correlation analysis
    """

    def __init__(self):
        self.enriched_data: Optional[pd.DataFrame] = None
        self.enrichment_history: List[str] = []

    def enrich_with_weather(
        self,
        df: pd.DataFrame,
        destination_col: str = 'destination',
        date_col: str = 'checkin_date'
    ) -> pd.DataFrame:
        """
        Enrich data with weather information

        Args:
            df: Booking DataFrame
            destination_col: Destination column name
            date_col: Date column for weather lookup

        Returns:
            DataFrame with weather features
        """
        logger.info("enriching_with_weather", num_records=len(df))

        try:
            # Ensure date column is datetime
            df[date_col] = pd.to_datetime(df[date_col])

            # Fetch weather data
            enriched_df = get_weather_for_bookings(df, destination_col, date_col)

            # Add derived weather features
            if 'temperature_mean' in enriched_df.columns:
                # Temperature categories
                enriched_df['temp_category'] = pd.cut(
                    enriched_df['temperature_mean'],
                    bins=[-np.inf, 10, 20, 30, np.inf],
                    labels=['cold', 'mild', 'warm', 'hot']
                )

                # Temperature deviation from average
                avg_temp_by_dest = enriched_df.groupby(destination_col)['temperature_mean'].transform('mean')
                enriched_df['temp_deviation'] = enriched_df['temperature_mean'] - avg_temp_by_dest

            if 'precipitation_sum' in enriched_df.columns:
                # Rainy day indicator
                enriched_df['is_rainy'] = (enriched_df['precipitation_sum'] > 1.0).astype(int)

                # Rain intensity
                enriched_df['rain_intensity'] = pd.cut(
                    enriched_df['precipitation_sum'],
                    bins=[0, 1, 5, 10, np.inf],
                    labels=['none', 'light', 'moderate', 'heavy']
                )

            if 'windspeed_max' in enriched_df.columns:
                # Windy day indicator
                enriched_df['is_windy'] = (enriched_df['windspeed_max'] > 30).astype(int)

            # Weather quality score (0-100)
            if all(col in enriched_df.columns for col in ['temperature_mean', 'precipitation_sum', 'windspeed_max']):
                # Normalize temperature (ideal range 18-25°C)
                temp_score = 100 - np.abs(enriched_df['temperature_mean'] - 21.5) * 4
                temp_score = np.clip(temp_score, 0, 100)

                # Precipitation penalty
                precip_score = 100 - (enriched_df['precipitation_sum'] * 10)
                precip_score = np.clip(precip_score, 0, 100)

                # Wind penalty
                wind_score = 100 - (enriched_df['windspeed_max'] - 15).clip(0, 100) * 2
                wind_score = np.clip(wind_score, 0, 100)

                # Combined weather quality
                enriched_df['weather_quality_score'] = (
                    temp_score * 0.5 + precip_score * 0.3 + wind_score * 0.2
                )

            self.enrichment_history.append('weather')
            logger.info("weather_enrichment_complete", new_features=['temperature_mean', 'precipitation_sum', 'windspeed_max', 'weather_quality_score'])

            return enriched_df

        except Exception as e:
            logger.error("weather_enrichment_failed", error=str(e))
            return df

    def enrich_with_holidays(
        self,
        df: pd.DataFrame,
        destination_col: str = 'destination',
        date_col: str = 'checkin_date'
    ) -> pd.DataFrame:
        """
        Enrich data with holiday information

        Args:
            df: Booking DataFrame
            destination_col: Destination column
            date_col: Date column

        Returns:
            DataFrame with holiday features
        """
        logger.info("enriching_with_holidays", num_records=len(df))

        try:
            df[date_col] = pd.to_datetime(df[date_col])

            # Get holidays
            enriched_df = add_holiday_features(df, destination_col, date_col)

            # Add holiday-related features
            if 'is_holiday' in enriched_df.columns:
                # Days until next holiday
                enriched_df['days_to_holiday'] = 0  # Placeholder for more complex logic

                # Holiday week indicator
                enriched_df['is_holiday_week'] = enriched_df['is_holiday']  # Can be expanded

            self.enrichment_history.append('holidays')
            logger.info("holiday_enrichment_complete")

            return enriched_df

        except Exception as e:
            logger.error("holiday_enrichment_failed", error=str(e))
            return df

    def enrich_with_temporal_features(
        self,
        df: pd.DataFrame,
        date_col: str = 'booking_date'
    ) -> pd.DataFrame:
        """
        Add advanced temporal features for better correlation analysis

        Args:
            df: DataFrame
            date_col: Date column

        Returns:
            DataFrame with temporal features
        """
        logger.info("enriching_with_temporal_features")

        df[date_col] = pd.to_datetime(df[date_col])

        # Basic temporal
        df['year'] = df[date_col].dt.year
        df['month'] = df[date_col].dt.month
        df['day_of_week'] = df[date_col].dt.dayofweek
        df['day_of_month'] = df[date_col].dt.day
        df['week_of_year'] = df[date_col].dt.isocalendar().week
        df['quarter'] = df[date_col].dt.quarter

        # Weekend/weekday
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['is_weekday'] = (~df['is_weekend'].astype(bool)).astype(int)

        # Month segments
        df['is_month_start'] = (df['day_of_month'] <= 10).astype(int)
        df['is_month_mid'] = ((df['day_of_month'] > 10) & (df['day_of_month'] <= 20)).astype(int)
        df['is_month_end'] = (df['day_of_month'] > 20).astype(int)

        # Season (meteorological)
        df['season'] = df['month'].map({
            12: 'winter', 1: 'winter', 2: 'winter',
            3: 'spring', 4: 'spring', 5: 'spring',
            6: 'summer', 7: 'summer', 8: 'summer',
            9: 'fall', 10: 'fall', 11: 'fall'
        })

        # Cyclical encoding for month and day of week
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)

        self.enrichment_history.append('temporal')
        logger.info("temporal_enrichment_complete")

        return df

    def enrich_with_lag_features(
        self,
        df: pd.DataFrame,
        value_col: str = 'final_price',
        lags: List[int] = [7, 14, 30]
    ) -> pd.DataFrame:
        """
        Add lagged features for time series correlation

        Args:
            df: DataFrame sorted by date
            value_col: Column to create lags for
            lags: List of lag periods

        Returns:
            DataFrame with lag features
        """
        logger.info("enriching_with_lag_features", lags=lags)

        for lag in lags:
            df[f'{value_col}_lag_{lag}'] = df[value_col].shift(lag)

        # Rolling statistics
        for window in [7, 14, 30]:
            df[f'{value_col}_rolling_mean_{window}'] = df[value_col].rolling(window=window).mean()
            df[f'{value_col}_rolling_std_{window}'] = df[value_col].rolling(window=window).std()

        self.enrichment_history.append('lags')
        logger.info("lag_enrichment_complete")

        return df

    def enrich_all(
        self,
        df: pd.DataFrame,
        include_weather: bool = True,
        include_holidays: bool = True,
        include_temporal: bool = True,
        include_lags: bool = False
    ) -> pd.DataFrame:
        """
        Apply all enrichments

        Args:
            df: Original DataFrame
            include_weather: Include weather data
            include_holidays: Include holiday data
            include_temporal: Include temporal features
            include_lags: Include lag features

        Returns:
            Fully enriched DataFrame
        """
        logger.info("starting_full_enrichment", num_records=len(df))

        enriched = df.copy()

        # Temporal features (always useful)
        if include_temporal:
            enriched = self.enrich_with_temporal_features(enriched)

        # Weather enrichment
        if include_weather:
            try:
                enriched = self.enrich_with_weather(enriched)
            except Exception as e:
                logger.warning("skipping_weather_enrichment", error=str(e))

        # Holiday enrichment
        if include_holidays:
            try:
                enriched = self.enrich_with_holidays(enriched)
            except Exception as e:
                logger.warning("skipping_holiday_enrichment", error=str(e))

        # Lag features
        if include_lags:
            enriched = self.enrich_with_lag_features(enriched)

        self.enriched_data = enriched

        logger.info(
            "enrichment_complete",
            original_cols=len(df.columns),
            enriched_cols=len(enriched.columns),
            enrichments=self.enrichment_history
        )

        return enriched

    def get_correlation_features(self) -> List[str]:
        """
        Get list of features suitable for correlation analysis

        Returns:
            List of feature column names
        """
        if self.enriched_data is None:
            return []

        # Exclude non-numeric and identifier columns
        exclude_patterns = ['date', 'id', 'name', 'city', 'destination', 'category']

        numeric_cols = self.enriched_data.select_dtypes(include=[np.number]).columns.tolist()

        feature_cols = [
            col for col in numeric_cols
            if not any(pattern in col.lower() for pattern in exclude_patterns)
        ]

        return feature_cols


def enrich_booking_data(
    df: pd.DataFrame,
    include_weather: bool = True,
    include_holidays: bool = True
) -> pd.DataFrame:
    """
    Convenience function to enrich booking data

    Args:
        df: Booking DataFrame
        include_weather: Include weather enrichment
        include_holidays: Include holiday enrichment

    Returns:
        Enriched DataFrame
    """
    enricher = DataEnrichment()
    return enricher.enrich_all(
        df,
        include_weather=include_weather,
        include_holidays=include_holidays,
        include_temporal=True,
        include_lags=False
    )
