"""Time series utility functions"""
import pandas as pd
import numpy as np
from typing import Optional, List


def create_lag_features(
    df: pd.DataFrame,
    column: str,
    lags: List[int],
    prefix: Optional[str] = None
) -> pd.DataFrame:
    """
    Create lagged features for time series analysis

    Args:
        df: DataFrame with time series data
        column: Column name to create lags for
        lags: List of lag periods (e.g., [1, 7, 14])
        prefix: Prefix for new column names

    Returns:
        DataFrame with added lag features
    """
    result = df.copy()
    col_prefix = prefix or f"{column}_lag"

    for lag in lags:
        result[f"{col_prefix}_{lag}"] = result[column].shift(lag)

    return result


def create_rolling_features(
    df: pd.DataFrame,
    column: str,
    windows: List[int],
    functions: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Create rolling window features

    Args:
        df: DataFrame with time series data
        column: Column name to compute rolling stats for
        windows: List of window sizes (e.g., [7, 14, 30])
        functions: List of aggregation functions (default: ['mean', 'std'])

    Returns:
        DataFrame with added rolling features
    """
    result = df.copy()
    funcs = functions or ['mean', 'std']

    for window in windows:
        for func in funcs:
            col_name = f"{column}_rolling_{window}_{func}"
            result[col_name] = result[column].rolling(window=window).agg(func)

    return result


def resample_timeseries(
    df: pd.DataFrame,
    date_column: str,
    freq: str,
    agg_dict: Optional[dict] = None
) -> pd.DataFrame:
    """
    Resample time series to different frequency

    Args:
        df: DataFrame with time series data
        date_column: Name of date column
        freq: Target frequency ('D', 'W', 'M', etc.)
        agg_dict: Dictionary mapping columns to aggregation functions

    Returns:
        Resampled DataFrame
    """
    df_copy = df.copy()
    df_copy[date_column] = pd.to_datetime(df_copy[date_column])
    df_copy = df_copy.set_index(date_column)

    if agg_dict:
        result = df_copy.resample(freq).agg(agg_dict)
    else:
        result = df_copy.resample(freq).sum()

    return result.reset_index()


def compute_cross_correlation(
    series1: pd.Series,
    series2: pd.Series,
    max_lag: int = 30
) -> pd.DataFrame:
    """
    Compute cross-correlation between two time series

    Args:
        series1: First time series
        series2: Second time series
        max_lag: Maximum lag to compute

    Returns:
        DataFrame with lags and correlation values
    """
    correlations = []

    for lag in range(-max_lag, max_lag + 1):
        if lag < 0:
            corr = series1.corr(series2.shift(-lag))
        else:
            corr = series1.shift(lag).corr(series2)

        correlations.append({'lag': lag, 'correlation': corr})

    return pd.DataFrame(correlations)


def detect_seasonality(
    series: pd.Series,
    period: int = 7
) -> dict:
    """
    Simple seasonality detection using autocorrelation

    Args:
        series: Time series to analyze
        period: Expected seasonal period (e.g., 7 for weekly)

    Returns:
        Dictionary with seasonality metrics
    """
    # Remove NaN values
    clean_series = series.dropna()

    # Compute autocorrelation at seasonal lag
    autocorr = clean_series.autocorr(lag=period)

    # Compute mean absolute percentage difference from seasonal mean
    seasonal_mean = clean_series.groupby(np.arange(len(clean_series)) % period).transform('mean')
    mape = np.mean(np.abs((clean_series - seasonal_mean) / clean_series)) * 100

    return {
        'period': period,
        'autocorrelation': autocorr,
        'seasonal_mape': mape,
        'has_seasonality': autocorr > 0.5
    }
