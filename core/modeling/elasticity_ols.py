"""Price elasticity estimation using log-log OLS/Ridge regression"""
import pandas as pd
import numpy as np
from typing import Optional, Dict
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
from pathlib import Path

from ..utils.logging import get_logger

logger = get_logger(__name__)


class ElasticityOLS:
    """Estimate price elasticity using log-log regression"""

    def __init__(self, regularization: Optional[float] = None):
        """
        Initialize elasticity model

        Args:
            regularization: Ridge regularization parameter (None for OLS)
        """
        self.regularization = regularization
        if regularization is None:
            self.model = LinearRegression()
        else:
            self.model = Ridge(alpha=regularization)

        self.feature_names: Optional[list] = None
        self.elasticity_: Optional[float] = None

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        price_col: str = 'final_price'
    ) -> 'ElasticityOLS':
        """
        Fit log-log regression model

        Args:
            X: Feature matrix (must include price_col)
            y: Target variable (demand)
            price_col: Name of price column

        Returns:
            Self
        """
        logger.info("fitting_elasticity_model", num_samples=len(X))

        self.feature_names = list(X.columns)

        # Log transform
        X_log = np.log(X.replace(0, 0.01))  # Avoid log(0)
        y_log = np.log(y.replace(0, 0.01))

        # Fit model
        self.model.fit(X_log, y_log)

        # Extract price elasticity (coefficient of log price)
        if price_col in self.feature_names:
            price_idx = self.feature_names.index(price_col)
            self.elasticity_ = self.model.coef_[price_idx]
            logger.info("elasticity_estimated", elasticity=self.elasticity_)
        else:
            logger.warning("price_column_not_found", price_col=price_col)

        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Predict demand given features

        Args:
            X: Feature matrix

        Returns:
            Predicted demand values
        """
        X_log = np.log(X.replace(0, 0.01))
        y_log_pred = self.model.predict(X_log)

        # Transform back from log space
        return np.exp(y_log_pred)

    def get_elasticity(self) -> float:
        """
        Get estimated price elasticity

        Returns:
            Price elasticity coefficient
        """
        if self.elasticity_ is None:
            raise ValueError("Model not fitted or price column not found.")
        return self.elasticity_

    def get_feature_coefficients(self) -> pd.DataFrame:
        """
        Get all feature coefficients

        Returns:
            DataFrame with feature names and coefficients
        """
        coef_df = pd.DataFrame({
            'feature': self.feature_names,
            'coefficient': self.model.coef_,
            'abs_coefficient': np.abs(self.model.coef_)
        })

        return coef_df.sort_values('abs_coefficient', ascending=False)

    def get_metrics(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
        """
        Calculate model performance metrics

        Args:
            X: Feature matrix
            y: True demand values

        Returns:
            Dictionary of metrics
        """
        predictions = self.predict(X)

        mae = mean_absolute_error(y, predictions)
        rmse = np.sqrt(mean_squared_error(y, predictions))
        r2 = r2_score(y, predictions)
        mape = np.mean(np.abs((y - predictions) / y)) * 100

        return {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'mape': mape,
            'elasticity': self.elasticity_
        }

    def predict_demand_change(
        self,
        base_price: float,
        new_price: float,
        base_demand: float
    ) -> float:
        """
        Predict demand change for a price change

        Args:
            base_price: Current price
            new_price: Proposed new price
            base_demand: Current demand level

        Returns:
            Predicted new demand
        """
        if self.elasticity_ is None:
            raise ValueError("Model not fitted.")

        price_change_pct = (new_price - base_price) / base_price
        demand_change_pct = self.elasticity_ * price_change_pct

        return base_demand * (1 + demand_change_pct)

    def save(self, filepath: Path):
        """Save model to file"""
        model_data = {
            'model': self.model,
            'feature_names': self.feature_names,
            'elasticity': self.elasticity_,
            'regularization': self.regularization
        }

        joblib.dump(model_data, filepath)
        logger.info("elasticity_model_saved", filepath=str(filepath))

    def load(self, filepath: Path) -> 'ElasticityOLS':
        """Load model from file"""
        model_data = joblib.load(filepath)

        self.model = model_data['model']
        self.feature_names = model_data['feature_names']
        self.elasticity_ = model_data['elasticity']
        self.regularization = model_data['regularization']

        logger.info("elasticity_model_loaded", filepath=str(filepath))
        return self


def train_elasticity_model(
    train_df: pd.DataFrame,
    feature_cols: list,
    target_col: str = 'daily_demand',
    price_col: str = 'final_price',
    regularization: Optional[float] = None
) -> ElasticityOLS:
    """
    Convenience function to train elasticity model

    Args:
        train_df: Training data
        feature_cols: List of feature column names
        target_col: Target column name
        price_col: Price column name
        regularization: Ridge regularization (None for OLS)

    Returns:
        Fitted ElasticityOLS model
    """
    X = train_df[feature_cols]
    y = train_df[target_col]

    model = ElasticityOLS(regularization=regularization)
    model.fit(X, y, price_col=price_col)

    return model
