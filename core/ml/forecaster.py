"""
Demand Forecasting Engine
Predict future occupancy, bookings, and revenue
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import date, datetime, timedelta

from core.ml.predictor import PricePredictionModel
from core.utils.logging import get_logger

logger = get_logger(__name__)


class DemandForecaster:
    """
    Forecast future demand (occupancy, bookings) based on historical patterns
    """

    def __init__(self, model_type: str = 'xgboost'):
        """
        Initialize demand forecaster

        Args:
            model_type: ML algorithm to use
        """
        self.occupancy_model = None
        self.bookings_model = None
        self.model_type = model_type

    def train_occupancy_model(
        self,
        df: pd.DataFrame,
        target_col: str = 'occupancy'
    ) -> Dict[str, Any]:
        """
        Train model to predict occupancy

        Args:
            df: Training dataframe with features
            target_col: Occupancy column name

        Returns:
            Training metrics
        """
        logger.info("training_occupancy_model", samples=len(df))

        self.occupancy_model = PricePredictionModel(algorithm=self.model_type)
        metrics = self.occupancy_model.train(df, target_col=target_col)

        return metrics

    def train_bookings_model(
        self,
        df: pd.DataFrame,
        target_col: str = 'bookings'
    ) -> Dict[str, Any]:
        """
        Train model to predict bookings

        Args:
            df: Training dataframe
            target_col: Bookings column name

        Returns:
            Training metrics
        """
        logger.info("training_bookings_model", samples=len(df))

        self.bookings_model = PricePredictionModel(algorithm=self.model_type)
        metrics = self.bookings_model.train(df, target_col=target_col)

        return metrics

    def forecast_occupancy(
        self,
        future_df: pd.DataFrame,
        days_ahead: int = 30
    ) -> pd.DataFrame:
        """
        Forecast occupancy for future dates

        Args:
            future_df: Dataframe with future dates and features
            days_ahead: Number of days to forecast

        Returns:
            Dataframe with date and predicted_occupancy
        """
        if not self.occupancy_model:
            raise ValueError("Occupancy model not trained. Call train_occupancy_model() first.")

        predictions = self.occupancy_model.predict(future_df)

        # Clip to valid range [0, 1]
        predictions = np.clip(predictions, 0, 1)

        result = pd.DataFrame({
            'date': future_df['date'] if 'date' in future_df.columns else pd.date_range(
                start=datetime.now(),
                periods=len(predictions),
                freq='D'
            ),
            'predicted_occupancy': predictions
        })

        logger.info("occupancy_forecast_complete", days=len(result))

        return result

    def forecast_bookings(
        self,
        future_df: pd.DataFrame,
        days_ahead: int = 30
    ) -> pd.DataFrame:
        """
        Forecast bookings for future dates

        Args:
            future_df: Dataframe with future dates and features
            days_ahead: Number of days to forecast

        Returns:
            Dataframe with date and predicted_bookings
        """
        if not self.bookings_model:
            raise ValueError("Bookings model not trained. Call train_bookings_model() first.")

        predictions = self.bookings_model.predict(future_df)

        # Floor to non-negative integers
        predictions = np.maximum(0, predictions).round()

        result = pd.DataFrame({
            'date': future_df['date'] if 'date' in future_df.columns else pd.date_range(
                start=datetime.now(),
                periods=len(predictions),
                freq='D'
            ),
            'predicted_bookings': predictions.astype(int)
        })

        logger.info("bookings_forecast_complete", days=len(result))

        return result

    def create_future_features(
        self,
        start_date: date,
        days_ahead: int,
        reference_df: pd.DataFrame,
        include_weather: bool = False,
        include_holidays: bool = False
    ) -> pd.DataFrame:
        """
        Create feature dataframe for future dates

        Args:
            start_date: Start date for forecast
            days_ahead: Number of days to forecast
            reference_df: Reference dataframe to copy feature patterns
            include_weather: Whether to include weather forecast
            include_holidays: Whether to include holiday flags

        Returns:
            Dataframe with future dates and estimated features
        """
        logger.info(
            "creating_future_features",
            start=start_date,
            days=days_ahead
        )

        # Create date range
        dates = pd.date_range(start=start_date, periods=days_ahead, freq='D')

        future_df = pd.DataFrame({'date': dates})

        # Add temporal features
        future_df['day_of_week'] = future_df['date'].dt.dayofweek
        future_df['day_of_month'] = future_df['date'].dt.day
        future_df['month'] = future_df['date'].dt.month
        future_df['quarter'] = future_df['date'].dt.quarter
        future_df['is_weekend'] = (future_df['day_of_week'] >= 5).astype(int)

        # Week of year
        future_df['week_of_year'] = future_df['date'].dt.isocalendar().week

        # Add cyclical encodings
        future_df['day_sin'] = np.sin(2 * np.pi * future_df['day_of_week'] / 7)
        future_df['day_cos'] = np.cos(2 * np.pi * future_df['day_of_week'] / 7)
        future_df['month_sin'] = np.sin(2 * np.pi * future_df['month'] / 12)
        future_df['month_cos'] = np.cos(2 * np.pi * future_df['month'] / 12)

        # Copy seasonal averages from reference data
        if 'temp_avg' in reference_df.columns:
            # Use monthly averages for weather
            monthly_weather = reference_df.groupby(
                reference_df['date'].dt.month
            ).agg({
                'temp_avg': 'mean',
                'precipitation': 'mean',
                'weather_quality': 'mean'
            })

            future_df = future_df.merge(
                monthly_weather,
                left_on='month',
                right_index=True,
                how='left'
            )

        # Holidays
        if include_holidays and 'is_holiday' in reference_df.columns:
            # Simple approach: copy holiday pattern from same dates in reference
            pass  # TODO: Implement holiday lookup

        # Fill missing numeric columns with reference means
        numeric_cols = reference_df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col not in future_df.columns and col not in ['price', 'occupancy', 'bookings', 'revenue']:
                future_df[col] = reference_df[col].mean()

        logger.info("future_features_created", features=len(future_df.columns))

        return future_df


class ScenarioTester:
    """
    Test "what-if" pricing scenarios
    """

    def __init__(self, demand_forecaster: DemandForecaster):
        """
        Initialize scenario tester

        Args:
            demand_forecaster: Trained demand forecaster
        """
        self.forecaster = demand_forecaster

    def test_price_scenario(
        self,
        base_df: pd.DataFrame,
        price_adjustment: float,
        adjustment_type: str = 'percent'
    ) -> pd.DataFrame:
        """
        Test impact of price changes on demand

        Args:
            base_df: Base scenario dataframe
            price_adjustment: Price change (e.g., 0.10 for +10%, or 5 for +$5)
            adjustment_type: 'percent' or 'absolute'

        Returns:
            Dataframe with scenario results
        """
        scenario_df = base_df.copy()

        if adjustment_type == 'percent':
            scenario_df['price'] = scenario_df['price'] * (1 + price_adjustment)
        else:
            scenario_df['price'] = scenario_df['price'] + price_adjustment

        # Predict new occupancy
        if self.forecaster.occupancy_model:
            predicted_occ = self.forecaster.forecaster.predict(scenario_df)
            scenario_df['predicted_occupancy'] = np.clip(predicted_occ, 0, 1)

        # Calculate revenue impact
        if 'predicted_occupancy' in scenario_df.columns:
            scenario_df['predicted_revenue'] = (
                scenario_df['price'] *
                scenario_df['predicted_occupancy'] *
                scenario_df.get('capacity', 1)
            )

        logger.info(
            "price_scenario_tested",
            adjustment=price_adjustment,
            type=adjustment_type
        )

        return scenario_df

    def compare_scenarios(
        self,
        scenarios: Dict[str, pd.DataFrame]
    ) -> pd.DataFrame:
        """
        Compare multiple scenarios

        Args:
            scenarios: Dict mapping scenario_name -> scenario_df

        Returns:
            Summary comparison dataframe
        """
        comparisons = []

        for name, scenario_df in scenarios.items():
            comparison = {
                'scenario': name,
                'avg_price': scenario_df['price'].mean(),
                'avg_occupancy': scenario_df.get('predicted_occupancy', scenario_df.get('occupancy', 0)).mean(),
                'total_revenue': scenario_df.get('predicted_revenue', 0).sum()
            }
            comparisons.append(comparison)

        comparison_df = pd.DataFrame(comparisons)

        logger.info("scenarios_compared", count=len(scenarios))

        return comparison_df


# ===== Utility Functions =====

def calculate_price_elasticity(
    df: pd.DataFrame,
    price_col: str = 'price',
    demand_col: str = 'occupancy'
) -> float:
    """
    Calculate price elasticity of demand

    Elasticity = (% change in demand) / (% change in price)

    Args:
        df: Dataframe with price and demand
        price_col: Price column name
        demand_col: Demand column name

    Returns:
        Price elasticity coefficient
    """
    # Simple regression approach
    from scipy.stats import linregress

    # Log-log regression for elasticity
    log_price = np.log(df[price_col] + 1)
    log_demand = np.log(df[demand_col] + 0.01)

    # Filter valid values
    valid = np.isfinite(log_price) & np.isfinite(log_demand)
    log_price = log_price[valid]
    log_demand = log_demand[valid]

    if len(log_price) < 10:
        logger.warning("insufficient_data_for_elasticity")
        return -1.0

    slope, intercept, r_value, p_value, std_err = linregress(log_price, log_demand)

    elasticity = slope  # In log-log model, slope = elasticity

    logger.info("price_elasticity_calculated", elasticity=elasticity, r2=r_value**2)

    return float(elasticity)
