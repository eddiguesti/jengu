"""
Price Optimizer
Find optimal prices to maximize revenue or occupancy
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Callable
from scipy.optimize import minimize, differential_evolution


class PriceOptimizer:
    """Optimize pricing to maximize revenue"""

    def __init__(
        self,
        demand_predictor: Callable,
        min_price: float,
        max_price: float,
        capacity: Optional[int] = None
    ):
        """
        Args:
            demand_predictor: Function that predicts demand given price
                             Should accept DataFrame with 'price' column
            min_price: Minimum allowed price
            max_price: Maximum allowed price
            capacity: Maximum capacity (rooms, units, etc.)
        """
        self.demand_predictor = demand_predictor
        self.min_price = min_price
        self.max_price = max_price
        self.capacity = capacity

    def optimize_single_day(
        self,
        features: pd.DataFrame,
        objective: str = "revenue",
        method: str = "differential_evolution"
    ) -> Dict:
        """
        Find optimal price for a single day

        Args:
            features: DataFrame with features for the day (excluding price)
            objective: 'revenue' or 'occupancy'
            method: 'differential_evolution' or 'L-BFGS-B'

        Returns:
            {
                'optimal_price': float,
                'predicted_demand': float,
                'predicted_revenue': float,
                'confidence': float
            }
        """
        def objective_fn(price):
            # Create feature row with this price
            feature_row = features.copy()
            feature_row['price'] = price[0] if isinstance(price, np.ndarray) else price

            # Predict demand
            demand = self.demand_predictor(feature_row)

            if isinstance(demand, np.ndarray):
                demand = demand[0]

            # Apply capacity constraint
            if self.capacity:
                demand = min(demand, self.capacity)

            if objective == "revenue":
                return -(price[0] if isinstance(price, np.ndarray) else price) * demand
            else:  # occupancy
                return -demand

        # Optimize
        if method == "differential_evolution":
            result = differential_evolution(
                objective_fn,
                bounds=[(self.min_price, self.max_price)],
                maxiter=100,
                seed=42
            )
            optimal_price = result.x[0]
        else:  # L-BFGS-B
            initial_price = (self.min_price + self.max_price) / 2
            result = minimize(
                objective_fn,
                x0=[initial_price],
                bounds=[(self.min_price, self.max_price)],
                method='L-BFGS-B'
            )
            optimal_price = result.x[0]

        # Calculate metrics at optimal price
        features_opt = features.copy()
        features_opt['price'] = optimal_price
        predicted_demand = self.demand_predictor(features_opt)

        if isinstance(predicted_demand, np.ndarray):
            predicted_demand = predicted_demand[0]

        if self.capacity:
            predicted_demand = min(predicted_demand, self.capacity)

        return {
            'optimal_price': round(optimal_price, 2),
            'predicted_demand': round(predicted_demand, 1),
            'predicted_revenue': round(optimal_price * predicted_demand, 2),
            'optimization_success': result.success if hasattr(result, 'success') else True
        }

    def optimize_period(
        self,
        features_df: pd.DataFrame,
        objective: str = "revenue"
    ) -> pd.DataFrame:
        """
        Optimize prices for multiple days

        Args:
            features_df: DataFrame with features for each day (excluding price)
            objective: 'revenue' or 'occupancy'

        Returns:
            DataFrame with optimal prices and predictions
        """
        results = []

        for idx in range(len(features_df)):
            feature_row = features_df.iloc[[idx]]

            result = self.optimize_single_day(feature_row, objective=objective)
            result['date'] = features_df.index[idx] if hasattr(features_df, 'index') else idx

            results.append(result)

        return pd.DataFrame(results)

    def what_if_analysis(
        self,
        features: pd.DataFrame,
        price_scenarios: List[Dict]
    ) -> pd.DataFrame:
        """
        Run what-if scenario analysis

        Args:
            features: Base features
            price_scenarios: List of scenarios
                [
                    {'name': 'Current', 'price_multiplier': 1.0},
                    {'name': '+10%', 'price_multiplier': 1.1},
                    {'name': '-10%', 'price_multiplier': 0.9},
                    {'name': 'Optimal', 'price_multiplier': None}  # Will optimize
                ]

        Returns:
            DataFrame comparing scenarios
        """
        results = []

        # Get baseline price (if exists)
        baseline_price = features['price'].mean() if 'price' in features.columns else (self.min_price + self.max_price) / 2

        for scenario in price_scenarios:
            if scenario.get('price_multiplier') is None:
                # Optimize
                opt_result = self.optimize_period(features.drop('price', axis=1, errors='ignore'))
                avg_price = opt_result['optimal_price'].mean()
                total_demand = opt_result['predicted_demand'].sum()
                total_revenue = opt_result['predicted_revenue'].sum()
            else:
                # Apply multiplier
                test_price = baseline_price * scenario['price_multiplier']
                features_test = features.copy()
                features_test['price'] = test_price

                predictions = self.demand_predictor(features_test)
                if isinstance(predictions, np.ndarray):
                    predictions = pd.Series(predictions)

                if self.capacity:
                    predictions = predictions.clip(upper=self.capacity)

                avg_price = test_price
                total_demand = predictions.sum()
                total_revenue = (test_price * predictions).sum()

            results.append({
                'scenario': scenario['name'],
                'avg_price': round(avg_price, 2),
                'total_demand': round(total_demand, 1),
                'total_revenue': round(total_revenue, 2),
                'revenue_per_unit': round(total_revenue / total_demand if total_demand > 0 else 0, 2)
            })

        df_results = pd.DataFrame(results)

        # Calculate % difference from first scenario (baseline)
        if len(df_results) > 1:
            baseline_revenue = df_results.iloc[0]['total_revenue']
            df_results['revenue_change_pct'] = ((df_results['total_revenue'] - baseline_revenue) / baseline_revenue * 100).round(2)

        return df_results


def calculate_price_ceiling_floor(
    df: pd.DataFrame,
    price_col: str,
    percentile_floor: float = 10,
    percentile_ceiling: float = 90
) -> Dict[str, float]:
    """
    Calculate recommended price floor and ceiling based on historical data

    Args:
        df: Historical data
        price_col: Price column name
        percentile_floor: Percentile for floor (default 10th)
        percentile_ceiling: Percentile for ceiling (default 90th)

    Returns:
        {'floor': float, 'ceiling': float, 'median': float}
    """
    prices = df[price_col].dropna()

    return {
        'floor': round(prices.quantile(percentile_floor / 100), 2),
        'ceiling': round(prices.quantile(percentile_ceiling / 100), 2),
        'median': round(prices.median(), 2),
        'mean': round(prices.mean(), 2),
        'std': round(prices.std(), 2)
    }
