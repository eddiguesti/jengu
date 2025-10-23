"""
Dataset Builder for LightGBM Elasticity Model
==============================================
Builds training datasets from enriched pricing data and competitor data.

Features:
- Historical pricing data with enrichments (weather, temporal, holidays)
- Competitor pricing bands (P10, P50, P90)
- Booking outcomes (conversion, ADR, RevPAR)
- Feature engineering (interactions, lags, moving averages)
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging
import httpx
import os

logger = logging.getLogger(__name__)


class DatasetBuilder:
    """
    Builds training datasets for pricing elasticity models
    """

    def __init__(self, backend_url: Optional[str] = None):
        """
        Initialize dataset builder

        Args:
            backend_url: Backend API URL for fetching data
        """
        self.backend_url = backend_url or os.getenv('BACKEND_API_URL', 'http://localhost:3001')
        self.timeout = 30.0

    def fetch_pricing_data(
        self,
        property_id: str,
        user_token: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 10000
    ) -> pd.DataFrame:
        """
        Fetch historical pricing data from backend

        Args:
            property_id: Property UUID
            user_token: JWT token for authentication
            start_date: Optional start date (ISO format)
            end_date: Optional end date (ISO format)
            limit: Maximum number of records

        Returns:
            DataFrame with pricing data
        """
        try:
            url = f"{self.backend_url}/api/pricing-data/{property_id}"

            headers = {'Authorization': f'Bearer {user_token}'}

            params = {'limit': limit}
            if start_date:
                params['startDate'] = start_date
            if end_date:
                params['endDate'] = end_date

            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=headers, params=params)

                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('data'):
                        df = pd.DataFrame(data['data'])
                        logger.info(f"Fetched {len(df)} pricing records for property {property_id}")
                        return df
                    else:
                        logger.warning(f"No pricing data found for property {property_id}")
                        return pd.DataFrame()
                else:
                    logger.error(f"Failed to fetch pricing data: HTTP {response.status_code}")
                    return pd.DataFrame()

        except Exception as e:
            logger.error(f"Error fetching pricing data: {str(e)}")
            return pd.DataFrame()

    def fetch_competitor_data(
        self,
        property_id: str,
        user_token: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Fetch competitor pricing data from backend

        Args:
            property_id: Property UUID
            user_token: JWT token for authentication
            start_date: Optional start date (ISO format)
            end_date: Optional end date (ISO format)

        Returns:
            DataFrame with competitor data
        """
        try:
            url = f"{self.backend_url}/api/competitor-data/{property_id}/range"

            headers = {'Authorization': f'Bearer {user_token}'}

            params = {}
            if start_date:
                params['startDate'] = start_date
            if end_date:
                params['endDate'] = end_date

            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=headers, params=params)

                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('data'):
                        df = pd.DataFrame(data['data'])
                        logger.info(f"Fetched {len(df)} competitor records for property {property_id}")
                        return df
                    else:
                        logger.info(f"No competitor data found for property {property_id}")
                        return pd.DataFrame()
                else:
                    logger.warning(f"Failed to fetch competitor data: HTTP {response.status_code}")
                    return pd.DataFrame()

        except Exception as e:
            logger.error(f"Error fetching competitor data: {str(e)}")
            return pd.DataFrame()

    def engineer_features(self, df: pd.DataFrame, competitor_df: pd.DataFrame) -> pd.DataFrame:
        """
        Engineer features for ML model

        Args:
            df: Pricing data DataFrame
            competitor_df: Competitor data DataFrame

        Returns:
            DataFrame with engineered features
        """
        logger.info("Engineering features...")

        # Convert date column to datetime
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
        elif 'checkIn' in df.columns:
            df['date'] = pd.to_datetime(df['checkIn'])
        else:
            raise ValueError("No date column found in pricing data")

        # ================================================================
        # Temporal Features
        # ================================================================

        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['week_of_year'] = df['date'].dt.isocalendar().week
        df['month'] = df['date'].dt.month
        df['quarter'] = df['date'].dt.quarter
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['is_month_start'] = (df['day_of_month'] <= 7).astype(int)
        df['is_month_end'] = (df['day_of_month'] >= 24).astype(int)

        # ================================================================
        # Season Encoding (one-hot)
        # ================================================================

        if 'season' in df.columns:
            season_dummies = pd.get_dummies(df['season'], prefix='season')
            df = pd.concat([df, season_dummies], axis=1)
        else:
            # Infer season from month
            df['season'] = df['month'].map({
                12: 'Winter', 1: 'Winter', 2: 'Winter',
                3: 'Spring', 4: 'Spring', 5: 'Spring',
                6: 'Summer', 7: 'Summer', 8: 'Summer',
                9: 'Fall', 10: 'Fall', 11: 'Fall'
            })
            season_dummies = pd.get_dummies(df['season'], prefix='season')
            df = pd.concat([df, season_dummies], axis=1)

        # ================================================================
        # Weather Features (if available)
        # ================================================================

        weather_features = ['temperature', 'precipitation', 'windSpeed', 'cloudCover', 'weatherCode']
        for feature in weather_features:
            if feature not in df.columns:
                df[feature] = np.nan

        # Weather interaction: rain on weekend
        if 'precipitation' in df.columns:
            df['rain_on_weekend'] = (df['is_weekend'] * (df['precipitation'] > 0)).astype(int)

        # ================================================================
        # Holiday Features (if available)
        # ================================================================

        if 'isHoliday' in df.columns:
            df['is_holiday'] = df['isHoliday'].fillna(0).astype(int)
        else:
            df['is_holiday'] = 0

        if 'holidayName' in df.columns:
            df['has_holiday_name'] = df['holidayName'].notna().astype(int)
        else:
            df['has_holiday_name'] = 0

        # ================================================================
        # Competitor Features
        # ================================================================

        if not competitor_df.empty:
            # Convert competitor date to datetime
            if 'date' in competitor_df.columns:
                competitor_df['date'] = pd.to_datetime(competitor_df['date'])
            else:
                logger.warning("No date column in competitor data")

            # Merge competitor data on date
            competitor_features = competitor_df[['date', 'priceP10', 'priceP50', 'priceP90', 'competitorCount']].copy()
            competitor_features.columns = ['date', 'comp_p10', 'comp_p50', 'comp_p90', 'comp_count']

            df = df.merge(competitor_features, on='date', how='left')

            # Calculate competitor-based features
            if 'price' in df.columns:
                df['price_vs_comp_p50'] = df['price'] - df['comp_p50']
                df['price_vs_comp_p50_pct'] = (df['price'] - df['comp_p50']) / df['comp_p50'] * 100
                df['price_vs_comp_p10'] = df['price'] - df['comp_p10']
                df['price_vs_comp_p90'] = df['price'] - df['comp_p90']

                # Positioning (budget, market, premium)
                df['is_budget'] = (df['price'] < df['comp_p50'] * 0.9).astype(int)
                df['is_premium'] = (df['price'] > df['comp_p50'] * 1.1).astype(int)
                df['is_market'] = (~df['is_budget'] & ~df['is_premium']).astype(int)

            # Competitor market range
            df['comp_range'] = df['comp_p90'] - df['comp_p10']
            df['comp_range_pct'] = (df['comp_p90'] - df['comp_p10']) / df['comp_p50'] * 100

        else:
            # No competitor data available
            df['comp_p10'] = np.nan
            df['comp_p50'] = np.nan
            df['comp_p90'] = np.nan
            df['comp_count'] = 0
            df['price_vs_comp_p50'] = np.nan
            df['price_vs_comp_p50_pct'] = np.nan
            df['is_budget'] = 0
            df['is_premium'] = 0
            df['is_market'] = 0
            df['comp_range'] = np.nan

        # ================================================================
        # Lag Features (price momentum)
        # ================================================================

        if 'price' in df.columns:
            df = df.sort_values('date')
            df['price_lag_1'] = df['price'].shift(1)
            df['price_lag_7'] = df['price'].shift(7)
            df['price_lag_30'] = df['price'].shift(30)

            # Moving averages
            df['price_ma_7'] = df['price'].rolling(window=7, min_periods=1).mean()
            df['price_ma_30'] = df['price'].rolling(window=30, min_periods=1).mean()

            # Price change indicators
            df['price_change_1d'] = df['price'] - df['price_lag_1']
            df['price_change_7d'] = df['price'] - df['price_lag_7']
            df['price_change_30d'] = df['price'] - df['price_lag_30']

            # Volatility (std over rolling window)
            df['price_volatility_7d'] = df['price'].rolling(window=7, min_periods=1).std()
            df['price_volatility_30d'] = df['price'].rolling(window=30, min_periods=1).std()

        # ================================================================
        # Booking/Occupancy Features (if available)
        # ================================================================

        if 'occupancyRate' in df.columns:
            df['occupancy_rate'] = df['occupancyRate'].fillna(0.5)
        else:
            df['occupancy_rate'] = 0.5  # Default 50%

        # ================================================================
        # Product Features (if available)
        # ================================================================

        if 'isRefundable' in df.columns:
            df['is_refundable'] = df['isRefundable'].fillna(0).astype(int)
        else:
            df['is_refundable'] = 0

        if 'lengthOfStay' in df.columns:
            df['length_of_stay'] = df['lengthOfStay'].fillna(1)
        else:
            df['length_of_stay'] = 1

        # LOS categories
        df['is_short_stay'] = (df['length_of_stay'] <= 2).astype(int)
        df['is_medium_stay'] = ((df['length_of_stay'] >= 3) & (df['length_of_stay'] <= 6)).astype(int)
        df['is_long_stay'] = (df['length_of_stay'] >= 7).astype(int)

        # ================================================================
        # Lead Time Features (if available)
        # ================================================================

        if 'leadTime' in df.columns:
            df['lead_time'] = df['leadTime'].fillna(30)
        else:
            df['lead_time'] = 30  # Default 30 days

        # Lead time buckets
        df['is_last_minute'] = (df['lead_time'] <= 7).astype(int)
        df['is_short_lead'] = ((df['lead_time'] > 7) & (df['lead_time'] <= 30)).astype(int)
        df['is_medium_lead'] = ((df['lead_time'] > 30) & (df['lead_time'] <= 90)).astype(int)
        df['is_long_lead'] = (df['lead_time'] > 90).astype(int)

        # ================================================================
        # Interaction Features
        # ================================================================

        # Weekend × Season
        if 'season_Summer' in df.columns:
            df['weekend_summer'] = df['is_weekend'] * df['season_Summer']
        if 'season_Winter' in df.columns:
            df['weekend_winter'] = df['is_weekend'] * df['season_Winter']

        # Holiday × Weekend
        df['holiday_weekend'] = df['is_holiday'] * df['is_weekend']

        # Occupancy × Weekend
        df['occupancy_weekend'] = df['occupancy_rate'] * df['is_weekend']

        # Last minute × Weekend
        df['last_minute_weekend'] = df['is_last_minute'] * df['is_weekend']

        logger.info(f"Feature engineering complete. Total features: {len(df.columns)}")

        return df

    def create_target_variable(self, df: pd.DataFrame, target_type: str = 'conversion') -> pd.DataFrame:
        """
        Create target variable for training

        Args:
            df: DataFrame with features
            target_type: Type of target ('conversion', 'adr', 'revpar')

        Returns:
            DataFrame with target variable
        """
        if target_type == 'conversion':
            # Binary: did this price result in a booking?
            if 'wasBooked' in df.columns:
                df['target'] = df['wasBooked'].fillna(0).astype(int)
            elif 'bookings' in df.columns:
                df['target'] = (df['bookings'] > 0).astype(int)
            else:
                logger.warning("No booking data found, creating synthetic target")
                # Synthetic: higher probability for lower prices, weekends, holidays
                base_prob = 0.5
                price_factor = -0.01 * df.get('price_vs_comp_p50_pct', 0).fillna(0)
                weekend_boost = 0.1 * df['is_weekend']
                holiday_boost = 0.1 * df['is_holiday']

                prob = base_prob + price_factor + weekend_boost + holiday_boost
                prob = np.clip(prob, 0.1, 0.9)
                df['target'] = np.random.binomial(1, prob)

        elif target_type == 'adr':
            # Average Daily Rate (actual revenue)
            if 'revenue' in df.columns:
                df['target'] = df['revenue'].fillna(0)
            else:
                logger.warning("No revenue data found, using price as target")
                df['target'] = df['price']

        elif target_type == 'revpar':
            # Revenue Per Available Room
            if 'revpar' in df.columns:
                df['target'] = df['revpar'].fillna(0)
            elif 'revenue' in df.columns and 'occupancyRate' in df.columns:
                df['target'] = df['revenue'] * df['occupancyRate']
            else:
                logger.warning("No RevPAR data found, creating synthetic")
                df['target'] = df['price'] * df['occupancy_rate']

        else:
            raise ValueError(f"Unknown target type: {target_type}")

        return df

    def build_training_dataset(
        self,
        property_id: str,
        user_token: str,
        target_type: str = 'conversion',
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Tuple[pd.DataFrame, List[str]]:
        """
        Build complete training dataset

        Args:
            property_id: Property UUID
            user_token: JWT token
            target_type: Target variable type
            start_date: Optional start date
            end_date: Optional end date

        Returns:
            Tuple of (DataFrame, list of feature names)
        """
        logger.info(f"Building training dataset for property {property_id}")

        # Fetch pricing data
        pricing_df = self.fetch_pricing_data(property_id, user_token, start_date, end_date)

        if pricing_df.empty:
            logger.error("No pricing data available")
            return pd.DataFrame(), []

        # Fetch competitor data
        competitor_df = self.fetch_competitor_data(property_id, user_token, start_date, end_date)

        # Engineer features
        df = self.engineer_features(pricing_df, competitor_df)

        # Create target variable
        df = self.create_target_variable(df, target_type)

        # Select feature columns (exclude metadata and target)
        exclude_cols = [
            'id', 'propertyId', 'userId', 'date', 'checkIn', 'checkOut',
            'createdAt', 'updatedAt', 'target', 'season', 'wasBooked',
            'bookings', 'revenue', 'revpar', 'holidayName'
        ]

        feature_cols = [col for col in df.columns if col not in exclude_cols]

        logger.info(f"Dataset built: {len(df)} rows, {len(feature_cols)} features")

        return df, feature_cols

    def save_dataset(self, df: pd.DataFrame, filepath: str):
        """Save dataset to CSV"""
        df.to_csv(filepath, index=False)
        logger.info(f"Dataset saved to {filepath}")

    def load_dataset(self, filepath: str) -> pd.DataFrame:
        """Load dataset from CSV"""
        df = pd.read_csv(filepath)
        logger.info(f"Dataset loaded from {filepath}: {len(df)} rows")
        return df
