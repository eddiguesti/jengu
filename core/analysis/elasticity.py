"""
Price Elasticity Analysis
"""
import pandas as pd
import numpy as np
from typing import Dict, Tuple
from scipy import stats


def calculate_price_elasticity(
    df: pd.DataFrame,
    price_col: str,
    demand_col: str
) -> Dict[str, float]:
    """
    Calculate price elasticity of demand

    Elasticity = % change in demand / % change in price

    Args:
        df: DataFrame with price and demand data
        price_col: Name of price column
        demand_col: Name of demand column (bookings/occupancy)

    Returns:
        {
            'elasticity': float,  # Elasticity coefficient
            'r_squared': float,   # Model fit
            'is_elastic': bool,   # True if |elasticity| > 1
            'interpretation': str
        }
    """
    # Remove missing values
    df_clean = df[[price_col, demand_col]].dropna()

    if len(df_clean) < 10:
        raise ValueError("Need at least 10 observations for elasticity calculation")

    # Log-log regression (standard elasticity model)
    log_price = np.log(df_clean[price_col] + 1)  # +1 to handle zeros
    log_demand = np.log(df_clean[demand_col] + 1)

    # Linear regression on log-log
    slope, intercept, r_value, p_value, std_err = stats.linregress(log_price, log_demand)

    elasticity = slope
    r_squared = r_value ** 2

    # Interpret elasticity
    if abs(elasticity) > 1:
        elastic_type = "elastic"
        interpretation = f"Demand is highly sensitive to price changes ({abs(elasticity):.2f}x)"
    elif abs(elasticity) > 0.5:
        elastic_type = "unit elastic"
        interpretation = f"Demand moderately responds to price changes ({abs(elasticity):.2f}x)"
    else:
        elastic_type = "inelastic"
        interpretation = f"Demand is relatively insensitive to price changes ({abs(elasticity):.2f}x)"

    return {
        'elasticity': round(elasticity, 3),
        'r_squared': round(r_squared, 3),
        'p_value': round(p_value, 4),
        'is_elastic': abs(elasticity) > 1,
        'type': elastic_type,
        'interpretation': interpretation,
        'optimal_strategy': _get_pricing_strategy(elasticity)
    }


def _get_pricing_strategy(elasticity: float) -> str:
    """Get pricing strategy based on elasticity"""
    if elasticity < -1:
        return "Lower prices to increase revenue (elastic demand)"
    elif elasticity > -0.5:
        return "Raise prices to increase revenue (inelastic demand)"
    else:
        return "Optimize prices carefully (unit elastic)"


def calculate_elasticity_by_segment(
    df: pd.DataFrame,
    price_col: str,
    demand_col: str,
    segment_col: str
) -> pd.DataFrame:
    """
    Calculate elasticity for each segment (e.g., weekday vs weekend, season, channel)

    Args:
        df: DataFrame
        price_col: Price column
        demand_col: Demand column
        segment_col: Segmentation column

    Returns:
        DataFrame with elasticity per segment
    """
    results = []

    for segment in df[segment_col].unique():
        df_segment = df[df[segment_col] == segment]

        try:
            elast = calculate_price_elasticity(df_segment, price_col, demand_col)
            elast['segment'] = segment
            results.append(elast)
        except (ValueError, RuntimeError):
            continue  # Skip segments with insufficient data

    return pd.DataFrame(results)


def estimate_demand_at_price(
    df: pd.DataFrame,
    price_col: str,
    demand_col: str,
    target_prices: np.ndarray
) -> np.ndarray:
    """
    Estimate demand at different price points

    Args:
        df: Historical data
        price_col: Price column
        demand_col: Demand column
        target_prices: Array of prices to estimate demand for

    Returns:
        Estimated demand for each price
    """
    # Fit log-log model
    df_clean = df[[price_col, demand_col]].dropna()
    log_price = np.log(df_clean[price_col] + 1)
    log_demand = np.log(df_clean[demand_col] + 1)

    slope, intercept, _, _, _ = stats.linregress(log_price, log_demand)

    # Predict demand
    log_target_prices = np.log(target_prices + 1)
    log_pred_demand = intercept + slope * log_target_prices
    pred_demand = np.exp(log_pred_demand) - 1

    return np.maximum(pred_demand, 0)  # No negative demand
