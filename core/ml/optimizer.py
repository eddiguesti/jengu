"""
Price Optimization Engine
Find optimal prices to maximize revenue or occupancy using ML predictions
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any, Callable
from datetime import date, timedelta
from scipy.optimize import differential_evolution, minimize

from core.ml.forecaster import DemandForecaster
from core.utils.logging import get_logger

logger = get_logger(__name__)


class PriceOptimizer:
    """
    Optimize prices to maximize revenue or occupancy
    """

    OBJECTIVES = {
        'revenue': 'Maximize Revenue',
        'occupancy': 'Maximize Occupancy',
        'balanced': 'Balance Revenue & Occupancy'
    }

    def __init__(
        self,
        demand_forecaster: DemandForecaster,
        objective: str = 'revenue'
    ):
        """
        Initialize price optimizer

        Args:
            demand_forecaster: Trained demand forecaster
            objective: Optimization objective ('revenue', 'occupancy', 'balanced')
        """
        self.forecaster = demand_forecaster
        self.objective = objective
        self.optimization_results = {}

    def optimize_price(
        self,
        current_price: float,
        features: pd.DataFrame,
        price_bounds: Tuple[float, float] = (50, 300),
        capacity: int = 100,
        competitor_price: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Find optimal price for a single date

        Args:
            current_price: Current price
            features: Feature dataframe for the date
            price_bounds: (min_price, max_price)
            capacity: Property capacity
            competitor_price: Optional competitor median price

        Returns:
            Dictionary with optimal_price, predicted_occupancy, predicted_revenue
        """
        logger.info("optimizing_price", current=current_price, objective=self.objective)

        def objective_function(price):
            """Objective function to minimize (negative for maximization)"""
            # Update price in features
            test_features = features.copy()
            test_features['price'] = price

            # Predict occupancy
            if self.forecaster.occupancy_model:
                occupancy = self.forecaster.occupancy_model.predict(test_features)[0]
                occupancy = np.clip(occupancy, 0, 1)
            else:
                # Fallback: simple price elasticity assumption
                elasticity = -1.5  # Assume elastic demand
                price_change = (price / current_price) - 1
                demand_change = elasticity * price_change
                occupancy = 0.7 * (1 + demand_change)
                occupancy = np.clip(occupancy, 0, 1)

            # Calculate metrics
            revenue = price * occupancy * capacity

            # Objective based on optimization goal
            if self.objective == 'revenue':
                return -revenue  # Negative for minimization

            elif self.objective == 'occupancy':
                return -occupancy

            elif self.objective == 'balanced':
                # Weighted combination
                normalized_revenue = revenue / (price_bounds[1] * capacity)
                normalized_occupancy = occupancy
                balanced_score = 0.6 * normalized_revenue + 0.4 * normalized_occupancy
                return -balanced_score

            else:
                return -revenue

        # Optimize using bounded optimization
        result = minimize(
            objective_function,
            x0=current_price,
            bounds=[price_bounds],
            method='L-BFGS-B'
        )

        optimal_price = result.x[0]

        # Predict with optimal price
        test_features = features.copy()
        test_features['price'] = optimal_price

        if self.forecaster.occupancy_model:
            predicted_occupancy = self.forecaster.occupancy_model.predict(test_features)[0]
            predicted_occupancy = np.clip(predicted_occupancy, 0, 1)
        else:
            price_change = (optimal_price / current_price) - 1
            demand_change = -1.5 * price_change
            predicted_occupancy = 0.7 * (1 + demand_change)
            predicted_occupancy = np.clip(predicted_occupancy, 0, 1)

        predicted_revenue = optimal_price * predicted_occupancy * capacity

        # Calculate current revenue for comparison
        test_features_current = features.copy()
        test_features_current['price'] = current_price

        if self.forecaster.occupancy_model:
            current_occupancy = self.forecaster.occupancy_model.predict(test_features_current)[0]
            current_occupancy = np.clip(current_occupancy, 0, 1)
        else:
            current_occupancy = 0.7

        current_revenue = current_price * current_occupancy * capacity

        # Competitive positioning
        if competitor_price:
            comp_gap = optimal_price - competitor_price
            comp_gap_pct = (comp_gap / competitor_price) * 100
        else:
            comp_gap = None
            comp_gap_pct = None

        optimization_result = {
            'current_price': float(current_price),
            'optimal_price': float(optimal_price),
            'price_change': float(optimal_price - current_price),
            'price_change_pct': float(((optimal_price / current_price) - 1) * 100),
            'current_occupancy': float(current_occupancy),
            'predicted_occupancy': float(predicted_occupancy),
            'occupancy_change': float(predicted_occupancy - current_occupancy),
            'current_revenue': float(current_revenue),
            'predicted_revenue': float(predicted_revenue),
            'revenue_lift': float(predicted_revenue - current_revenue),
            'revenue_lift_pct': float(((predicted_revenue / current_revenue) - 1) * 100) if current_revenue > 0 else 0,
            'competitor_gap': float(comp_gap) if comp_gap else None,
            'competitor_gap_pct': float(comp_gap_pct) if comp_gap_pct else None,
            'objective': self.objective,
            'success': result.success
        }

        logger.info(
            "price_optimization_complete",
            optimal_price=optimal_price,
            revenue_lift=optimization_result['revenue_lift_pct']
        )

        return optimization_result

    def optimize_calendar(
        self,
        dates: List[date],
        current_prices: pd.Series,
        features_df: pd.DataFrame,
        price_bounds: Tuple[float, float] = (50, 300),
        capacity: int = 100,
        competitor_prices: Optional[pd.Series] = None
    ) -> pd.DataFrame:
        """
        Optimize prices for a calendar period (e.g., next 30 days)

        Args:
            dates: List of dates to optimize
            current_prices: Series of current prices
            features_df: Dataframe with features for each date
            price_bounds: (min_price, max_price)
            capacity: Property capacity
            competitor_prices: Optional series of competitor prices

        Returns:
            Dataframe with optimization results for each date
        """
        logger.info("optimizing_calendar", days=len(dates))

        results = []

        for i, target_date in enumerate(dates):
            # Get features for this date
            date_features = features_df.iloc[[i]]

            # Current price
            current_price = current_prices.iloc[i] if i < len(current_prices) else price_bounds[0]

            # Competitor price
            comp_price = competitor_prices.iloc[i] if competitor_prices is not None and i < len(competitor_prices) else None

            # Optimize
            try:
                result = self.optimize_price(
                    current_price=current_price,
                    features=date_features,
                    price_bounds=price_bounds,
                    capacity=capacity,
                    competitor_price=comp_price
                )

                result['date'] = target_date
                results.append(result)

            except Exception as e:
                logger.error("optimization_failed", date=target_date, error=str(e))
                # Add fallback result
                results.append({
                    'date': target_date,
                    'current_price': current_price,
                    'optimal_price': current_price,
                    'success': False,
                    'error': str(e)
                })

        results_df = pd.DataFrame(results)

        # Summary statistics
        total_current_revenue = results_df['current_revenue'].sum()
        total_predicted_revenue = results_df['predicted_revenue'].sum()
        total_lift = total_predicted_revenue - total_current_revenue
        total_lift_pct = (total_lift / total_current_revenue * 100) if total_current_revenue > 0 else 0

        self.optimization_results = {
            'period_start': min(dates),
            'period_end': max(dates),
            'total_days': len(dates),
            'total_current_revenue': float(total_current_revenue),
            'total_predicted_revenue': float(total_predicted_revenue),
            'total_revenue_lift': float(total_lift),
            'total_revenue_lift_pct': float(total_lift_pct),
            'avg_price_change': float(results_df['price_change'].mean()),
            'avg_occupancy_change': float(results_df['occupancy_change'].mean())
        }

        logger.info(
            "calendar_optimization_complete",
            days=len(dates),
            revenue_lift_pct=total_lift_pct
        )

        return results_df

    def apply_constraints(
        self,
        optimized_df: pd.DataFrame,
        constraints: Dict[str, Any]
    ) -> pd.DataFrame:
        """
        Apply business constraints to optimized prices

        Args:
            optimized_df: Dataframe with optimal_price column
            constraints: Dictionary of constraints

        Returns:
            Dataframe with constrained prices
        """
        constrained_df = optimized_df.copy()

        # Max price change per day
        if 'max_price_change_pct' in constraints:
            max_change = constraints['max_price_change_pct'] / 100
            constrained_df['optimal_price'] = constrained_df.apply(
                lambda row: np.clip(
                    row['optimal_price'],
                    row['current_price'] * (1 - max_change),
                    row['current_price'] * (1 + max_change)
                ),
                axis=1
            )

        # Minimum occupancy target
        if 'min_occupancy' in constraints:
            min_occ = constraints['min_occupancy']
            # Filter out recommendations below min occupancy
            constrained_df.loc[
                constrained_df['predicted_occupancy'] < min_occ,
                'optimal_price'
            ] = constrained_df['current_price']

        # Competitive positioning
        if 'comp_positioning' in constraints and 'competitor_gap' in constrained_df.columns:
            positioning = constraints['comp_positioning']  # e.g., 'premium', 'match', 'value'

            if positioning == 'premium':
                # Always price 5-10% above competitors
                constrained_df['optimal_price'] = np.maximum(
                    constrained_df['optimal_price'],
                    (constrained_df['current_price'] - constrained_df['competitor_gap']) * 1.05
                )

            elif positioning == 'match':
                # Match competitors within ±2%
                target_price = constrained_df['current_price'] - constrained_df['competitor_gap']
                constrained_df['optimal_price'] = target_price

            elif positioning == 'value':
                # Price 3-5% below competitors
                target_price = (constrained_df['current_price'] - constrained_df['competitor_gap']) * 0.95
                constrained_df['optimal_price'] = target_price

        logger.info("constraints_applied", constraints=list(constraints.keys()))

        return constrained_df


class RevenueOptimizer:
    """
    Advanced revenue management with dynamic pricing rules
    """

    def __init__(self, optimizer: PriceOptimizer):
        """
        Initialize revenue optimizer

        Args:
            optimizer: Base price optimizer
        """
        self.optimizer = optimizer

    def create_pricing_strategy(
        self,
        lead_time_days: int,
        current_occupancy: float,
        base_price: float
    ) -> float:
        """
        Create dynamic pricing strategy based on lead time and occupancy

        Args:
            lead_time_days: Days until check-in
            current_occupancy: Current occupancy rate (0-1)
            base_price: Base/rack rate

        Returns:
            Recommended price
        """
        # Lead time factor (increase price as date approaches if demand is high)
        if lead_time_days <= 7:
            lead_time_multiplier = 1.15 if current_occupancy > 0.7 else 0.95
        elif lead_time_days <= 14:
            lead_time_multiplier = 1.10 if current_occupancy > 0.6 else 1.0
        elif lead_time_days <= 30:
            lead_time_multiplier = 1.05 if current_occupancy > 0.5 else 1.0
        else:
            lead_time_multiplier = 1.0

        # Occupancy-based adjustment
        if current_occupancy >= 0.9:
            occupancy_multiplier = 1.20  # High demand premium
        elif current_occupancy >= 0.75:
            occupancy_multiplier = 1.10
        elif current_occupancy >= 0.6:
            occupancy_multiplier = 1.0
        elif current_occupancy >= 0.4:
            occupancy_multiplier = 0.95
        else:
            occupancy_multiplier = 0.85  # Discount to drive demand

        recommended_price = base_price * lead_time_multiplier * occupancy_multiplier

        logger.info(
            "pricing_strategy_created",
            lead_time=lead_time_days,
            occupancy=current_occupancy,
            multiplier=lead_time_multiplier * occupancy_multiplier
        )

        return recommended_price

    def simulate_revenue_scenarios(
        self,
        base_df: pd.DataFrame,
        price_adjustments: List[float] = [-0.10, -0.05, 0, 0.05, 0.10]
    ) -> pd.DataFrame:
        """
        Simulate multiple pricing scenarios

        Args:
            base_df: Base dataframe
            price_adjustments: List of price adjustments (as % change)

        Returns:
            Dataframe comparing scenarios
        """
        scenarios = []

        for adj in price_adjustments:
            scenario_df = base_df.copy()
            scenario_df['price'] = scenario_df['price'] * (1 + adj)

            # Predict occupancy (simplified)
            elasticity = -1.5
            scenario_df['occupancy'] = np.clip(
                scenario_df.get('occupancy', 0.7) * (1 + elasticity * adj),
                0, 1
            )

            scenario_df['revenue'] = (
                scenario_df['price'] *
                scenario_df['occupancy'] *
                scenario_df.get('capacity', 100)
            )

            total_revenue = scenario_df['revenue'].sum()
            avg_occupancy = scenario_df['occupancy'].mean()
            avg_price = scenario_df['price'].mean()

            scenarios.append({
                'price_adjustment': f"{adj*100:+.0f}%",
                'avg_price': avg_price,
                'avg_occupancy': avg_occupancy,
                'total_revenue': total_revenue,
                'revenue_vs_base': total_revenue - scenarios[0]['total_revenue'] if scenarios else 0
            })

        scenarios_df = pd.DataFrame(scenarios)

        logger.info("revenue_scenarios_simulated", scenarios=len(price_adjustments))

        return scenarios_df


# ===== Utility Functions =====

def calculate_optimal_price_range(
    historical_df: pd.DataFrame,
    price_col: str = 'price',
    occupancy_col: str = 'occupancy',
    revenue_col: Optional[str] = None
) -> Dict[str, float]:
    """
    Analyze historical data to find optimal price range

    Args:
        historical_df: Historical dataframe
        price_col: Price column
        occupancy_col: Occupancy column
        revenue_col: Optional revenue column

    Returns:
        Dictionary with price range recommendations
    """
    # Group by price bins
    price_bins = pd.qcut(historical_df[price_col], q=10, duplicates='drop')
    binned = historical_df.groupby(price_bins).agg({
        price_col: 'mean',
        occupancy_col: 'mean'
    })

    if revenue_col:
        binned[revenue_col] = historical_df.groupby(price_bins)[revenue_col].mean()
    else:
        binned['revenue'] = binned[price_col] * binned[occupancy_col]

    # Find optimal price (max revenue)
    optimal_idx = binned['revenue'].idxmax()
    optimal_price = binned.loc[optimal_idx, price_col]

    # Price range (80% of max revenue)
    revenue_threshold = binned['revenue'].max() * 0.8
    viable_prices = binned[binned['revenue'] >= revenue_threshold]

    recommendations = {
        'optimal_price': float(optimal_price),
        'min_recommended_price': float(viable_prices[price_col].min()),
        'max_recommended_price': float(viable_prices[price_col].max()),
        'optimal_occupancy': float(binned.loc[optimal_idx, occupancy_col]),
        'optimal_revenue': float(binned.loc[optimal_idx, 'revenue'])
    }

    logger.info("optimal_price_range_calculated", **recommendations)

    return recommendations
