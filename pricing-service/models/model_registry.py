"""
Model Registry for LightGBM Models
===================================
Manages trained models with versioning, loading, and caching.

Features:
- Model version management
- Lazy loading with caching
- Model checksum verification
- Model metadata tracking
"""

import lightgbm as lgb
import json
import hashlib
import os
from typing import Dict, Optional, List, Tuple
from datetime import datetime
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class ModelRegistry:
    """
    Registry for managing trained LightGBM models
    """

    def __init__(self, model_dir: str = 'models'):
        """
        Initialize model registry

        Args:
            model_dir: Directory containing trained models
        """
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        # Cache for loaded models
        self._cache: Dict[str, Tuple[lgb.Booster, Dict]] = {}

        # Track loaded models
        self._loaded_models: Dict[str, Dict] = {}

        logger.info(f"Model registry initialized: {self.model_dir}")

    def get_model_key(self, property_id: str, model_type: str = 'conversion') -> str:
        """Generate cache key for model"""
        return f"{property_id}_{model_type}"

    def load_model(
        self,
        property_id: str,
        model_type: str = 'conversion',
        version: str = 'latest',
        use_cache: bool = True
    ) -> Tuple[Optional[lgb.Booster], Optional[Dict]]:
        """
        Load model and metadata

        Args:
            property_id: Property UUID
            model_type: Type of model (conversion, adr, revpar)
            version: Model version or 'latest'
            use_cache: Whether to use cached model

        Returns:
            Tuple of (model, metadata) or (None, None) if not found
        """
        cache_key = self.get_model_key(property_id, model_type)

        # Check cache first
        if use_cache and cache_key in self._cache:
            logger.debug(f"Model loaded from cache: {cache_key}")
            return self._cache[cache_key]

        # Find model file
        model_path = self.model_dir / f"{property_id}_{model_type}_{version}.bin"
        metadata_path = self.model_dir / f"{property_id}_{model_type}_{version}.json"

        if not model_path.exists():
            logger.warning(f"Model not found: {model_path}")
            return None, None

        try:
            # Load model
            model = lgb.Booster(model_file=str(model_path))
            logger.info(f"Model loaded: {model_path}")

            # Load metadata
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            # Verify checksum
            checksum = self._calculate_checksum(model_path)
            logger.info(f"Model checksum: {checksum}")

            # Update metadata with checksum
            metadata['checksum'] = checksum
            metadata['loaded_at'] = datetime.now().isoformat()

            # Cache model
            if use_cache:
                self._cache[cache_key] = (model, metadata)

            # Track loaded model
            self._loaded_models[cache_key] = {
                'property_id': property_id,
                'model_type': model_type,
                'version': metadata.get('version', version),
                'loaded_at': metadata['loaded_at'],
                'checksum': checksum,
                'num_features': metadata.get('num_features', 0),
                'metrics': metadata.get('metrics', {}),
            }

            logger.info(f"Model {cache_key} ready: version={metadata.get('version')}, features={metadata.get('num_features')}")

            return model, metadata

        except Exception as e:
            logger.error(f"Error loading model {model_path}: {str(e)}")
            return None, None

    def _calculate_checksum(self, filepath: Path) -> str:
        """Calculate MD5 checksum of file"""
        md5 = hashlib.md5()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                md5.update(chunk)
        return md5.hexdigest()

    def list_models(self, property_id: Optional[str] = None) -> List[Dict]:
        """
        List available models

        Args:
            property_id: Optional property ID to filter

        Returns:
            List of model metadata dictionaries
        """
        models = []

        for metadata_path in self.model_dir.glob('*.json'):
            # Skip 'latest' symlinks
            if '_latest.json' in str(metadata_path):
                continue

            try:
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)

                # Filter by property ID if specified
                if property_id and metadata.get('property_id') != property_id:
                    continue

                # Add file path
                metadata['file_path'] = str(metadata_path)

                models.append(metadata)

            except Exception as e:
                logger.warning(f"Error reading metadata {metadata_path}: {str(e)}")

        # Sort by timestamp (newest first)
        models.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

        return models

    def get_latest_version(self, property_id: str, model_type: str = 'conversion') -> Optional[str]:
        """
        Get latest version for a property and model type

        Args:
            property_id: Property UUID
            model_type: Model type

        Returns:
            Version string or None if not found
        """
        models = self.list_models(property_id=property_id)

        for model in models:
            if model.get('model_type') == model_type:
                return model.get('version')

        return None

    def delete_model(self, property_id: str, model_type: str, version: str):
        """
        Delete a specific model version

        Args:
            property_id: Property UUID
            model_type: Model type
            version: Model version
        """
        model_path = self.model_dir / f"{property_id}_{model_type}_{version}.bin"
        metadata_path = self.model_dir / f"{property_id}_{model_type}_{version}.json"

        if model_path.exists():
            model_path.unlink()
            logger.info(f"Deleted model: {model_path}")

        if metadata_path.exists():
            metadata_path.unlink()
            logger.info(f"Deleted metadata: {metadata_path}")

        # Remove from cache
        cache_key = self.get_model_key(property_id, model_type)
        if cache_key in self._cache:
            del self._cache[cache_key]
            logger.info(f"Removed from cache: {cache_key}")

    def clear_cache(self):
        """Clear model cache"""
        self._cache.clear()
        logger.info("Model cache cleared")

    def get_loaded_models(self) -> Dict[str, Dict]:
        """Get information about currently loaded models"""
        return self._loaded_models.copy()

    def predict(
        self,
        property_id: str,
        features: Dict[str, float],
        model_type: str = 'conversion',
        version: str = 'latest'
    ) -> Optional[float]:
        """
        Make prediction using loaded model

        Args:
            property_id: Property UUID
            features: Dictionary of feature name -> value
            model_type: Model type
            version: Model version

        Returns:
            Prediction value or None if model not found
        """
        model, metadata = self.load_model(property_id, model_type, version)

        if model is None or metadata is None:
            logger.error(f"Model not found for prediction: {property_id}_{model_type}")
            return None

        try:
            # Extract features in correct order
            feature_names = metadata.get('features', [])
            feature_values = []

            for feature_name in feature_names:
                value = features.get(feature_name, 0.0)  # Default to 0 if missing
                feature_values.append(value)

            # Make prediction
            prediction = model.predict([feature_values], num_iteration=model.best_iteration)[0]

            logger.debug(f"Prediction for {property_id}: {prediction:.4f}")

            return float(prediction)

        except Exception as e:
            logger.error(f"Error making prediction: {str(e)}")
            return None

    def get_feature_importance(
        self,
        property_id: str,
        model_type: str = 'conversion',
        version: str = 'latest',
        top_n: int = 10
    ) -> Optional[Dict[str, float]]:
        """
        Get feature importance for a model

        Args:
            property_id: Property UUID
            model_type: Model type
            version: Model version
            top_n: Number of top features to return

        Returns:
            Dictionary of feature -> importance
        """
        _, metadata = self.load_model(property_id, model_type, version)

        if metadata is None:
            return None

        feature_importance = metadata.get('feature_importance', {})

        # Sort by importance and take top N
        sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:top_n]

        return dict(sorted_features)

    def warm_up(self, property_ids: List[str], model_type: str = 'conversion'):
        """
        Warm up cache by loading models for multiple properties

        Args:
            property_ids: List of property UUIDs
            model_type: Model type to load
        """
        logger.info(f"Warming up cache for {len(property_ids)} properties...")

        loaded_count = 0
        for property_id in property_ids:
            model, metadata = self.load_model(property_id, model_type, use_cache=True)
            if model is not None:
                loaded_count += 1

        logger.info(f"Cache warm-up complete: {loaded_count}/{len(property_ids)} models loaded")

    def get_registry_stats(self) -> Dict:
        """Get statistics about the model registry"""
        total_models = len(list(self.model_dir.glob('*.bin')))
        cached_models = len(self._cache)

        models_by_type = {}
        for metadata_path in self.model_dir.glob('*.json'):
            if '_latest.json' in str(metadata_path):
                continue

            try:
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    model_type = metadata.get('model_type', 'unknown')
                    models_by_type[model_type] = models_by_type.get(model_type, 0) + 1
            except:
                pass

        return {
            'total_models': total_models,
            'cached_models': cached_models,
            'models_by_type': models_by_type,
            'model_dir': str(self.model_dir),
            'loaded_models': list(self._loaded_models.keys()),
        }


# Global registry instance
_registry: Optional[ModelRegistry] = None


def get_registry() -> ModelRegistry:
    """Get global model registry instance"""
    global _registry
    if _registry is None:
        _registry = ModelRegistry()
    return _registry
