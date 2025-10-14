"""
ML Price Predictor
Train XGBoost/LightGBM models to predict optimal pricing
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import joblib

import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import shap


class PricePredictor:
    """Train and predict optimal pricing using gradient boosting"""

    def __init__(
        self,
        model_type: str = "xgboost",
        **model_params
    ):
        """
        Args:
            model_type: 'xgboost' or 'lightgbm'
            model_params: Additional parameters for the model
        """
        self.model_type = model_type
        self.model_params = model_params or {}
        self.model = None
        self.feature_names: List[str] = []
        self.metrics: Dict = {}
        self.shap_values = None
        self.explainer = None

    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        cv_folds: int = 5,
        verbose: bool = True
    ) -> Dict[str, float]:
        """
        Train model with time-series cross-validation

        Args:
            X: Feature matrix
            y: Target variable (price or demand)
            cv_folds: Number of CV folds
            verbose: Print progress

        Returns:
            Metrics: {'mae': 10.5, 'rmse': 15.2, 'r2': 0.85}
        """
        self.feature_names = list(X.columns)

        # Time series split
        tscv = TimeSeriesSplit(n_splits=cv_folds)

        # Initialize model
        if self.model_type == "xgboost":
            default_params = {
                'n_estimators': 100,
                'learning_rate': 0.1,
                'max_depth': 6,
                'min_child_weight': 1,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'random_state': 42,
                'n_jobs': -1
            }
            default_params.update(self.model_params)
            self.model = xgb.XGBRegressor(**default_params)

        elif self.model_type == "lightgbm":
            default_params = {
                'n_estimators': 100,
                'learning_rate': 0.1,
                'num_leaves': 31,
                'min_child_samples': 20,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'random_state': 42,
                'n_jobs': -1,
                'verbose': -1
            }
            default_params.update(self.model_params)
            self.model = lgb.LGBMRegressor(**default_params)

        else:
            raise ValueError(f"Unknown model type: {self.model_type}")

        # Cross-validation
        cv_scores = {'mae': [], 'rmse': [], 'r2': []}

        for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            # Train
            self.model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False
            )

            # Predict
            y_pred = self.model.predict(X_val)

            # Metrics
            mae = mean_absolute_error(y_val, y_pred)
            rmse = np.sqrt(mean_squared_error(y_val, y_pred))
            r2 = r2_score(y_val, y_pred)

            cv_scores['mae'].append(mae)
            cv_scores['rmse'].append(rmse)
            cv_scores['r2'].append(r2)

            if verbose:
                print(f"Fold {fold+1}/{cv_folds}: MAE={mae:.2f}, RMSE={rmse:.2f}, R²={r2:.3f}")

        # Final training on all data
        self.model.fit(X, y, verbose=False)

        # Store metrics
        self.metrics = {
            'mae': np.mean(cv_scores['mae']),
            'mae_std': np.std(cv_scores['mae']),
            'rmse': np.mean(cv_scores['rmse']),
            'rmse_std': np.std(cv_scores['rmse']),
            'r2': np.mean(cv_scores['r2']),
            'r2_std': np.std(cv_scores['r2']),
            'cv_folds': cv_folds
        }

        if verbose:
            print(f"\n✓ Training complete!")
            print(f"  MAE: {self.metrics['mae']:.2f} ± {self.metrics['mae_std']:.2f}")
            print(f"  RMSE: {self.metrics['rmse']:.2f} ± {self.metrics['rmse_std']:.2f}")
            print(f"  R²: {self.metrics['r2']:.3f} ± {self.metrics['r2_std']:.3f}")

        return self.metrics

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Predict prices/demand

        Args:
            X: Feature matrix

        Returns:
            Predictions
        """
        if self.model is None:
            raise ValueError("Model not trained yet. Call train() first.")

        return self.model.predict(X)

    def get_feature_importance(self, top_n: int = 20) -> pd.DataFrame:
        """
        Get feature importance from model

        Args:
            top_n: Number of top features to return

        Returns:
            DataFrame with feature importance
        """
        if self.model is None:
            raise ValueError("Model not trained yet")

        if hasattr(self.model, 'feature_importances_'):
            importance = self.model.feature_importances_
        else:
            raise AttributeError("Model doesn't have feature_importances_")

        df_importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance
        }).sort_values('importance', ascending=False).head(top_n)

        return df_importance

    def explain_with_shap(
        self,
        X: pd.DataFrame,
        sample_size: int = 100
    ) -> np.ndarray:
        """
        Generate SHAP values for explainability

        Args:
            X: Feature matrix
            sample_size: Number of samples for explanation

        Returns:
            SHAP values array
        """
        if self.model is None:
            raise ValueError("Model not trained yet")

        # Sample data for speed
        if len(X) > sample_size:
            X_sample = X.sample(n=sample_size, random_state=42)
        else:
            X_sample = X

        # Create explainer
        self.explainer = shap.TreeExplainer(self.model)
        self.shap_values = self.explainer.shap_values(X_sample)

        return self.shap_values

    def save(self, path: Path):
        """Save trained model"""
        if self.model is None:
            raise ValueError("No model to save")

        path.parent.mkdir(parents=True, exist_ok=True)

        model_data = {
            'model': self.model,
            'model_type': self.model_type,
            'feature_names': self.feature_names,
            'metrics': self.metrics
        }

        joblib.dump(model_data, path)
        print(f"✓ Model saved to {path}")

    @classmethod
    def load(cls, path: Path) -> 'PricePredictor':
        """Load trained model"""
        model_data = joblib.load(path)

        predictor = cls(model_type=model_data['model_type'])
        predictor.model = model_data['model']
        predictor.feature_names = model_data['feature_names']
        predictor.metrics = model_data['metrics']

        print(f"✓ Model loaded from {path}")
        return predictor


def compare_models(
    X: pd.DataFrame,
    y: pd.Series,
    models: List[str] = ["xgboost", "lightgbm"],
    cv_folds: int = 5
) -> pd.DataFrame:
    """
    Compare multiple models

    Args:
        X: Features
        y: Target
        models: List of model types to compare
        cv_folds: CV folds

    Returns:
        Comparison DataFrame
    """
    results = []

    for model_type in models:
        print(f"\nTraining {model_type}...")
        predictor = PricePredictor(model_type=model_type)
        metrics = predictor.train(X, y, cv_folds=cv_folds, verbose=False)

        metrics['model'] = model_type
        results.append(metrics)

    df_results = pd.DataFrame(results)
    df_results = df_results.sort_values('mae')

    print("\n📊 Model Comparison:")
    print(df_results[['model', 'mae', 'rmse', 'r2']])

    return df_results
