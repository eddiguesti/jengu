"""Auto-generate pricing weights from feature importance"""
import pandas as pd
import numpy as np
from typing import Dict
from pathlib import Path
import json

from ..utils.logging import get_logger

logger = get_logger(__name__)


class PricingWeightGenerator:
    """Generate pricing weights from correlation analysis"""

    # Feature categories and their pricing factor mappings
    FEATURE_CATEGORIES = {
        'weather': ['temp_mean', 'temp_max', 'temp_min', 'weather_quality',
                   'sunshine_hours', 'precipitation', 'is_rainy'],
        'holiday': ['is_holiday', 'holiday_name'],
        'season': ['month', 'quarter', 'season', 'month_sin', 'month_cos'],
        'temporal': ['day_of_week', 'is_weekend', 'dow_sin', 'dow_cos'],
        'price': ['final_price', 'price_lag'],
    }

    def __init__(self):
        self.weights: Dict[str, float] = {}

    def generate_weights(
        self,
        rankings_df: pd.DataFrame,
        normalize: bool = True
    ) -> Dict[str, float]:
        """
        Generate pricing weights from feature rankings

        Args:
            rankings_df: DataFrame from rank_top_features
            normalize: Whether to normalize weights to sum to 1

        Returns:
            Dictionary of category -> weight
        """
        logger.info("generating_pricing_weights", features=len(rankings_df))

        category_scores = {}

        # Map features to categories and aggregate scores
        for _, row in rankings_df.iterrows():
            feature = row['feature']
            score = row['combined_score']

            # Find category
            category = self._categorize_feature(feature)

            if category:
                if category not in category_scores:
                    category_scores[category] = []
                category_scores[category].append(score)

        # Average scores per category
        weights = {}
        for category, scores in category_scores.items():
            weights[category] = np.mean(scores)

        # Normalize if requested
        if normalize and weights:
            total = sum(weights.values())
            weights = {k: v / total for k, v in weights.items()}

        self.weights = weights

        logger.info("weights_generated", weights=weights)

        return weights

    def _categorize_feature(self, feature: str) -> str:
        """Categorize a feature name"""
        feature_lower = feature.lower()

        for category, keywords in self.FEATURE_CATEGORIES.items():
            if any(kw in feature_lower for kw in keywords):
                return category

        return 'other'

    def suggest_pricing_factors(self) -> Dict[str, Dict]:
        """
        Generate detailed pricing factor suggestions

        Returns:
            Dictionary with category -> {weight, impact, recommendation}
        """
        suggestions = {}

        for category, weight in self.weights.items():
            impact = self._interpret_impact(weight)
            recommendation = self._generate_recommendation(category, weight)

            suggestions[category] = {
                'weight': round(weight, 3),
                'impact': impact,
                'recommendation': recommendation
            }

        return suggestions

    def _interpret_impact(self, weight: float) -> str:
        """Interpret weight as impact level"""
        if weight > 0.3:
            return "Very High"
        elif weight > 0.2:
            return "High"
        elif weight > 0.1:
            return "Moderate"
        elif weight > 0.05:
            return "Low"
        else:
            return "Minimal"

    def _generate_recommendation(self, category: str, weight: float) -> str:
        """Generate actionable recommendation"""
        recommendations = {
            'weather': {
                'high': "Implement dynamic weather-based pricing. Increase rates by 10-15% on optimal weather days.",
                'moderate': "Consider weather as a secondary factor. Adjust rates by 5-10% for extreme conditions.",
                'low': "Weather has minimal impact. Focus on other factors."
            },
            'holiday': {
                'high': "Implement aggressive holiday pricing. Increase rates by 20-30% during major holidays.",
                'moderate': "Apply moderate holiday premiums (10-15%) for recognized holidays.",
                'low': "Holiday pricing has limited effect. Standard rates may suffice."
            },
            'season': {
                'high': "Strong seasonal patterns detected. Implement distinct pricing tiers per season.",
                'moderate': "Apply moderate seasonal adjustments (10-20% variance).",
                'low': "Demand is relatively stable across seasons."
            },
            'temporal': {
                'high': "Weekends and day-of-week significantly impact demand. Implement day-specific pricing.",
                'moderate': "Apply weekend premiums (5-10%).",
                'low': "Temporal patterns are weak. Consistent pricing recommended."
            },
            'price': {
                'high': "High price elasticity detected. Small price changes significantly impact demand.",
                'moderate': "Moderate price sensitivity. Test pricing adjustments carefully.",
                'low': "Low price sensitivity. Premium pricing strategy may work."
            }
        }

        category_recs = recommendations.get(category, {})

        if weight > 0.2:
            return category_recs.get('high', "Significant impact detected. Prioritize this factor.")
        elif weight > 0.1:
            return category_recs.get('moderate', "Moderate impact. Consider in pricing strategy.")
        else:
            return category_recs.get('low', "Low impact. Deprioritize this factor.")

    def save_weights(
        self,
        output_path: Path = Path("data/weights/feature_weights.json")
    ) -> Path:
        """
        Save weights to JSON

        Args:
            output_path: Output file path

        Returns:
            Path to saved file
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)

        suggestions = self.suggest_pricing_factors()

        output_data = {
            'weights': self.weights,
            'suggestions': suggestions,
            'generated_at': pd.Timestamp.now().isoformat()
        }

        with open(output_path, 'w') as f:
            json.dump(output_data, f, indent=2)

        logger.info("weights_saved", path=str(output_path))

        return output_path

    @classmethod
    def load_weights(cls, path: Path = Path("data/weights/feature_weights.json")) -> 'PricingWeightGenerator':
        """Load weights from JSON"""
        generator = cls()

        if path.exists():
            with open(path, 'r') as f:
                data = json.load(f)
            generator.weights = data.get('weights', {})
            logger.info("weights_loaded", path=str(path))

        return generator


def generate_pricing_strategy_summary(weights: Dict[str, float]) -> str:
    """
    Generate plain-English summary of pricing strategy

    Args:
        weights: Dictionary of category weights

    Returns:
        Multi-line summary string
    """
    sorted_weights = sorted(weights.items(), key=lambda x: x[1], reverse=True)

    summary_lines = ["**Pricing Strategy Recommendations:**\n"]

    for i, (category, weight) in enumerate(sorted_weights[:5], 1):
        pct = weight * 100
        summary_lines.append(f"{i}. **{category.title()}** ({pct:.1f}% importance)")

        if category == 'weather' and weight > 0.2:
            summary_lines.append("   - Implement weather-responsive pricing")
            summary_lines.append("   - Increase rates 10-15% on sunny days")
        elif category == 'holiday' and weight > 0.2:
            summary_lines.append("   - Apply holiday premiums (20-30%)")
            summary_lines.append("   - Plan capacity around peak holidays")
        elif category == 'season' and weight > 0.2:
            summary_lines.append("   - Create seasonal pricing tiers")
            summary_lines.append("   - Adjust rates quarterly")
        elif category == 'temporal' and weight > 0.15:
            summary_lines.append("   - Implement weekend pricing premiums")
            summary_lines.append("   - Differentiate weekday vs weekend rates")

        summary_lines.append("")

    return "\n".join(summary_lines)
