# Pricing Service Setup Guide

## Overview

The Dynamic Pricing Engine is a **separate Python microservice** that needs to be started independently from the main Node.js backend.

---

## Current Status

🔴 **Not Running** - The service is not currently started, causing 500 errors:

```
POST /api/pricing/quote
TypeError: fetch failed
```

---

## Architecture

```
┌─────────────────────┐
│  Frontend (React)   │
│  Port: 5173         │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐      ┌──────────────────────┐
│  Backend (Node.js)  │─────→│  Pricing Service     │
│  Port: 3001         │←─────│  (Python FastAPI)    │
└─────────────────────┘      │  Port: 8001 (?)      │
                              └──────────────────────┘
```

**Flow**:
1. Frontend requests price quote from backend (`/api/pricing/quote`)
2. Backend proxies request to Python pricing service
3. Pricing service uses ML model to calculate price
4. Backend returns result to frontend

---

## Where Is The Service?

The pricing service code should be located in one of these places:

1. **Separate repository**: `travel-pricing-ml` or `pricing-engine` repo
2. **Subdirectory**: `backend/pricing-service/` or `ml-service/`
3. **Docker container**: May be containerized separately

**Check**:
```bash
# Search for Python pricing service
ls -la | grep -i pricing
ls -la backend/ | grep -i pricing
ls -la .. | grep -i pricing

# Search for Python files
find . -name "*.py" -type f | grep -i pricing
```

---

## Configuration

### Backend Configuration

**File**: [`backend/routes/pricing.ts`](backend/routes/pricing.ts:24)

The backend expects the pricing service at a specific URL:

```typescript
const callPricingScore = async (features: any) => {
  const response = await fetch('http://localhost:8001/pricing/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features }),
  })
  return response.json()
}
```

**Configuration Required**:
- **Host**: `localhost` (or Docker container name)
- **Port**: `8001` (default Python FastAPI port)
- **Endpoint**: `/pricing/score`

### Environment Variables

Add to [`backend/.env`](backend/.env):

```bash
# Pricing Service Configuration
PRICING_SERVICE_URL=http://localhost:8001
PRICING_SERVICE_ENABLED=true
```

---

## How to Start (If Service Exists)

### Option 1: Local Python Service

```bash
# Navigate to pricing service directory
cd pricing-service  # or wherever it's located

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start service
uvicorn main:app --reload --port 8001
```

### Option 2: Docker Container

```bash
# Build and start pricing service
docker-compose up pricing-service

# Or if using separate docker-compose file
cd pricing-service
docker-compose up
```

### Option 3: Serverless/Cloud

If deployed to cloud (AWS Lambda, Google Cloud Run, etc.):
- Update `PRICING_SERVICE_URL` in `.env` to point to cloud endpoint
- Ensure backend has network access to the service

---

## If Service Doesn't Exist

If the pricing service hasn't been created yet, you have two options:

### Option A: Disable Pricing Features (Quick)

Update [`backend/routes/pricing.ts`](backend/routes/pricing.ts:24):

```typescript
// Add feature flag check
router.post('/quote', authenticateUser, asyncHandler(async (req, res) => {
  // Check if pricing service is enabled
  if (process.env.PRICING_SERVICE_ENABLED !== 'true') {
    return sendError(res, 'SERVICE_UNAVAILABLE', 'Pricing service is not available')
  }

  // ... rest of the code
}))
```

And in `.env`:
```bash
PRICING_SERVICE_ENABLED=false
```

### Option B: Create Pricing Service (Advanced)

Create a minimal Python FastAPI service:

```bash
# Create new directory
mkdir pricing-service
cd pricing-service

# Create requirements.txt
cat > requirements.txt <<EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
scikit-learn==1.3.2
pandas==2.1.3
numpy==1.26.2
EOF

# Create main.py
cat > main.py <<EOF
from fastapi import FastAPI
from pydantic import BaseModel
import random

app = FastAPI(title="Pricing Service")

class PricingFeatures(BaseModel):
    features: dict

class PricingScore(BaseModel):
    recommended_price: float
    confidence: float
    demand_score: float

@app.post("/pricing/score", response_model=PricingScore)
async def calculate_price(data: PricingFeatures):
    # TODO: Replace with actual ML model
    # For now, return random price
    base_price = 100.0
    adjustment = random.uniform(0.8, 1.2)

    return PricingScore(
        recommended_price=base_price * adjustment,
        confidence=0.85,
        demand_score=0.75
    )

@app.get("/health")
async def health():
    return {"status": "healthy"}
EOF

# Install and run
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

---

## Verification

Once started, verify the service is running:

### 1. Health Check

```bash
curl http://localhost:8001/health
# Expected: {"status":"healthy"}
```

### 2. Test Pricing Endpoint

```bash
curl -X POST http://localhost:8001/pricing/score \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "date": "2025-06-01",
      "temperature": 28,
      "is_weekend": true,
      "occupancy": 0.85
    }
  }'

# Expected: {"recommended_price":120.5,"confidence":0.85,"demand_score":0.75}
```

### 3. Test From Frontend

1. Start all services (backend + pricing)
2. Go to Pricing Engine page
3. Click "Get Price Recommendation"
4. Should receive price quote without 500 error

---

## Troubleshooting

### Error: `fetch failed`

**Cause**: Pricing service is not running or URL is wrong

**Fix**:
1. Start pricing service on port 8001
2. Verify URL in `backend/routes/pricing.ts`
3. Check firewall allows localhost:8001

### Error: `Connection refused`

**Cause**: Port 8001 is used by another service

**Fix**:
1. Change port in pricing service startup command
2. Update port in `backend/routes/pricing.ts`

### Error: `Module not found`

**Cause**: Python dependencies not installed

**Fix**:
```bash
cd pricing-service
pip install -r requirements.txt
```

---

## Production Deployment

### Docker Compose

**File**: [`docker-compose.yml`](docker-compose.yml) (create if missing):

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - PRICING_SERVICE_URL=http://pricing-service:8001
    depends_on:
      - pricing-service

  pricing-service:
    build: ./pricing-service
    ports:
      - "8001:8001"
    environment:
      - MODEL_PATH=/app/models/pricing_model.pkl
    volumes:
      - ./models:/app/models

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

Start all services:
```bash
docker-compose up -d
```

---

## Summary

| Component | Port | Status | Action Required |
|-----------|------|--------|-----------------|
| Frontend | 5173 | ✅ Running | None |
| Backend | 3001 | ✅ Running | None |
| Pricing Service | 8001 | 🔴 Not Running | **Start service** |

**Next Steps**:
1. Locate or create pricing service
2. Start on port 8001
3. Verify health endpoint responds
4. Test pricing endpoint from backend

---

## Alternative: Mock Pricing Endpoint

If you don't need ML pricing yet, add a mock endpoint to the backend:

```typescript
// backend/server.ts
app.post('/api/pricing/quote', authenticateUser, asyncHandler(async (req, res) => {
  const { date, property_id } = req.body

  // Mock pricing logic
  const basePrice = 100
  const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6
  const adjustment = isWeekend ? 1.3 : 1.0

  res.json({
    recommended_price: basePrice * adjustment,
    confidence: 0.85,
    demand_score: 0.75,
    message: 'Mock pricing (ML service not available)'
  })
}))
```

This allows the frontend to work without the separate Python service.

---

**Created**: November 1, 2025
**Status**: Pricing service not running
**Priority**: Medium (feature unavailable but not blocking)
