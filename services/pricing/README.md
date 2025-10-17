# Jengu Pricing Service

**FastAPI microservice for dynamic pricing with occupancy-aware optimization**

## Overview

This Python service provides intelligent pricing recommendations for hospitality properties. It's designed to work alongside the main Express.js backend, handling all pricing logic and (eventually) machine learning models.

### Current Phase: MVP (Phase 1)

**Status**: Rule-based pricing with occupancy awareness

**Features**:

- Occupancy-aware pricing (higher prices when capacity is constrained)
- Seasonal adjustments (winter/spring/summer/autumn)
- Day-of-week pricing (weekends premium)
- Competitive market alignment (uses competitor p50 if available)
- Director toggles (fill vs rate strategy, risk mode)
- Price exploration grid for A/B testing
- Health check endpoints (/live, /ready, /version)

### Future Phase: ML-Powered (Phase 2)

**Planned Features**:

- Ensemble Kalman Filter (EnKF) for real-time demand forecasting
- Conformal prediction for uncertainty quantification
- Hierarchical Bayesian priors for cold-start properties
- Multi-armed bandit for price exploration
- Automated learning from booking outcomes

---

## Installation

### Prerequisites

- Python 3.10 or higher
- pip or uv (Python package manager)

### Setup

```bash
# Navigate to pricing service directory
cd services/pricing

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## Running the Service

### Development Mode

```bash
# From services/pricing directory
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Service will be available at**: `http://localhost:8000`

**Interactive API docs**: `http://localhost:8000/docs` (Swagger UI)

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## API Endpoints

### Health Checks

#### `GET /live`

Liveness probe - always returns 200 if service is running

```json
{
  "status": "alive",
  "timestamp": "2025-01-18T12:00:00"
}
```

#### `GET /ready`

Readiness probe - returns 200 when service is ready to serve requests

```json
{
  "status": "ready",
  "timestamp": "2025-01-18T12:00:00",
  "phase": "rule_based"
}
```

#### `GET /version`

Service version and metadata

```json
{
  "service": "Jengu Pricing Service",
  "version": "1.0.0-MVP",
  "phase": "Rule-based pricing (Phase 1)",
  "ml_models": "Not yet implemented (Phase 2)"
}
```

### Pricing Endpoints

#### `POST /score`

Get a price quote for a specific stay date and product

**Request Body**:

```json
{
  "entity": {
    "userId": "user-uuid",
    "propertyId": "property-uuid"
  },
  "stay_date": "2025-08-20",
  "quote_time": "2025-01-18T12:00:00Z",
  "product": {
    "type": "standard",
    "refundable": true,
    "los": 1
  },
  "inventory": {
    "capacity": 50,
    "remaining": 15,
    "overbook_limit": 0
  },
  "market": {
    "comp_price_p10": 80,
    "comp_price_p50": 110,
    "comp_price_p90": 150
  },
  "context": {
    "season": "summer",
    "day_of_week": 5,
    "weather": {}
  },
  "toggles": {
    "strategy_fill_vs_rate": 50,
    "exploration_pct": 5.0,
    "risk_mode": "balanced",
    "min_price": 60,
    "max_price": 220
  }
}
```

**Response**:

```json
{
  "price": 139.99,
  "price_grid": [125.99, 132.99, 139.99, 146.99, 153.99],
  "conf_band": {
    "lower": 125.99,
    "upper": 153.99
  },
  "expected": {
    "occ_now": 0.7,
    "occ_end_bucket": 0.9
  },
  "reasons": [
    "Base price: $110.00",
    "Season adjustment (summer): 1.25x",
    "Day of week (Fri)",
    "Current occupancy: 70.0%",
    "Strategy: 50% fill-vs-rate",
    "Risk mode: balanced"
  ],
  "safety": {
    "strategy": "rule_based_mvp",
    "version": "1.0.0"
  }
}
```

#### `POST /learn`

Submit booking outcomes for model training (Phase 2 feature)

**Request Body**:

```json
[
  {
    "quote_id": "quote-uuid-1",
    "entity": {
      "userId": "user-uuid",
      "propertyId": "property-uuid"
    },
    "stay_date": "2025-08-20",
    "product": {
      "type": "standard",
      "refundable": true,
      "los": 1
    },
    "context": {
      "season": "summer",
      "day_of_week": 5
    },
    "price_offered": 139.99,
    "booked": true,
    "cancelled": false,
    "revenue_realized": 139.99
  }
]
```

**Response**:

```json
{
  "success": true,
  "processed": 1,
  "message": "Phase 1: Outcomes logged, ML training deferred to Phase 2"
}
```

---

## Configuration

### Environment Variables

| Variable              | Default                 | Description                          |
| --------------------- | ----------------------- | ------------------------------------ |
| `HOST`                | `0.0.0.0`               | Host to bind to                      |
| `PORT`                | `8000`                  | Port to listen on                    |
| `LOG_LEVEL`           | `info`                  | Logging level                        |
| `PRICING_SERVICE_URL` | `http://localhost:8000` | Used by backend to call this service |

---

## Architecture

### Current (Phase 1)

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │─────▶│   Backend    │─────▶│   Pricing    │
│  (React)     │      │  (Express)   │      │   Service    │
│              │      │              │      │  (FastAPI)   │
└──────────────┘      └──────────────┘      └──────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │   Supabase   │
                      │  PostgreSQL  │
                      └──────────────┘
```

**Data Flow**:

1. Frontend calls `POST /api/pricing/quote`
2. Backend fetches context (capacity, market, weather) from database
3. Backend calls `POST /score` on pricing service
4. Pricing service calculates price using rules
5. Backend logs quote to `pricing_quotes` table
6. Backend returns price to frontend

### Future (Phase 2)

Same architecture, but pricing service will:

- Load historical data for training (via backend API or direct DB access)
- Use ML models instead of rules for pricing
- Update models incrementally via `/learn` endpoint

---

## Pricing Logic (Phase 1)

### Base Price

- Starts with competitor p50 (median) if available
- Defaults to $100 if no market data

### Adjustments

1. **Season** (multiplicative):
   - Winter: 0.85x
   - Spring: 1.0x
   - Summer: 1.25x
   - Autumn: 0.95x

2. **Day of Week** (multiplicative):
   - Friday, Saturday: 1.15x
   - Monday, Thursday: 1.05x
   - Other days: 1.0x

3. **Occupancy** (multiplicative):
   - \> 80% full: 1.3x (scarcity premium)
   - \> 60% full: 1.15x
   - < 30% full: 0.9x (discount to fill)

4. **Strategy** (fill vs rate):
   - 0-49: Lower prices (fill-oriented)
   - 50: Balanced
   - 51-100: Higher prices (rate-oriented)

5. **Risk Mode** (multiplicative):
   - Conservative: 0.95x
   - Balanced: 1.0x
   - Aggressive: 1.1x

### Constraints

- Min price: $50 (or toggle override)
- Max price: $500 (or toggle override)
- Refundable products: +10% premium
- Final price rounded to $X.99 for psychological effect

---

## Testing

### Manual Testing

```bash
# Health check
curl http://localhost:8000/live

# Get price quote
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "entity": {"userId": "test", "propertyId": "test"},
    "stay_date": "2025-08-20",
    "quote_time": "2025-01-18T12:00:00Z",
    "product": {"type": "standard", "refundable": false, "los": 1},
    "inventory": {"capacity": 50, "remaining": 15},
    "market": {"comp_price_p50": 110},
    "context": {"season": "summer", "day_of_week": 5},
    "toggles": {"strategy_fill_vs_rate": 50, "risk_mode": "balanced"}
  }'
```

### Unit Tests (Future)

```bash
pytest tests/
```

---

## Deployment

### Local Development

Run locally on port 8000 (default). Backend connects via `PRICING_SERVICE_URL=http://localhost:8000`.

### Docker (Future)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Cloud Deployment

Options for Phase 2:

- **Render**: Python web service (auto-scaling)
- **Fly.io**: Global edge deployment
- **AWS Lambda**: Serverless (using Mangum adapter)
- **Railway**: Simple Python deployment

---

## Roadmap

### Phase 1: MVP (Current) ✅

- [x] Rule-based pricing
- [x] Occupancy awareness
- [x] Season/DOW adjustments
- [x] Director toggles
- [x] Health endpoints
- [x] FastAPI structure

### Phase 2: ML Models (Planned)

- [ ] Ensemble Kalman Filter (EnKF)
- [ ] Conformal prediction
- [ ] Demand forecasting
- [ ] Learning loop (`/learn` endpoint)
- [ ] Model persistence (save/load)
- [ ] Cold-start handling

### Phase 3: Advanced Features (Future)

- [ ] Multi-armed bandit exploration
- [ ] Hierarchical Bayesian priors
- [ ] Real-time compset integration
- [ ] Weather-aware pricing
- [ ] Event detection (concerts, holidays)
- [ ] Revenue optimization metrics

---

## Troubleshooting

### Service won't start

```bash
# Check Python version
python --version  # Should be 3.10+

# Check dependencies
pip install -r requirements.txt

# Try running directly
python main.py
```

### Backend can't reach pricing service

1. Verify service is running: `curl http://localhost:8000/live`
2. Check `PRICING_SERVICE_URL` in backend `.env`
3. Ensure no firewall blocking port 8000

### Prices seem wrong

- Check toggle values (especially `strategy_fill_vs_rate` and `risk_mode`)
- Verify inventory data (capacity/remaining)
- Review `reasons` field in response for breakdown

---

## Contributing

When adding features:

1. Follow existing code structure
2. Add type hints (Pydantic models)
3. Update API docs in this README
4. Test endpoints manually before committing
5. Consider backward compatibility (Phase 1 → Phase 2)

---

## License

Proprietary - Jengu Platform
