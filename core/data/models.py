"""SQLAlchemy models for travel pricing"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, Date
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Booking(Base):
    """Raw booking data"""
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(String(50), unique=True, nullable=False, index=True)
    destination = Column(String(100), nullable=False)
    booking_date = Column(Date, nullable=False, index=True)
    checkin_date = Column(Date, nullable=False, index=True)
    checkout_date = Column(Date, nullable=False)
    duration_days = Column(Integer, nullable=False)
    num_travelers = Column(Integer, nullable=False)
    accommodation_type = Column(String(50), nullable=False)
    season = Column(String(20), nullable=False)
    base_price = Column(Float, nullable=False)
    final_price = Column(Float, nullable=False)
    discount_applied = Column(Float, default=0.0)
    include_flights = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    features = relationship("BookingFeature", back_populates="booking", cascade="all, delete-orphan")


class BookingFeature(Base):
    """Engineered features for modeling"""
    __tablename__ = "booking_features"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(String(50), ForeignKey("bookings.booking_id"), nullable=False, index=True)

    # Time-based features
    day_of_week = Column(Integer)
    month = Column(Integer)
    quarter = Column(Integer)
    days_until_checkin = Column(Integer)

    # Lag features
    price_lag_7 = Column(Float)
    price_lag_14 = Column(Float)
    price_lag_30 = Column(Float)

    # Rolling features
    demand_rolling_7 = Column(Float)
    demand_rolling_14 = Column(Float)
    demand_rolling_30 = Column(Float)

    # External features
    is_holiday = Column(Boolean, default=False)
    weather_temp = Column(Float)
    weather_condition = Column(String(50))

    # Encoded features (stored as JSON)
    destination_encoded = Column(JSON)
    season_encoded = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="features")


class DemandForecast(Base):
    """Demand forecasts from GLM model"""
    __tablename__ = "demand_forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    destination = Column(String(100), nullable=False, index=True)
    forecast_date = Column(Date, nullable=False, index=True)
    predicted_demand = Column(Float, nullable=False)
    confidence_lower = Column(Float)
    confidence_upper = Column(Float)
    model_version = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class PriceRecommendation(Base):
    """Optimized price recommendations"""
    __tablename__ = "price_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    destination = Column(String(100), nullable=False, index=True)
    recommendation_date = Column(Date, nullable=False, index=True)
    accommodation_type = Column(String(50), nullable=False)
    season = Column(String(20), nullable=False)
    recommended_price = Column(Float, nullable=False)
    expected_demand = Column(Float)
    expected_revenue = Column(Float)
    price_elasticity = Column(Float)
    policy_version = Column(String(50))
    model_version = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class PricingPolicy(Base):
    """Versioned pricing policy configurations"""
    __tablename__ = "pricing_policies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    policy_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False, index=True)
    is_active = Column(Boolean, default=False)

    # Policy parameters (stored as JSON)
    min_price_multiplier = Column(Float, default=0.5)
    max_price_multiplier = Column(Float, default=3.0)
    seasonal_adjustments = Column(JSON)
    destination_rules = Column(JSON)
    custom_rules = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))


class ModelArtifact(Base):
    """Metadata for saved model artifacts"""
    __tablename__ = "model_artifacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_type = Column(String(50), nullable=False)  # 'demand_glm', 'elasticity_ols', etc.
    version = Column(String(50), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)

    # Model metadata
    training_date = Column(DateTime, default=datetime.utcnow)
    metrics = Column(JSON)  # MAE, RMSE, R2, etc.
    hyperparameters = Column(JSON)
    feature_importance = Column(JSON)

    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
