"""
ML Price Prediction Engine
XGBoost and LightGBM models for dynamic pricing with SHAP explainability
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import date, timedelta
import pickle
from pathlib import Path

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.linear_model import Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor

from core.utils.logging import get_logger

logger = get_logger(__name__)


class PricePredictionModel:
    """
    ML model for price prediction with multiple algorithms
    """

    SUPPORTED_ALGORITHMS = {
        'xgboost': 'XGBoost Gradient Boosting',
        'lightgbm': 'LightGBM Gradient Boosting',
        'random_forest': 'Random Forest',
        'ridge': 'Ridge Regression',
        'lasso': 'Lasso Regression'
    }

    def __init__(
        self,
        algorithm: str = 'xgboost',
        model_dir: Optional[Path] = None
    ):
        """
        Initialize price prediction model

        Args:
            algorithm: Model type ('xgboost', 'lightgbm', 'random_forest', 'ridge', 'lasso')
            model_dir: Directory to save/load models
        """
        self.algorithm = algorithm
        self.model = None
        self.feature_names = []
        self.target_name = 'price'
        self.scaler = None
        self.training_metrics = {}

        if model_dir is None:
            model_dir = Path(__file__).parent.parent.parent / "data" / "models"
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        # SHAP explainer
        self.explainer = None

    def _create_model(self) -> Any:
        """Create model instance based on algorithm"""
        if self.algorithm == 'xgboost':
            if not XGBOOST_AVAILABLE:
                logger.warning("xgboost_not_available", fallback="random_forest")
                self.algorithm = 'random_forest'
                return RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)

            return xgb.XGBRegressor(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                n_jobs=-1
            )

        elif self.algorithm == 'lightgbm':
            if not LIGHTGBM_AVAILABLE:
                logger.warning("lightgbm_not_available", fallback="random_forest")
                self.algorithm = 'random_forest'
                return RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)

            return lgb.LGBMRegressor(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                n_jobs=-1,
                verbose=-1
            )

        elif self.algorithm == 'random_forest':
            return RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )

        elif self.algorithm == 'ridge':
            return Ridge(alpha=1.0, random_state=42)

        elif self.algorithm == 'lasso':
            return Lasso(alpha=1.0, random_state=42)

        else:
            raise ValueError(f"Unknown algorithm: {self.algorithm}")

    def prepare_features(
        self,
        df: pd.DataFrame,
        target_col: str = 'price',
        exclude_cols: Optional[List[str]] = None
    ) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
        """
        Prepare features for training

        Args:
            df: Input dataframe
            target_col: Target column name
            exclude_cols: Columns to exclude from features

        Returns:
            (X, y, feature_names)
        """
        if exclude_cols is None:
            exclude_cols = ['date', 'booking_date', 'checkin_date', 'checkout_date']

        # Identify feature columns
        exclude_set = set(exclude_cols + [target_col])
        feature_cols = [col for col in df.columns if col not in exclude_set]

        # Filter to numeric columns only
        numeric_cols = df[feature_cols].select_dtypes(include=[np.number]).columns.tolist()

        X = df[numeric_cols].copy()
        y = df[target_col].copy()

        # Handle missing values
        X = X.fillna(X.mean())

        logger.info(
            "features_prepared",
            features=len(numeric_cols),
            samples=len(X),
            target=target_col
        )

        return X, y, numeric_cols

    def train(
        self,
        df: pd.DataFrame,
        target_col: str = 'price',
        exclude_cols: Optional[List[str]] = None,
        cv_folds: int = 5
    ) -> Dict[str, Any]:
        """
        Train the model with cross-validation

        Args:
            df: Training dataframe
            target_col: Target column name
            exclude_cols: Columns to exclude
            cv_folds: Number of CV folds

        Returns:
            Dictionary with training metrics
        """
        logger.info("training_started", algorithm=self.algorithm, samples=len(df))

        # Prepare features
        X, y, feature_names = self.prepare_features(df, target_col, exclude_cols)
        self.feature_names = feature_names
        self.target_name = target_col

        # Create model
        self.model = self._create_model()

        # Time series cross-validation
        tscv = TimeSeriesSplit(n_splits=cv_folds)
        cv_scores = cross_val_score(
            self.model,
            X, y,
            cv=tscv,
            scoring='neg_mean_squared_error',
            n_jobs=-1
        )

        cv_rmse = np.sqrt(-cv_scores)

        # Train on full dataset
        self.model.fit(X, y)

        # Predictions
        y_pred = self.model.predict(X)

        # Metrics
        mse = mean_squared_error(y, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y, y_pred)
        r2 = r2_score(y, y_pred)

        self.training_metrics = {
            'algorithm': self.algorithm,
            'samples': len(X),
            'features': len(feature_names),
            'cv_rmse_mean': float(cv_rmse.mean()),
            'cv_rmse_std': float(cv_rmse.std()),
            'train_rmse': float(rmse),
            'train_mae': float(mae),
            'train_r2': float(r2),
            'feature_importance': self._get_feature_importance()
        }

        # Create SHAP explainer
        if SHAP_AVAILABLE and self.algorithm in ['xgboost', 'lightgbm', 'random_forest']:
            try:
                self.explainer = shap.TreeExplainer(self.model)
                logger.info("shap_explainer_created")
            except Exception as e:
                logger.warning("shap_explainer_failed", error=str(e))

        logger.info(
            "training_complete",
            r2=r2,
            rmse=rmse,
            mae=mae,
            cv_rmse=cv_rmse.mean()
        )

        return self.training_metrics

    def _get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance scores"""
        if not self.model or not self.feature_names:
            return {}

        try:
            if hasattr(self.model, 'feature_importances_'):
                # Tree-based models
                importances = self.model.feature_importances_
            elif hasattr(self.model, 'coef_'):
                # Linear models
                importances = np.abs(self.model.coef_)
            else:
                return {}

            importance_dict = {
                name: float(imp)
                for name, imp in zip(self.feature_names, importances)
            }

            # Sort by importance
            importance_dict = dict(
                sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
            )

            return importance_dict

        except Exception as e:
            logger.warning("feature_importance_failed", error=str(e))
            return {}

    def predict(
        self,
        df: pd.DataFrame,
        return_intervals: bool = False
    ) -> np.ndarray:
        """
        Make predictions

        Args:
            df: Input dataframe with features
            return_intervals: Whether to return prediction intervals (if supported)

        Returns:
            Array of predictions
        """
        if not self.model:
            raise ValueError("Model not trained. Call train() first.")

        # Prepare features (align with training features)
        X = df[self.feature_names].copy()
        X = X.fillna(X.mean())

        # Predict
        predictions = self.model.predict(X)

        logger.info("predictions_made", count=len(predictions))

        return predictions

    def predict_with_explanation(
        self,
        df: pd.DataFrame,
        n_samples: int = 100
    ) -> Tuple[np.ndarray, Optional[Any]]:
        """
        Make predictions with SHAP explanations

        Args:
            df: Input dataframe
            n_samples: Number of samples to explain

        Returns:
            (predictions, shap_values)
        """
        predictions = self.predict(df)

        if self.explainer is None or not SHAP_AVAILABLE:
            logger.warning("shap_not_available")
            return predictions, None

        try:
            X = df[self.feature_names].copy()
            X = X.fillna(X.mean())

            # Sample if too many rows
            if len(X) > n_samples:
                sample_indices = np.random.choice(len(X), n_samples, replace=False)
                X_sample = X.iloc[sample_indices]
            else:
                X_sample = X

            shap_values = self.explainer.shap_values(X_sample)

            logger.info("shap_values_computed", samples=len(X_sample))

            return predictions, shap_values

        except Exception as e:
            logger.error("shap_computation_failed", error=str(e))
            return predictions, None

    def save(self, filename: Optional[str] = None) -> Path:
        """
        Save model to disk

        Args:
            filename: Optional filename (default: {algorithm}_model.pkl)

        Returns:
            Path to saved model
        """
        if filename is None:
            filename = f"{self.algorithm}_model.pkl"

        filepath = self.model_dir / filename

        model_data = {
            'model': self.model,
            'algorithm': self.algorithm,
            'feature_names': self.feature_names,
            'target_name': self.target_name,
            'training_metrics': self.training_metrics,
            'explainer': self.explainer
        }

        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)

        logger.info("model_saved", path=str(filepath))

        return filepath

    def load(self, filename: str) -> None:
        """
        Load model from disk

        Args:
            filename: Model filename
        """
        filepath = self.model_dir / filename

        if not filepath.exists():
            raise FileNotFoundError(f"Model not found: {filepath}")

        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)

        self.model = model_data['model']
        self.algorithm = model_data['algorithm']
        self.feature_names = model_data['feature_names']
        self.target_name = model_data['target_name']
        self.training_metrics = model_data.get('training_metrics', {})
        self.explainer = model_data.get('explainer')

        logger.info("model_loaded", path=str(filepath), algorithm=self.algorithm)

    def evaluate(
        self,
        test_df: pd.DataFrame,
        target_col: str = 'price'
    ) -> Dict[str, float]:
        """
        Evaluate model on test set

        Args:
            test_df: Test dataframe
            target_col: Target column name

        Returns:
            Dictionary with evaluation metrics
        """
        if not self.model:
            raise ValueError("Model not trained. Call train() first.")

        X_test = test_df[self.feature_names].copy()
        X_test = X_test.fillna(X_test.mean())
        y_test = test_df[target_col]

        y_pred = self.model.predict(X_test)

        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        # MAPE (Mean Absolute Percentage Error)
        mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100

        metrics = {
            'test_rmse': float(rmse),
            'test_mae': float(mae),
            'test_r2': float(r2),
            'test_mape': float(mape),
            'n_samples': len(test_df)
        }

        logger.info("evaluation_complete", **metrics)

        return metrics


# ===== Convenience Functions =====

def train_multiple_models(
    df: pd.DataFrame,
    algorithms: List[str] = ['xgboost', 'lightgbm', 'random_forest'],
    target_col: str = 'price'
) -> Dict[str, PricePredictionModel]:
    """
    Train multiple models and compare

    Args:
        df: Training dataframe
        algorithms: List of algorithms to try
        target_col: Target column

    Returns:
        Dictionary mapping algorithm -> trained model
    """
    models = {}

    for algo in algorithms:
        logger.info("training_algorithm", algorithm=algo)

        try:
            model = PricePredictionModel(algorithm=algo)
            model.train(df, target_col=target_col)
            models[algo] = model
        except Exception as e:
            logger.error("training_failed", algorithm=algo, error=str(e))

    return models


def get_best_model(models: Dict[str, PricePredictionModel]) -> Tuple[str, PricePredictionModel]:
    """
    Select best model based on CV RMSE

    Args:
        models: Dictionary of trained models

    Returns:
        (best_algorithm, best_model)
    """
    best_algo = None
    best_rmse = float('inf')

    for algo, model in models.items():
        cv_rmse = model.training_metrics.get('cv_rmse_mean', float('inf'))
        if cv_rmse < best_rmse:
            best_rmse = cv_rmse
            best_algo = algo

    logger.info("best_model_selected", algorithm=best_algo, cv_rmse=best_rmse)

    return best_algo, models[best_algo]
