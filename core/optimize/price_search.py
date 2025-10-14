"""Price optimization using search algorithms"""
import numpy as np
import pandas as pd
from typing import Optional, Dict, Callable, Tuple
from scipy.optimize import minimize_scalar, differential_evolution

from ..utils.logging import get_logger
from ..utils.config import get_settings

logger = get_logger(__name__)


class PriceOptimizer:
    """Optimize pricing to maximize revenue given demand model and constraints"""

    def __init__(
        self,
        demand_model: Callable,
        elasticity_model: Optional[Callable] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None
    ):
        """
        Initialize price optimizer

        Args:
            demand_model: Function that predicts demand given price and features
            elasticity_model: Optional elasticity model for better estimates
            min_price: Minimum allowed price
            max_price: Maximum allowed price
        """
        self.demand_model = demand_model
        self.elasticity_model = elasticity_model

        settings = get_settings()
        self.min_price = min_price
        self.max_price = max_price

    def revenue_function(
        self,
        price: float,
        features: Dict,
        base_demand: float
    ) -> float:
        """
        Calculate expected revenue for given price

        Args:
            price: Price point to evaluate
            features: Feature dictionary for demand prediction
            base_demand: Base demand level

        Returns:
            Negative revenue (for minimization)
        """
        # Update features with new price
        features_with_price = features.copy()
        features_with_price['final_price'] = price

        # Predict demand
        if self.elasticity_model:
            # Use elasticity model
            demand = self.elasticity_model.predict_demand_change(
                base_price=features.get('final_price', price),
                new_price=price,
                base_demand=base_demand
            )
        else:
            # Use demand model directly
            demand = self.demand_model(features_with_price)

        # Revenue = price * demand
        revenue = price * demand

        # Return negative for minimization
        return -revenue

    def optimize_price(
        self,
        features: Dict,
        base_demand: float,
        base_price: Optional[float] = None,
        constraints: Optional[Dict] = None
    ) -> Dict[str, float]:
        """
        Find optimal price to maximize revenue

        Args:
            features: Feature dictionary
            base_demand: Current demand level
            base_price: Current price (for bounds)
            constraints: Additional constraints dict

        Returns:
            Dictionary with optimal_price, expected_demand, expected_revenue
        """
        logger.info("optimizing_price", base_demand=base_demand)

        # Set bounds
        if base_price:
            settings = get_settings()
            bounds = (
                max(base_price * settings.min_price_multiplier, self.min_price or 0),
                min(base_price * settings.max_price_multiplier, self.max_price or np.inf)
            )
        else:
            bounds = (self.min_price or 1, self.max_price or 10000)

        # Optimize using scipy
        result = minimize_scalar(
            lambda p: self.revenue_function(p, features, base_demand),
            bounds=bounds,
            method='bounded'
        )

        optimal_price = result.x
        optimal_revenue = -result.fun  # Negate back

        # Calculate optimal demand
        features_optimal = features.copy()
        features_optimal['final_price'] = optimal_price

        if self.elasticity_model:
            optimal_demand = self.elasticity_model.predict_demand_change(
                base_price=features.get('final_price', base_price or optimal_price),
                new_price=optimal_price,
                base_demand=base_demand
            )
        else:
            optimal_demand = self.demand_model(features_optimal)

        logger.info(
            "price_optimized",
            optimal_price=optimal_price,
            expected_demand=optimal_demand,
            expected_revenue=optimal_revenue
        )

        return {
            'optimal_price': optimal_price,
            'expected_demand': optimal_demand,
            'expected_revenue': optimal_revenue,
            'price_change_pct': ((optimal_price - (base_price or optimal_price)) /
                                (base_price or optimal_price)) * 100 if base_price else 0
        }

    def optimize_price_grid(
        self,
        features: Dict,
        base_demand: float,
        base_price: float,
        n_points: int = 50
    ) -> pd.DataFrame:
        """
        Evaluate revenue across a grid of prices

        Args:
            features: Feature dictionary
            base_demand: Current demand level
            base_price: Current price
            n_points: Number of price points to evaluate

        Returns:
            DataFrame with price, demand, and revenue columns
        """
        settings = get_settings()

        # Create price grid
        min_price = base_price * settings.min_price_multiplier
        max_price = base_price * settings.max_price_multiplier
        price_grid = np.linspace(min_price, max_price, n_points)

        results = []
        for price in price_grid:
            features_with_price = features.copy()
            features_with_price['final_price'] = price

            if self.elasticity_model:
                demand = self.elasticity_model.predict_demand_change(
                    base_price=base_price,
                    new_price=price,
                    base_demand=base_demand
                )
            else:
                demand = self.demand_model(features_with_price)

            revenue = price * demand

            results.append({
                'price': price,
                'demand': demand,
                'revenue': revenue,
                'price_change_pct': ((price - base_price) / base_price) * 100
            })

        return pd.DataFrame(results)

    def optimize_with_constraints(
        self,
        features: Dict,
        base_demand: float,
        base_price: float,
        min_demand: Optional[float] = None,
        min_revenue: Optional[float] = None,
        competitor_price: Optional[float] = None,
        max_price_diff_pct: Optional[float] = None
    ) -> Dict[str, float]:
        """
        Optimize price with business constraints

        Args:
            features: Feature dictionary
            base_demand: Current demand level
            base_price: Current price
            min_demand: Minimum acceptable demand
            min_revenue: Minimum acceptable revenue
            competitor_price: Competitor price for positioning
            max_price_diff_pct: Max % difference from competitor

        Returns:
            Dictionary with optimization results
        """
        settings = get_settings()

        # Define bounds
        lower_bound = base_price * settings.min_price_multiplier
        upper_bound = base_price * settings.max_price_multiplier

        # Adjust for competitor pricing
        if competitor_price and max_price_diff_pct:
            comp_lower = competitor_price * (1 - max_price_diff_pct / 100)
            comp_upper = competitor_price * (1 + max_price_diff_pct / 100)
            lower_bound = max(lower_bound, comp_lower)
            upper_bound = min(upper_bound, comp_upper)

        # Define constraint function
        def constraint_function(price):
            features_with_price = features.copy()
            features_with_price['final_price'] = price

            if self.elasticity_model:
                demand = self.elasticity_model.predict_demand_change(
                    base_price=base_price,
                    new_price=price,
                    base_demand=base_demand
                )
            else:
                demand = self.demand_model(features_with_price)

            revenue = price * demand

            # Check constraints
            violations = []
            if min_demand and demand < min_demand:
                violations.append(f"demand {demand} < min {min_demand}")
            if min_revenue and revenue < min_revenue:
                violations.append(f"revenue {revenue} < min {min_revenue}")

            return len(violations) == 0, violations

        # Grid search with constraints
        price_grid = np.linspace(lower_bound, upper_bound, 100)
        best_price = None
        best_revenue = -np.inf

        for price in price_grid:
            is_feasible, _ = constraint_function(price)

            if is_feasible:
                revenue = -self.revenue_function(price, features, base_demand)
                if revenue > best_revenue:
                    best_revenue = revenue
                    best_price = price

        if best_price is None:
            logger.warning("no_feasible_price_found", using_base_price=True)
            best_price = base_price
            best_revenue = base_price * base_demand

        # Calculate final metrics
        features_final = features.copy()
        features_final['final_price'] = best_price

        if self.elasticity_model:
            final_demand = self.elasticity_model.predict_demand_change(
                base_price=base_price,
                new_price=best_price,
                base_demand=base_demand
            )
        else:
            final_demand = self.demand_model(features_final)

        return {
            'optimal_price': best_price,
            'expected_demand': final_demand,
            'expected_revenue': best_revenue,
            'constraints_met': True
        }


def optimize_price_simple(
    base_price: float,
    base_demand: float,
    elasticity: float,
    target_margin: float = 0.3
) -> Dict[str, float]:
    """
    Simple price optimization using elasticity

    Args:
        base_price: Current price
        base_demand: Current demand
        elasticity: Price elasticity coefficient
        target_margin: Target profit margin

    Returns:
        Dictionary with optimal price recommendation
    """
    # Simple formula: optimal markup = -1 / (elasticity - 1)
    # Only valid for negative elasticity < -1
    if elasticity >= -1:
        logger.warning("elasticity_not_elastic", elasticity=elasticity)
        return {
            'optimal_price': base_price,
            'expected_demand': base_demand,
            'recommendation': 'Price is inelastic, no change recommended'
        }

    optimal_markup = -1 / (elasticity + 1)
    optimal_price = base_price * (1 + optimal_markup)

    # Predict demand change
    price_change_pct = (optimal_price - base_price) / base_price
    demand_change_pct = elasticity * price_change_pct
    expected_demand = base_demand * (1 + demand_change_pct)

    return {
        'optimal_price': optimal_price,
        'expected_demand': expected_demand,
        'expected_revenue': optimal_price * expected_demand,
        'price_change_pct': price_change_pct * 100
    }
