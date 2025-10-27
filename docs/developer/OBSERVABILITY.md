# Observability - Monitoring, Alerting, and Debugging

This document describes the observability stack for the Jengu pricing service, including error tracking with Sentry, metrics with Prometheus, visualization with Grafana, and alerting.

## Table of Contents

- [Overview](#overview)
- [Sentry - Error Tracking](#sentry---error-tracking)
- [Prometheus - Metrics](#prometheus---metrics)
- [Grafana - Visualization](#grafana---visualization)
- [Alerting](#alerting)
- [Request Tracing](#request-tracing)
- [Local Development](#local-development)
- [Production Setup](#production-setup)

---

## Overview

The observability stack provides comprehensive monitoring and debugging capabilities:

- **Sentry**: Error tracking, performance monitoring, transaction tracing
- **Prometheus**: Time-series metrics collection and storage
- **Grafana**: Metrics visualization and dashboards
- **Alerting**: Automated alerts for critical issues

### Architecture

```
┌─────────────────┐
│ Pricing Service │
│   (FastAPI)     │
└────────┬────────┘
         │
         ├─── Sentry SDK ──────────► Sentry.io (Error Tracking)
         │
         └─── Prometheus Metrics ──► Prometheus Server
                                          │
                                          ▼
                                     Grafana (Dashboards)
                                          │
                                          ▼
                                     Alertmanager (Alerts)
```

---

## Sentry - Error Tracking

### Features

- **Error Tracking**: Automatic exception capture with stack traces
- **Performance Monitoring**: Transaction tracing for critical paths
- **Request Context**: Every error tagged with request ID, user ID, property ID
- **Breadcrumbs**: Automatic logging of HTTP requests, database queries
- **Before-Send Hooks**: Filter out sensitive data and low-priority errors

### Configuration

Environment variables (`.env`):

```bash
# Sentry Configuration
SENTRY_DSN=https://your-dsn@sentry.io/project-id
ENVIRONMENT=production  # or development, staging
RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1  # Sample 10% of transactions
```

### Implementation

Location: [`pricing-service/observability/sentry_config.py`](../../pricing-service/observability/sentry_config.py)

Key functions:

```python
# Initialize Sentry on service startup
init_sentry(dsn, environment, release, traces_sample_rate=0.1)

# Set context for current request
set_request_context(
    request_id='abc-123',
    user_id='user-456',
    property_id='prop-789',
    additional_tags={'endpoint': '/score'}
)

# Start performance transaction
with start_transaction(name='/score', op='http.server') as transaction:
    # ... do work ...
    pass
```

### Sentry Dashboard

View errors and performance at: https://sentry.io/organizations/your-org/projects/

Key views:

- **Issues**: Grouped errors with frequency and impact
- **Performance**: Transaction traces showing bottlenecks
- **Releases**: Track errors by deployment version

### Error Filtering

Errors filtered by `before_send` hook:

- Health check errors (not actionable)
- 404 errors (expected)
- Validation errors with low impact

### Request Tagging

Every Sentry event is tagged with:

- `request_id`: Unique request identifier
- `user_id`: User making the request
- `property_id`: Property being priced
- `endpoint`: API route
- `method`: HTTP method

---

## Prometheus - Metrics

### Metrics Exposed

Location: [`pricing-service/observability/prometheus_metrics.py`](../../pricing-service/observability/prometheus_metrics.py)

#### API Metrics

| Metric                          | Type      | Labels                              | Description                |
| ------------------------------- | --------- | ----------------------------------- | -------------------------- |
| `pricing_api_latency_seconds`   | Histogram | `method`, `endpoint`, `status_code` | API request latency        |
| `pricing_score_latency_seconds` | Histogram | `pricing_method`                    | `/score` endpoint latency  |
| `pricing_requests_total`        | Counter   | `method`, `endpoint`, `status_code` | Total requests             |
| `pricing_active_requests`       | Gauge     | `endpoint`                          | Active concurrent requests |
| `pricing_errors_total`          | Counter   | `endpoint`, `error_type`            | Total errors               |

#### ML Model Metrics

| Metric                             | Type      | Labels                      | Description              |
| ---------------------------------- | --------- | --------------------------- | ------------------------ |
| `pricing_model_prediction_seconds` | Histogram | `property_id`, `model_type` | Model prediction latency |
| `pricing_model_cache_hits_total`   | Counter   | -                           | Model cache hits         |
| `pricing_model_cache_misses_total` | Counter   | -                           | Model cache misses       |
| `pricing_models_loaded`            | Gauge     | -                           | Number of models loaded  |

#### Learning Loop Metrics

| Metric                                | Type      | Labels                                | Description         |
| ------------------------------------- | --------- | ------------------------------------- | ------------------- |
| `pricing_outcomes_ingested_total`     | Counter   | `property_id`                         | Outcomes ingested   |
| `pricing_outcomes_invalid_total`      | Counter   | `property_id`, `reason`               | Invalid outcomes    |
| `pricing_retraining_duration_seconds` | Histogram | `property_id`, `model_type`           | Retraining duration |
| `pricing_retraining_total`            | Counter   | `property_id`, `model_type`, `status` | Retraining events   |
| `pricing_drift_detected_total`        | Counter   | `property_id`, `trigger_retrain`      | Drift detections    |

#### A/B Testing Metrics

| Metric                         | Type    | Labels                                 | Description          |
| ------------------------------ | ------- | -------------------------------------- | -------------------- |
| `pricing_ab_assignments_total` | Counter | `experiment_id`, `variant`             | A/B test assignments |
| `pricing_ab_outcomes_total`    | Counter | `experiment_id`, `variant`, `accepted` | A/B test outcomes    |

#### Competitor Data Metrics

| Metric                                 | Type    | Labels                  | Description               |
| -------------------------------------- | ------- | ----------------------- | ------------------------- |
| `pricing_competitor_fetches_total`     | Counter | `property_id`, `status` | Competitor data fetches   |
| `pricing_competitor_staleness_seconds` | Gauge   | `property_id`           | Competitor data staleness |

#### System Metrics

| Metric                   | Type  | Labels                              | Description         |
| ------------------------ | ----- | ----------------------------------- | ------------------- |
| `pricing_service_info`   | Info  | `version`, `environment`, `service` | Service information |
| `pricing_uptime_seconds` | Gauge | -                                   | Service uptime      |

### Metrics Endpoint

Access metrics at: `http://localhost:8000/metrics`

Example output:

```
# HELP pricing_api_latency_seconds API request latency in seconds
# TYPE pricing_api_latency_seconds histogram
pricing_api_latency_seconds_bucket{endpoint="/score",method="POST",status_code="200",le="0.01"} 10
pricing_api_latency_seconds_bucket{endpoint="/score",method="POST",status_code="200",le="0.025"} 45
pricing_api_latency_seconds_bucket{endpoint="/score",method="POST",status_code="200",le="0.05"} 89
...
```

### Helper Functions

```python
# Track API request
track_request(method='POST', endpoint='/score', status_code=200, duration=0.025)

# Track /score specific latency
track_score_request(pricing_method='ml_elasticity', duration=0.018)

# Track outcomes ingestion
track_outcomes(property_id='prop-123', count=100, invalid_count=5)

# Track model prediction
track_model_prediction(property_id='prop-123', model_type='conversion', duration=0.005)

# Track retraining
track_retraining(property_id='prop-123', model_type='conversion', status='deployed', duration=120.5)

# Track drift detection
track_drift(property_id='prop-123', trigger_retrain=True)

# Context manager for latency tracking
with track_latency(api_latency, {'method': 'POST', 'endpoint': '/score'}):
    # ... do work ...
    pass
```

---

## Grafana - Visualization

### Dashboard

Pre-built dashboard: [`pricing-service/observability/grafana_dashboard.json`](../../pricing-service/observability/grafana_dashboard.json)

Import this dashboard into Grafana to get instant visibility into:

#### 1. **API Request Rate**

- Total requests/sec by endpoint and status code
- Identify traffic patterns and spikes

#### 2. **/score Latency (p50, p95, p99)**

- Critical path monitoring
- Alert threshold at p95 > 80ms

#### 3. **Error Rate**

- Errors/sec by endpoint and type
- Alert threshold at 0.1 errors/sec

#### 4. **Active Requests**

- Concurrent request load
- Detect slow processing or traffic spikes

#### 5. **Service Uptime**

- Uptime duration in days/hours/minutes

#### 6. **API Latency by Route (p95)**

- Latency breakdown for all endpoints
- Identify slow routes

#### 7. **Model Prediction Latency (p95)**

- ML model inference performance
- Track by model type and property

#### 8. **Model Cache Hit Rate**

- Cache efficiency (hits / (hits + misses))
- Low hit rate indicates cache issues

#### 9. **Models Loaded**

- Number of ML models in memory
- Track memory usage

#### 10. **Outcomes Ingested (rate)**

- Learning loop health
- Track by property

#### 11. **Invalid Outcomes**

- Data quality monitoring
- Identify properties with bad data

#### 12. **Model Retraining Events**

- Retraining frequency by status
- Track deployed vs failed retrains

#### 13. **Retraining Duration (p95)**

- Retraining performance
- Alert on long retrains

#### 14. **Drift Detection Events**

- Drift frequency by property
- Track retrain triggers

#### 15. **A/B Test Assignments**

- Traffic split between variants
- Verify balanced assignment

#### 16. **A/B Test Conversion Rate**

- Conversion rate by variant
- Compare ML vs rule-based

#### 17. **Competitor Data Fetch Success Rate**

- Scraper health
- Track fetch failures

#### 18. **Competitor Data Staleness**

- Data freshness by property
- Alert on stale data (>24 hours)

### Importing the Dashboard

1. Open Grafana UI
2. Navigate to **Dashboards > Import**
3. Upload `grafana_dashboard.json`
4. Select Prometheus data source
5. Click **Import**

---

## Alerting

### Alert Rules

Location: [`pricing-service/observability/prometheus_alerts.yml`](../../pricing-service/observability/prometheus_alerts.yml)

#### Critical Alerts (Immediate Action)

| Alert                    | Condition           | Threshold | Duration | Description                     |
| ------------------------ | ------------------- | --------- | -------- | ------------------------------- |
| **CriticalScoreLatency** | /score p95 > 80ms   | 0.08s     | 5m       | Critical user-facing latency    |
| **HighErrorRate**        | Errors/sec > 0.1    | 0.1       | 5m       | High error rate impacting users |
| **ServiceDown**          | Service unreachable | N/A       | 1m       | Service is down                 |
| **NoModelsLoaded**       | No models loaded    | 0         | 5m       | Service cannot make predictions |
| **RetrainingFailures**   | Retraining failures | > 0       | 5m       | Model retraining is failing     |

#### Warning Alerts (Investigate)

| Alert                           | Condition               | Threshold | Duration | Description                         |
| ------------------------------- | ----------------------- | --------- | -------- | ----------------------------------- |
| **HighAPILatency**              | API p95 > 1s            | 1.0s      | 5m       | General API slowness                |
| **SlowScoreLatency**            | /score p95 > 200ms      | 0.2s      | 5m       | /score slower than expected         |
| **IncreasedErrorRate**          | Errors/sec > 0.05       | 0.05      | 10m      | Elevated error rate                 |
| **SlowModelPrediction**         | Model p95 > 100ms       | 0.1s      | 5m       | ML inference slowness               |
| **LowModelCacheHitRate**        | Cache hit rate < 70%    | 0.7       | 10m      | Cache inefficiency                  |
| **HighInvalidOutcomesRate**     | Invalid outcomes > 10%  | 0.1       | 10m      | Data quality issues                 |
| **LongRetrainingDuration**      | Retraining > 30 min     | 1800s     | 5m       | Retraining taking too long          |
| **FrequentDriftDetection**      | Drift rate > 0.1/hour   | 0.1       | 10m      | Excessive drift triggering retrains |
| **ABTestImbalance**             | Traffic imbalance > 20% | 0.2       | 30m      | A/B test traffic not balanced       |
| **LowABTestConversionRate**     | Conversion < 5%         | 0.05      | 1h       | Unusually low conversion            |
| **CompetitorDataFetchFailures** | Failures > 0.1/sec      | 0.1       | 10m      | Scraper failing                     |
| **StaleCompetitorData**         | Staleness > 24 hours    | 86400s    | 1h       | Competitor data outdated            |
| **HighActiveRequests**          | Active requests > 100   | 100       | 5m       | High concurrent load                |
| **HighMemoryUsage**             | Memory > 4GB            | 4GB       | 10m      | Memory leak or high load            |

### Configuring Alertmanager

Add to `prometheus.yml`:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'pricing-service/observability/prometheus_alerts.yml'
```

Configure Alertmanager (`alertmanager.yml`):

```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
    - match:
        severity: warning
      receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#pricing-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

---

## Request Tracing

### Request ID Flow

Every request is assigned a unique `request_id` for end-to-end tracing:

1. **Request arrives**: Middleware generates or extracts `X-Request-ID` header
2. **Sentry tagging**: Request ID attached to all Sentry events
3. **Logging**: Request ID included in all log messages
4. **Response**: Request ID returned in `X-Request-ID` response header

### Tracing a Request

1. Make API request, capture `X-Request-ID` from response:

   ```bash
   curl -v http://localhost:8000/score -H "Content-Type: application/json" -d '{...}'
   # Response header: X-Request-ID: abc-123-def-456
   ```

2. Search Sentry for request ID:
   - Navigate to Sentry → Search: `request_id:abc-123-def-456`
   - View all errors and transactions for this request

3. Search logs:

   ```bash
   grep "abc-123-def-456" pricing-service.log
   ```

4. Query Prometheus for metrics (requires label propagation):
   - Request IDs are not currently stored in metrics (high cardinality)
   - Use time range and endpoint filters instead

### Propagating Request ID

To propagate request IDs across services:

```python
import httpx

# Extract request ID from current request
request_id = request.headers.get('X-Request-ID')

# Pass to downstream service
response = httpx.get(
    'http://backend-api/competitor-data',
    headers={'X-Request-ID': request_id}
)
```

---

## Local Development

### Running Sentry (Optional)

For local development, Sentry is optional. If `SENTRY_DSN` is not set, the service will run without error tracking.

To enable Sentry locally:

```bash
# .env
SENTRY_DSN=https://your-dev-dsn@sentry.io/dev-project
ENVIRONMENT=development
RELEASE=dev
SENTRY_TRACES_SAMPLE_RATE=1.0  # Sample 100% in dev
```

### Running Prometheus + Grafana

Use Docker Compose for local setup:

```yaml
# docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./pricing-service/observability/prometheus_alerts.yml:/etc/prometheus/alerts.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - '9093:9093'
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

volumes:
  grafana-storage:
```

Prometheus config (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/alerts.yml'

scrape_configs:
  - job_name: 'pricing-service'
    static_configs:
      - targets: ['host.docker.internal:8000']
    metrics_path: '/metrics'
```

Start services:

```bash
docker-compose up -d
```

Access:

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- Alertmanager: http://localhost:9093

---

## Production Setup

### Sentry

1. Create Sentry project at https://sentry.io
2. Set environment variables:

   ```bash
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ENVIRONMENT=production
   RELEASE=$(git rev-parse --short HEAD)
   SENTRY_TRACES_SAMPLE_RATE=0.1  # Sample 10%
   ```

3. Deploy service with environment variables

### Prometheus

1. Deploy Prometheus server
2. Configure scrape targets:

   ```yaml
   scrape_configs:
     - job_name: 'pricing-service'
       static_configs:
         - targets: ['pricing-service-1:8000', 'pricing-service-2:8000']
   ```

3. Configure retention:
   ```bash
   --storage.tsdb.retention.time=30d
   ```

### Grafana

1. Deploy Grafana
2. Add Prometheus data source
3. Import dashboard from `grafana_dashboard.json`
4. Set up notification channels (Slack, PagerDuty, email)

### Alertmanager

1. Deploy Alertmanager
2. Configure notification receivers
3. Link Prometheus to Alertmanager
4. Test alerts with dummy data

### High Availability

For production HA setup:

- **Prometheus**: Use federation or Thanos for multi-instance setup
- **Grafana**: Use external database (PostgreSQL) for HA
- **Alertmanager**: Deploy in cluster mode with 3+ replicas

---

## Best Practices

### Metrics

1. **Keep cardinality low**: Avoid high-cardinality labels (e.g., request IDs, timestamps)
2. **Use histograms for latency**: Histograms allow flexible quantile calculation
3. **Counter for events**: Use counters for events that only increase (requests, errors)
4. **Gauge for current state**: Use gauges for values that go up and down (memory, active requests)

### Sentry

1. **Tag with context**: Always tag errors with request ID, user ID, property ID
2. **Filter noise**: Use before-send hooks to filter out low-priority errors
3. **Sample transactions**: Sample 10-20% of transactions to reduce costs
4. **Release tracking**: Always set release version to track regressions

### Alerting

1. **Alert on symptoms, not causes**: Alert on user-impacting issues (latency, errors), not internal metrics
2. **Set appropriate thresholds**: Use SLOs to determine alert thresholds
3. **Group related alerts**: Use `group_by` to avoid alert storms
4. **Runbooks**: Document response procedures for each alert

### Dashboards

1. **Start with high-level view**: Show overall health before drilling down
2. **Use consistent colors**: Red for errors, green for success, yellow for warnings
3. **Add annotations**: Mark deployments and incidents on timeseries
4. **Template variables**: Use variables for property ID, environment, etc.

---

## Troubleshooting

### Metrics not showing in Prometheus

1. Check metrics endpoint is accessible:

   ```bash
   curl http://localhost:8000/metrics
   ```

2. Check Prometheus scrape targets:
   - Navigate to Prometheus → Status → Targets
   - Verify target is "UP"

3. Check Prometheus logs:
   ```bash
   docker logs prometheus
   ```

### Sentry not capturing errors

1. Check `SENTRY_DSN` is set:

   ```bash
   echo $SENTRY_DSN
   ```

2. Check Sentry initialization:
   - Look for "✅ Sentry initialized" in service logs

3. Test Sentry:
   ```python
   import sentry_sdk
   sentry_sdk.capture_message("Test message")
   ```

### Grafana dashboard empty

1. Check Prometheus data source:
   - Grafana → Configuration → Data Sources
   - Test connection

2. Check time range:
   - Ensure dashboard time range includes recent data

3. Check PromQL queries:
   - Test queries directly in Prometheus UI
   - Verify metric names and labels

### Alerts not firing

1. Check alert rules loaded:
   - Prometheus → Status → Rules
   - Verify alerts are present

2. Check alert evaluation:
   - Prometheus → Alerts
   - See pending and firing alerts

3. Check Alertmanager:
   - Alertmanager UI → Status
   - Verify configuration loaded

---

## References

- **Sentry Documentation**: https://docs.sentry.io/
- **Prometheus Documentation**: https://prometheus.io/docs/
- **Grafana Documentation**: https://grafana.com/docs/
- **Alertmanager Documentation**: https://prometheus.io/docs/alerting/latest/alertmanager/
- **FastAPI Instrumentation**: https://fastapi.tiangolo.com/advanced/middleware/

---

**Next Steps:**

- Review [Learning Loop documentation](./LEARNING_LOOP.md) for model retraining observability
- Check [A/B Testing documentation](./AB_TESTING.md) for experiment monitoring
- See [Architecture documentation](./ARCHITECTURE.md) for system overview
