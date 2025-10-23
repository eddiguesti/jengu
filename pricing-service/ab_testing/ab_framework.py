"""
A/B Testing Framework for Pricing Models
=========================================
Compares ML-based pricing vs rule-based pricing to measure revenue lift.

Features:
- Random assignment to ML vs rule-based cohorts
- Metric tracking (conversion, ADR, RevPAR)
- Statistical significance testing
- Experiment configuration and management
"""

import hashlib
import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


@dataclass
class ExperimentConfig:
    """Configuration for A/B test experiment"""
    experiment_id: str
    name: str
    description: str
    start_date: str
    end_date: str
    ml_traffic_percentage: float  # 0-100
    is_active: bool
    randomization_unit: str  # 'property' or 'user' or 'session'
    metrics: List[str]  # ['conversion', 'adr', 'revpar']


@dataclass
class ExperimentResult:
    """Results from a single pricing decision"""
    experiment_id: str
    timestamp: str
    property_id: str
    user_id: str
    variant: str  # 'ml' or 'rule_based'
    price_quoted: float
    was_booked: bool
    revenue: Optional[float]
    lead_days: int
    los: int
    occupancy_rate: float


class ABTestingFramework:
    """
    A/B testing framework for pricing experiments
    """

    def __init__(self):
        """Initialize A/B testing framework"""
        self.experiments: Dict[str, ExperimentConfig] = {}
        self.results: List[ExperimentResult] = []

        logger.info("A/B testing framework initialized")

    def create_experiment(
        self,
        name: str,
        description: str,
        start_date: str,
        end_date: str,
        ml_traffic_percentage: float = 50.0,
        randomization_unit: str = 'property',
        metrics: Optional[List[str]] = None
    ) -> str:
        """
        Create new A/B test experiment

        Args:
            name: Experiment name
            description: Experiment description
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            ml_traffic_percentage: Percentage of traffic to ML variant (0-100)
            randomization_unit: Unit of randomization
            metrics: List of metrics to track

        Returns:
            Experiment ID
        """
        experiment_id = hashlib.md5(f"{name}_{datetime.now().isoformat()}".encode()).hexdigest()[:8]

        if metrics is None:
            metrics = ['conversion', 'adr', 'revpar']

        experiment = ExperimentConfig(
            experiment_id=experiment_id,
            name=name,
            description=description,
            start_date=start_date,
            end_date=end_date,
            ml_traffic_percentage=ml_traffic_percentage,
            is_active=True,
            randomization_unit=randomization_unit,
            metrics=metrics
        )

        self.experiments[experiment_id] = experiment

        logger.info(f"Created experiment: {experiment_id} ({name})")

        return experiment_id

    def assign_variant(
        self,
        experiment_id: str,
        randomization_key: str
    ) -> str:
        """
        Assign variant (ML or rule-based) to a randomization key

        Uses consistent hashing to ensure same key always gets same variant

        Args:
            experiment_id: Experiment ID
            randomization_key: Key for randomization (property_id, user_id, etc.)

        Returns:
            'ml' or 'rule_based'
        """
        if experiment_id not in self.experiments:
            logger.warning(f"Experiment {experiment_id} not found, defaulting to rule_based")
            return 'rule_based'

        experiment = self.experiments[experiment_id]

        if not experiment.is_active:
            logger.info(f"Experiment {experiment_id} is inactive, defaulting to rule_based")
            return 'rule_based'

        # Check if experiment is within date range
        now = datetime.now()
        start = datetime.fromisoformat(experiment.start_date)
        end = datetime.fromisoformat(experiment.end_date)

        if not (start <= now <= end):
            logger.info(f"Experiment {experiment_id} is outside date range")
            return 'rule_based'

        # Consistent hash assignment
        hash_input = f"{experiment_id}:{randomization_key}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        bucket = (hash_value % 100) + 1  # 1-100

        # Assign to ML if bucket <= ml_traffic_percentage
        if bucket <= experiment.ml_traffic_percentage:
            return 'ml'
        else:
            return 'rule_based'

    def should_use_ml(
        self,
        property_id: str,
        user_id: str,
        experiment_id: Optional[str] = None
    ) -> bool:
        """
        Determine if ML pricing should be used based on A/B test assignment

        Args:
            property_id: Property UUID
            user_id: User UUID
            experiment_id: Optional specific experiment ID

        Returns:
            True if ML should be used, False for rule-based
        """
        # If no experiment specified, check if any active experiments exist
        if experiment_id is None:
            # Find first active experiment
            for exp_id, exp in self.experiments.items():
                if exp.is_active:
                    experiment_id = exp_id
                    break

            if experiment_id is None:
                # No active experiments, default to rule-based
                return False

        # Determine randomization key
        experiment = self.experiments.get(experiment_id)
        if experiment is None:
            return False

        if experiment.randomization_unit == 'property':
            randomization_key = property_id
        elif experiment.randomization_unit == 'user':
            randomization_key = user_id
        else:  # session
            randomization_key = f"{user_id}_{datetime.now().date().isoformat()}"

        # Assign variant
        variant = self.assign_variant(experiment_id, randomization_key)

        return variant == 'ml'

    def log_result(
        self,
        experiment_id: str,
        property_id: str,
        user_id: str,
        variant: str,
        price_quoted: float,
        was_booked: bool,
        revenue: Optional[float] = None,
        lead_days: int = 0,
        los: int = 1,
        occupancy_rate: float = 0.5
    ):
        """
        Log result from a pricing decision

        Args:
            experiment_id: Experiment ID
            property_id: Property UUID
            user_id: User UUID
            variant: 'ml' or 'rule_based'
            price_quoted: Price shown to user
            was_booked: Whether booking was completed
            revenue: Actual revenue if booked
            lead_days: Days until stay
            los: Length of stay
            occupancy_rate: Occupancy at time of quote
        """
        result = ExperimentResult(
            experiment_id=experiment_id,
            timestamp=datetime.now().isoformat(),
            property_id=property_id,
            user_id=user_id,
            variant=variant,
            price_quoted=price_quoted,
            was_booked=was_booked,
            revenue=revenue if was_booked else None,
            lead_days=lead_days,
            los=los,
            occupancy_rate=occupancy_rate
        )

        self.results.append(result)

        logger.debug(f"Logged result: {variant}, price={price_quoted}, booked={was_booked}")

    def calculate_metrics(
        self,
        experiment_id: str,
        variant: Optional[str] = None,
        min_date: Optional[str] = None,
        max_date: Optional[str] = None
    ) -> Dict:
        """
        Calculate metrics for an experiment

        Args:
            experiment_id: Experiment ID
            variant: Optional variant to filter ('ml' or 'rule_based')
            min_date: Optional minimum date filter
            max_date: Optional maximum date filter

        Returns:
            Dictionary of calculated metrics
        """
        # Filter results
        filtered_results = [
            r for r in self.results
            if r.experiment_id == experiment_id
            and (variant is None or r.variant == variant)
            and (min_date is None or r.timestamp >= min_date)
            and (max_date is None or r.timestamp <= max_date)
        ]

        if not filtered_results:
            return {
                'count': 0,
                'conversion_rate': 0.0,
                'adr': 0.0,
                'revpar': 0.0,
            }

        # Calculate metrics
        total_quotes = len(filtered_results)
        total_bookings = sum(1 for r in filtered_results if r.was_booked)
        conversion_rate = total_bookings / total_quotes if total_quotes > 0 else 0.0

        # ADR (Average Daily Rate) - average revenue per booking
        booked_results = [r for r in filtered_results if r.was_booked and r.revenue is not None]
        adr = np.mean([r.revenue for r in booked_results]) if booked_results else 0.0

        # RevPAR (Revenue Per Available Room) - total revenue / total opportunities
        total_revenue = sum(r.revenue for r in booked_results)
        revpar = total_revenue / total_quotes if total_quotes > 0 else 0.0

        # Average price quoted
        avg_price = np.mean([r.price_quoted for r in filtered_results])

        return {
            'count': total_quotes,
            'bookings': total_bookings,
            'conversion_rate': conversion_rate,
            'adr': adr,
            'revpar': revpar,
            'avg_price': avg_price,
            'total_revenue': total_revenue,
        }

    def compare_variants(
        self,
        experiment_id: str,
        min_date: Optional[str] = None,
        max_date: Optional[str] = None
    ) -> Dict:
        """
        Compare ML vs rule-based variants with statistical significance

        Args:
            experiment_id: Experiment ID
            min_date: Optional minimum date filter
            max_date: Optional maximum date filter

        Returns:
            Comparison results with statistical tests
        """
        # Calculate metrics for each variant
        ml_metrics = self.calculate_metrics(experiment_id, variant='ml', min_date=min_date, max_date=max_date)
        rule_metrics = self.calculate_metrics(experiment_id, variant='rule_based', min_date=min_date, max_date=max_date)

        # Statistical significance tests
        ml_results = [r for r in self.results if r.experiment_id == experiment_id and r.variant == 'ml']
        rule_results = [r for r in self.results if r.experiment_id == experiment_id and r.variant == 'rule_based']

        # Conversion rate significance (proportion test)
        ml_conversions = [1 if r.was_booked else 0 for r in ml_results]
        rule_conversions = [1 if r.was_booked else 0 for r in rule_results]

        conversion_pvalue = None
        if len(ml_conversions) > 0 and len(rule_conversions) > 0:
            # Two-sample proportion test (z-test)
            conversion_pvalue = stats.ttest_ind(ml_conversions, rule_conversions, equal_var=False).pvalue

        # RevPAR significance (t-test)
        ml_revpars = [r.revenue / r.los if r.was_booked and r.revenue else 0 for r in ml_results]
        rule_revpars = [r.revenue / r.los if r.was_booked and r.revenue else 0 for r in rule_results]

        revpar_pvalue = None
        if len(ml_revpars) > 0 and len(rule_revpars) > 0:
            revpar_pvalue = stats.ttest_ind(ml_revpars, rule_revpars, equal_var=False).pvalue

        # Calculate lift
        conversion_lift = ((ml_metrics['conversion_rate'] - rule_metrics['conversion_rate']) / rule_metrics['conversion_rate'] * 100) if rule_metrics['conversion_rate'] > 0 else 0
        revpar_lift = ((ml_metrics['revpar'] - rule_metrics['revpar']) / rule_metrics['revpar'] * 100) if rule_metrics['revpar'] > 0 else 0
        adr_lift = ((ml_metrics['adr'] - rule_metrics['adr']) / rule_metrics['adr'] * 100) if rule_metrics['adr'] > 0 else 0

        return {
            'experiment_id': experiment_id,
            'ml': ml_metrics,
            'rule_based': rule_metrics,
            'lift': {
                'conversion_rate': conversion_lift,
                'adr': adr_lift,
                'revpar': revpar_lift,
            },
            'significance': {
                'conversion_pvalue': conversion_pvalue,
                'revpar_pvalue': revpar_pvalue,
                'is_significant': conversion_pvalue < 0.05 if conversion_pvalue else False,
            }
        }

    def get_experiment(self, experiment_id: str) -> Optional[ExperimentConfig]:
        """Get experiment configuration"""
        return self.experiments.get(experiment_id)

    def list_experiments(self, active_only: bool = False) -> List[ExperimentConfig]:
        """List all experiments"""
        experiments = list(self.experiments.values())
        if active_only:
            experiments = [e for e in experiments if e.is_active]
        return experiments

    def stop_experiment(self, experiment_id: str):
        """Stop an experiment"""
        if experiment_id in self.experiments:
            self.experiments[experiment_id].is_active = False
            logger.info(f"Stopped experiment: {experiment_id}")

    def export_results(self, experiment_id: str, filepath: str):
        """Export experiment results to JSON"""
        filtered_results = [
            asdict(r) for r in self.results
            if r.experiment_id == experiment_id
        ]

        with open(filepath, 'w') as f:
            json.dump(filtered_results, f, indent=2)

        logger.info(f"Exported {len(filtered_results)} results to {filepath}")


# Global instance
_ab_framework: Optional[ABTestingFramework] = None


def get_ab_framework() -> ABTestingFramework:
    """Get global A/B testing framework instance"""
    global _ab_framework
    if _ab_framework is None:
        _ab_framework = ABTestingFramework()
    return _ab_framework
