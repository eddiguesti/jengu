"""
Drift Detection for Pricing Models
===================================
Detects data drift and triggers early retraining when needed.

Features:
- Kolmogorov-Smirnov (KS) test for feature drift
- Population Stability Index (PSI) calculation
- Drift alerting and logging
- Automated retrain triggering

Usage:
    python -m learning.drift_detection --property-id {uuid}
"""

import logging
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class DriftDetector:
    """
    Detects data drift in pricing features
    """

    def __init__(
        self,
        ks_threshold: float = 0.05,
        psi_threshold: float = 0.2,
        min_samples: int = 100
    ):
        """
        Initialize drift detector

        Args:
            ks_threshold: P-value threshold for KS test (default 0.05)
            psi_threshold: PSI threshold for drift (default 0.2)
            min_samples: Minimum samples required for drift detection
        """
        self.ks_threshold = ks_threshold
        self.psi_threshold = psi_threshold
        self.min_samples = min_samples

    def ks_test(
        self,
        reference_data: pd.Series,
        current_data: pd.Series
    ) -> Tuple[float, float, bool]:
        """
        Perform Kolmogorov-Smirnov test for distribution drift

        Args:
            reference_data: Reference distribution (e.g., last month)
            current_data: Current distribution (e.g., this week)

        Returns:
            Tuple of (statistic, p_value, is_drifted)
        """
        # Remove NaN values
        reference_clean = reference_data.dropna()
        current_clean = current_data.dropna()

        if len(reference_clean) < self.min_samples or len(current_clean) < self.min_samples:
            logger.warning(f"Insufficient samples for KS test")
            return 0.0, 1.0, False

        # Perform KS test
        statistic, p_value = stats.ks_2samp(reference_clean, current_clean)

        # Drift detected if p-value < threshold
        is_drifted = p_value < self.ks_threshold

        return statistic, p_value, is_drifted

    def calculate_psi(
        self,
        reference_data: pd.Series,
        current_data: pd.Series,
        buckets: int = 10
    ) -> Tuple[float, bool]:
        """
        Calculate Population Stability Index (PSI)

        PSI measures how much a distribution has changed.
        PSI < 0.1: No significant change
        PSI 0.1-0.2: Small change
        PSI > 0.2: Significant change (drift)

        Args:
            reference_data: Reference distribution
            current_data: Current distribution
            buckets: Number of buckets for discretization

        Returns:
            Tuple of (psi, is_drifted)
        """
        # Remove NaN values
        reference_clean = reference_data.dropna()
        current_clean = current_data.dropna()

        if len(reference_clean) < self.min_samples or len(current_clean) < self.min_samples:
            logger.warning(f"Insufficient samples for PSI calculation")
            return 0.0, False

        # Create buckets based on reference distribution
        try:
            _, bins = pd.qcut(reference_clean, q=buckets, retbins=True, duplicates='drop')
        except:
            # If qcut fails, use equal-width bins
            bins = np.linspace(reference_clean.min(), reference_clean.max(), buckets + 1)

        # Calculate distribution in each bucket
        reference_dist, _ = np.histogram(reference_clean, bins=bins)
        current_dist, _ = np.histogram(current_clean, bins=bins)

        # Convert to proportions
        reference_pct = reference_dist / len(reference_clean)
        current_pct = current_dist / len(current_clean)

        # Avoid division by zero
        reference_pct = np.where(reference_pct == 0, 0.0001, reference_pct)
        current_pct = np.where(current_pct == 0, 0.0001, current_pct)

        # Calculate PSI
        psi = np.sum((current_pct - reference_pct) * np.log(current_pct / reference_pct))

        is_drifted = psi > self.psi_threshold

        return float(psi), is_drifted

    def detect_drift(
        self,
        reference_df: pd.DataFrame,
        current_df: pd.DataFrame,
        features: List[str]
    ) -> Dict:
        """
        Detect drift across multiple features

        Args:
            reference_df: Reference data (e.g., previous month)
            current_df: Current data (e.g., this week)
            features: List of feature names to check

        Returns:
            Dict with drift detection results
        """
        logger.info(f"Detecting drift for {len(features)} features")
        logger.info(f"Reference data: {len(reference_df)} samples")
        logger.info(f"Current data: {len(current_df)} samples")

        drift_results = {}
        drifted_features = []

        for feature in features:
            if feature not in reference_df.columns or feature not in current_df.columns:
                logger.warning(f"Feature {feature} not found in data, skipping")
                continue

            # KS test
            ks_stat, ks_pvalue, ks_drifted = self.ks_test(
                reference_df[feature],
                current_df[feature]
            )

            # PSI
            psi, psi_drifted = self.calculate_psi(
                reference_df[feature],
                current_df[feature]
            )

            # Overall drift (if either test indicates drift)
            is_drifted = ks_drifted or psi_drifted

            if is_drifted:
                drifted_features.append(feature)

            drift_results[feature] = {
                'ks_statistic': float(ks_stat),
                'ks_pvalue': float(ks_pvalue),
                'ks_drifted': ks_drifted,
                'psi': float(psi),
                'psi_drifted': psi_drifted,
                'is_drifted': is_drifted
            }

        # Summary
        total_features = len(features)
        drifted_count = len(drifted_features)
        drift_percentage = (drifted_count / total_features * 100) if total_features > 0 else 0

        # Overall drift decision
        # Trigger retrain if >25% of features drifted
        trigger_retrain = drift_percentage > 25

        summary = {
            'total_features': total_features,
            'drifted_features': drifted_count,
            'drift_percentage': drift_percentage,
            'trigger_retrain': trigger_retrain,
            'drifted_feature_list': drifted_features,
            'timestamp': datetime.now().isoformat()
        }

        logger.info(f"Drift detection complete: {drifted_count}/{total_features} features drifted ({drift_percentage:.1f}%)")

        if trigger_retrain:
            logger.warning(f"⚠️  Significant drift detected! Recommend early retraining.")

        return {
            'summary': summary,
            'feature_results': drift_results
        }

    def monitor_property_drift(
        self,
        outcomes_storage,
        property_id: str,
        features: List[str],
        reference_period_days: int = 30,
        current_period_days: int = 7
    ) -> Dict:
        """
        Monitor drift for a property using stored outcomes

        Args:
            outcomes_storage: OutcomesStorage instance
            property_id: Property UUID
            features: List of features to monitor
            reference_period_days: Days to use for reference distribution
            current_period_days: Days to use for current distribution

        Returns:
            Drift detection results
        """
        logger.info(f"Monitoring drift for property {property_id}")

        # Get reference period data (e.g., 30-60 days ago)
        reference_end = datetime.now() - timedelta(days=reference_period_days)
        reference_start = reference_end - timedelta(days=reference_period_days)

        reference_df = outcomes_storage.get_outcomes(
            property_id=property_id,
            start_date=reference_start.isoformat(),
            end_date=reference_end.isoformat()
        )

        # Get current period data (e.g., last 7 days)
        current_start = datetime.now() - timedelta(days=current_period_days)
        current_df = outcomes_storage.get_outcomes(
            property_id=property_id,
            start_date=current_start.isoformat()
        )

        if reference_df.empty or current_df.empty:
            logger.warning(f"Insufficient data for drift detection")
            return {
                'summary': {
                    'total_features': 0,
                    'drifted_features': 0,
                    'drift_percentage': 0,
                    'trigger_retrain': False,
                    'error': 'Insufficient data'
                },
                'feature_results': {}
            }

        # Detect drift
        results = self.detect_drift(reference_df, current_df, features)

        # Add metadata
        results['metadata'] = {
            'property_id': property_id,
            'reference_period': {
                'start': reference_start.isoformat(),
                'end': reference_end.isoformat(),
                'samples': len(reference_df)
            },
            'current_period': {
                'start': current_start.isoformat(),
                'end': datetime.now().isoformat(),
                'samples': len(current_df)
            }
        }

        return results


def main():
    """CLI for drift detection"""
    import argparse
    import sys
    import os

    # Add parent directory to path
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from learning.outcomes_storage import get_outcomes_storage

    parser = argparse.ArgumentParser(description='Detect data drift for pricing models')
    parser.add_argument('--property-id', required=True, help='Property UUID')
    parser.add_argument('--features', nargs='+', help='Features to check for drift')
    parser.add_argument('--reference-days', type=int, default=30, help='Reference period (days)')
    parser.add_argument('--current-days', type=int, default=7, help='Current period (days)')
    parser.add_argument('--ks-threshold', type=float, default=0.05, help='KS test p-value threshold')
    parser.add_argument('--psi-threshold', type=float, default=0.2, help='PSI threshold')

    args = parser.parse_args()

    # Default features to monitor
    if not args.features:
        args.features = [
            'quoted_price', 'comp_p50', 'occupancy_rate',
            'lead_time', 'temperature', 'day_of_week'
        ]

    detector = DriftDetector(
        ks_threshold=args.ks_threshold,
        psi_threshold=args.psi_threshold
    )

    outcomes_storage = get_outcomes_storage()

    results = detector.monitor_property_drift(
        outcomes_storage=outcomes_storage,
        property_id=args.property_id,
        features=args.features,
        reference_period_days=args.reference_days,
        current_period_days=args.current_days
    )

    # Print results
    print("\n" + "="*80)
    print("DRIFT DETECTION RESULTS")
    print("="*80)
    print(f"\nProperty: {args.property_id}")
    print(f"Reference period: {args.reference_days} days ({results['metadata']['reference_period']['samples']} samples)")
    print(f"Current period: {args.current_days} days ({results['metadata']['current_period']['samples']} samples)")

    summary = results['summary']
    print(f"\nDrifted features: {summary['drifted_features']}/{summary['total_features']} ({summary['drift_percentage']:.1f}%)")
    print(f"Trigger retrain: {summary['trigger_retrain']}")

    if summary.get('drifted_feature_list'):
        print(f"\nDrifted features: {', '.join(summary['drifted_feature_list'])}")

    print("\nFeature details:")
    for feature, result in results['feature_results'].items():
        if result['is_drifted']:
            print(f"  ⚠️  {feature}:")
            print(f"      KS p-value: {result['ks_pvalue']:.4f} (drifted: {result['ks_drifted']})")
            print(f"      PSI: {result['psi']:.4f} (drifted: {result['psi_drifted']})")

    print("="*80)

    # Return exit code based on drift
    return 1 if summary['trigger_retrain'] else 0


if __name__ == '__main__':
    sys.exit(main())
