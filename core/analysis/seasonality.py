"""
Seasonal Decomposition and Trend Analysis
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional
from statsmodels.tsa.seasonal import seasonal_decompose


def decompose_time_series(
    df: pd.DataFrame,
    date_col: str,
    value_col: str,
    period: int = 7,  # Weekly seasonality
    model: str = 'additive'
) -> Dict[str, pd.Series]:
    """
    Decompose time series into trend, seasonal, and residual components

    Args:
        df: DataFrame with time series data
        date_col: Name of date column
        value_col: Name of value column to decompose
        period: Seasonality period (7=weekly, 30=monthly, 365=yearly)
        model: 'additive' or 'multiplicative'

    Returns:
        {
            'trend': pd.Series,
            'seasonal': pd.Series,
            'residual': pd.Series,
            'observed': pd.Series
        }
    """
    # Prepare data
    df_sorted = df[[date_col, value_col]].copy()
    df_sorted[date_col] = pd.to_datetime(df_sorted[date_col])
    df_sorted = df_sorted.sort_values(date_col)
    df_sorted = df_sorted.set_index(date_col)

    # Remove missing values
    df_sorted = df_sorted.dropna()

    # Check if we have enough data
    if len(df_sorted) < period * 2:
        raise ValueError(f"Need at least {period * 2} observations for period={period}")

    # Decompose
    result = seasonal_decompose(
        df_sorted[value_col],
        model=model,
        period=period,
        extrapolate_trend='freq'
    )

    return {
        'observed': result.observed,
        'trend': result.trend,
        'seasonal': result.seasonal,
        'residual': result.resid
    }


def calculate_seasonality_strength(decomposition: Dict[str, pd.Series]) -> float:
    """
    Calculate seasonality strength (0-1)

    Higher values indicate stronger seasonality

    Returns:
        Seasonality strength (0-1)
    """
    var_residual = decomposition['residual'].var()
    var_seasonal_residual = (decomposition['seasonal'] + decomposition['residual']).var()

    if var_seasonal_residual == 0:
        return 0.0

    strength = max(0, 1 - (var_residual / var_seasonal_residual))
    return strength


def calculate_trend_strength(decomposition: Dict[str, pd.Series]) -> float:
    """
    Calculate trend strength (0-1)

    Higher values indicate stronger trend

    Returns:
        Trend strength (0-1)
    """
    var_residual = decomposition['residual'].var()
    var_trend_residual = (decomposition['trend'] + decomposition['residual']).var()

    if var_trend_residual == 0:
        return 0.0

    strength = max(0, 1 - (var_residual / var_trend_residual))
    return strength


def detect_seasonality_period(
    series: pd.Series,
    max_period: int = 365
) -> Optional[int]:
    """
    Auto-detect seasonality period using autocorrelation

    Args:
        series: Time series data
        max_period: Maximum period to test

    Returns:
        Detected period (or None if no clear seasonality)
    """
    from statsmodels.tsa.stattools import acf

    # Calculate autocorrelation
    acf_values = acf(series.dropna(), nlags=min(max_period, len(series) // 2), fft=True)

    # Find peaks in autocorrelation
    peaks = []
    for i in range(2, len(acf_values) - 1):
        if acf_values[i] > acf_values[i-1] and acf_values[i] > acf_values[i+1]:
            if acf_values[i] > 0.3:  # Threshold for significance
                peaks.append((i, acf_values[i]))

    if not peaks:
        return None

    # Return strongest peak
    peaks.sort(key=lambda x: x[1], reverse=True)
    return peaks[0][0]
