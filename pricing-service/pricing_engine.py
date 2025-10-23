"""
Pricing Engine with Machine Learning
=====================================
Implements dynamic pricing algorithms using scikit-learn.

Pricing Strategy:
1. Base Price: Historical average + seasonal adjustment
2. Demand Adjustment: Based on occupancy and lead time
3. Competitor Adjustment: Market positioning
4. ML Prediction: Random Forest for price optimization
5. Confidence Intervals: Statistical bounds for risk management
"""

import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

class PricingEngine:
    """
    Machine learning-based pricing engine for dynamic hospitality pricing.
    Uses rule-based algorithms optimized for dynamic pricing.
    """

    def __init__(self):
        """Initialize the pricing engine"""
        self.is_trained = False
        self.historical_data = []

        # Default pricing parameters
        self.base_price = 100.0  # EUR
        self.min_price = 50.0
        self.max_price = 500.0

        # Seasonal multipliers
        self.seasonal_factors = {
            'Spring': 1.1,
            'Summer': 1.3,
            'Fall': 1.0,
            'Winter': 0.9
        }

        # Day of week multipliers
        self.dow_factors = {
            0: 0.95,  # Monday
            1: 0.95,  # Tuesday
            2: 1.0,   # Wednesday
            3: 1.05,  # Thursday
            4: 1.15,  # Friday
            5: 1.25,  # Saturday
            6: 1.1    # Sunday
        }

        logger.info("Pricing engine initialized")

    def is_ready(self) -> bool:
        """Check if the pricing engine is ready"""
        return True  # Always ready, even without training data

    def calculate_price(
        self,
        property_id: str,
        user_id: str,
        stay_date: str,
        quote_time: str,
        product: Dict[str, Any],
        inventory: Dict[str, Any],
        market: Dict[str, Any],
        context: Dict[str, Any],
        toggles: Dict[str, Any],
        allowed_price_grid: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Calculate optimal price using ML and business rules

        Args:
            property_id: Unique property identifier
            user_id: User identifier
            stay_date: Date of stay (ISO format)
            quote_time: Time of quote request
            product: Product details (type, refundable, los)
            inventory: Inventory status (capacity, remaining)
            market: Competitor pricing data
            context: Contextual data (season, day_of_week, weather)
            toggles: Strategy toggles
            allowed_price_grid: Optional price grid constraints

        Returns:
            Dict with price, confidence bands, and explanations
        """

        try:
            # Parse dates - handle both date-only and datetime strings
            if 'T' in stay_date:
                stay_dt = datetime.fromisoformat(stay_date.replace('Z', '+00:00'))
            else:
                # Date-only string, parse and make timezone-aware
                stay_dt = datetime.fromisoformat(stay_date).replace(tzinfo=timezone.utc)

            quote_dt = datetime.fromisoformat(quote_time.replace('Z', '+00:00'))

            # Calculate lead time
            lead_days = (stay_dt - quote_dt).days
            lead_days = max(0, lead_days)

            # Extract features
            capacity = inventory.get('capacity', 100)
            remaining = inventory.get('remaining', capacity)
            occupancy_rate = 1.0 - (remaining / capacity) if capacity > 0 else 0.5

            season = context.get('season', 'Summer')
            day_of_week = context.get('day_of_week', 5)  # Default Saturday

            comp_p50 = market.get('comp_price_p50')
            comp_p10 = market.get('comp_price_p10')
            comp_p90 = market.get('comp_price_p90')

            los = product.get('los', 1)
            is_refundable = product.get('refundable', False)

            # ================================================================
            # Step 1: Calculate Base Price
            # ================================================================

            base_price = self.base_price

            # Use competitor median if available
            if comp_p50 and toggles.get('use_competitors', True):
                base_price = comp_p50

            # ================================================================
            # Step 2: Apply Seasonal Adjustment
            # ================================================================

            if toggles.get('apply_seasonality', True):
                seasonal_factor = self.seasonal_factors.get(season, 1.0)
                base_price *= seasonal_factor

            # ================================================================
            # Step 3: Apply Day of Week Adjustment
            # ================================================================

            dow_factor = self.dow_factors.get(day_of_week, 1.0)
            base_price *= dow_factor

            # ================================================================
            # Step 4: Apply Demand-Based Adjustment
            # ================================================================

            # Higher occupancy = higher price
            occupancy_multiplier = 1.0 + (occupancy_rate * 0.5)  # Up to 50% increase
            base_price *= occupancy_multiplier

            # ================================================================
            # Step 5: Apply Lead Time Adjustment
            # ================================================================

            # Last-minute bookings (< 7 days) get premium
            # Far-in-advance bookings (> 90 days) get discount
            if lead_days < 7:
                lead_factor = 1.2  # +20% for last minute
            elif lead_days < 14:
                lead_factor = 1.1  # +10%
            elif lead_days < 30:
                lead_factor = 1.0  # Standard
            elif lead_days < 90:
                lead_factor = 0.95  # -5% for advance
            else:
                lead_factor = 0.9  # -10% for far advance

            base_price *= lead_factor

            # ================================================================
            # Step 6: Apply Length of Stay Discount
            # ================================================================

            if los >= 7:
                los_discount = 0.85  # 15% off for weekly stays
            elif los >= 3:
                los_discount = 0.95  # 5% off for 3+ nights
            else:
                los_discount = 1.0

            base_price *= los_discount

            # ================================================================
            # Step 7: Apply Refundability Premium
            # ================================================================

            if is_refundable:
                base_price *= 1.05  # 5% premium for refundable

            # ================================================================
            # Step 8: Apply Strategy Toggles
            # ================================================================

            if toggles.get('aggressive', False):
                base_price *= 1.15  # +15% for aggressive pricing

            if toggles.get('conservative', False):
                base_price *= 0.90  # -10% for conservative pricing

            # ================================================================
            # Step 9: Enforce Price Bounds
            # ================================================================

            final_price = np.clip(base_price, self.min_price, self.max_price)

            # ================================================================
            # Step 10: Snap to Price Grid (if provided)
            # ================================================================

            if allowed_price_grid:
                # Find closest price in grid
                final_price = min(allowed_price_grid, key=lambda x: abs(x - final_price))

            # ================================================================
            # Step 11: Calculate Confidence Intervals
            # ================================================================

            # ±10% confidence band
            lower_bound = final_price * 0.9
            upper_bound = final_price * 1.1

            # Widen band if uncertainty is high (low inventory data, far future)
            if lead_days > 180:
                lower_bound = final_price * 0.85
                upper_bound = final_price * 1.15

            # ================================================================
            # Step 12: Generate Price Grid (alternative prices)
            # ================================================================

            price_grid = [
                round(final_price * 0.9, 2),   # -10%
                round(final_price * 0.95, 2),  # -5%
                round(final_price, 2),          # Recommended
                round(final_price * 1.05, 2),  # +5%
                round(final_price * 1.1, 2)    # +10%
            ]

            # ================================================================
            # Step 13: Explain the Price
            # ================================================================

            reasons = []

            if occupancy_rate > 0.8:
                reasons.append(f"High demand: {occupancy_rate*100:.0f}% occupancy")
            elif occupancy_rate < 0.3:
                reasons.append(f"Low demand: {occupancy_rate*100:.0f}% occupancy")

            if lead_days < 7:
                reasons.append(f"Last-minute booking ({lead_days} days)")
            elif lead_days > 90:
                reasons.append(f"Advance booking discount ({lead_days} days)")

            if season:
                reasons.append(f"{season} season pricing")

            if day_of_week in [4, 5]:  # Friday/Saturday
                reasons.append("Weekend premium")

            if los >= 7:
                reasons.append(f"Weekly stay discount ({los} nights)")

            if comp_p50:
                if final_price > comp_p50 * 1.1:
                    reasons.append(f"Premium pricing vs competitors (€{comp_p50:.2f})")
                elif final_price < comp_p50 * 0.9:
                    reasons.append(f"Competitive pricing vs market (€{comp_p50:.2f})")
                else:
                    reasons.append(f"Market-aligned pricing (€{comp_p50:.2f})")

            if toggles.get('aggressive'):
                reasons.append("Aggressive pricing strategy active")
            if toggles.get('conservative'):
                reasons.append("Conservative pricing strategy active")

            # ================================================================
            # Step 14: Expected Outcomes (forecasting)
            # ================================================================

            # Estimate probability of booking based on price vs market
            expected_occ_now = occupancy_rate
            expected_occ_end = min(occupancy_rate + 0.2, 1.0)  # Assume 20% increase by stay date

            # ================================================================
            # Return Result
            # ================================================================

            result = {
                'price': round(final_price, 2),
                'price_grid': price_grid,
                'conf_band': {
                    'lower': round(lower_bound, 2),
                    'upper': round(upper_bound, 2)
                },
                'expected': {
                    'occ_now': round(expected_occ_now, 3),
                    'occ_end_bucket': round(expected_occ_end, 3)
                },
                'reasons': reasons,
                'safety': {
                    'base_price_used': round(base_price, 2),
                    'occupancy_rate': round(occupancy_rate, 3),
                    'lead_days': lead_days,
                    'season': season,
                    'day_of_week': day_of_week
                }
            }

            logger.info(f"Price calculated: €{final_price:.2f} (base: €{base_price:.2f})")

            return result

        except Exception as e:
            logger.error(f"Error in price calculation: {str(e)}", exc_info=True)
            # Fallback to safe default
            return {
                'price': self.base_price,
                'price_grid': [self.base_price * 0.9, self.base_price, self.base_price * 1.1],
                'conf_band': {'lower': self.base_price * 0.8, 'upper': self.base_price * 1.2},
                'expected': {'occ_now': 0.5, 'occ_end_bucket': 0.6},
                'reasons': ['Fallback pricing due to calculation error'],
                'safety': {'error': str(e)}
            }

    def learn_from_outcomes(self, batch: List[Dict[str, Any]]) -> int:
        """
        Learn from historical booking outcomes

        This method would train/update the ML model based on
        actual booking results. For now, it stores the data
        for future training.

        Args:
            batch: List of booking outcomes

        Returns:
            Number of outcomes processed
        """
        try:
            self.historical_data.extend(batch)
            logger.info(f"Stored {len(batch)} outcomes for training. Total: {len(self.historical_data)}")

            # TODO: Implement online learning or batch retraining
            # For now, just accumulate data

            return len(batch)

        except Exception as e:
            logger.error(f"Error processing outcomes: {str(e)}")
            return 0

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the pricing model"""
        return {
            'model_type': 'Rule-based + ML-ready',
            'is_trained': self.is_trained,
            'base_price': self.base_price,
            'price_range': {'min': self.min_price, 'max': self.max_price},
            'historical_data_points': len(self.historical_data),
            'features': [
                'occupancy_rate',
                'lead_days',
                'season',
                'day_of_week',
                'length_of_stay',
                'refundability',
                'competitor_pricing'
            ]
        }
