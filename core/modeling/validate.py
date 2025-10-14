"""Model validation utilities for time-series cross-validation"""
import pandas as pd
import numpy as np
from typing import List, Tuple, Callable, Dict, Any
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from ..utils.logging import get_logger

logger = get_logger(__name__)


class TimeSeriesCV:
    """Time series cross-validation with expanding window"""

    def __init__(
        self,
        n_splits: int = 5,
        test_size: int = 30,
        gap: int = 0
    ):
        """
        Initialize time series CV

        Args:
            n_splits: Number of splits
            test_size: Size of test set (in days)
            gap: Gap between train and test (in days)
        """
        self.n_splits = n_splits
        self.test_size = test_size
        self.gap = gap

    def split(
        self,
        df: pd.DataFrame,
        date_column: str = 'booking_date'
    ) -> List[Tuple[pd.Index, pd.Index]]:
        """
        Generate train/test splits

        Args:
            df: DataFrame with time series data
            date_column: Name of date column

        Returns:
            List of (train_indices, test_indices) tuples
        """
        df = df.sort_values(date_column).reset_index(drop=True)

        n = len(df)
        splits = []

        # Calculate split points
        for i in range(self.n_splits):
            # Test end moves forward each split
            test_end = n - (self.n_splits - i - 1) * self.test_size
            test_start = test_end - self.test_size

            # Train set expands with each split
            train_end = test_start - self.gap

            if train_end < self.test_size:
                # Not enough data for this split
                continue

            train_indices = df.index[:train_end]
            test_indices = df.index[test_start:test_end]

            splits.append((train_indices, test_indices))

        logger.info("time_series_splits_created", num_splits=len(splits))
        return splits


def cross_validate_model(
    model_class: Callable,
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str,
    cv: TimeSeriesCV,
    model_kwargs: Dict[str, Any] = None
) -> Dict[str, List[float]]:
    """
    Perform cross-validation on a model

    Args:
        model_class: Model class to instantiate
        df: DataFrame with features and target
        feature_cols: List of feature column names
        target_col: Target column name
        cv: TimeSeriesCV instance
        model_kwargs: Kwargs to pass to model constructor

    Returns:
        Dictionary of metric lists
    """
    model_kwargs = model_kwargs or {}
    splits = cv.split(df)

    metrics = {
        'mae': [],
        'rmse': [],
        'mape': [],
        'r2': []
    }

    for fold, (train_idx, test_idx) in enumerate(splits):
        logger.info("cv_fold_start", fold=fold + 1)

        # Split data
        X_train = df.loc[train_idx, feature_cols]
        y_train = df.loc[train_idx, target_col]
        X_test = df.loc[test_idx, feature_cols]
        y_test = df.loc[test_idx, target_col]

        # Train model
        model = model_class(**model_kwargs)
        model.fit(X_train, y_train)

        # Get metrics
        fold_metrics = model.get_metrics(X_test, y_test)

        for key in metrics.keys():
            if key in fold_metrics:
                metrics[key].append(fold_metrics[key])

    # Calculate mean and std
    summary = {}
    for key, values in metrics.items():
        if values:
            summary[f'{key}_mean'] = np.mean(values)
            summary[f'{key}_std'] = np.std(values)

    logger.info("cross_validation_complete", summary=summary)
    return summary


def plot_predictions(
    y_true: pd.Series,
    y_pred: np.ndarray,
    dates: pd.Series = None,
    title: str = "Actual vs Predicted"
) -> go.Figure:
    """
    Plot actual vs predicted values

    Args:
        y_true: True values
        y_pred: Predicted values
        dates: Optional date series for x-axis
        title: Plot title

    Returns:
        Plotly figure
    """
    if dates is not None:
        x = dates
        x_title = "Date"
    else:
        x = np.arange(len(y_true))
        x_title = "Index"

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=x,
        y=y_true,
        mode='lines+markers',
        name='Actual',
        line=dict(color='blue')
    ))

    fig.add_trace(go.Scatter(
        x=x,
        y=y_pred,
        mode='lines+markers',
        name='Predicted',
        line=dict(color='red', dash='dash')
    ))

    fig.update_layout(
        title=title,
        xaxis_title=x_title,
        yaxis_title="Value",
        hovermode='x unified'
    )

    return fig


def plot_residuals(
    y_true: pd.Series,
    y_pred: np.ndarray,
    dates: pd.Series = None
) -> go.Figure:
    """
    Plot residuals analysis

    Args:
        y_true: True values
        y_pred: Predicted values
        dates: Optional date series

    Returns:
        Plotly figure with subplots
    """
    residuals = y_true - y_pred

    if dates is not None:
        x = dates
    else:
        x = np.arange(len(y_true))

    # Create subplots
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=(
            'Residuals over Time',
            'Residuals Distribution',
            'Residuals vs Predicted',
            'Q-Q Plot'
        )
    )

    # Residuals over time
    fig.add_trace(
        go.Scatter(x=x, y=residuals, mode='markers', name='Residuals'),
        row=1, col=1
    )
    fig.add_hline(y=0, line_dash="dash", line_color="red", row=1, col=1)

    # Residuals histogram
    fig.add_trace(
        go.Histogram(x=residuals, name='Distribution', nbinsx=30),
        row=1, col=2
    )

    # Residuals vs predicted
    fig.add_trace(
        go.Scatter(x=y_pred, y=residuals, mode='markers', name='vs Predicted'),
        row=2, col=1
    )
    fig.add_hline(y=0, line_dash="dash", line_color="red", row=2, col=1)

    # Q-Q plot (simplified)
    from scipy import stats
    theoretical_quantiles = stats.probplot(residuals)[0][0]
    sample_quantiles = stats.probplot(residuals)[0][1]

    fig.add_trace(
        go.Scatter(
            x=theoretical_quantiles,
            y=sample_quantiles,
            mode='markers',
            name='Q-Q'
        ),
        row=2, col=2
    )

    # Add diagonal line for Q-Q plot
    min_val = min(theoretical_quantiles.min(), sample_quantiles.min())
    max_val = max(theoretical_quantiles.max(), sample_quantiles.max())
    fig.add_trace(
        go.Scatter(
            x=[min_val, max_val],
            y=[min_val, max_val],
            mode='lines',
            line=dict(color='red', dash='dash'),
            showlegend=False
        ),
        row=2, col=2
    )

    fig.update_layout(height=800, showlegend=False, title_text="Residuals Analysis")

    return fig


def calculate_diagnostics(y_true: pd.Series, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Calculate comprehensive model diagnostics

    Args:
        y_true: True values
        y_pred: Predicted values

    Returns:
        Dictionary of diagnostic metrics
    """
    residuals = y_true - y_pred

    mae = np.mean(np.abs(residuals))
    rmse = np.sqrt(np.mean(residuals ** 2))
    mape = np.mean(np.abs(residuals / y_true)) * 100
    bias = np.mean(residuals)

    # R-squared
    ss_res = np.sum(residuals ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    r2 = 1 - (ss_res / ss_tot)

    return {
        'mae': mae,
        'rmse': rmse,
        'mape': mape,
        'bias': bias,
        'r2': r2,
        'residual_std': np.std(residuals)
    }
