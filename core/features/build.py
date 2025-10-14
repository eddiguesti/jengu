"""Feature assembly from raw bookings to model-ready features"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, List

from ..utils.logging import get_logger
from ..utils.timeseries import create_lag_features, create_rolling_features
from .encoders import DestinationEncoder, SeasonEncoder

logger = get_logger(__name__)


class FeatureBuilder:
    """Build features from raw booking data"""

    def __init__(self):
        self.destination_encoder = DestinationEncoder()
        self.season_encoder = SeasonEncoder()

    def build_time_features(self, df: pd.DataFrame, date_column: str = 'booking_date') -> pd.DataFrame:
        """
        Build time-based features

        Args:
            df: DataFrame with booking data
            date_column: Name of date column

        Returns:
            DataFrame with added time features
        """
        result = df.copy()
        result[date_column] = pd.to_datetime(result[date_column])

        result['day_of_week'] = result[date_column].dt.dayofweek
        result['month'] = result[date_column].dt.month
        result['quarter'] = result[date_column].dt.quarter
        result['year'] = result[date_column].dt.year
        result['week_of_year'] = result[date_column].dt.isocalendar().week
        result['is_weekend'] = result['day_of_week'].isin([5, 6]).astype(int)

        logger.info("time_features_created", num_features=6)
        return result

    def build_booking_window_features(
        self,
        df: pd.DataFrame,
        booking_date_col: str = 'booking_date',
        checkin_date_col: str = 'checkin_date'
    ) -> pd.DataFrame:
        """
        Build booking window features (lead time)

        Args:
            df: DataFrame with booking data
            booking_date_col: Booking date column name
            checkin_date_col: Check-in date column name

        Returns:
            DataFrame with booking window features
        """
        result = df.copy()
        result[booking_date_col] = pd.to_datetime(result[booking_date_col])
        result[checkin_date_col] = pd.to_datetime(result[checkin_date_col])

        result['days_until_checkin'] = (
            result[checkin_date_col] - result[booking_date_col]
        ).dt.days

        # Categorize booking window
        result['booking_window_category'] = pd.cut(
            result['days_until_checkin'],
            bins=[-1, 7, 30, 90, 365],
            labels=['last_minute', 'short_term', 'medium_term', 'long_term']
        )

        logger.info("booking_window_features_created")
        return result

    def build_lag_features(
        self,
        df: pd.DataFrame,
        target_col: str = 'final_price',
        lags: Optional[List[int]] = None
    ) -> pd.DataFrame:
        """
        Build lagged features for time series

        Args:
            df: DataFrame sorted by date
            target_col: Column to create lags for
            lags: List of lag periods

        Returns:
            DataFrame with lag features
        """
        if lags is None:
            lags = [7, 14, 30]

        result = create_lag_features(df, target_col, lags, prefix=f"{target_col}_lag")
        logger.info("lag_features_created", num_lags=len(lags))
        return result

    def build_rolling_features(
        self,
        df: pd.DataFrame,
        target_col: str = 'final_price',
        windows: Optional[List[int]] = None
    ) -> pd.DataFrame:
        """
        Build rolling window features

        Args:
            df: DataFrame sorted by date
            target_col: Column to compute rolling stats for
            windows: List of window sizes

        Returns:
            DataFrame with rolling features
        """
        if windows is None:
            windows = [7, 14, 30]

        result = create_rolling_features(
            df, target_col, windows, functions=['mean', 'std', 'min', 'max']
        )
        logger.info("rolling_features_created", num_windows=len(windows))
        return result

    def build_destination_features(
        self,
        df: pd.DataFrame,
        destination_col: str = 'destination'
    ) -> pd.DataFrame:
        """
        Build destination-based features

        Args:
            df: DataFrame with booking data
            destination_col: Destination column name

        Returns:
            DataFrame with destination features
        """
        result = df.copy()

        # Encode destinations
        encoded = self.destination_encoder.fit_transform(result[destination_col])
        result['destination_encoded'] = encoded

        # Add destination popularity
        dest_counts = result[destination_col].value_counts()
        result['destination_popularity'] = result[destination_col].map(dest_counts)

        logger.info("destination_features_created")
        return result

    def build_season_features(
        self,
        df: pd.DataFrame,
        season_col: str = 'season'
    ) -> pd.DataFrame:
        """
        Build season-based features

        Args:
            df: DataFrame with booking data
            season_col: Season column name

        Returns:
            DataFrame with season features
        """
        result = df.copy()

        # Encode seasons
        encoded = self.season_encoder.fit_transform(result[season_col])
        result['season_encoded'] = encoded

        logger.info("season_features_created")
        return result

    def build_all_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Build all features from raw bookings

        Args:
            df: Raw booking DataFrame

        Returns:
            DataFrame with all engineered features
        """
        logger.info("building_all_features", num_records=len(df))

        # Ensure sorted by date
        df = df.sort_values('booking_date').reset_index(drop=True)

        # Build feature sets
        df = self.build_time_features(df)
        df = self.build_booking_window_features(df)
        df = self.build_destination_features(df)
        df = self.build_season_features(df)

        # Build lag and rolling features (require sorted data)
        df = self.build_lag_features(df)
        df = self.build_rolling_features(df)

        # Calculate demand (bookings per day)
        demand = df.groupby('booking_date').size().reset_index(name='daily_demand')
        df = df.merge(demand, on='booking_date', how='left')

        logger.info("all_features_built", total_columns=len(df.columns))
        return df


def build_features_from_bookings(bookings_df: pd.DataFrame) -> pd.DataFrame:
    """
    Convenience function to build all features

    Args:
        bookings_df: Raw bookings DataFrame

    Returns:
        DataFrame with engineered features
    """
    builder = FeatureBuilder()
    return builder.build_all_features(bookings_df)
