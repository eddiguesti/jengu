"""Data repository for database access - Vanta Compliant with SQL Injection Protection"""
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import create_engine, and_, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager

from .models import (
    Base, Booking, BookingFeature, DemandForecast,
    PriceRecommendation, PricingPolicy, ModelArtifact
)
from ..utils.config import get_settings
from ..utils.logging import get_logger

logger = get_logger(__name__)


class DatabaseRepository:
    """
    Repository for database operations with security best practices

    Features:
    - Parameterized queries (SQL injection protection)
    - Connection pooling
    - Automatic session management
    - Comprehensive audit logging
    """

    def __init__(self, database_url: Optional[str] = None):
        settings = get_settings()
        self.database_url = database_url or settings.database_url

        # Create engine with secure connection pooling
        self.engine = create_engine(
            self.database_url,
            echo=settings.db_echo,
            poolclass=QueuePool,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_recycle=settings.db_pool_recycle,  # Recycle connections
            pool_pre_ping=True,  # Verify connections before using
            # Security: Disable statement caching if needed
            # connect_args={"options": "-c statement_timeout=30000"}  # PostgreSQL specific
        )
        self.SessionLocal = sessionmaker(
            bind=self.engine,
            autocommit=False,
            autoflush=False,
        )

    def create_tables(self):
        """Create all tables"""
        Base.metadata.create_all(bind=self.engine)
        logger.info("database_tables_created")

    def drop_tables(self):
        """Drop all tables"""
        Base.metadata.drop_all(bind=self.engine)
        logger.info("database_tables_dropped")

    @contextmanager
    def get_session(self) -> Session:
        """Get database session context manager"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error("database_session_error", error=str(e))
            raise
        finally:
            session.close()

    # Booking operations
    def create_booking(self, booking_data: dict) -> Booking:
        """Create a new booking"""
        with self.get_session() as session:
            booking = Booking(**booking_data)
            session.add(booking)
            session.flush()
            logger.info("booking_created", booking_id=booking.booking_id)
            return booking

    def get_booking(self, booking_id: str) -> Optional[Booking]:
        """Get booking by ID"""
        with self.get_session() as session:
            return session.query(Booking).filter(
                Booking.booking_id == booking_id
            ).first()

    def get_bookings_by_date_range(
        self, start_date: date, end_date: date
    ) -> List[Booking]:
        """Get bookings within date range"""
        with self.get_session() as session:
            return session.query(Booking).filter(
                and_(
                    Booking.booking_date >= start_date,
                    Booking.booking_date <= end_date
                )
            ).all()

    # Feature operations
    def create_booking_features(self, feature_data: dict) -> BookingFeature:
        """Create booking features"""
        with self.get_session() as session:
            features = BookingFeature(**feature_data)
            session.add(features)
            session.flush()
            logger.info("booking_features_created", booking_id=feature_data.get("booking_id"))
            return features

    # Demand forecast operations
    def create_demand_forecast(self, forecast_data: dict) -> DemandForecast:
        """Create demand forecast"""
        with self.get_session() as session:
            forecast = DemandForecast(**forecast_data)
            session.add(forecast)
            session.flush()
            return forecast

    def get_demand_forecasts(
        self, destination: str, start_date: date, end_date: date
    ) -> List[DemandForecast]:
        """Get demand forecasts for destination and date range"""
        with self.get_session() as session:
            return session.query(DemandForecast).filter(
                and_(
                    DemandForecast.destination == destination,
                    DemandForecast.forecast_date >= start_date,
                    DemandForecast.forecast_date <= end_date
                )
            ).all()

    # Price recommendation operations
    def create_price_recommendation(self, recommendation_data: dict) -> PriceRecommendation:
        """Create price recommendation"""
        with self.get_session() as session:
            recommendation = PriceRecommendation(**recommendation_data)
            session.add(recommendation)
            session.flush()
            return recommendation

    def get_latest_price_recommendation(
        self, destination: str, accommodation_type: str, season: str
    ) -> Optional[PriceRecommendation]:
        """Get latest price recommendation"""
        with self.get_session() as session:
            return session.query(PriceRecommendation).filter(
                and_(
                    PriceRecommendation.destination == destination,
                    PriceRecommendation.accommodation_type == accommodation_type,
                    PriceRecommendation.season == season
                )
            ).order_by(PriceRecommendation.recommendation_date.desc()).first()

    # Policy operations
    def create_policy(self, policy_data: dict) -> PricingPolicy:
        """Create pricing policy"""
        with self.get_session() as session:
            policy = PricingPolicy(**policy_data)
            session.add(policy)
            session.flush()
            logger.info("policy_created", version=policy.version)
            return policy

    def get_active_policy(self) -> Optional[PricingPolicy]:
        """Get active pricing policy"""
        with self.get_session() as session:
            return session.query(PricingPolicy).filter(
                PricingPolicy.is_active == True
            ).first()

    def set_active_policy(self, version: str):
        """Set a policy version as active"""
        with self.get_session() as session:
            # Deactivate all policies
            session.query(PricingPolicy).update({"is_active": False})
            # Activate specified version
            session.query(PricingPolicy).filter(
                PricingPolicy.version == version
            ).update({"is_active": True})
            logger.info("policy_activated", version=version)

    # Model artifact operations
    def create_model_artifact(self, artifact_data: dict) -> ModelArtifact:
        """Create model artifact metadata"""
        with self.get_session() as session:
            artifact = ModelArtifact(**artifact_data)
            session.add(artifact)
            session.flush()
            logger.info(
                "model_artifact_created",
                model_type=artifact.model_type,
                version=artifact.version
            )
            return artifact

    def get_active_model(self, model_type: str) -> Optional[ModelArtifact]:
        """Get active model artifact for a type"""
        with self.get_session() as session:
            return session.query(ModelArtifact).filter(
                and_(
                    ModelArtifact.model_type == model_type,
                    ModelArtifact.is_active == True
                )
            ).first()


# Global repository instance
_repo: Optional[DatabaseRepository] = None


def get_repository() -> DatabaseRepository:
    """Get or create global repository instance"""
    global _repo
    if _repo is None:
        _repo = DatabaseRepository()
    return _repo
