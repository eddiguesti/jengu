"""
Prometheus Metrics for Pricing Service
=======================================
Exports metrics for monitoring and alerting.

Metrics:
- API latency by route (histogram)
- /score latency p95, p99 (histogram)
- Request count by status code (counter)
- Model prediction latency (histogram)
- Active requests (gauge)
- Outcomes ingested (counter)
- Model retraining duration (histogram)
"""

from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client import CollectorRegistry
import time
from typing import Optional
from contextlib import contextmanager

# Create registry
registry = CollectorRegistry()

# ============================================================================
# API Metrics
# ============================================================================

# Request latency by route
api_latency = Histogram(
    'pricing_api_latency_seconds',
    'API request latency in seconds',
    ['method', 'endpoint', 'status_code'],
    buckets=[0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0],
    registry=registry
)

# Specific /score latency for critical path
score_latency = Histogram(
    'pricing_score_latency_seconds',
    '/score endpoint latency in seconds',
    ['pricing_method'],  # ml_elasticity vs rule_based
    buckets=[0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0],
    registry=registry
)

# Request count by status code
request_count = Counter(
    'pricing_requests_total',
    'Total number of requests',
    ['method', 'endpoint', 'status_code'],
    registry=registry
)

# Active requests
active_requests = Gauge(
    'pricing_active_requests',
    'Number of active requests',
    ['endpoint'],
    registry=registry
)

# Error rate
error_count = Counter(
    'pricing_errors_total',
    'Total number of errors',
    ['endpoint', 'error_type'],
    registry=registry
)

# ============================================================================
# ML Model Metrics
# ============================================================================

# Model prediction latency
model_prediction_latency = Histogram(
    'pricing_model_prediction_seconds',
    'Model prediction latency in seconds',
    ['property_id', 'model_type'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
    registry=registry
)

# Model cache hits/misses
model_cache_hits = Counter(
    'pricing_model_cache_hits_total',
    'Model cache hits',
    registry=registry
)

model_cache_misses = Counter(
    'pricing_model_cache_misses_total',
    'Model cache misses',
    registry=registry
)

# Active models loaded
models_loaded = Gauge(
    'pricing_models_loaded',
    'Number of models currently loaded',
    registry=registry
)

# ============================================================================
# Outcomes & Learning Metrics
# ============================================================================

# Outcomes ingested
outcomes_ingested = Counter(
    'pricing_outcomes_ingested_total',
    'Total outcomes ingested',
    ['property_id'],
    registry=registry
)

# Invalid outcomes
outcomes_invalid = Counter(
    'pricing_outcomes_invalid_total',
    'Total invalid outcomes',
    ['property_id', 'reason'],
    registry=registry
)

# Retraining duration
retraining_duration = Histogram(
    'pricing_retraining_duration_seconds',
    'Model retraining duration in seconds',
    ['property_id', 'model_type'],
    buckets=[10, 30, 60, 120, 300, 600, 1200, 1800],
    registry=registry
)

# Retraining count
retraining_count = Counter(
    'pricing_retraining_total',
    'Total model retraining runs',
    ['property_id', 'model_type', 'status'],  # status: deployed, not_deployed, failed
    registry=registry
)

# Drift detected
drift_detected = Counter(
    'pricing_drift_detected_total',
    'Total drift detections',
    ['property_id', 'trigger_retrain'],
    registry=registry
)

# ============================================================================
# A/B Testing Metrics
# ============================================================================

# A/B experiment assignments
ab_assignments = Counter(
    'pricing_ab_assignments_total',
    'A/B test variant assignments',
    ['experiment_id', 'variant'],
    registry=registry
)

# A/B outcomes
ab_outcomes = Counter(
    'pricing_ab_outcomes_total',
    'A/B test outcomes',
    ['experiment_id', 'variant', 'accepted'],
    registry=registry
)

# ============================================================================
# Competitor Data Metrics
# ============================================================================

# Competitor data fetches
competitor_fetches = Counter(
    'pricing_competitor_fetches_total',
    'Competitor data fetches',
    ['property_id', 'status'],  # status: success, not_found, error
    registry=registry
)

# Competitor data staleness
competitor_staleness = Gauge(
    'pricing_competitor_staleness_seconds',
    'Time since last competitor data update',
    ['property_id'],
    registry=registry
)

# ============================================================================
# System Metrics
# ============================================================================

# Service info
service_info = Info(
    'pricing_service',
    'Pricing service information',
    registry=registry
)

# Uptime
uptime_seconds = Gauge(
    'pricing_uptime_seconds',
    'Service uptime in seconds',
    registry=registry
)

# ============================================================================
# Helper Functions
# ============================================================================

@contextmanager
def track_latency(histogram: Histogram, labels: Optional[dict] = None):
    """
    Context manager to track latency

    Usage:
        with track_latency(api_latency, {'method': 'POST', 'endpoint': '/score', 'status_code': '200'}):
            # ... do work ...
    """
    start_time = time.time()
    try:
        yield
    finally:
        duration = time.time() - start_time
        if labels:
            histogram.labels(**labels).observe(duration)
        else:
            histogram.observe(duration)


def track_request(method: str, endpoint: str, status_code: int, duration: float):
    """
    Track request metrics

    Args:
        method: HTTP method
        endpoint: API endpoint
        status_code: HTTP status code
        duration: Request duration in seconds
    """
    # Track latency
    api_latency.labels(
        method=method,
        endpoint=endpoint,
        status_code=str(status_code)
    ).observe(duration)

    # Track count
    request_count.labels(
        method=method,
        endpoint=endpoint,
        status_code=str(status_code)
    ).inc()

    # Track errors
    if status_code >= 400:
        error_type = 'client_error' if status_code < 500 else 'server_error'
        error_count.labels(
            endpoint=endpoint,
            error_type=error_type
        ).inc()


def track_score_request(pricing_method: str, duration: float):
    """
    Track /score endpoint specific metrics

    Args:
        pricing_method: Pricing method used (ml_elasticity, rule_based)
        duration: Request duration in seconds
    """
    score_latency.labels(pricing_method=pricing_method).observe(duration)


def track_model_prediction(property_id: str, model_type: str, duration: float):
    """
    Track model prediction latency

    Args:
        property_id: Property UUID
        model_type: Model type (conversion, adr, revpar)
        duration: Prediction duration in seconds
    """
    model_prediction_latency.labels(
        property_id=property_id,
        model_type=model_type
    ).observe(duration)


def track_outcomes(property_id: str, count: int, invalid_count: int = 0):
    """
    Track outcomes ingestion

    Args:
        property_id: Property UUID
        count: Number of valid outcomes
        invalid_count: Number of invalid outcomes
    """
    outcomes_ingested.labels(property_id=property_id).inc(count)

    if invalid_count > 0:
        outcomes_invalid.labels(
            property_id=property_id,
            reason='validation_failed'
        ).inc(invalid_count)


def track_retraining(property_id: str, model_type: str, status: str, duration: float):
    """
    Track model retraining

    Args:
        property_id: Property UUID
        model_type: Model type
        status: Retraining status (deployed, not_deployed, failed)
        duration: Retraining duration in seconds
    """
    retraining_duration.labels(
        property_id=property_id,
        model_type=model_type
    ).observe(duration)

    retraining_count.labels(
        property_id=property_id,
        model_type=model_type,
        status=status
    ).inc()


def track_drift(property_id: str, trigger_retrain: bool):
    """
    Track drift detection

    Args:
        property_id: Property UUID
        trigger_retrain: Whether drift triggered retrain
    """
    drift_detected.labels(
        property_id=property_id,
        trigger_retrain=str(trigger_retrain).lower()
    ).inc()


def track_ab_assignment(experiment_id: str, variant: str):
    """
    Track A/B test assignment

    Args:
        experiment_id: Experiment ID
        variant: Variant assigned (ml, rule_based)
    """
    ab_assignments.labels(
        experiment_id=experiment_id,
        variant=variant
    ).inc()


def track_ab_outcome(experiment_id: str, variant: str, accepted: bool):
    """
    Track A/B test outcome

    Args:
        experiment_id: Experiment ID
        variant: Variant used
        accepted: Whether outcome was accepted
    """
    ab_outcomes.labels(
        experiment_id=experiment_id,
        variant=variant,
        accepted=str(accepted).lower()
    ).inc()


def set_service_info(version: str, environment: str):
    """
    Set service information

    Args:
        version: Service version
        environment: Environment (dev, staging, prod)
    """
    service_info.info({
        'version': version,
        'environment': environment,
        'service': 'pricing-service'
    })


def get_metrics():
    """
    Get all metrics in Prometheus format

    Returns:
        Metrics text in Prometheus format
    """
    return generate_latest(registry)


def get_content_type():
    """Get Prometheus content type"""
    return CONTENT_TYPE_LATEST
