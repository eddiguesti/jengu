"""
Backtesting Script for Pricing Models
======================================
Validates ML pricing model performance against historical data.

Features:
- Historical replay of pricing decisions
- Comparison of ML vs rule-based pricing
- Revenue lift calculation
- Conversion rate analysis
- Risk assessment
"""

import sys
import os
import argparse
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import json

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.dataset_builder import DatasetBuilder
from models.model_registry import get_registry
from pricing_engine import PricingEngine
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PricingBacktester:
    """
    Backtests pricing models on historical data
    """

    def __init__(self):
        """Initialize backtester"""
        self.pricing_engine = PricingEngine()
        self.model_registry = get_registry()

    def run_backtest(
        self,
        property_id: str,
        user_token: str,
        start_date: str,
        end_date: str,
        model_type: str = 'conversion'
    ) -> Dict:
        """
        Run backtest on historical data

        Args:
            property_id: Property UUID
            user_token: JWT token for authentication
            start_date: Backtest start date (ISO format)
            end_date: Backtest end date (ISO format)
            model_type: Model type to test

        Returns:
            Dictionary of backtest results
        """
        logger.info(f"Running backtest for property {property_id} from {start_date} to {end_date}")

        # Build dataset
        builder = DatasetBuilder()
        df, feature_cols = builder.build_training_dataset(
            property_id=property_id,
            user_token=user_token,
            target_type='conversion',
            start_date=start_date,
            end_date=end_date
        )

        if df.empty:
            logger.error("No data available for backtesting")
            return {'error': 'No data available'}

        logger.info(f"Loaded {len(df)} historical records")

        # Initialize results storage
        ml_results = []
        rule_results = []

        # Load ML model (if available)
        model, metadata = self.model_registry.load_model(property_id, model_type)
        ml_available = model is not None

        if not ml_available:
            logger.warning(f"No ML model found for property {property_id}, comparing rule-based only")

        # Iterate through historical records
        for idx, row in df.iterrows():
            # Skip if missing critical data
            if pd.isna(row.get('date')) or pd.isna(row.get('price')):
                continue

            # Build pricing request from historical row
            stay_date = row['date'].isoformat() if hasattr(row['date'], 'isoformat') else str(row['date'])
            quote_time = (row['date'] - timedelta(days=int(row.get('lead_time', 30)))).isoformat()

            product = {
                'type': 'standard',
                'refundable': bool(row.get('is_refundable', 0)),
                'los': int(row.get('length_of_stay', 1))
            }

            inventory = {
                'capacity': 100,
                'remaining': int((1 - row.get('occupancy_rate', 0.5)) * 100),
                'overbook_limit': 0
            }

            market = {
                'comp_price_p10': row.get('comp_p10'),
                'comp_price_p50': row.get('comp_p50'),
                'comp_price_p90': row.get('comp_p90')
            }

            context = {
                'season': row.get('season', 'Summer'),
                'day_of_week': int(row.get('day_of_week', 5)),
                'weather': {
                    'temperature': row.get('temperature', 20.0),
                    'precipitation': row.get('precipitation', 0.0)
                },
                'isHoliday': int(row.get('is_holiday', 0))
            }

            # ML pricing
            if ml_available:
                ml_toggles = {
                    'aggressive': False,
                    'conservative': False,
                    'use_ml': True,
                    'use_competitors': True,
                    'apply_seasonality': True
                }

                try:
                    ml_price_result = self.pricing_engine.calculate_price(
                        property_id=property_id,
                        user_id='backtest',
                        stay_date=stay_date,
                        quote_time=quote_time,
                        product=product,
                        inventory=inventory,
                        market=market,
                        context=context,
                        toggles=ml_toggles
                    )

                    ml_price = ml_price_result['price']

                except Exception as e:
                    logger.warning(f"ML pricing failed for row {idx}: {str(e)}")
                    ml_price = None

            else:
                ml_price = None

            # Rule-based pricing
            rule_toggles = {
                'aggressive': False,
                'conservative': False,
                'use_ml': False,
                'use_competitors': True,
                'apply_seasonality': True
            }

            try:
                rule_price_result = self.pricing_engine.calculate_price(
                    property_id=property_id,
                    user_id='backtest',
                    stay_date=stay_date,
                    quote_time=quote_time,
                    product=product,
                    inventory=inventory,
                    market=market,
                    context=context,
                    toggles=rule_toggles
                )

                rule_price = rule_price_result['price']

            except Exception as e:
                logger.warning(f"Rule-based pricing failed for row {idx}: {str(e)}")
                rule_price = None

            # Historical actual
            actual_price = row.get('price', 0)
            was_booked = int(row.get('target', 0)) if 'target' in row else 0
            actual_revenue = actual_price * was_booked

            # Estimate conversion for counterfactual prices
            # Simple elasticity: 10% price decrease → 5% conversion increase
            baseline_conversion = was_booked

            if ml_price and actual_price > 0:
                price_diff_pct = (ml_price - actual_price) / actual_price
                conversion_adjustment = -price_diff_pct * 0.5  # 50% elasticity
                ml_conversion = np.clip(baseline_conversion + conversion_adjustment, 0, 1)
                ml_conversion_binary = 1 if np.random.rand() < ml_conversion else 0
                ml_revenue = ml_price * ml_conversion_binary

                ml_results.append({
                    'price': ml_price,
                    'converted': ml_conversion_binary,
                    'revenue': ml_revenue,
                    'actual_price': actual_price,
                    'was_booked': was_booked
                })

            if rule_price and actual_price > 0:
                price_diff_pct = (rule_price - actual_price) / actual_price
                conversion_adjustment = -price_diff_pct * 0.5
                rule_conversion = np.clip(baseline_conversion + conversion_adjustment, 0, 1)
                rule_conversion_binary = 1 if np.random.rand() < rule_conversion else 0
                rule_revenue = rule_price * rule_conversion_binary

                rule_results.append({
                    'price': rule_price,
                    'converted': rule_conversion_binary,
                    'revenue': rule_revenue,
                    'actual_price': actual_price,
                    'was_booked': was_booked
                })

        # Calculate metrics
        logger.info(f"Backtest complete: ML={len(ml_results)} results, Rule={len(rule_results)} results")

        ml_metrics = self._calculate_metrics(ml_results) if ml_results else {}
        rule_metrics = self._calculate_metrics(rule_results) if rule_results else {}

        # Calculate lift
        lift = {}
        if ml_metrics and rule_metrics:
            lift = {
                'revenue_lift_pct': ((ml_metrics['total_revenue'] - rule_metrics['total_revenue']) / rule_metrics['total_revenue'] * 100) if rule_metrics['total_revenue'] > 0 else 0,
                'conversion_lift_pct': ((ml_metrics['conversion_rate'] - rule_metrics['conversion_rate']) / rule_metrics['conversion_rate'] * 100) if rule_metrics['conversion_rate'] > 0 else 0,
                'adr_lift_pct': ((ml_metrics['avg_price'] - rule_metrics['avg_price']) / rule_metrics['avg_price'] * 100) if rule_metrics['avg_price'] > 0 else 0,
            }

        return {
            'property_id': property_id,
            'backtest_period': {
                'start_date': start_date,
                'end_date': end_date,
                'num_records': len(df)
            },
            'ml_metrics': ml_metrics,
            'rule_based_metrics': rule_metrics,
            'lift': lift,
            'model_available': ml_available,
        }

    def _calculate_metrics(self, results: List[Dict]) -> Dict:
        """Calculate metrics from backtest results"""
        if not results:
            return {}

        total_records = len(results)
        total_conversions = sum(r['converted'] for r in results)
        total_revenue = sum(r['revenue'] for r in results)
        avg_price = np.mean([r['price'] for r in results])

        conversion_rate = total_conversions / total_records if total_records > 0 else 0

        # ADR (Average Daily Rate) - average revenue per booking
        booked_results = [r for r in results if r['converted']]
        adr = np.mean([r['revenue'] for r in booked_results]) if booked_results else 0

        # RevPAR (Revenue Per Available Room)
        revpar = total_revenue / total_records if total_records > 0 else 0

        return {
            'total_records': total_records,
            'total_conversions': total_conversions,
            'conversion_rate': conversion_rate,
            'total_revenue': total_revenue,
            'avg_price': avg_price,
            'adr': adr,
            'revpar': revpar,
        }

    def export_results(self, results: Dict, filepath: str):
        """Export backtest results to JSON"""
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2)

        logger.info(f"Backtest results exported to {filepath}")


def main():
    """Main backtesting CLI"""
    parser = argparse.ArgumentParser(description='Backtest pricing models on historical data')
    parser.add_argument('--property-id', required=True, help='Property UUID')
    parser.add_argument('--user-token', required=True, help='JWT token for authentication')
    parser.add_argument('--start-date', required=True, help='Backtest start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', required=True, help='Backtest end date (YYYY-MM-DD)')
    parser.add_argument('--model-type', default='conversion', help='Model type to test')
    parser.add_argument('--output', help='Output filepath for results JSON')

    args = parser.parse_args()

    # Run backtest
    backtester = PricingBacktester()

    results = backtester.run_backtest(
        property_id=args.property_id,
        user_token=args.user_token,
        start_date=args.start_date,
        end_date=args.end_date,
        model_type=args.model_type
    )

    # Print results
    print("\n" + "="*80)
    print("BACKTEST RESULTS")
    print("="*80)
    print(f"\nProperty: {results['property_id']}")
    print(f"Period: {results['backtest_period']['start_date']} to {results['backtest_period']['end_date']}")
    print(f"Records: {results['backtest_period']['num_records']}")
    print(f"ML Model Available: {results['model_available']}")

    if results['ml_metrics']:
        print("\nML METRICS:")
        for key, value in results['ml_metrics'].items():
            if isinstance(value, float):
                print(f"  {key}: {value:.4f}")
            else:
                print(f"  {key}: {value}")

    if results['rule_based_metrics']:
        print("\nRULE-BASED METRICS:")
        for key, value in results['rule_based_metrics'].items():
            if isinstance(value, float):
                print(f"  {key}: {value:.4f}")
            else:
                print(f"  {key}: {value}")

    if results['lift']:
        print("\nLIFT (ML vs Rule-Based):")
        for key, value in results['lift'].items():
            print(f"  {key}: {value:+.2f}%")

    print("\n" + "="*80)

    # Export if requested
    if args.output:
        backtester.export_results(results, args.output)

    # Determine if uplift is significant
    if results.get('lift', {}).get('revenue_lift_pct', 0) > 0:
        print("\n✅ ML model shows positive revenue lift!")
    else:
        print("\n⚠️  ML model does not show positive revenue lift")


if __name__ == '__main__':
    main()
