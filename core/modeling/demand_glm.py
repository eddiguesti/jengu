"""Demand forecasting using Generalized Linear Models (Poisson/NegBin)"""
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, Tuple
import statsmodels.api as sm
from statsmodels.genmod.families import Poisson, NegativeBinomial
import joblib
from pathlib import Path

from ..utils.logging import get_logger

logger = get_logger(__name__)


class DemandGLM:
    """Demand forecasting using GLM with Poisson or Negative Binomial distribution"""

    def __init__(self, family: str = 'poisson', alpha: float = 1.0):
        """
        Initialize demand GLM model

        Args:
            family: 'poisson' or 'negbin' (negative binomial)
            alpha: Dispersion parameter for negative binomial (ignored for Poisson)
        """
        self.family = family
        self.alpha = alpha
        self.model: Optional[sm.GLM] = None
        self.results: Optional[Any] = None
        self.feature_names: Optional[list] = None

    def _get_family(self):
        """Get statsmodels family object"""
        if self.family == 'poisson':
            return Poisson()
        elif self.family == 'negbin':
            return NegativeBinomial(alpha=self.alpha)
        else:
            raise ValueError(f"Unknown family: {self.family}")

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        exposure: Optional[pd.Series] = None
    ) -> 'DemandGLM':
        """
        Fit GLM model

        Args:
            X: Feature matrix
            y: Target variable (demand counts)
            exposure: Exposure variable (e.g., number of days)

        Returns:
            Self
        """
        logger.info("fitting_demand_glm", family=self.family, num_samples=len(X))

        self.feature_names = list(X.columns)

        # Add constant term
        X_with_const = sm.add_constant(X)

        # Create GLM model
        family_obj = self._get_family()

        if exposure is not None:
            self.model = sm.GLM(
                y, X_with_const,
                family=family_obj,
                exposure=exposure
            )
        else:
            self.model = sm.GLM(y, X_with_const, family=family_obj)

        # Fit model
        self.results = self.model.fit()

        logger.info(
            "demand_glm_fitted",
            aic=self.results.aic,
            bic=self.results.bic,
            deviance=self.results.deviance
        )

        return self

    def predict(
        self,
        X: pd.DataFrame,
        exposure: Optional[pd.Series] = None
    ) -> np.ndarray:
        """
        Predict demand

        Args:
            X: Feature matrix
            exposure: Exposure variable

        Returns:
            Predicted demand counts
        """
        if self.results is None:
            raise ValueError("Model not fitted. Call fit() first.")

        X_with_const = sm.add_constant(X)

        if exposure is not None:
            # statsmodels requires exposure as log offset
            predictions = self.results.predict(X_with_const, exposure=exposure)
        else:
            predictions = self.results.predict(X_with_const)

        return predictions

    def predict_with_intervals(
        self,
        X: pd.DataFrame,
        exposure: Optional[pd.Series] = None,
        alpha: float = 0.05
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Predict with confidence intervals

        Args:
            X: Feature matrix
            exposure: Exposure variable
            alpha: Significance level for confidence intervals

        Returns:
            Tuple of (predictions, lower_bounds, upper_bounds)
        """
        if self.results is None:
            raise ValueError("Model not fitted. Call fit() first.")

        X_with_const = sm.add_constant(X)

        predictions = self.results.get_prediction(X_with_const, exposure=exposure)
        prediction_summary = predictions.summary_frame(alpha=alpha)

        return (
            prediction_summary['mean'].values,
            prediction_summary['mean_ci_lower'].values,
            prediction_summary['mean_ci_upper'].values
        )

    def get_feature_importance(self) -> pd.DataFrame:
        """
        Get feature importance based on coefficients

        Returns:
            DataFrame with feature names, coefficients, and p-values
        """
        if self.results is None:
            raise ValueError("Model not fitted. Call fit() first.")

        # Get coefficients (exclude constant)
        coef_df = pd.DataFrame({
            'feature': ['const'] + self.feature_names,
            'coefficient': self.results.params.values,
            'std_error': self.results.bse.values,
            'p_value': self.results.pvalues.values,
            'significant': self.results.pvalues.values < 0.05
        })

        # Sort by absolute coefficient value
        coef_df['abs_coefficient'] = coef_df['coefficient'].abs()
        coef_df = coef_df.sort_values('abs_coefficient', ascending=False)

        return coef_df.drop('abs_coefficient', axis=1)

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

        mae = np.mean(np.abs(y - predictions))
        rmse = np.sqrt(np.mean((y - predictions) ** 2))
        mape = np.mean(np.abs((y - predictions) / y)) * 100

        return {
            'mae': mae,
            'rmse': rmse,
            'mape': mape,
            'aic': self.results.aic,
            'bic': self.results.bic,
            'deviance': self.results.deviance
        }

    def save(self, filepath: Path):
        """Save model to file"""
        if self.results is None:
            raise ValueError("Model not fitted. Nothing to save.")

        model_data = {
            'results': self.results,
            'feature_names': self.feature_names,
            'family': self.family,
            'alpha': self.alpha
        }

        joblib.dump(model_data, filepath)
        logger.info("demand_glm_saved", filepath=str(filepath))

    def load(self, filepath: Path) -> 'DemandGLM':
        """Load model from file"""
        model_data = joblib.load(filepath)

        self.results = model_data['results']
        self.feature_names = model_data['feature_names']
        self.family = model_data['family']
        self.alpha = model_data['alpha']

        logger.info("demand_glm_loaded", filepath=str(filepath))
        return self


def train_demand_model(
    train_df: pd.DataFrame,
    feature_cols: list,
    target_col: str = 'daily_demand',
    family: str = 'poisson'
) -> DemandGLM:
    """
    Convenience function to train demand model

    Args:
        train_df: Training data
        feature_cols: List of feature column names
        target_col: Target column name
        family: GLM family ('poisson' or 'negbin')

    Returns:
        Fitted DemandGLM model
    """
    X = train_df[feature_cols]
    y = train_df[target_col]

    model = DemandGLM(family=family)
    model.fit(X, y)

    return model
