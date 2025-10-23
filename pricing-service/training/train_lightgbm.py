"""
LightGBM Elasticity Model Training
===================================
Trains LightGBM models for pricing elasticity and demand prediction.

Features:
- Per-property or clustered models
- Feature importance analysis
- Model versioning and registry
- Hyperparameter tuning
- Cross-validation
"""

import lightgbm as lgb
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, roc_auc_score, log_loss
from typing import Dict, List, Optional, Tuple
import json
import hashlib
import logging
from datetime import datetime
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.dataset_builder import DatasetBuilder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LightGBMTrainer:
    """
    Trains and evaluates LightGBM models for pricing elasticity
    """

    def __init__(self, model_dir: str = 'models'):
        """
        Initialize trainer

        Args:
            model_dir: Directory to save trained models
        """
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

        # Default hyperparameters
        self.default_params = {
            'objective': 'binary',  # or 'regression' for ADR/RevPAR
            'metric': 'binary_logloss',  # or 'rmse' for regression
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'min_data_in_leaf': 20,
            'max_depth': 6,
            'lambda_l1': 0.1,
            'lambda_l2': 0.1,
        }

    def train(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str = 'target',
        params: Optional[Dict] = None,
        num_boost_round: int = 100,
        early_stopping_rounds: int = 10,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Tuple[lgb.Booster, Dict]:
        """
        Train LightGBM model

        Args:
            df: Training data
            feature_cols: List of feature column names
            target_col: Target column name
            params: Model hyperparameters (uses defaults if None)
            num_boost_round: Number of boosting rounds
            early_stopping_rounds: Early stopping patience
            test_size: Test set size (0-1)
            random_state: Random seed

        Returns:
            Tuple of (trained model, metrics dict)
        """
        logger.info(f"Training LightGBM model with {len(df)} samples, {len(feature_cols)} features")

        # Use default params if not provided
        if params is None:
            params = self.default_params.copy()

        # Prepare data
        X = df[feature_cols].fillna(0)  # Fill NaN with 0
        y = df[target_col]

        # Split train/validation
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y if params.get('objective') == 'binary' else None
        )

        logger.info(f"Train set: {len(X_train)}, Validation set: {len(X_val)}")

        # Create LightGBM datasets
        train_data = lgb.Dataset(X_train, label=y_train, feature_name=feature_cols)
        val_data = lgb.Dataset(X_val, label=y_val, reference=train_data, feature_name=feature_cols)

        # Train model
        logger.info("Training model...")
        callbacks = [
            lgb.log_evaluation(period=10),
            lgb.early_stopping(stopping_rounds=early_stopping_rounds)
        ]

        model = lgb.train(
            params,
            train_data,
            num_boost_round=num_boost_round,
            valid_sets=[train_data, val_data],
            valid_names=['train', 'valid'],
            callbacks=callbacks
        )

        logger.info(f"Training complete. Best iteration: {model.best_iteration}")

        # Evaluate model
        metrics = self.evaluate(model, X_val, y_val, params.get('objective', 'binary'))

        # Add feature importance
        feature_importance = dict(zip(feature_cols, model.feature_importance(importance_type='gain')))
        metrics['feature_importance'] = feature_importance

        # Sort features by importance
        sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        logger.info("Top 10 features:")
        for feature, importance in sorted_features[:10]:
            logger.info(f"  {feature}: {importance:.2f}")

        return model, metrics

    def evaluate(self, model: lgb.Booster, X: pd.DataFrame, y: pd.Series, objective: str) -> Dict:
        """
        Evaluate model performance

        Args:
            model: Trained LightGBM model
            X: Features
            y: True labels/values
            objective: Model objective (binary, regression, etc.)

        Returns:
            Dictionary of metrics
        """
        y_pred = model.predict(X, num_iteration=model.best_iteration)

        metrics = {}

        if objective == 'binary':
            # Binary classification metrics
            metrics['auc'] = roc_auc_score(y, y_pred)
            metrics['logloss'] = log_loss(y, y_pred)

            # Convert probabilities to binary predictions
            y_pred_binary = (y_pred > 0.5).astype(int)
            metrics['accuracy'] = (y_pred_binary == y).mean()

            # Precision/Recall
            true_positives = ((y_pred_binary == 1) & (y == 1)).sum()
            false_positives = ((y_pred_binary == 1) & (y == 0)).sum()
            false_negatives = ((y_pred_binary == 0) & (y == 1)).sum()

            metrics['precision'] = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
            metrics['recall'] = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0

            if metrics['precision'] + metrics['recall'] > 0:
                metrics['f1'] = 2 * (metrics['precision'] * metrics['recall']) / (metrics['precision'] + metrics['recall'])
            else:
                metrics['f1'] = 0

            logger.info(f"AUC: {metrics['auc']:.4f}, Accuracy: {metrics['accuracy']:.4f}, F1: {metrics['f1']:.4f}")

        else:
            # Regression metrics
            metrics['mae'] = mean_absolute_error(y, y_pred)
            metrics['rmse'] = np.sqrt(mean_squared_error(y, y_pred))
            metrics['r2'] = r2_score(y, y_pred)

            # MAPE (Mean Absolute Percentage Error)
            mape_mask = y != 0
            if mape_mask.sum() > 0:
                metrics['mape'] = np.mean(np.abs((y[mape_mask] - y_pred[mape_mask]) / y[mape_mask])) * 100
            else:
                metrics['mape'] = 0

            logger.info(f"MAE: {metrics['mae']:.2f}, RMSE: {metrics['rmse']:.2f}, R²: {metrics['r2']:.4f}")

        return metrics

    def save_model(
        self,
        model: lgb.Booster,
        property_id: str,
        feature_cols: List[str],
        metrics: Dict,
        model_type: str = 'conversion'
    ) -> str:
        """
        Save trained model and metadata

        Args:
            model: Trained LightGBM model
            property_id: Property UUID
            feature_cols: List of feature names
            metrics: Model performance metrics
            model_type: Type of model (conversion, adr, revpar)

        Returns:
            Path to saved model
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        version = f"v{timestamp}"

        # Save model binary
        model_path = os.path.join(self.model_dir, f"{property_id}_{model_type}_{version}.bin")
        model.save_model(model_path)

        logger.info(f"Model saved to {model_path}")

        # Calculate features hash
        features_str = ','.join(sorted(feature_cols))
        features_hash = hashlib.md5(features_str.encode()).hexdigest()

        # Save metadata
        metadata = {
            'property_id': property_id,
            'model_type': model_type,
            'version': version,
            'timestamp': timestamp,
            'num_features': len(feature_cols),
            'features': feature_cols,
            'features_hash': features_hash,
            'metrics': {k: float(v) if isinstance(v, (np.float32, np.float64)) else v
                        for k, v in metrics.items() if k != 'feature_importance'},
            'feature_importance': {k: float(v) for k, v in metrics.get('feature_importance', {}).items()},
            'model_params': model.params,
            'num_trees': model.num_trees(),
            'best_iteration': model.best_iteration,
        }

        metadata_path = os.path.join(self.model_dir, f"{property_id}_{model_type}_{version}.json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Metadata saved to {metadata_path}")

        # Create symlink to latest model
        latest_model_path = os.path.join(self.model_dir, f"{property_id}_{model_type}_latest.bin")
        latest_metadata_path = os.path.join(self.model_dir, f"{property_id}_{model_type}_latest.json")

        # Remove old symlinks if they exist
        if os.path.exists(latest_model_path):
            os.remove(latest_model_path)
        if os.path.exists(latest_metadata_path):
            os.remove(latest_metadata_path)

        # Create new symlinks (Windows: copy instead of symlink)
        import shutil
        shutil.copy2(model_path, latest_model_path)
        shutil.copy2(metadata_path, latest_metadata_path)

        logger.info(f"Latest model links updated")

        return model_path

    def load_model(self, property_id: str, model_type: str = 'conversion', version: str = 'latest') -> Tuple[lgb.Booster, Dict]:
        """
        Load trained model and metadata

        Args:
            property_id: Property UUID
            model_type: Type of model
            version: Model version or 'latest'

        Returns:
            Tuple of (model, metadata)
        """
        model_path = os.path.join(self.model_dir, f"{property_id}_{model_type}_{version}.bin")
        metadata_path = os.path.join(self.model_dir, f"{property_id}_{model_type}_{version}.json")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")

        # Load model
        model = lgb.Booster(model_file=model_path)
        logger.info(f"Model loaded from {model_path}")

        # Load metadata
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

        logger.info(f"Model version: {metadata['version']}, Features: {metadata['num_features']}")

        return model, metadata

    def cross_validate(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str = 'target',
        params: Optional[Dict] = None,
        n_folds: int = 5,
        num_boost_round: int = 100
    ) -> Dict:
        """
        Perform cross-validation

        Args:
            df: Training data
            feature_cols: Feature column names
            target_col: Target column name
            params: Model parameters
            n_folds: Number of CV folds
            num_boost_round: Number of boosting rounds

        Returns:
            Dictionary of CV metrics
        """
        logger.info(f"Performing {n_folds}-fold cross-validation...")

        if params is None:
            params = self.default_params.copy()

        X = df[feature_cols].fillna(0)
        y = df[target_col]

        # LightGBM CV
        train_data = lgb.Dataset(X, label=y, feature_name=feature_cols)

        cv_results = lgb.cv(
            params,
            train_data,
            num_boost_round=num_boost_round,
            nfold=n_folds,
            stratified=params.get('objective') == 'binary',
            shuffle=True,
            callbacks=[lgb.log_evaluation(period=10)]
        )

        # Extract mean metrics from CV
        metric_name = list(cv_results.keys())[0]  # e.g., 'binary_logloss-mean'
        cv_metrics = {
            'cv_mean': cv_results[metric_name][-1],
            'cv_std': cv_results[metric_name.replace('-mean', '-stdv')][-1] if metric_name.replace('-mean', '-stdv') in cv_results else 0,
            'best_iteration': len(cv_results[metric_name]),
        }

        logger.info(f"CV {metric_name}: {cv_metrics['cv_mean']:.4f} ± {cv_metrics['cv_std']:.4f}")

        return cv_metrics


def main():
    """
    Main training script
    """
    import argparse

    parser = argparse.ArgumentParser(description='Train LightGBM elasticity model')
    parser.add_argument('--property-id', required=True, help='Property UUID')
    parser.add_argument('--user-token', required=True, help='JWT token for authentication')
    parser.add_argument('--target-type', default='conversion', choices=['conversion', 'adr', 'revpar'], help='Target variable type')
    parser.add_argument('--start-date', help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', help='End date (YYYY-MM-DD)')
    parser.add_argument('--num-boost-round', type=int, default=100, help='Number of boosting rounds')
    parser.add_argument('--cv', action='store_true', help='Perform cross-validation')
    parser.add_argument('--save', action='store_true', help='Save trained model')

    args = parser.parse_args()

    # Build dataset
    logger.info("Building dataset...")
    builder = DatasetBuilder()
    df, feature_cols = builder.build_training_dataset(
        property_id=args.property_id,
        user_token=args.user_token,
        target_type=args.target_type,
        start_date=args.start_date,
        end_date=args.end_date
    )

    if df.empty:
        logger.error("No data available for training")
        return

    # Initialize trainer
    trainer = LightGBMTrainer()

    # Set objective based on target type
    params = trainer.default_params.copy()
    if args.target_type == 'conversion':
        params['objective'] = 'binary'
        params['metric'] = 'binary_logloss'
    else:
        params['objective'] = 'regression'
        params['metric'] = 'rmse'

    # Cross-validation (optional)
    if args.cv:
        cv_metrics = trainer.cross_validate(df, feature_cols, params=params)
        logger.info(f"Cross-validation results: {cv_metrics}")

    # Train model
    model, metrics = trainer.train(
        df,
        feature_cols,
        params=params,
        num_boost_round=args.num_boost_round
    )

    # Save model (optional)
    if args.save:
        model_path = trainer.save_model(
            model,
            args.property_id,
            feature_cols,
            metrics,
            model_type=args.target_type
        )
        logger.info(f"Model saved to {model_path}")
    else:
        logger.info("Model not saved (use --save flag to save)")

    logger.info("Training complete!")


if __name__ == '__main__':
    main()
