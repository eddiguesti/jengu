"""
AI Recommendations Engine
Generate actionable pricing insights and recommendations
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional


def generate_recommendations(
    enriched_df: pd.DataFrame,
    correlations_df: Optional[pd.DataFrame] = None,
    current_prices: Optional[pd.Series] = None,
    elasticity: Optional[Dict] = None
) -> List[str]:
    """
    Generate AI-powered pricing recommendations

    Args:
        enriched_df: Enriched dataset with weather, holidays, etc.
        correlations_df: Correlation analysis results
        current_prices: Current pricing data
        elasticity: Price elasticity metrics

    Returns:
        List of recommendation strings
    """
    recommendations = []

    # 1. Weather-based recommendations
    if 'avg_temp' in enriched_df.columns and 'price' in enriched_df.columns:
        temp_price_corr = enriched_df[['avg_temp', 'price']].corr().iloc[0, 1]

        if abs(temp_price_corr) > 0.3:
            if temp_price_corr > 0:
                recommendations.append(
                    f"📈 **Weather Impact**: Temperature is positively correlated with pricing ({temp_price_corr:.2f}). "
                    f"Consider increasing prices by 10-15% during hot weather periods."
                )
            else:
                recommendations.append(
                    f"📉 **Weather Impact**: Temperature is negatively correlated with pricing ({temp_price_corr:.2f}). "
                    f"Consider dynamic pricing based on forecasted weather."
                )

    # 2. Holiday recommendations
    if 'is_holiday' in enriched_df.columns and 'price' in enriched_df.columns:
        holiday_avg = enriched_df[enriched_df['is_holiday'] == 1]['price'].mean()
        non_holiday_avg = enriched_df[enriched_df['is_holiday'] == 0]['price'].mean()

        if not pd.isna(holiday_avg) and not pd.isna(non_holiday_avg):
            holiday_premium = ((holiday_avg - non_holiday_avg) / non_holiday_avg) * 100

            if holiday_premium > 5:
                recommendations.append(
                    f"🎉 **Holiday Pricing**: Your holiday prices are {holiday_premium:.1f}% higher than regular days. "
                    f"This is effective! Maintain or increase slightly."
                )
            elif holiday_premium < 0:
                recommendations.append(
                    f"⚠️ **Missed Opportunity**: Holiday prices are {abs(holiday_premium):.1f}% LOWER than regular days. "
                    f"Consider implementing a 20-30% holiday premium."
                )

    # 3. Weekday vs Weekend
    if 'day_of_week' in enriched_df.columns and 'price' in enriched_df.columns:
        weekend_mask = enriched_df['day_of_week'].isin([5, 6])  # Sat, Sun
        weekend_avg = enriched_df[weekend_mask]['price'].mean()
        weekday_avg = enriched_df[~weekend_mask]['price'].mean()

        if not pd.isna(weekend_avg) and not pd.isna(weekday_avg):
            weekend_diff = ((weekend_avg - weekday_avg) / weekday_avg) * 100

            if abs(weekend_diff) < 5:
                recommendations.append(
                    f"📅 **Weekend Strategy**: Weekend and weekday prices are similar (diff: {weekend_diff:.1f}%). "
                    f"Consider implementing weekend surge pricing (+15-25%)."
                )
            elif weekend_diff > 20:
                recommendations.append(
                    f"💰 **Weekend Pricing**: Strong weekend premium ({weekend_diff:.1f}%). "
                    f"Monitor competitor prices to ensure competitiveness."
                )

    # 4. Seasonal patterns
    if 'month' in enriched_df.columns and 'price' in enriched_df.columns:
        monthly_avg = enriched_df.groupby('month')['price'].mean()
        peak_month = monthly_avg.idxmax()
        low_month = monthly_avg.idxmin()
        peak_price = monthly_avg.max()
        low_price = monthly_avg.min()

        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        recommendations.append(
            f"📊 **Seasonal Pattern**: Peak season is {month_names[peak_month-1]} (avg €{peak_price:.0f}), "
            f"low season is {month_names[low_month-1]} (avg €{low_price:.0f}). "
            f"Variation: {((peak_price - low_price) / low_price * 100):.0f}%"
        )

    # 5. Price elasticity recommendations
    if elasticity and 'elasticity' in elasticity:
        elast_value = elasticity['elasticity']

        if elast_value < -1:
            recommendations.append(
                f"⚡ **Price Sensitivity**: Demand is elastic ({elast_value:.2f}). "
                f"Small price decreases can significantly boost occupancy. "
                f"Consider promotional pricing during low-demand periods."
            )
        elif elast_value > -0.5:
            recommendations.append(
                f"💎 **Price Inelastic**: Demand is relatively insensitive to price ({elast_value:.2f}). "
                f"You have pricing power! Consider 5-10% price increase to maximize revenue."
            )

    # 6. Correlation-based recommendations
    if correlations_df is not None and len(correlations_df) > 0:
        top_feature = correlations_df.iloc[0]

        if 'feature' in top_feature and 'pearson' in top_feature:
            feature_name = top_feature['feature']
            correlation = top_feature['pearson']

            if abs(correlation) > 0.5:
                recommendations.append(
                    f"🔍 **Key Driver**: '{feature_name}' has strong correlation ({correlation:.2f}) with your target. "
                    f"Focus on this metric for pricing decisions."
                )

    # 7. Capacity utilization
    if 'bookings' in enriched_df.columns or 'occupancy' in enriched_df.columns:
        booking_col = 'bookings' if 'bookings' in enriched_df.columns else 'occupancy'
        avg_occupancy = enriched_df[booking_col].mean()

        if avg_occupancy < 60:
            recommendations.append(
                f"📉 **Low Occupancy Alert**: Average occupancy is {avg_occupancy:.1f}%. "
                f"Consider demand-based pricing or promotions to increase bookings."
            )
        elif avg_occupancy > 90:
            recommendations.append(
                f"🚀 **High Demand**: Occupancy is {avg_occupancy:.1f}%. "
                f"You can afford to increase prices by 10-20% to maximize revenue."
            )

    # 8. Data quality recommendations
    if len(enriched_df) < 100:
        recommendations.append(
            f"📊 **Data Collection**: You have {len(enriched_df)} data points. "
            f"Collect at least 6-12 months of data for more accurate predictions."
        )

    return recommendations[:10]  # Return top 10


def generate_daily_alert(
    date: pd.Timestamp,
    predicted_demand: float,
    recommended_price: float,
    current_price: Optional[float] = None
) -> Optional[str]:
    """
    Generate daily pricing alert

    Args:
        date: Date for the alert
        predicted_demand: Predicted demand
        recommended_price: Optimal price recommendation
        current_price: Current price (if set)

    Returns:
        Alert string or None
    """
    if current_price is None:
        return None

    price_diff_pct = ((recommended_price - current_price) / current_price) * 100

    if abs(price_diff_pct) < 5:
        return None  # No significant change needed

    if price_diff_pct > 10:
        return (
            f"⬆️ **{date.strftime('%Y-%m-%d')}**: Increase price by {price_diff_pct:.0f}% "
            f"(€{current_price:.0f} → €{recommended_price:.0f}). "
            f"Predicted demand: {predicted_demand:.0f} bookings."
        )
    elif price_diff_pct < -10:
        return (
            f"⬇️ **{date.strftime('%Y-%m-%d')}**: Decrease price by {abs(price_diff_pct):.0f}% "
            f"(€{current_price:.0f} → €{recommended_price:.0f}) "
            f"to capture {predicted_demand:.0f} bookings."
        )

    return None


def calculate_revenue_opportunity(
    current_revenue: float,
    optimized_revenue: float
) -> Dict[str, float]:
    """
    Calculate potential revenue opportunity

    Returns:
        {
            'current_revenue': float,
            'optimized_revenue': float,
            'opportunity': float,
            'opportunity_pct': float
        }
    """
    opportunity = optimized_revenue - current_revenue
    opportunity_pct = (opportunity / current_revenue * 100) if current_revenue > 0 else 0

    return {
        'current_revenue': round(current_revenue, 2),
        'optimized_revenue': round(optimized_revenue, 2),
        'opportunity': round(opportunity, 2),
        'opportunity_pct': round(opportunity_pct, 2)
    }
