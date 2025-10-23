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

import os
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
import logging
import requests
from competitor_data_client import CompetitorDataClient
from models.model_registry import get_registry

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

        # Initialize competitor data client
        self.competitor_client = CompetitorDataClient()

        # Initialize model registry
        self.model_registry = get_registry()

        # Backend API URL for neighborhood index
        self.backend_api_url = os.getenv('BACKEND_API_URL', 'http://localhost:3001')

        logger.info("Pricing engine initialized")

    def is_ready(self) -> bool:
        """Check if the pricing engine is ready"""
        return True  # Always ready, even without training data

    def get_neighborhood_index(self, property_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch latest neighborhood competitive index from backend
        Returns None if not available or on error
        """
        try:
            response = requests.get(
                f"{self.backend_api_url}/api/neighborhood-index/{property_id}/latest",
                timeout=2
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('index'):
                    return data['index']
        except Exception as e:
            logger.debug(f"Could not fetch neighborhood index: {e}")
        return None

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

            # Get competitor pricing - use provided data or fetch from database
            comp_p50 = market.get('comp_price_p50')
            comp_p10 = market.get('comp_price_p10')
            comp_p90 = market.get('comp_price_p90')
            comp_source = 'provided'
            comp_count = None

            # If competitor data not provided and competitor pricing is enabled, fetch from database
            if not comp_p50 and toggles.get('use_competitors', True):
                try:
                    competitor_data = self.competitor_client.get_competitor_prices(
                        property_id=property_id,
                        stay_date=stay_date
                    )
                    if competitor_data:
                        comp_p10 = competitor_data.get('comp_price_p10')
                        comp_p50 = competitor_data.get('comp_price_p50')
                        comp_p90 = competitor_data.get('comp_price_p90')
                        comp_count = competitor_data.get('competitor_count', 0)
                        comp_source = competitor_data.get('source', 'database')
                        logger.info(f"Fetched competitor data from {comp_source}: P50=€{comp_p50:.2f}, count={comp_count}")
                except Exception as e:
                    logger.warning(f"Failed to fetch competitor data: {str(e)}")
                    # Continue without competitor data

            los = product.get('los', 1)
            is_refundable = product.get('refundable', False)

            # ================================================================
            # ML Prediction Path (if enabled and model available)
            # ================================================================

            if toggles.get('use_ml', True):
                try:
                    # Build feature dictionary for ML model
                    features = self._build_ml_features(
                        stay_dt=stay_dt,
                        lead_days=lead_days,
                        occupancy_rate=occupancy_rate,
                        season=season,
                        day_of_week=day_of_week,
                        comp_p10=comp_p10,
                        comp_p50=comp_p50,
                        comp_p90=comp_p90,
                        los=los,
                        is_refundable=is_refundable,
                        context=context
                    )

                    # Try to get ML prediction for conversion probability
                    ml_conversion_prob = self.model_registry.predict(
                        property_id=property_id,
                        features=features,
                        model_type='conversion',
                        version='latest'
                    )

                    if ml_conversion_prob is not None:
                        # Use ML model to calculate elasticity-based price
                        logger.info(f"ML conversion probability: {ml_conversion_prob:.4f}")

                        # Calculate price using elasticity model
                        ml_price = self._calculate_ml_price(
                            conversion_prob=ml_conversion_prob,
                            comp_p50=comp_p50,
                            occupancy_rate=occupancy_rate,
                            lead_days=lead_days,
                            season=season,
                            day_of_week=day_of_week,
                            los=los
                        )

                        # Apply guardrails (min/max constraints)
                        ml_price = np.clip(ml_price, self.min_price, self.max_price)

                        # Snap to price grid if provided
                        if allowed_price_grid:
                            ml_price = min(allowed_price_grid, key=lambda x: abs(x - ml_price))

                        # Generate ML-based reasoning
                        ml_reasons = [
                            f"ML elasticity model (conversion prob: {ml_conversion_prob:.1%})",
                            f"Predicted demand: {'High' if ml_conversion_prob > 0.7 else 'Medium' if ml_conversion_prob > 0.4 else 'Low'}"
                        ]

                        # Add competitor context if available
                        if comp_p50:
                            price_diff_pct = (ml_price - comp_p50) / comp_p50 * 100
                            if ml_price > comp_p50 * 1.1:
                                ml_reasons.append(f"Premium positioning vs market (€{comp_p50:.2f}, +{price_diff_pct:.0f}%)")
                            elif ml_price < comp_p50 * 0.9:
                                ml_reasons.append(f"Competitive positioning vs market (€{comp_p50:.2f}, {price_diff_pct:.0f}%)")
                            else:
                                ml_reasons.append(f"Market-aligned (€{comp_p50:.2f}, {price_diff_pct:+.0f}%)")

                        # Return ML-based result
                        return {
                            'price': round(ml_price, 2),
                            'price_grid': [
                                round(ml_price * 0.9, 2),
                                round(ml_price * 0.95, 2),
                                round(ml_price, 2),
                                round(ml_price * 1.05, 2),
                                round(ml_price * 1.1, 2)
                            ],
                            'conf_band': {
                                'lower': round(ml_price * 0.9, 2),
                                'upper': round(ml_price * 1.1, 2)
                            },
                            'expected': {
                                'occ_now': round(occupancy_rate, 3),
                                'occ_end_bucket': round(min(occupancy_rate + ml_conversion_prob * 0.3, 1.0), 3)
                            },
                            'reasons': ml_reasons,
                            'safety': {
                                'pricing_method': 'ml_elasticity',
                                'ml_conversion_prob': round(ml_conversion_prob, 4),
                                'occupancy_rate': round(occupancy_rate, 3),
                                'lead_days': lead_days,
                                'season': season,
                                'day_of_week': day_of_week,
                                'competitor_data': {
                                    'p10': comp_p10,
                                    'p50': comp_p50,
                                    'p90': comp_p90,
                                    'count': comp_count,
                                    'source': comp_source
                                } if comp_p50 else None
                            }
                        }

                except Exception as e:
                    logger.warning(f"ML prediction failed, falling back to rule-based: {str(e)}")
                    # Fall through to rule-based pricing

            # ================================================================
            # Step 1: Calculate Base Price (Rule-Based)
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

            # Fetch neighborhood competitive index if available
            neighborhood_index = self.get_neighborhood_index(property_id)
            if neighborhood_index:
                overall_index = neighborhood_index.get('overallIndex', 0)
                market_position = neighborhood_index.get('marketPosition', '')
                price_comp_score = neighborhood_index.get('priceCompetitivenessScore', 0)

                # Add competitive positioning context
                if overall_index >= 70:
                    reasons.append(f"Strong competitive position (Index: {overall_index:.0f}/100, {market_position})")
                elif overall_index >= 50:
                    reasons.append(f"Moderate competitive position (Index: {overall_index:.0f}/100, {market_position})")
                else:
                    reasons.append(f"Improving competitive position (Index: {overall_index:.0f}/100, {market_position})")

                # Add price competitiveness insight
                if price_comp_score >= 70:
                    reasons.append(f"Highly competitive pricing ({price_comp_score:.0f}/100 price score)")
                elif price_comp_score <= 30:
                    reasons.append(f"Premium pricing strategy ({price_comp_score:.0f}/100 price score)")

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
                price_diff = final_price - comp_p50
                price_diff_pct = (price_diff / comp_p50) * 100

                if final_price > comp_p50 * 1.1:
                    positioning = "premium"
                    reasons.append(f"Premium positioning: €{final_price:.2f} vs market median €{comp_p50:.2f} (+{price_diff_pct:.0f}%)")
                elif final_price < comp_p50 * 0.9:
                    positioning = "budget"
                    reasons.append(f"Competitive positioning: €{final_price:.2f} vs market median €{comp_p50:.2f} ({price_diff_pct:.0f}%)")
                else:
                    positioning = "market"
                    reasons.append(f"Market-aligned: €{final_price:.2f} vs market median €{comp_p50:.2f} ({price_diff_pct:+.0f}%)")

                # Add market range context if available
                if comp_p10 and comp_p90:
                    reasons.append(f"Market range: €{comp_p10:.2f} (low) to €{comp_p90:.2f} (high)")
                    if comp_count:
                        reasons.append(f"Based on {comp_count} competitor properties ({comp_source})")

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
                    'day_of_week': day_of_week,
                    'competitor_data': {
                        'p10': comp_p10,
                        'p50': comp_p50,
                        'p90': comp_p90,
                        'count': comp_count,
                        'source': comp_source
                    } if comp_p50 else None
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

    def _build_ml_features(
        self,
        stay_dt: datetime,
        lead_days: int,
        occupancy_rate: float,
        season: str,
        day_of_week: int,
        comp_p10: Optional[float],
        comp_p50: Optional[float],
        comp_p90: Optional[float],
        los: int,
        is_refundable: bool,
        context: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Build feature dictionary for ML model prediction

        Returns:
            Dictionary of feature_name -> value
        """
        features = {}

        # Temporal features
        features['day_of_week'] = float(day_of_week)
        features['day_of_month'] = float(stay_dt.day)
        features['week_of_year'] = float(stay_dt.isocalendar()[1])
        features['month'] = float(stay_dt.month)
        features['quarter'] = float((stay_dt.month - 1) // 3 + 1)
        features['is_weekend'] = float(day_of_week in [5, 6])
        features['is_month_start'] = float(stay_dt.day <= 7)
        features['is_month_end'] = float(stay_dt.day >= 24)

        # Season encoding (one-hot)
        for s in ['Spring', 'Summer', 'Fall', 'Winter']:
            features[f'season_{s}'] = float(season == s)

        # Weather features (if available)
        features['temperature'] = float(context.get('weather', {}).get('temperature', 20.0))
        features['precipitation'] = float(context.get('weather', {}).get('precipitation', 0.0))
        features['rain_on_weekend'] = float(features['is_weekend'] * (features['precipitation'] > 0))

        # Holiday features
        features['is_holiday'] = float(context.get('isHoliday', 0))

        # Competitor features
        features['comp_p10'] = float(comp_p10 if comp_p10 else 0)
        features['comp_p50'] = float(comp_p50 if comp_p50 else 0)
        features['comp_p90'] = float(comp_p90 if comp_p90 else 0)
        features['comp_count'] = float(context.get('competitor_count', 0))

        if comp_p50 and comp_p50 > 0:
            features['comp_range'] = float(comp_p90 - comp_p10 if comp_p10 and comp_p90 else 0)
            features['comp_range_pct'] = float((comp_p90 - comp_p10) / comp_p50 * 100 if comp_p10 and comp_p90 else 0)
        else:
            features['comp_range'] = 0.0
            features['comp_range_pct'] = 0.0

        # Occupancy
        features['occupancy_rate'] = float(occupancy_rate)

        # Product features
        features['length_of_stay'] = float(los)
        features['is_refundable'] = float(is_refundable)
        features['is_short_stay'] = float(los <= 2)
        features['is_medium_stay'] = float(3 <= los <= 6)
        features['is_long_stay'] = float(los >= 7)

        # Lead time features
        features['lead_time'] = float(lead_days)
        features['is_last_minute'] = float(lead_days <= 7)
        features['is_short_lead'] = float(7 < lead_days <= 30)
        features['is_medium_lead'] = float(30 < lead_days <= 90)
        features['is_long_lead'] = float(lead_days > 90)

        # Interaction features
        features['weekend_summer'] = float(features['is_weekend'] * features.get('season_Summer', 0))
        features['holiday_weekend'] = float(features['is_holiday'] * features['is_weekend'])
        features['occupancy_weekend'] = float(occupancy_rate * features['is_weekend'])
        features['last_minute_weekend'] = float(features['is_last_minute'] * features['is_weekend'])

        return features

    def _calculate_ml_price(
        self,
        conversion_prob: float,
        comp_p50: Optional[float],
        occupancy_rate: float,
        lead_days: int,
        season: str,
        day_of_week: int,
        los: int
    ) -> float:
        """
        Calculate price based on ML conversion probability

        Uses demand elasticity to optimize for revenue (price × conversion)

        Args:
            conversion_prob: ML-predicted conversion probability
            comp_p50: Market median price
            occupancy_rate: Current occupancy
            lead_days: Days until stay
            season: Season name
            day_of_week: Day of week (0-6)
            los: Length of stay

        Returns:
            Optimal price
        """
        # Start with market baseline or internal base
        if comp_p50 and comp_p50 > 0:
            base_price = comp_p50
        else:
            base_price = self.base_price

        # Elasticity-based adjustment
        # High conversion prob → can charge more (inelastic demand)
        # Low conversion prob → charge less (elastic demand)

        if conversion_prob > 0.7:
            # High demand - premium pricing
            elasticity_factor = 1.2
        elif conversion_prob > 0.5:
            # Medium demand - slight premium
            elasticity_factor = 1.1
        elif conversion_prob > 0.3:
            # Medium-low demand - market pricing
            elasticity_factor = 1.0
        else:
            # Low demand - discount to stimulate
            elasticity_factor = 0.9

        price = base_price * elasticity_factor

        # Additional adjustments based on context
        # Occupancy pressure
        if occupancy_rate > 0.8:
            price *= 1.1  # High occupancy → premium
        elif occupancy_rate < 0.3:
            price *= 0.95  # Low occupancy → discount

        # Lead time
        if lead_days < 7:
            price *= 1.15  # Last minute premium
        elif lead_days > 90:
            price *= 0.95  # Advance booking discount

        # Season
        seasonal_factor = self.seasonal_factors.get(season, 1.0)
        price *= seasonal_factor

        # Day of week
        dow_factor = self.dow_factors.get(day_of_week, 1.0)
        price *= dow_factor

        # LOS discount
        if los >= 7:
            price *= 0.85
        elif los >= 3:
            price *= 0.95

        return price

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
