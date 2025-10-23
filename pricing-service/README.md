# Jengu Pricing ML Service

Machine learning-powered dynamic pricing engine for hospitality businesses.

## Features

- **Real-time Price Optimization**: Calculate optimal prices in milliseconds
- **Demand-Based Pricing**: Adjust prices based on occupancy and lead time
- **Competitor-Aware**: Factor in market pricing when available
- **Seasonal Intelligence**: Automatic seasonal and day-of-week adjustments
- **Confidence Intervals**: Statistical bounds for risk management
- **Explainable Pricing**: Get reasons for every price recommendation

## Quick Start

### Option 1: Run with Python (Development)

```bash
# Install Python 3.11+ if not already installed

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

The service will start on `http://localhost:8000`

### Option 2: Run with Docker (Production)

```bash
# Build the Docker image
docker build -t jengu-pricing-service .

# Run the container
docker run -p 8000:8000 jengu-pricing-service
```

### Option 3: Run with Docker Compose

```bash
# From the project root directory
docker-compose up pricing-service
```

## API Endpoints

### Health Check

```bash
GET http://localhost:8000/health
```

### Calculate Price

```bash
POST http://localhost:8000/score

{
  "entity": {
    "userId": "user-123",
    "propertyId": "prop-456"
  },
  "stay_date": "2025-11-01",
  "quote_time": "2025-10-22T12:00:00Z",
  "product": {
    "type": "standard",
    "refundable": false,
    "los": 2
  },
  "inventory": {
    "capacity": 50,
    "remaining": 10,
    "overbook_limit": 0
  },
  "market": {
    "comp_price_p10": 90.0,
    "comp_price_p50": 120.0,
    "comp_price_p90": 150.0
  },
  "context": {
    "season": "Summer",
    "day_of_week": 5,
    "weather": {}
  },
  "toggles": {
    "aggressive": false,
    "conservative": false,
    "use_ml": true,
    "use_competitors": true,
    "apply_seasonality": true
  },
  "allowed_price_grid": null
}
```

**Response:**

```json
{
  "price": 142.5,
  "price_grid": [128.25, 135.38, 142.5, 149.63, 156.75],
  "conf_band": {
    "lower": 128.25,
    "upper": 156.75
  },
  "expected": {
    "occ_now": 0.8,
    "occ_end_bucket": 0.9
  },
  "reasons": [
    "High demand: 80% occupancy",
    "Weekend premium",
    "Summer season pricing",
    "Market-aligned pricing (€120.00)"
  ],
  "safety": {
    "base_price_used": 142.5,
    "occupancy_rate": 0.8,
    "lead_days": 10,
    "season": "Summer",
    "day_of_week": 5
  }
}
```

### Submit Learning Data

```bash
POST http://localhost:8000/learn

{
  "batch": [
    {
      "quote_id": "quote-123",
      "booked": true,
      "price_shown": 120.0,
      "price_paid": 120.0
    }
  ]
}
```

## Pricing Algorithm

The service uses a multi-factor pricing model:

1. **Base Price**: Historical average or competitor median
2. **Seasonal Adjustment**: Spring (+10%), Summer (+30%), Fall (0%), Winter (-10%)
3. **Day of Week**: Weekend premium (+15-25%)
4. **Demand Multiplier**: Based on current occupancy (up to +50%)
5. **Lead Time**: Last-minute premium (+20%) or advance discount (-10%)
6. **Length of Stay**: Discounts for 3+ nights (-5%) or weekly (-15%)
7. **Refundability**: Premium for flexible bookings (+5%)
8. **Strategy Toggles**: Aggressive (+15%) or Conservative (-10%)

## Configuration

Edit `.env` file:

```env
BASE_PRICE=100.0
MIN_PRICE=50.0
MAX_PRICE=500.0
ENABLE_ML_PREDICTIONS=true
ENABLE_COMPETITOR_PRICING=true
ENABLE_SEASONAL_ADJUSTMENT=true
```

## Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test pricing endpoint
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d @test_request.json
```

## Deployment

### Railway / Heroku / Render

1. Connect your Git repository
2. Set port to 8000
3. Deploy automatically

### AWS / GCP / Azure

Use the Dockerfile for container-based deployment.

### Environment Variables

```
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=INFO
```

## Monitoring

The service exposes:

- `/health` - Health check endpoint
- `/model/info` - Model information and statistics

## Future Enhancements

- [ ] Train ML model on historical bookings
- [ ] A/B testing support
- [ ] Multi-property price optimization
- [ ] Real-time model updates
- [ ] Advanced forecasting with ARIMA/LSTM
- [ ] Custom pricing rules engine
- [ ] Integration with external data sources

## License

Proprietary - Jengu Platform

## Support

For issues or questions, contact: support@jengu.com
