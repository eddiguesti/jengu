"""
Weekly Retraining Workflow
===========================
Automatically retrains models using latest booking outcomes.

Features:
- Fetch latest outcomes from storage
- Retrain models if sufficient new data
- Compare against previous model
- Deploy if performance improved
- Log metrics and versioning

Usage:
    python training/retrain_weekly.py --all-properties
    python training/retrain_weekly.py --property-id {uuid}
"""

import sys
import os
import argparse
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from learning.outcomes_storage import get_outcomes_storage
from data.dataset_builder import DatasetBuilder
from training.train_lightgbm import LightGBMTrainer
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WeeklyRetrainingWorkflow:
    """
    Manages weekly model retraining workflow
    """

    def __init__(self, min_new_outcomes: int = 100, min_total_outcomes: int = 1000):
        """
        Initialize retraining workflow

        Args:
            min_new_outcomes: Minimum new outcomes required to trigger retrain
            min_total_outcomes: Minimum total outcomes required for training
        """
        self.min_new_outcomes = min_new_outcomes
        self.min_total_outcomes = min_total_outcomes

        self.outcomes_storage = get_outcomes_storage()
        self.trainer = LightGBMTrainer()

    def should_retrain(self, property_id: str) -> tuple[bool, str]:
        """
        Determine if model should be retrained

        Args:
            property_id: Property UUID

        Returns:
            Tuple of (should_retrain, reason)
        """
        # Get outcomes statistics
        stats = self.outcomes_storage.get_statistics(property_id)

        if not stats['exists']:
            return False, f"No outcomes found for property {property_id}"

        total_records = stats['total_records']

        if total_records < self.min_total_outcomes:
            return False, f"Insufficient total outcomes ({total_records} < {self.min_total_outcomes})"

        # Check for new outcomes in last 7 days
        recent_count = stats['recent_activity']['last_7_days']

        if recent_count < self.min_new_outcomes:
            return False, f"Insufficient new outcomes ({recent_count} < {self.min_new_outcomes} in last 7 days)"

        return True, f"Ready to retrain: {total_records} total outcomes, {recent_count} new in last 7 days"

    def prepare_training_data(
        self,
        property_id: str,
        user_token: str = 'retrain-system'
    ) -> tuple[pd.DataFrame, list]:
        """
        Prepare training data from stored outcomes

        Args:
            property_id: Property UUID
            user_token: User token (not needed for stored outcomes)

        Returns:
            Tuple of (DataFrame, feature_cols)
        """
        logger.info(f"Preparing training data for property {property_id}")

        # Get outcomes from storage
        outcomes_df = self.outcomes_storage.get_outcomes(property_id)

        if outcomes_df.empty:
            raise ValueError(f"No outcomes found for property {property_id}")

        logger.info(f"Loaded {len(outcomes_df)} outcomes")

        # Convert outcomes to training format
        # The outcomes should already have most features stored

        # Create target variable from 'accepted' field
        outcomes_df['target'] = outcomes_df['accepted'].astype(int)

        # Feature engineering - extract from context if available
        if 'context' in outcomes_df.columns:
            # Parse JSON context if stored as string
            import json
            for idx, row in outcomes_df.iterrows():
                if pd.notna(row['context']):
                    try:
                        context = json.loads(row['context']) if isinstance(row['context'], str) else row['context']
                        for key, value in context.items():
                            outcomes_df.at[idx, key] = value
                    except:
                        pass

        # Select features
        # These should match the features used in dataset_builder.py
        base_features = [
            'day_of_week', 'month', 'is_weekend',
            'season_Spring', 'season_Summer', 'season_Fall', 'season_Winter',
            'temperature', 'precipitation', 'is_holiday',
            'comp_p10', 'comp_p50', 'comp_p90',
            'occupancy_rate', 'lead_time',
            'length_of_stay', 'is_refundable',
            'is_last_minute', 'is_weekend'
        ]

        # Filter to available features
        feature_cols = [f for f in base_features if f in outcomes_df.columns]

        # Fill missing values
        for col in feature_cols:
            if col.startswith('season_'):
                outcomes_df[col] = outcomes_df[col].fillna(0)
            else:
                outcomes_df[col] = outcomes_df[col].fillna(outcomes_df[col].median() if col in outcomes_df.columns else 0)

        logger.info(f"Prepared {len(feature_cols)} features")

        return outcomes_df, feature_cols

    def retrain_property(
        self,
        property_id: str,
        model_type: str = 'conversion',
        compare_with_previous: bool = True
    ) -> dict:
        """
        Retrain model for a property

        Args:
            property_id: Property UUID
            model_type: Model type to train
            compare_with_previous: Whether to compare with previous model

        Returns:
            Dict with retraining results
        """
        logger.info(f"\n{'='*80}")
        logger.info(f"Retraining {model_type} model for property {property_id}")
        logger.info(f"{'='*80}\n")

        # Check if should retrain
        should_retrain, reason = self.should_retrain(property_id)

        if not should_retrain:
            logger.info(f"Skipping retrain: {reason}")
            return {
                'success': False,
                'property_id': property_id,
                'reason': reason,
                'action': 'skipped'
            }

        logger.info(f"Proceeding with retrain: {reason}")

        try:
            # Prepare training data
            df, feature_cols = self.prepare_training_data(property_id)

            # Get previous model metrics if comparing
            previous_metrics = None
            if compare_with_previous:
                try:
                    from models.model_registry import get_registry
                    registry = get_registry()
                    _, metadata = registry.load_model(property_id, model_type, version='latest')
                    if metadata:
                        previous_metrics = metadata.get('metrics', {})
                        logger.info(f"Previous model AUC: {previous_metrics.get('auc', 'N/A'):.4f}")
                except:
                    logger.warning("No previous model found for comparison")

            # Train new model
            params = self.trainer.default_params.copy()
            if model_type == 'conversion':
                params['objective'] = 'binary'
                params['metric'] = 'binary_logloss'
            else:
                params['objective'] = 'regression'
                params['metric'] = 'rmse'

            model, metrics = self.trainer.train(
                df=df,
                feature_cols=feature_cols,
                target_col='target',
                params=params,
                num_boost_round=100,
                early_stopping_rounds=10
            )

            # Compare with previous model
            deploy_new_model = True
            comparison = {}

            if previous_metrics and compare_with_previous:
                if model_type == 'conversion':
                    # Compare AUC
                    prev_auc = previous_metrics.get('auc', 0)
                    new_auc = metrics.get('auc', 0)

                    improvement = new_auc - prev_auc
                    improvement_pct = (improvement / prev_auc * 100) if prev_auc > 0 else 0

                    comparison = {
                        'previous_auc': prev_auc,
                        'new_auc': new_auc,
                        'improvement': improvement,
                        'improvement_pct': improvement_pct
                    }

                    # Only deploy if improved or within 1% (avoid regression)
                    if improvement < -0.01:  # More than 1% worse
                        deploy_new_model = False
                        logger.warning(f"New model AUC ({new_auc:.4f}) worse than previous ({prev_auc:.4f}), not deploying")
                    else:
                        logger.info(f"New model AUC: {new_auc:.4f} (improvement: {improvement_pct:+.2f}%)")

                else:
                    # Compare RMSE for regression
                    prev_rmse = previous_metrics.get('rmse', float('inf'))
                    new_rmse = metrics.get('rmse', float('inf'))

                    improvement = prev_rmse - new_rmse  # Lower is better
                    improvement_pct = (improvement / prev_rmse * 100) if prev_rmse > 0 else 0

                    comparison = {
                        'previous_rmse': prev_rmse,
                        'new_rmse': new_rmse,
                        'improvement': improvement,
                        'improvement_pct': improvement_pct
                    }

                    if improvement < -0.01 * prev_rmse:  # More than 1% worse
                        deploy_new_model = False
                        logger.warning(f"New model RMSE ({new_rmse:.2f}) worse than previous ({prev_rmse:.2f}), not deploying")

            # Save model if deploying
            model_path = None
            if deploy_new_model:
                model_path = self.trainer.save_model(
                    model=model,
                    property_id=property_id,
                    feature_cols=feature_cols,
                    metrics=metrics,
                    model_type=model_type
                )
                logger.info(f"✅ New model deployed: {model_path}")
            else:
                logger.info("⚠️  New model not deployed (performance regression)")

            return {
                'success': True,
                'property_id': property_id,
                'model_type': model_type,
                'action': 'deployed' if deploy_new_model else 'trained_not_deployed',
                'metrics': metrics,
                'comparison': comparison,
                'model_path': model_path,
                'training_samples': len(df),
                'num_features': len(feature_cols)
            }

        except Exception as e:
            logger.error(f"Error retraining model: {str(e)}", exc_info=True)
            return {
                'success': False,
                'property_id': property_id,
                'reason': str(e),
                'action': 'failed'
            }

    def retrain_all_properties(self, model_type: str = 'conversion') -> list:
        """
        Retrain models for all properties with sufficient outcomes

        Args:
            model_type: Model type to train

        Returns:
            List of retraining results
        """
        properties = self.outcomes_storage.list_properties()

        logger.info(f"Found {len(properties)} properties with outcomes")

        results = []

        for property_id in properties:
            result = self.retrain_property(property_id, model_type)
            results.append(result)

        # Summary
        successful = sum(1 for r in results if r.get('success') and r.get('action') == 'deployed')
        skipped = sum(1 for r in results if r.get('action') == 'skipped')
        failed = sum(1 for r in results if r.get('action') == 'failed')
        not_deployed = sum(1 for r in results if r.get('action') == 'trained_not_deployed')

        logger.info(f"\n{'='*80}")
        logger.info("RETRAINING SUMMARY")
        logger.info(f"{'='*80}")
        logger.info(f"Total properties: {len(properties)}")
        logger.info(f"Successfully retrained: {successful}")
        logger.info(f"Trained but not deployed: {not_deployed}")
        logger.info(f"Skipped: {skipped}")
        logger.info(f"Failed: {failed}")
        logger.info(f"{'='*80}\n")

        return results


def main():
    """Main retraining CLI"""
    parser = argparse.ArgumentParser(description='Weekly model retraining workflow')
    parser.add_argument('--all-properties', action='store_true', help='Retrain all properties')
    parser.add_argument('--property-id', help='Retrain specific property')
    parser.add_argument('--model-type', default='conversion', choices=['conversion', 'adr', 'revpar'], help='Model type')
    parser.add_argument('--min-new-outcomes', type=int, default=100, help='Minimum new outcomes to trigger retrain')
    parser.add_argument('--min-total-outcomes', type=int, default=1000, help='Minimum total outcomes required')
    parser.add_argument('--force', action='store_true', help='Force retrain even if criteria not met')

    args = parser.parse_args()

    workflow = WeeklyRetrainingWorkflow(
        min_new_outcomes=args.min_new_outcomes,
        min_total_outcomes=args.min_total_outcomes
    )

    if args.all_properties:
        results = workflow.retrain_all_properties(model_type=args.model_type)

        # Save results summary
        import json
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        results_path = Path('data/retraining') / f"retrain_summary_{timestamp}.json"
        results_path.parent.mkdir(parents=True, exist_ok=True)

        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)

        logger.info(f"Results saved to {results_path}")

    elif args.property_id:
        result = workflow.retrain_property(args.property_id, model_type=args.model_type)

        print("\n" + "="*80)
        print("RETRAINING RESULT")
        print("="*80)
        print(f"Property: {result['property_id']}")
        print(f"Action: {result['action']}")
        print(f"Success: {result['success']}")

        if 'metrics' in result:
            print("\nMetrics:")
            for key, value in result['metrics'].items():
                if isinstance(value, (int, float)) and key != 'feature_importance':
                    print(f"  {key}: {value:.4f}")

        if 'comparison' in result:
            print("\nComparison:")
            for key, value in result['comparison'].items():
                if isinstance(value, (int, float)):
                    print(f"  {key}: {value:.4f}")

        print("="*80)

    else:
        parser.print_help()


if __name__ == '__main__':
    main()
