"""
Jengu Pricing ML Service
=========================
Machine learning-powered dynamic pricing engine for hospitality businesses.

This service provides:
- Real-time price optimization
- Demand-based pricing
- Competitor-aware pricing
- Seasonal and temporal adjustments
- Confidence intervals and risk management
"""

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import uvicorn
from datetime import datetime, date
import logging
import os
import uuid
import time

# Import our pricing engine
from pricing_engine import PricingEngine

# Import observability
from observability.sentry_config import init_sentry, set_request_context, start_transaction
from observability.prometheus_metrics import (
    track_request,
    track_score_request,
    active_requests,
    set_service_info,
    uptime_seconds,
    get_metrics,
    get_content_type
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Sentry (if DSN provided)
sentry_dsn = os.getenv('SENTRY_DSN')
if sentry_dsn:
    environment = os.getenv('ENVIRONMENT', 'development')
    release = os.getenv('RELEASE', '1.0.0')
    traces_sample_rate = float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1'))

    init_sentry(
        dsn=sentry_dsn,
        environment=environment,
        release=release,
        traces_sample_rate=traces_sample_rate
    )
    logger.info(f"✅ Sentry initialized (environment: {environment}, release: {release})")
else:
    logger.warning("⚠️  SENTRY_DSN not set, error tracking disabled")

# Track service start time
service_start_time = time.time()

# Initialize FastAPI app
app = FastAPI(
    title="Jengu Pricing ML Service",
    description="Machine learning pricing engine for dynamic hospitality pricing",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Request ID and Observability Middleware
# ============================================================================

@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """
    Middleware to track request IDs, latency, and errors
    """
    # Generate or extract request ID
    request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))

    # Track active requests
    endpoint = request.url.path
    active_requests.labels(endpoint=endpoint).inc()

    # Start timer
    start_time = time.time()

    # Set Sentry context
    user_id = request.headers.get('X-User-ID')
    property_id = request.headers.get('X-Property-ID')

    set_request_context(
        request_id=request_id,
        user_id=user_id,
        property_id=property_id,
        additional_tags={
            'endpoint': endpoint,
            'method': request.method
        }
    )

    # Process request
    try:
        response = await call_next(request)

        # Calculate duration
        duration = time.time() - start_time

        # Track metrics
        track_request(
            method=request.method,
            endpoint=endpoint,
            status_code=response.status_code,
            duration=duration
        )

        # Add request ID to response headers
        response.headers['X-Request-ID'] = request_id

        return response

    except Exception as e:
        # Calculate duration even on error
        duration = time.time() - start_time

        # Track error metrics
        track_request(
            method=request.method,
            endpoint=endpoint,
            status_code=500,
            duration=duration
        )

        # Re-raise exception (Sentry will capture it)
        raise

    finally:
        # Decrement active requests
        active_requests.labels(endpoint=endpoint).dec()

# Initialize pricing engine
pricing_engine = PricingEngine()

# Set service info for Prometheus
environment = os.getenv('ENVIRONMENT', 'development')
release = os.getenv('RELEASE', '1.0.0')
set_service_info(version=release, environment=environment)

# Startup event to track uptime
@app.on_event("startup")
async def startup_event():
    """Initialize service metrics on startup"""
    logger.info("🚀 Starting Jengu Pricing ML Service")
    logger.info(f"   Environment: {environment}")
    logger.info(f"   Release: {release}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("👋 Shutting down Jengu Pricing ML Service")

# ============================================================================
# Request/Response Models
# ============================================================================

class EntityModel(BaseModel):
    userId: str
    propertyId: str

class ProductModel(BaseModel):
    type: str = "standard"
    refundable: bool = False
    los: int = Field(1, ge=1, description="Length of stay in nights")

class InventoryModel(BaseModel):
    capacity: int = Field(..., ge=1)
    remaining: int = Field(..., ge=0)
    overbook_limit: int = Field(0, ge=0)

class MarketModel(BaseModel):
    comp_price_p10: Optional[float] = None
    comp_price_p50: Optional[float] = None
    comp_price_p90: Optional[float] = None

class ContextModel(BaseModel):
    season: Optional[str] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    weather: Optional[Dict[str, Any]] = None

class TogglesModel(BaseModel):
    aggressive: bool = False
    conservative: bool = False
    use_ml: bool = True
    use_competitors: bool = True
    apply_seasonality: bool = True

class PricingRequest(BaseModel):
    entity: EntityModel
    stay_date: str
    quote_time: str
    product: ProductModel
    inventory: InventoryModel
    market: MarketModel
    costs: Optional[Dict[str, Any]] = None
    context: ContextModel
    toggles: TogglesModel
    allowed_price_grid: Optional[List[float]] = None

class PricingResponse(BaseModel):
    price: float
    price_grid: Optional[List[float]] = None
    conf_band: Optional[Dict[str, float]] = None
    expected: Optional[Dict[str, float]] = None
    reasons: Optional[List[str]] = None
    safety: Optional[Dict[str, Any]] = None

class LearnRequest(BaseModel):
    batch: List[Dict[str, Any]]

class LearnResponse(BaseModel):
    success: bool
    processed: int
    message: str

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Jengu Pricing ML Service",
        "status": "operational",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    """Detailed health check"""
    # Update uptime metric
    uptime_seconds.set(time.time() - service_start_time)

    return {
        "status": "healthy",
        "model_loaded": pricing_engine.is_ready(),
        "uptime_seconds": time.time() - service_start_time,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/metrics")
async def metrics():
    """
    Prometheus metrics endpoint

    Exposes metrics for scraping by Prometheus:
    - API latency histograms (by route, status code)
    - /score specific latency (by pricing method)
    - Request counts
    - Error counts
    - Active requests
    - Model prediction latency
    - Outcomes ingested
    - Retraining metrics
    - Drift detection events
    - A/B testing assignments
    - Service uptime
    """
    # Update uptime before returning metrics
    uptime_seconds.set(time.time() - service_start_time)

    # Return metrics in Prometheus format
    return Response(content=get_metrics(), media_type=get_content_type())

@app.post("/score", response_model=PricingResponse)
async def score(request: PricingRequest):
    """
    Generate optimal price recommendation

    This endpoint analyzes:
    - Historical pricing patterns
    - Current inventory levels
    - Competitor pricing
    - Seasonal trends
    - Day of week patterns
    - Lead time dynamics

    Returns optimized price with confidence intervals.

    A/B Testing:
    If an active experiment exists, uses consistent hashing to assign
    ML vs rule-based pricing variant.
    """
    # Track /score specific latency
    score_start_time = time.time()

    try:
        logger.info(f"Pricing request for property {request.entity.propertyId}, stay_date {request.stay_date}")

        # Check A/B testing assignment
        from ab_testing.ab_framework import get_ab_framework

        ab_framework = get_ab_framework()

        # Override use_ml toggle based on A/B test assignment
        should_use_ml = ab_framework.should_use_ml(
            property_id=request.entity.propertyId,
            user_id=request.entity.userId
        )

        # Update toggles
        toggles_dict = request.toggles.dict()
        toggles_dict['use_ml'] = should_use_ml

        variant = 'ml' if should_use_ml else 'rule_based'
        logger.info(f"A/B variant assigned: {variant}")

        # Calculate optimal price
        result = pricing_engine.calculate_price(
            property_id=request.entity.propertyId,
            user_id=request.entity.userId,
            stay_date=request.stay_date,
            quote_time=request.quote_time,
            product=request.product.dict(),
            inventory=request.inventory.dict(),
            market=request.market.dict(),
            context=request.context.dict(),
            toggles=toggles_dict,
            allowed_price_grid=request.allowed_price_grid
        )

        # Track /score latency by pricing method
        score_duration = time.time() - score_start_time
        pricing_method = 'ml_elasticity' if should_use_ml else 'rule_based'
        track_score_request(pricing_method=pricing_method, duration=score_duration)

        logger.info(f"Price calculated: €{result['price']:.2f} (variant: {variant}, duration: {score_duration*1000:.1f}ms)")

        # Add variant to response for tracking
        if 'safety' not in result:
            result['safety'] = {}
        result['safety']['ab_variant'] = variant

        return PricingResponse(**result)

    except Exception as e:
        logger.error(f"Error calculating price: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")

@app.post("/learn", response_model=LearnResponse)
async def learn(request: LearnRequest):
    """
    Submit booking outcomes for ML model training

    This endpoint accepts historical booking data to improve
    the pricing model over time through continuous learning.

    Outcomes are persisted per property for:
    - Weekly model retraining
    - Performance tracking
    - Drift detection

    Expected fields per outcome:
    - property_id (required)
    - timestamp (required)
    - quoted_price (required)
    - accepted (required, bool)
    - final_price (optional, if different from quoted)
    - time_to_book (optional, hours between quote and booking)
    - comp_p10, comp_p50, comp_p90 (optional, competitor snapshot)
    - context (optional, dict with season, day_of_week, weather, etc.)
    """
    try:
        logger.info(f"Learning from {len(request.batch)} outcomes")

        # Store outcomes using outcomes storage
        from learning.outcomes_storage import get_outcomes_storage

        outcomes_storage = get_outcomes_storage()

        # Group outcomes by property_id
        outcomes_by_property = {}
        for outcome in request.batch:
            property_id = outcome.get('property_id')
            if not property_id:
                logger.warning("Outcome missing property_id, skipping")
                continue

            if property_id not in outcomes_by_property:
                outcomes_by_property[property_id] = []

            outcomes_by_property[property_id].append(outcome)

        # Store outcomes for each property
        total_stored = 0
        total_invalid = 0
        total_duplicates = 0

        for property_id, outcomes in outcomes_by_property.items():
            result = outcomes_storage.store_outcomes(
                property_id=property_id,
                outcomes=outcomes,
                deduplicate=True
            )

            stored_count = result.get('stored', 0)
            invalid_count = result.get('invalid', 0)

            total_stored += stored_count
            total_invalid += invalid_count
            total_duplicates += result.get('duplicates', 0)

            # Track outcomes metrics
            from observability.prometheus_metrics import track_outcomes
            if stored_count > 0:
                track_outcomes(property_id=property_id, count=stored_count, invalid_count=invalid_count)

        # Also pass to pricing engine for in-memory accumulation
        processed = pricing_engine.learn_from_outcomes(request.batch)

        message = f"Stored {total_stored} outcomes across {len(outcomes_by_property)} properties"
        if total_invalid > 0:
            message += f" ({total_invalid} invalid)"
        if total_duplicates > 0:
            message += f" ({total_duplicates} duplicates removed)"

        return LearnResponse(
            success=True,
            processed=total_stored,
            message=message
        )

    except Exception as e:
        logger.error(f"Error processing learning batch: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Learning failed: {str(e)}")

@app.get("/learn/outcomes/{property_id}/stats")
async def get_outcomes_stats(property_id: str):
    """Get statistics about stored outcomes for a property"""
    try:
        from learning.outcomes_storage import get_outcomes_storage

        outcomes_storage = get_outcomes_storage()
        stats = outcomes_storage.get_statistics(property_id)

        return {
            'success': True,
            'property_id': property_id,
            'stats': stats
        }

    except Exception as e:
        logger.error(f"Error getting outcomes stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get outcomes stats: {str(e)}")

@app.get("/learn/outcomes/properties")
async def list_properties_with_outcomes():
    """List all properties that have stored outcomes"""
    try:
        from learning.outcomes_storage import get_outcomes_storage

        outcomes_storage = get_outcomes_storage()
        properties = outcomes_storage.list_properties()

        return {
            'success': True,
            'count': len(properties),
            'properties': properties
        }

    except Exception as e:
        logger.error(f"Error listing properties: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list properties: {str(e)}")

@app.get("/model/info")
async def model_info():
    """Get information about the current pricing model"""
    return pricing_engine.get_model_info()

@app.get("/model/metrics/{property_id}")
async def get_model_metrics(property_id: str, model_type: str = 'conversion'):
    """
    Get ML model metrics and performance for a property

    Args:
        property_id: Property UUID
        model_type: Type of model (conversion, adr, revpar)

    Returns:
        Model metrics including MAE, RMSE, feature importance, etc.
    """
    try:
        from models.model_registry import get_registry

        registry = get_registry()

        # Load model metadata
        _, metadata = registry.load_model(property_id, model_type, version='latest')

        if metadata is None:
            raise HTTPException(status_code=404, detail=f"Model not found for property {property_id}")

        # Get feature importance (top 20)
        feature_importance = registry.get_feature_importance(property_id, model_type, top_n=20)

        # Build response
        response = {
            'property_id': property_id,
            'model_type': model_type,
            'version': metadata.get('version'),
            'timestamp': metadata.get('timestamp'),
            'num_features': metadata.get('num_features'),
            'num_trees': metadata.get('num_trees'),
            'best_iteration': metadata.get('best_iteration'),
            'metrics': metadata.get('metrics', {}),
            'feature_importance': feature_importance,
            'checksum': metadata.get('checksum'),
            'loaded_at': metadata.get('loaded_at'),
        }

        return response

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model not found for property {property_id}")
    except Exception as e:
        logger.error(f"Error retrieving model metrics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve model metrics: {str(e)}")

@app.get("/model/registry")
async def get_registry_info():
    """
    Get information about the model registry

    Returns:
        Registry statistics and loaded models
    """
    try:
        from models.model_registry import get_registry

        registry = get_registry()
        stats = registry.get_registry_stats()

        return {
            'success': True,
            'registry': stats,
            'loaded_models': registry.get_loaded_models(),
        }

    except Exception as e:
        logger.error(f"Error retrieving registry info: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve registry info: {str(e)}")

@app.get("/model/list")
async def list_models(property_id: str = None):
    """
    List available models

    Args:
        property_id: Optional property UUID to filter

    Returns:
        List of available models with metadata
    """
    try:
        from models.model_registry import get_registry

        registry = get_registry()
        models = registry.list_models(property_id=property_id)

        return {
            'success': True,
            'count': len(models),
            'models': models
        }

    except Exception as e:
        logger.error(f"Error listing models: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")

# ============================================================================
# A/B Testing Endpoints
# ============================================================================

@app.post("/ab/experiments")
async def create_experiment(
    name: str,
    description: str,
    start_date: str,
    end_date: str,
    ml_traffic_percentage: float = 50.0
):
    """Create new A/B test experiment"""
    try:
        from ab_testing.ab_framework import get_ab_framework

        ab_framework = get_ab_framework()

        experiment_id = ab_framework.create_experiment(
            name=name,
            description=description,
            start_date=start_date,
            end_date=end_date,
            ml_traffic_percentage=ml_traffic_percentage
        )

        return {
            'success': True,
            'experiment_id': experiment_id,
            'message': f'Experiment "{name}" created successfully'
        }

    except Exception as e:
        logger.error(f"Error creating experiment: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create experiment: {str(e)}")

@app.get("/ab/experiments")
async def list_experiments(active_only: bool = False):
    """List all A/B test experiments"""
    try:
        from ab_testing.ab_framework import get_ab_framework
        from dataclasses import asdict

        ab_framework = get_ab_framework()
        experiments = ab_framework.list_experiments(active_only=active_only)

        return {
            'success': True,
            'count': len(experiments),
            'experiments': [asdict(e) for e in experiments]
        }

    except Exception as e:
        logger.error(f"Error listing experiments: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list experiments: {str(e)}")

@app.get("/ab/experiments/{experiment_id}/results")
async def get_experiment_results(experiment_id: str):
    """Get results comparison for an experiment"""
    try:
        from ab_testing.ab_framework import get_ab_framework

        ab_framework = get_ab_framework()
        results = ab_framework.compare_variants(experiment_id)

        return {
            'success': True,
            'results': results
        }

    except Exception as e:
        logger.error(f"Error getting experiment results: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get experiment results: {str(e)}")

@app.post("/ab/experiments/{experiment_id}/stop")
async def stop_experiment(experiment_id: str):
    """Stop an experiment"""
    try:
        from ab_testing.ab_framework import get_ab_framework

        ab_framework = get_ab_framework()
        ab_framework.stop_experiment(experiment_id)

        return {
            'success': True,
            'message': f'Experiment {experiment_id} stopped'
        }

    except Exception as e:
        logger.error(f"Error stopping experiment: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to stop experiment: {str(e)}")

# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (dev only)
        log_level="info"
    )
