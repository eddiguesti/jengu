# Learning Loop & Weekly Retraining

**Status**: ✅ **COMPLETE** (Task 9)
**Date**: 2025-10-23

### Overview

This document describes the learning loop system that closes the feedback cycle by ingesting booking outcomes and automatically retraining models based on real-world performance.

The learning loop provides:
- **/learn endpoint** for ingesting booking outcomes
- **Outcomes storage** per property with deduplication
- **Weekly retraining** workflow with performance comparison
- **Drift detection** using KS tests and PSI
- **CI/CD automation** via GitHub Actions
- **Dashboard endpoints** for monitoring

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Learning Loop Architecture                       │
│                                                                          │
│  1. Booking Outcomes      2. Storage           3. Retraining            │
│  ┌──────────────┐        ┌─────────────┐      ┌──────────────┐         │
│  │ Frontend/    │──POST─▶│ /learn      │─────▶│ Outcomes     │         │
│  │ Backend      │        │ Endpoint    │      │ Storage      │         │
│  └──────────────┘        └─────────────┘      │ (Parquet)    │         │
│                                   │            └──────────────┘         │
│                                   │                   │                 │
│                                   ▼                   ▼                 │
│                          ┌─────────────┐      ┌──────────────┐         │
│                          │ In-Memory   │      │ Drift        │         │
│                          │ Accumulation│      │ Detection    │         │
│                          └─────────────┘      │ (KS/PSI)     │         │
│                                               └──────────────┘         │
│                                                       │                 │
│  4. Weekly Schedule      5. Training         6. Deploy                 │
│  ┌──────────────┐        ┌─────────────┐      ┌──────────────┐         │
│  │ GitHub       │──trigger│ Retrain     │─────▶│ Model        │         │
│  │ Actions      │        │ Workflow    │      │ Registry     │         │
│  │ (Cron)       │        │ (LightGBM)  │      │ (Versioned)  │         │
│  └──────────────┘        └─────────────┘      └──────────────┘         │
│                                   │                   │                 │
│                                   ▼                   ▼                 │
│                          ┌─────────────┐      ┌──────────────┐         │
│                          │ Compare     │      │ Production   │         │
│                          │ vs Previous │      │ Deployment   │         │
│                          └─────────────┘      └──────────────┘         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Enhanced /learn Endpoint

**File**: [pricing-service/main.py](../../pricing-service/main.py) (lines 204-281)

**Features**:
- Accepts batch of booking outcomes
- Validates required fields
- Persists to parquet storage per property
- Deduplicates by timestamp + quoted_price
- Groups outcomes by property_id
- Returns storage statistics

**API Request**:

```bash
POST /learn
Content-Type: application/json

{
  "batch": [
    {
      "property_id": "property-uuid",
      "timestamp": "2024-10-23T14:30:00Z",
      "quoted_price": 205.50,
      "accepted": true,
      "final_price": 205.50,
      "time_to_book": 2.5,
      "comp_p10": 120.00,
      "comp_p50": 180.00,
      "comp_p90": 250.00,
      "context": {
        "season": "Fall",
        "day_of_week": 5,
        "temperature": 18.5,
        "is_holiday": 0,
        "occupancy_rate": 0.75,
        "lead_time": 14,
        "length_of_stay": 2,
        "is_refundable": 0
      }
    },
    {
      "property_id": "property-uuid",
      "timestamp": "2024-10-23T15:00:00Z",
      "quoted_price": 195.00,
      "accepted": false
    }
  ]
}
```

**Response**:

```json
{
  "success": true,
  "processed": 2,
  "message": "Stored 2 outcomes across 1 properties"
}
```

**Required Fields**:
- `property_id` (string): Property UUID
- `timestamp` (string): ISO timestamp of quote
- `quoted_price` (float): Price shown to customer
- `accepted` (boolean): Whether booking was completed

**Optional Fields**:
- `final_price` (float): Actual price paid (if different from quoted)
- `time_to_book` (float): Hours between quote and booking
- `comp_p10`, `comp_p50`, `comp_p90` (float): Competitor snapshot
- `context` (object): Contextual features at time of quote

### 2. Outcomes Storage

**File**: [pricing-service/learning/outcomes_storage.py](../../pricing-service/learning/outcomes_storage.py)

**Storage Format**: Apache Parquet (columnar, compressed)

**Features**:
- Validates outcomes before storage
- Deduplicates by (timestamp, quoted_price)
- Stores per property: `data/outcomes/{property_id}_outcomes.parquet`
- Efficient query by date range
- Statistics calculation
- Export for training

**Methods**:

```python
from learning.outcomes_storage import get_outcomes_storage

outcomes_storage = get_outcomes_storage()

# Store outcomes
result = outcomes_storage.store_outcomes(
    property_id='property-uuid',
    outcomes=[{...}, {...}],
    deduplicate=True
)

# Get outcomes
df = outcomes_storage.get_outcomes(
    property_id='property-uuid',
    start_date='2024-01-01',
    end_date='2024-10-23',
    limit=10000
)

# Get statistics
stats = outcomes_storage.get_statistics('property-uuid')
# Returns: total_records, date_range, acceptance_rate, avg_price, data_quality, recent_activity

# Export for training
filepath = outcomes_storage.export_for_training(
    property_id='property-uuid',
    start_date='2024-01-01'
)

# List properties
properties = outcomes_storage.list_properties()

# Delete old outcomes
outcomes_storage.delete_outcomes(
    property_id='property-uuid',
    before_date='2024-01-01'
)
```

**API Endpoints**:

```
GET /learn/outcomes/{property_id}/stats
GET /learn/outcomes/properties
```

**Example Response** (`/learn/outcomes/{property_id}/stats`):

```json
{
  "success": true,
  "property_id": "property-uuid",
  "stats": {
    "exists": true,
    "total_records": 5432,
    "date_range": {
      "min": "2024-01-01T00:00:00Z",
      "max": "2024-10-23T14:30:00Z"
    },
    "acceptance_rate": 0.6234,
    "avg_quoted_price": 198.50,
    "avg_final_price": 195.30,
    "file_size_mb": 2.4,
    "data_quality": {
      "missing_final_price": 0,
      "missing_comp_bands": 120,
      "missing_context": 45
    },
    "recent_activity": {
      "last_7_days": 156,
      "acceptance_rate_7d": 0.6410
    }
  }
}
```

### 3. Weekly Retraining Workflow

**File**: [pricing-service/training/retrain_weekly.py](../../pricing-service/training/retrain_weekly.py)

**Workflow**:
1. Check if retraining should occur (new outcomes threshold)
2. Prepare training data from stored outcomes
3. Train new model with LightGBM
4. Compare performance vs previous model
5. Deploy if improved (or within 1% tolerance)
6. Log results and version

**Retraining Criteria**:
- Minimum 1000 total outcomes
- Minimum 100 new outcomes in last 7 days
- Can be overridden with `--force` flag

**Model Comparison**:
- **Conversion models**: Compare AUC
  - Deploy if new AUC > previous AUC - 0.01
- **Regression models**: Compare RMSE
  - Deploy if new RMSE < previous RMSE + 1%

**CLI Usage**:

```bash
cd pricing-service

# Retrain all properties
python training/retrain_weekly.py --all-properties

# Retrain specific property
python training/retrain_weekly.py --property-id {property-uuid}

# Force retrain (ignore criteria)
python training/retrain_weekly.py --property-id {property-uuid} --force

# Custom thresholds
python training/retrain_weekly.py \
  --all-properties \
  --min-new-outcomes 50 \
  --min-total-outcomes 500
```

**Output**:

```
================================================================================
Retraining conversion model for property property-uuid
================================================================================

Proceeding with retrain: Ready to retrain: 5432 total outcomes, 156 new in last 7 days
Loaded 5432 outcomes
Prepared 45 features
Training model...
Training complete. Best iteration: 87
Previous model AUC: 0.8512
New model AUC: 0.8623 (improvement: +1.30%)
✅ New model deployed: models/property-uuid_conversion_v20241023_145632.bin

================================================================================
RETRAINING SUMMARY
================================================================================
Total properties: 10
Successfully retrained: 7
Trained but not deployed: 1
Skipped: 2
Failed: 0
================================================================================
```

### 4. Drift Detection

**File**: [pricing-service/learning/drift_detection.py](../../pricing-service/learning/drift_detection.py)

**Drift Detection Methods**:

1. **Kolmogorov-Smirnov (KS) Test**
   - Tests if two distributions are significantly different
   - P-value < 0.05 indicates drift
   - Good for continuous features (price, temperature, occupancy)

2. **Population Stability Index (PSI)**
   - Measures distribution shift between two periods
   - PSI < 0.1: No significant change
   - PSI 0.1-0.2: Small change
   - PSI > 0.2: Significant drift

**Drift Decision Logic**:
- Calculate KS test and PSI for each feature
- Mark feature as drifted if either test indicates drift
- Trigger early retraining if >25% of features drifted

**CLI Usage**:

```bash
cd pricing-service

# Detect drift for a property
python -m learning.drift_detection \
  --property-id {property-uuid} \
  --features quoted_price comp_p50 occupancy_rate lead_time \
  --reference-days 30 \
  --current-days 7
```

**Output**:

```
================================================================================
DRIFT DETECTION RESULTS
================================================================================

Property: property-uuid
Reference period: 30 days (2543 samples)
Current period: 7 days (156 samples)

Drifted features: 3/6 (50.0%)
Trigger retrain: True

Drifted features: comp_p50, occupancy_rate, lead_time

Feature details:
  ⚠️  comp_p50:
      KS p-value: 0.0012 (drifted: True)
      PSI: 0.2543 (drifted: True)
  ⚠️  occupancy_rate:
      KS p-value: 0.0234 (drifted: True)
      PSI: 0.1876 (drifted: False)
  ⚠️  lead_time:
      KS p-value: 0.1234 (drifted: False)
      PSI: 0.2123 (drifted: True)
================================================================================
```

**Exit Codes**:
- 0: No drift detected
- 1: Drift detected, recommend retraining

**Integration with Retraining**:

Drift detection runs automatically in GitHub Actions before retraining:

```yaml
# .github/workflows/weekly-retrain.yml
jobs:
  drift-detection:
    steps:
      - name: Run drift detection
        run: |
          for prop in $properties; do
            if python -m learning.drift_detection --property-id "$prop"; then
              echo "No drift"
            else
              echo "⚠️  Drift detected, triggering retrain"
            fi
          done
```

### 5. GitHub Actions CI/CD

**File**: [.github/workflows/weekly-retrain.yml](../../.github/workflows/weekly-retrain.yml)

**Schedule**: Every Sunday at 2 AM UTC

**Workflow Jobs**:

1. **Drift Detection**
   - Check all properties for drift
   - Generate drift report
   - Upload as artifact

2. **Retrain Models**
   - Run retraining for all properties
   - Matrix strategy for model types (conversion, adr, revpar)
   - Upload results and new models as artifacts

3. **Deploy Models**
   - Download new models
   - Deploy to production (S3, GCS, or K8s volume)
   - Update model registry
   - Trigger service restart (optional)

4. **Notify**
   - Send Slack notification
   - Post summary to GitHub
   - Alert on failures

**Manual Trigger**:

```bash
# Trigger via GitHub CLI
gh workflow run weekly-retrain.yml

# Trigger specific property
gh workflow run weekly-retrain.yml \
  -f property_id=property-uuid \
  -f force=true
```

**Notifications** (configure in GitHub Secrets):
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: For S3 deployment
- `KUBE_CONFIG`: For Kubernetes deployment

### 6. Dashboard Endpoints

**API Endpoints for Monitoring**:

```
GET /dashboard/overview
GET /dashboard/model-performance
```

**Dashboard Overview** (`/dashboard/overview`):

```json
{
  "success": true,
  "overview": {
    "total_properties": 10,
    "total_outcomes": 54320,
    "recent_outcomes_7d": 1245,
    "avg_acceptance_rate": 0.6234,
    "total_models": 30,
    "cached_models": 10
  },
  "properties": [
    {
      "property_id": "property-uuid-1",
      "total_outcomes": 5432,
      "recent_outcomes_7d": 156,
      "acceptance_rate": 0.6234,
      "avg_price": 198.50
    },
    ...
  ],
  "timestamp": "2024-10-23T15:00:00Z"
}
```

**Model Performance Dashboard** (`/dashboard/model-performance`):

```json
{
  "success": true,
  "summary": {
    "total_properties": 10,
    "avg_auc": 0.8456,
    "avg_num_features": 58.3,
    "models_count": 10
  },
  "performance_by_property": {
    "property-uuid-1": {
      "conversion": [
        {
          "version": "v20241023_145632",
          "timestamp": "20241023_145632",
          "metrics": {
            "auc": 0.8623,
            "logloss": 0.4123,
            "accuracy": 0.7892
          },
          "num_features": 62
        }
      ]
    }
  }
}
```

---

## Deployment Guide

### 1. Configure Outcomes Storage

```bash
cd pricing-service

# Create outcomes directory
mkdir -p data/outcomes
mkdir -p data/training
mkdir -p data/retraining
```

### 2. Start Ingesting Outcomes

**From Frontend/Backend**:

```javascript
// After booking completes or quote is made
const outcome = {
  property_id: propertyId,
  timestamp: new Date().toISOString(),
  quoted_price: priceShown,
  accepted: bookingCompleted,
  final_price: actualPricePaid,
  time_to_book: hoursToBook,
  comp_p10: competitorData.p10,
  comp_p50: competitorData.p50,
  comp_p90: competitorData.p90,
  context: {
    season: 'Fall',
    day_of_week: 5,
    temperature: 18.5,
    occupancy_rate: 0.75,
    lead_time: 14,
    length_of_stay: 2
  }
};

// Send to pricing service
await fetch('http://localhost:8000/learn', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ batch: [outcome] })
});
```

### 3. Set Up Weekly Retraining

**Option A: GitHub Actions** (Recommended)

1. Copy `.github/workflows/weekly-retrain.yml` to your repository
2. Configure secrets:
   ```
   SLACK_WEBHOOK_URL (optional)
   AWS_ACCESS_KEY_ID (if using S3)
   AWS_SECRET_ACCESS_KEY (if using S3)
   ```
3. Enable GitHub Actions in repository settings
4. Workflow runs automatically every Sunday at 2 AM

**Option B: Cron Job**

```bash
# Add to crontab
0 2 * * 0 cd /path/to/pricing-service && python training/retrain_weekly.py --all-properties
```

**Option C: Manual**

```bash
# Run retraining manually when needed
cd pricing-service
python training/retrain_weekly.py --all-properties
```

### 4. Monitor Drift

```bash
# Check drift weekly
cd pricing-service
python -m learning.drift_detection --property-id {property-uuid}

# If exit code is 1 (drift detected), trigger early retrain
if [ $? -eq 1 ]; then
  python training/retrain_weekly.py --property-id {property-uuid} --force
fi
```

### 5. View Dashboard Metrics

```bash
# Get overview
curl http://localhost:8000/dashboard/overview

# Get model performance
curl http://localhost:8000/dashboard/model-performance

# Get outcomes stats for property
curl http://localhost:8000/learn/outcomes/{property-uuid}/stats
```

---

## Best Practices

### Outcome Ingestion

1. **Batch outcomes**: Send in batches (e.g., every hour or daily) rather than one at a time
2. **Include context**: Always include contextual features (weather, season, etc.) for better retraining
3. **Handle failures**: Implement retry logic for /learn endpoint
4. **Monitor ingestion**: Track successful vs failed ingestions

### Retraining

1. **Don't retrain too frequently**: Weekly is usually sufficient
2. **Monitor comparison metrics**: Always compare new model vs previous
3. **Don't deploy regressions**: Only deploy if new model is better or within tolerance
4. **Keep multiple versions**: Retain last 3 model versions for rollback

### Drift Detection

1. **Monitor key features**: Focus on features most important to model (comp_p50, occupancy_rate, lead_time)
2. **Use appropriate thresholds**: KS p-value 0.05, PSI 0.2 are good defaults
3. **Combine methods**: Use both KS test and PSI for robustness
4. **Trigger early retrain**: If >25% of features drifted, retrain immediately

### Data Quality

1. **Validate outcomes**: Ensure required fields are present
2. **Handle missing data**: Outcomes without context can still be useful
3. **Monitor data quality**: Track missing fields in `/learn/outcomes/{property_id}/stats`
4. **Clean old data**: Delete outcomes older than 2 years to keep storage manageable

---

## Monitoring

### Key Metrics to Track

1. **Outcomes Ingestion**:
   - Total outcomes per property
   - Outcomes ingested in last 7 days
   - Acceptance rate trend
   - Data quality (missing fields %)

2. **Model Retraining**:
   - Retraining frequency per property
   - Success rate (deployed vs trained)
   - Average improvement (AUC, RMSE)
   - Training duration

3. **Drift Detection**:
   - % of features drifted
   - Drift alerts triggered
   - Time since last drift check

4. **Model Performance**:
   - Current model AUC/RMSE
   - Performance vs baseline
   - Feature importance stability

### Alerts

Set up alerts for:
- Retraining failures
- Model performance regression
- Significant drift (>50% of features)
- Low outcome volume (<100 in 7 days)
- Data quality issues (>20% missing fields)

---

## Troubleshooting

### Issue: /learn endpoint returns 500 error

**Symptoms**: Outcomes not being stored

**Solutions**:
1. Check logs: `tail -f pricing-service/logs/app.log`
2. Verify outcomes format (required fields present)
3. Check disk space: `df -h`
4. Verify parquet write permissions

### Issue: Retraining skipped (insufficient outcomes)

**Symptoms**: "Skipping retrain: Insufficient new outcomes"

**Solutions**:
1. Lower thresholds: `--min-new-outcomes 50 --min-total-outcomes 500`
2. Force retrain: `--force` flag
3. Check outcomes ingestion: `GET /learn/outcomes/{property-id}/stats`
4. Verify outcomes are being sent from frontend/backend

### Issue: New model not deployed (performance regression)

**Symptoms**: "New model not deployed (performance regression)"

**Solutions**:
1. Check training data quality (missing features, imbalanced classes)
2. Increase training data size (wait for more outcomes)
3. Tune hyperparameters (`training/train_lightgbm.py`)
4. Review feature engineering (ensure features match production)

### Issue: Drift detected but model performs well

**Symptoms**: Drift alerts but high AUC

**Solutions**:
1. Adjust drift thresholds (increase PSI threshold to 0.25)
2. Drift may be benign (seasonal shift)
3. Review drifted features (non-critical features OK to drift)
4. Consider manual review before retraining

---

## Summary

### ✅ Completed Features

- **Enhanced /learn endpoint** with outcomes storage and validation
- **Outcomes storage** using Parquet with deduplication
- **Weekly retraining workflow** with performance comparison
- **Drift detection** using KS test and PSI
- **GitHub Actions CI/CD** for automated retraining
- **Dashboard endpoints** for monitoring outcomes and model performance
- **Comprehensive CLI tools** for manual retraining and drift detection

### 📊 Acceptance Criteria Status

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| New bookings appear in dataset | ✅ | /learn endpoint stores to parquet |
| Weekly retrain increments version | ✅ | retrain_weekly.py with versioning |
| Drift detector logs when breached | ✅ | drift_detection.py with KS/PSI |
| Dashboard shows metrics trend | ✅ | /dashboard/overview and /dashboard/model-performance |

---

**Last Updated**: 2025-10-23
**Status**: ✅ **TASK 9 COMPLETE**
