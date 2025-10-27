# Observability Setup Guide

Quick start guide for setting up and using the observability stack.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Testing Locally](#testing-locally)
- [Viewing Metrics](#viewing-metrics)
- [Viewing Errors](#viewing-errors)
- [Setting Up Alerts](#setting-up-alerts)

---

## Quick Start

### 1. Install Dependencies

```bash
cd pricing-service
pip install -r requirements.txt
```

This installs:

- `sentry-sdk[fastapi]` - Error tracking
- `prometheus-client` - Metrics collection

### 2. Configure Environment Variables

Create or update `.env`:

```bash
# Sentry Configuration (Optional for local dev)
SENTRY_DSN=https://your-dsn@sentry.io/project-id
ENVIRONMENT=development
RELEASE=dev
SENTRY_TRACES_SAMPLE_RATE=1.0  # Sample 100% in dev

# General Config
PORT=8000
```

### 3. Start the Service

```bash
python main.py
```

You should see:

```
⚠️  SENTRY_DSN not set, error tracking disabled
(or)
✅ Sentry initialized (environment: development, release: dev)

🚀 Starting Jengu Pricing ML Service
   Environment: development
   Release: dev
```

### 4. Verify Metrics Endpoint

```bash
curl http://localhost:8000/metrics
```

Expected output:

```
# HELP pricing_api_latency_seconds API request latency in seconds
# TYPE pricing_api_latency_seconds histogram
pricing_api_latency_seconds_bucket{endpoint="/",method="GET",status_code="200",le="0.01"} 1
pricing_api_latency_seconds_bucket{endpoint="/",method="GET",status_code="200",le="0.025"} 1
...
```

---

## Environment Variables

### Required

None! The service works without Sentry or Prometheus configured.

### Optional - Sentry

| Variable                    | Default       | Description                                 |
| --------------------------- | ------------- | ------------------------------------------- |
| `SENTRY_DSN`                | -             | Sentry project DSN (enables error tracking) |
| `ENVIRONMENT`               | `development` | Environment name (dev, staging, prod)       |
| `RELEASE`                   | `1.0.0`       | Release version for tracking                |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1`         | Transaction sampling rate (0.0-1.0)         |

### Optional - General

| Variable    | Default | Description   |
| ----------- | ------- | ------------- |
| `PORT`      | `8000`  | Service port  |
| `LOG_LEVEL` | `INFO`  | Logging level |

---

## Testing Locally

### Test Metrics Collection

1. **Make some requests:**

```bash
# Health check
curl http://localhost:8000/health

# Score request
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "entity": {"userId": "user-123", "propertyId": "prop-456"},
    "stay_date": "2025-11-01",
    "quote_time": "2025-10-23T10:00:00Z",
    "product": {"type": "standard", "refundable": false, "los": 2},
    "inventory": {"capacity": 10, "remaining": 5, "overbook_limit": 2},
    "market": {"comp_price_p50": 100},
    "context": {"day_of_week": 5},
    "toggles": {"use_ml": true}
  }'
```

2. **Check metrics:**

```bash
curl http://localhost:8000/metrics | grep pricing_score_latency
```

Expected:

```
pricing_score_latency_seconds_bucket{pricing_method="ml_elasticity",le="0.01"} 1
pricing_score_latency_seconds_bucket{pricing_method="ml_elasticity",le="0.025"} 1
...
```

### Test Request Tracing

1. **Make request and capture request ID:**

```bash
curl -v http://localhost:8000/health 2>&1 | grep -i x-request-id
```

Output:

```
< X-Request-ID: abc-123-def-456
```

2. **Check logs for request ID:**

```bash
# Service logs will show the request ID
grep "abc-123-def-456" logs/pricing-service.log
```

### Test Error Tracking (with Sentry)

1. **Trigger an error:**

```bash
# Send invalid request
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

2. **Check Sentry:**

- Navigate to https://sentry.io/your-org/your-project/
- View recent issue
- See stack trace, request context, and request ID

---

## Viewing Metrics

### Option 1: Prometheus UI (Local)

1. **Start Prometheus:**

```bash
# Create prometheus.yml
cat > prometheus.yml <<EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'pricing-service'
    static_configs:
      - targets: ['host.docker.internal:8000']
    metrics_path: '/metrics'
EOF

# Run Prometheus in Docker
docker run -d -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

2. **Open Prometheus UI:**

Navigate to http://localhost:9090

3. **Query metrics:**

Try these queries:

```promql
# Request rate
rate(pricing_requests_total[5m])

# /score p95 latency
histogram_quantile(0.95, rate(pricing_score_latency_seconds_bucket[5m]))

# Error rate
rate(pricing_errors_total[5m])

# Active requests
pricing_active_requests
```

### Option 2: Grafana (Local)

1. **Start Grafana:**

```bash
docker run -d -p 3000:3000 grafana/grafana
```

2. **Configure:**

- Navigate to http://localhost:3000 (admin/admin)
- Add Prometheus data source: http://host.docker.internal:9090
- Import dashboard from `observability/grafana_dashboard.json`

3. **View dashboard:**

- Navigate to Dashboards → Jengu Pricing Service - Production Monitoring
- See all metrics visualized

---

## Viewing Errors

### With Sentry

1. **Configure Sentry:**

Set `SENTRY_DSN` in `.env` and restart service.

2. **View errors:**

- Navigate to https://sentry.io/your-org/your-project/
- Click on **Issues** to see grouped errors
- Click on **Performance** to see transaction traces

3. **Search by request ID:**

In Sentry search bar:

```
request_id:abc-123-def-456
```

### Without Sentry (Logs Only)

Check service logs:

```bash
tail -f logs/pricing-service.log | grep ERROR
```

---

## Setting Up Alerts

### 1. Start Alertmanager

```bash
# Create alertmanager.yml
cat > alertmanager.yml <<EOF
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#pricing-alerts'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
EOF

# Run Alertmanager
docker run -d -p 9093:9093 \
  -v $(pwd)/alertmanager.yml:/etc/alertmanager/alertmanager.yml \
  prom/alertmanager
```

### 2. Configure Prometheus

Update `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['host.docker.internal:9093']

rule_files:
  - '/etc/prometheus/alerts.yml'

scrape_configs:
  - job_name: 'pricing-service'
    static_configs:
      - targets: ['host.docker.internal:8000']
    metrics_path: '/metrics'
```

Mount alert rules:

```bash
docker run -d -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/observability/prometheus_alerts.yml:/etc/prometheus/alerts.yml \
  prom/prometheus
```

### 3. Test Alerts

1. **Trigger alert condition:**

```bash
# Generate high latency (if you have a slow endpoint)
for i in {1..100}; do
  curl http://localhost:8000/score -X POST -d '...' &
done
wait
```

2. **Check Prometheus alerts:**

Navigate to http://localhost:9090/alerts

3. **Check Alertmanager:**

Navigate to http://localhost:9093

4. **Check Slack:**

Look for alert in configured Slack channel.

---

## Docker Compose Setup (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  pricing-service:
    build: .
    ports:
      - '8000:8000'
    environment:
      - SENTRY_DSN=${SENTRY_DSN}
      - ENVIRONMENT=development
      - RELEASE=dev

  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./observability/prometheus_alerts.yml:/etc/prometheus/alerts.yml

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

Start all services:

```bash
docker-compose up -d
```

Access:

- Pricing Service: http://localhost:8000
- Metrics: http://localhost:8000/metrics
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- Alertmanager: http://localhost:9093

---

## Troubleshooting

### Metrics not updating

**Problem:** Metrics endpoint returns empty or stale data.

**Solution:**

1. Check service is running:

   ```bash
   curl http://localhost:8000/health
   ```

2. Make some requests to generate metrics

3. Check Prometheus scrape status:
   - Navigate to http://localhost:9090/targets
   - Ensure target is "UP"

### Sentry not capturing errors

**Problem:** Errors not appearing in Sentry.

**Solution:**

1. Verify `SENTRY_DSN` is set:

   ```bash
   echo $SENTRY_DSN
   ```

2. Check service logs for initialization message:

   ```
   ✅ Sentry initialized (environment: development, release: dev)
   ```

3. Test Sentry manually:
   ```python
   import sentry_sdk
   sentry_sdk.capture_message("Test from pricing service")
   ```

### Alerts not firing

**Problem:** Alert conditions met but no notification.

**Solution:**

1. Check Prometheus alerts page: http://localhost:9090/alerts
2. Verify alert is "Firing" (not just "Pending")
3. Check Alertmanager: http://localhost:9093
4. Verify notification channel (Slack webhook, email, etc.)

---

## Next Steps

- Read full documentation: [OBSERVABILITY.md](../../docs/developer/OBSERVABILITY.md)
- Import Grafana dashboard: `grafana_dashboard.json`
- Configure production Sentry project
- Set up production Prometheus + Grafana cluster
- Configure Slack/PagerDuty alerts

---

## Files Reference

| File                     | Description                              |
| ------------------------ | ---------------------------------------- |
| `sentry_config.py`       | Sentry initialization and configuration  |
| `prometheus_metrics.py`  | Metrics definitions and helper functions |
| `grafana_dashboard.json` | Pre-built Grafana dashboard              |
| `prometheus_alerts.yml`  | Alert rules for Prometheus               |
| `README.md`              | This file - quick start guide            |

---

## Support

For questions or issues:

- Check [OBSERVABILITY.md](../../docs/developer/OBSERVABILITY.md) for detailed documentation
- Review Prometheus queries at http://localhost:9090
- Search Sentry issues at https://sentry.io
