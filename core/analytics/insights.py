"""Generate actionable insights from booking data"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class Insight:
    """Single business insight"""
    title: str
    description: str
    category: str  # 'pricing', 'demand', 'seasonality', 'opportunity', 'risk'
    importance: str  # 'high', 'medium', 'low'
    metric_value: Optional[float] = None
    metric_name: Optional[str] = None
    recommendation: Optional[str] = None
    confidence: Optional[float] = None

    def to_dict(self) -> Dict:
        return {
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'importance': self.importance,
            'metric_value': self.metric_value,
            'metric_name': self.metric_name,
            'recommendation': self.recommendation,
            'confidence': self.confidence
        }


class InsightsEngine:
    """
    Generate actionable insights from booking and pricing data
    """

    def __init__(self):
        self.insights: List[Insight] = []

    def analyze_revenue_trends(
        self,
        df: pd.DataFrame,
        date_col: str = 'booking_date',
        revenue_col: str = 'final_price'
    ) -> List[Insight]:
        """Analyze revenue trends and patterns"""
        insights = []

        df[date_col] = pd.to_datetime(df[date_col])
        df = df.sort_values(date_col)

        # Calculate daily revenue
        daily_revenue = df.groupby(date_col)[revenue_col].sum()

        # Trend analysis
        recent_30d = daily_revenue.tail(30).mean()
        previous_30d = daily_revenue.iloc[-60:-30].mean() if len(daily_revenue) >= 60 else recent_30d

        if recent_30d > previous_30d * 1.1:
            insights.append(Insight(
                title="Revenue Growth Detected",
                description=f"Revenue has increased by {((recent_30d - previous_30d) / previous_30d * 100):.1f}% in the last 30 days",
                category="pricing",
                importance="high",
                metric_value=recent_30d,
                metric_name="avg_daily_revenue",
                recommendation="Consider maintaining current pricing strategy",
                confidence=0.85
            ))
        elif recent_30d < previous_30d * 0.9:
            insights.append(Insight(
                title="Revenue Decline Alert",
                description=f"Revenue has decreased by {((previous_30d - recent_30d) / previous_30d * 100):.1f}% in the last 30 days",
                category="risk",
                importance="high",
                metric_value=recent_30d,
                metric_name="avg_daily_revenue",
                recommendation="Review pricing strategy and market conditions",
                confidence=0.85
            ))

        return insights

    def analyze_demand_patterns(
        self,
        df: pd.DataFrame,
        date_col: str = 'booking_date'
    ) -> List[Insight]:
        """Analyze demand patterns and booking behavior"""
        insights = []

        df[date_col] = pd.to_datetime(df[date_col])

        # Day of week analysis
        df['day_of_week'] = df[date_col].dt.dayofweek
        demand_by_dow = df.groupby('day_of_week').size()

        peak_day = demand_by_dow.idxmax()
        peak_demand = demand_by_dow.max()
        avg_demand = demand_by_dow.mean()

        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        if peak_demand > avg_demand * 1.3:
            insights.append(Insight(
                title=f"{day_names[peak_day]} Peak Demand",
                description=f"{day_names[peak_day]} shows {((peak_demand - avg_demand) / avg_demand * 100):.0f}% higher demand than average",
                category="demand",
                importance="medium",
                metric_value=peak_demand,
                metric_name="bookings",
                recommendation=f"Consider premium pricing on {day_names[peak_day]}s",
                confidence=0.90
            ))

        # Booking window analysis
        if 'days_until_checkin' in df.columns:
            avg_lead_time = df['days_until_checkin'].mean()

            if avg_lead_time < 7:
                insights.append(Insight(
                    title="Short Booking Windows",
                    description=f"Average booking lead time is only {avg_lead_time:.1f} days",
                    category="demand",
                    importance="high",
                    metric_value=avg_lead_time,
                    metric_name="avg_lead_time_days",
                    recommendation="Focus on last-minute pricing strategies and promotions",
                    confidence=0.80
                ))
            elif avg_lead_time > 60:
                insights.append(Insight(
                    title="Long Planning Horizon",
                    description=f"Customers book {avg_lead_time:.0f} days in advance on average",
                    category="demand",
                    importance="medium",
                    metric_value=avg_lead_time,
                    metric_name="avg_lead_time_days",
                    recommendation="Implement early-bird discounts to capture advance bookings",
                    confidence=0.80
                ))

        return insights

    def analyze_price_elasticity(
        self,
        df: pd.DataFrame,
        price_col: str = 'final_price',
        demand_col: str = 'daily_demand'
    ) -> List[Insight]:
        """Analyze price sensitivity and elasticity"""
        insights = []

        if demand_col not in df.columns:
            # Calculate demand if not present
            df['daily_demand'] = 1  # Simple count per row

        # Price quartiles
        price_quartiles = df[price_col].quantile([0.25, 0.5, 0.75])

        low_price_demand = df[df[price_col] <= price_quartiles[0.25]][demand_col].mean()
        high_price_demand = df[df[price_col] >= price_quartiles[0.75]][demand_col].mean()

        if low_price_demand > high_price_demand * 1.5:
            insights.append(Insight(
                title="High Price Sensitivity",
                description=f"Demand drops {((low_price_demand - high_price_demand) / low_price_demand * 100):.0f}% at premium price points",
                category="pricing",
                importance="high",
                metric_value=high_price_demand / low_price_demand,
                metric_name="demand_ratio",
                recommendation="Consider competitive pricing or value-add services at higher price points",
                confidence=0.75
            ))
        elif low_price_demand < high_price_demand * 1.2:
            insights.append(Insight(
                title="Low Price Sensitivity",
                description="Demand remains stable across price ranges",
                category="opportunity",
                importance="high",
                metric_value=high_price_demand / low_price_demand,
                metric_name="demand_ratio",
                recommendation="Opportunity for premium pricing and revenue optimization",
                confidence=0.75
            ))

        return insights

    def analyze_seasonality(
        self,
        df: pd.DataFrame,
        date_col: str = 'booking_date',
        value_col: str = 'final_price'
    ) -> List[Insight]:
        """Analyze seasonal patterns"""
        insights = []

        df[date_col] = pd.to_datetime(df[date_col])
        df['month'] = df[date_col].dt.month

        monthly_avg = df.groupby('month')[value_col].mean()
        overall_avg = monthly_avg.mean()

        peak_months = monthly_avg[monthly_avg > overall_avg * 1.2].index.tolist()
        low_months = monthly_avg[monthly_avg < overall_avg * 0.8].index.tolist()

        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        if peak_months:
            peak_month_names = [month_names[m-1] for m in peak_months]
            insights.append(Insight(
                title="Peak Season Identified",
                description=f"Strong demand in {', '.join(peak_month_names)}",
                category="seasonality",
                importance="high",
                metric_value=monthly_avg[peak_months].mean(),
                metric_name="avg_revenue",
                recommendation=f"Maximize revenue during {', '.join(peak_month_names)} with dynamic pricing",
                confidence=0.85
            ))

        if low_months:
            low_month_names = [month_names[m-1] for m in low_months]
            insights.append(Insight(
                title="Off-Season Opportunity",
                description=f"Lower demand in {', '.join(low_month_names)}",
                category="opportunity",
                importance="medium",
                metric_value=monthly_avg[low_months].mean(),
                metric_name="avg_revenue",
                recommendation=f"Consider promotions or special packages for {', '.join(low_month_names)}",
                confidence=0.80
            ))

        return insights

    def analyze_destination_performance(
        self,
        df: pd.DataFrame,
        destination_col: str = 'destination',
        revenue_col: str = 'final_price'
    ) -> List[Insight]:
        """Analyze performance by destination"""
        insights = []

        if destination_col not in df.columns:
            return insights

        dest_revenue = df.groupby(destination_col)[revenue_col].agg(['mean', 'count', 'sum'])
        dest_revenue = dest_revenue.sort_values('sum', ascending=False)

        # Top performer
        top_dest = dest_revenue.index[0]
        top_revenue = dest_revenue.iloc[0]['sum']
        total_revenue = dest_revenue['sum'].sum()

        if top_revenue / total_revenue > 0.3:
            insights.append(Insight(
                title=f"{top_dest} Dominates Revenue",
                description=f"{top_dest} generates {(top_revenue / total_revenue * 100):.0f}% of total revenue",
                category="opportunity",
                importance="high",
                metric_value=top_revenue,
                metric_name="revenue",
                recommendation=f"Invest in {top_dest} capacity and marketing",
                confidence=0.90
            ))

        # Underperformers
        low_performers = dest_revenue[dest_revenue['count'] < dest_revenue['count'].median()]
        if len(low_performers) > 0:
            low_dest_names = ', '.join(low_performers.head(3).index.tolist())
            insights.append(Insight(
                title="Underutilized Destinations",
                description=f"Low booking volume for {low_dest_names}",
                category="opportunity",
                importance="medium",
                metric_value=low_performers['count'].mean(),
                metric_name="avg_bookings",
                recommendation="Increase marketing or offer promotions for underperforming destinations",
                confidence=0.70
            ))

        return insights

    def generate_all_insights(
        self,
        df: pd.DataFrame,
        config: Optional[Dict] = None
    ) -> List[Insight]:
        """
        Generate comprehensive insights from booking data

        Args:
            df: DataFrame with booking data
            config: Optional configuration dictionary

        Returns:
            List of all insights
        """
        logger.info("generating_insights", num_records=len(df))

        self.insights = []

        # Revenue insights
        self.insights.extend(self.analyze_revenue_trends(df))

        # Demand insights
        self.insights.extend(self.analyze_demand_patterns(df))

        # Price elasticity insights
        self.insights.extend(self.analyze_price_elasticity(df))

        # Seasonality insights
        self.insights.extend(self.analyze_seasonality(df))

        # Destination insights
        if 'destination' in df.columns:
            self.insights.extend(self.analyze_destination_performance(df))

        logger.info("insights_generated", total_insights=len(self.insights))
        return self.insights

    def get_insights_by_category(self, category: str) -> List[Insight]:
        """Filter insights by category"""
        return [i for i in self.insights if i.category == category]

    def get_high_priority_insights(self) -> List[Insight]:
        """Get only high-importance insights"""
        return [i for i in self.insights if i.importance == 'high']

    def to_dataframe(self) -> pd.DataFrame:
        """Convert insights to DataFrame"""
        return pd.DataFrame([i.to_dict() for i in self.insights])


def generate_insights(df: pd.DataFrame, config: Optional[Dict] = None) -> List[Insight]:
    """
    Convenience function to generate insights

    Args:
        df: DataFrame with booking data
        config: Optional configuration

    Returns:
        List of insights
    """
    engine = InsightsEngine()
    return engine.generate_all_insights(df, config)
