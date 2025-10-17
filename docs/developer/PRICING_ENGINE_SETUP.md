# Pricing Engine Setup Guide

**Complete setup instructions for the Jengu Dynamic Pricing Engine**

**Status**: Phase 1 (MVP) - Rule-based pricing with occupancy awareness
**Date**: 2025-01-18

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Database Setup](#database-setup)
5. [Python Service Setup](#python-service-setup)
6. [Backend Setup](#backend-setup)
7. [Frontend Integration](#frontend-integration)
8. [Testing the System](#testing-the-system)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Next Steps (Phase 2)](#next-steps-phase-2)

---

## Overview

The Jengu Pricing Engine is a microservice-based dynamic pricing system that provides:

- **Occupancy-aware pricing**: Adjusts prices based on availability
- **Seasonal intelligence**: Higher prices during peak seasons
- **Day-of-week optimization**: Weekend premiums
- **Competitive alignment**: Uses market data when available
- **Director toggles**: User-controlled strategy parameters
- **Learning capability**: Records outcomes for future ML training (Phase 2)

### Current Phase: MVP (Phase 1)

**What works**:

- Rule-based pricing logic
- Full API integration
- Database tracking (quotes & outcomes)
- Frontend UI (already exists!)
- Health checks and monitoring

**Not yet implemented** (Phase 2):

- Machine learning models (EnKF, conformal prediction)
- Automated learning from outcomes
- Demand forecasting with ML
- Advanced optimization algorithms

---

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │─────▶│   Backend    │─────▶│   Pricing    │─────▶│   Python     │
│  (React)     │      │  (Express)   │      │   Routes     │      │   Service    │
│              │◀─────│              │◀─────│              │◀─────│  (FastAPI)   │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │   Supabase   │
                      │  PostgreSQL  │
                      └──────────────┘
```

**Data Flow**:

1. Frontend (PricingEngine.tsx) calls `POST /api/pricing/quote`
2. Backend fetches context (capacity, market, weather) from database
3. Backend calls Python service `POST /score`
4. Python service calculates price using rules
5. Backend logs quote to `pricing_quotes` table
6. Backend returns price to frontend

**New Components**:

- **Database**: 3 new tables (pricing_quotes, pricing_outcomes, inventory_snapshots)
- **Backend**: `/api/pricing/*` endpoints in `routes/pricing.ts`
- **Python Service**: FastAPI microservice in `services/pricing/`
- **Frontend**: API client in `lib/api/services/pricing.ts`

---

## Prerequisites

### System Requirements

- **Node.js**: 20+ (for backend)
- **Python**: 3.10+ (for pricing service)
- **pnpm**: Latest version (monorepo package manager)
- **Supabase**: Active project with credentials

### Environment Variables

**Backend** (`backend/.env`):

```env
# Existing variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NEW: Pricing service URL
PRICING_SERVICE_URL=http://localhost:8000

# NEW: Optional - enable automated learning (Phase 2)
ENABLE_CRON=false
```

**Frontend** (`frontend/.env`):

```env
# Existing variables (no changes needed)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Database Setup

### Step 1: Run Migration SQL

The migration creates 3 new tables and adds RLS policies.

**Option A: Supabase Dashboard (Recommended)**

1. Open your Supabase project
2. Navigate to **SQL Editor**
3. Copy contents of `backend/migrations/add_pricing_engine_tables.sql`
4. Paste into SQL editor
5. Click **Run**

**Option B: Supabase CLI**

```bash
# From project root
cd backend/migrations
supabase db push add_pricing_engine_tables.sql
```

### Step 2: Verify Tables

Run this query in Supabase SQL editor:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('pricing_quotes', 'pricing_outcomes', 'inventory_snapshots');
```

You should see all 3 tables listed.

### Step 3: Verify Indexes

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'pricing%';
```

Should show indexes for queries and foreign keys.

### Step 4: Set Capacity Configuration (Optional)

Add default capacity to your business settings:

```sql
UPDATE business_settings
SET capacity_config = '{"standard": 50, "premium": 10}'::jsonb
WHERE userid = 'your-user-id';
```

This provides fallback capacity when inventory snapshots aren't available.

---

## Python Service Setup

### Step 1: Install Python Dependencies

```bash
# Navigate to pricing service
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

### Step 2: Test Python Service

```bash
# Start the service (from services/pricing)
python main.py
```

You should see:

```
🚀 Starting Jengu Pricing Service...
📍 Phase 1: Rule-based pricing with occupancy awareness
🔮 Phase 2: ML models (coming soon)
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Verify Health Endpoints

Open a new terminal:

```bash
# Check liveness
curl http://localhost:8000/live

# Check readiness
curl http://localhost:8000/ready

# Check version
curl http://localhost:8000/version
```

All should return 200 OK with JSON responses.

### Step 4: Test Pricing Calculation

```bash
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

Should return a price quote with reasoning.

---

## Backend Setup

### Step 1: Verify Routes Registered

The pricing routes should already be registered in `server.ts`. Check:

```bash
# From backend directory
grep "pricingRouter" server.ts
```

Should see:

```typescript
import pricingRouter from './routes/pricing.js'
// ...
app.use('/api/pricing', pricingRouter)
```

### Step 2: Update Environment

Edit `backend/.env` and add:

```env
PRICING_SERVICE_URL=http://localhost:8000
```

### Step 3: Restart Backend

```bash
# From backend directory
pnpm run dev
```

You should see the new pricing endpoints listed in the startup message:

```
💰 Dynamic Pricing Engine:
   - POST /api/pricing/quote (get price quote)
   - POST /api/pricing/learn (submit outcomes for ML)
   - GET  /api/pricing/check-readiness
```

### Step 4: Test Backend Endpoints

**Important**: You need a valid JWT token for these requests.

```bash
# Get a token by logging in via frontend, then:

# Check readiness
curl -X GET http://localhost:3001/api/pricing/check-readiness \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get price quote
curl -X POST http://localhost:3001/api/pricing/quote \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "your-property-id",
    "stayDate": "2025-08-20",
    "product": {"type": "standard", "refundable": false, "los": 1},
    "toggles": {
      "strategy_fill_vs_rate": 50,
      "risk_mode": "balanced",
      "min_price": 60,
      "max_price": 220
    }
  }'
```

---

## Frontend Integration

### Current Status

The frontend Pricing Engine UI ([PricingEngine.tsx](../../frontend/src/pages/PricingEngine.tsx)) already exists with 1,090 lines of sophisticated UI!

**What's already there**:

- Strategy selection (conservative, balanced, aggressive)
- Parameter tuning (demand sensitivity, price aggression, occupancy target)
- Forecast horizon selector (7, 14, 30, 60 days)
- Beautiful visualizations (charts, tables)
- Export to CSV functionality
- Business impact analysis

**What we added**:

- API client (`lib/api/services/pricing.ts`) to connect to backend
- Type-safe request/response interfaces
- Convenience functions for range queries

### Integration Options

**Option A: Keep Existing UI (Recommended for Phase 1)**

The existing UI works perfectly with mock data. You can:

1. Continue using it for demos and testing
2. Add a "Connect to Backend" toggle later
3. Incrementally replace mock data with API calls

**Option B: Wire Up API Calls (Future Enhancement)**

When ready to connect to the backend:

1. Replace `generatePricingData()` with API calls
2. Use `getPricingQuotesForRange()` from `lib/api/services/pricing.ts`
3. Map responses to existing data structure
4. Add loading states and error handling

**Example integration** (for reference):

```typescript
import { getPricingQuotesForRange } from '../lib/api'

// Replace generatePricingData() with:
const fetchPricingDataFromBackend = async () => {
  const propertyId = uploadedFiles[0]?.id // Get from context
  const startDate = new Date().toISOString().split('T')[0]

  const quotes = await getPricingQuotesForRange(
    propertyId,
    startDate,
    forecastHorizon,
    { type: 'standard', refundable: false, los: 1 },
    {
      strategy_fill_vs_rate: priceAggression * 100,
      risk_mode: selectedStrategy,
      min_price: 50,
      max_price: 500,
    }
  )

  // Map to existing data structure
  return quotes.map(quote => ({
    date: quote.stay_date,
    day: new Date(quote.stay_date).toLocaleDateString('en-US', { weekday: 'short' }),
    current_price: basePrice,
    optimized_price: quote.data.price,
    demand_forecast: 70,
    occupancy_current: 75,
    occupancy_optimized: quote.data.expected?.occ_end_bucket * 100 || 80,
    revenue_current: basePrice * 75,
    revenue_optimized: quote.data.price * (quote.data.expected?.occ_end_bucket * 100 || 80),
  }))
}
```

---

## Testing the System

### End-to-End Test Checklist

**1. Database Setup** ✓

- [ ] Tables created successfully
- [ ] Indexes exist
- [ ] RLS policies applied
- [ ] capacity_config set in business_settings

**2. Python Service** ✓

- [ ] Service starts without errors
- [ ] `/live` returns 200
- [ ] `/ready` returns 200
- [ ] `/score` returns valid price quote
- [ ] Pricing logic applies all adjustments (season, DOW, occupancy)

**3. Backend API** ✓

- [ ] Server starts with pricing routes registered
- [ ] `PRICING_SERVICE_URL` configured
- [ ] `/api/pricing/check-readiness` passes all checks
- [ ] `/api/pricing/quote` returns price and logs to database
- [ ] `/api/pricing/learn` accepts outcomes (Phase 2)

**4. Frontend** ✓

- [ ] Pricing Engine page loads
- [ ] Strategy selection works
- [ ] Parameter sliders update calculations
- [ ] Charts render correctly
- [ ] Export CSV works

**5. Integration** (Optional for Phase 1)

- [ ] Frontend can call backend API
- [ ] Backend can reach Python service
- [ ] Database logs quotes correctly
- [ ] Error handling works gracefully

### Manual Test Scenarios

**Scenario 1: Weekend Premium Pricing**

Request a quote for Friday/Saturday:

- Should see 15% price increase vs weekday
- Reasons should mention "Day of week (Fri/Sat)"

**Scenario 2: High Occupancy Pricing**

Request with `capacity: 50, remaining: 5` (90% full):

- Should see 30% premium (scarcity pricing)
- Reasons should mention "Current occupancy: 90.0%"

**Scenario 3: Low Occupancy Discount**

Request with `capacity: 50, remaining: 40` (20% full):

- Should see 10% discount
- Reasons should mention "Current occupancy: 20.0%"

**Scenario 4: Strategy Adjustment**

- Conservative: Lower prices (fill-oriented)
- Balanced: Standard prices
- Aggressive: Higher prices (rate-oriented)

---

## Deployment

### Development Mode

**Backend + Frontend** (default):

```bash
# Terminal 1: Backend
cd backend
pnpm run dev

# Terminal 2: Frontend
cd frontend
pnpm run dev
```

**Python Service**:

```bash
# Terminal 3: Pricing Service
cd services/pricing
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

### Production Deployment

**Option A: All-in-One Server** (Simple)

1. Deploy Node.js app (backend + frontend build)
2. Run Python service on same server (port 8000)
3. Set `PRICING_SERVICE_URL=http://localhost:8000`

**Option B: Microservices** (Recommended)

1. **Frontend**: Static hosting (Vercel, Netlify, Cloudflare Pages)
2. **Backend**: Node.js hosting (Render, Railway, Fly.io)
3. **Python Service**: Python hosting (Render, Railway, Fly.io, AWS Lambda)

**Environment variables**:

```env
# Backend .env
PRICING_SERVICE_URL=https://pricing-service.yourplatform.com

# Frontend .env
VITE_API_URL=https://api.yourplatform.com
```

**Docker Deployment** (Future):

```yaml
# docker-compose.yml (example)
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - PRICING_SERVICE_URL=http://pricing:8000
    ports:
      - '3001:3001'

  pricing:
    build: ./services/pricing
    ports:
      - '8000:8000'

  frontend:
    build: ./frontend
    environment:
      - VITE_API_URL=http://backend:3001
    ports:
      - '5173:5173'
```

---

## Troubleshooting

### Python Service Issues

**Problem**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:

```bash
cd services/pricing
pip install -r requirements.txt
```

**Problem**: Port 8000 already in use

**Solution**:

```bash
# Find process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

### Backend Connection Issues

**Problem**: Backend can't reach pricing service

**Solution**:

1. Verify Python service is running: `curl http://localhost:8000/live`
2. Check `PRICING_SERVICE_URL` in backend `.env`
3. Check firewall/antivirus not blocking port 8000

**Problem**: `pricing_quotes` table doesn't exist

**Solution**:

1. Run database migration again
2. Verify tables exist in Supabase dashboard
3. Check RLS policies are enabled

### Database Issues

**Problem**: RLS policies blocking inserts

**Solution**:

- Backend uses `supabaseAdmin` (service role) which bypasses RLS
- Manual userId filtering is done in application code
- Verify `authenticateUser` middleware is working

**Problem**: No capacity data available

**Solution**:

1. Add `capacity_config` to business_settings:
   ```sql
   UPDATE business_settings
   SET capacity_config = '{"standard": 50}'::jsonb
   WHERE userid = 'your-user-id';
   ```
2. Or populate `inventory_snapshots` table

---

## Next Steps (Phase 2)

### Planned Enhancements

**1. Machine Learning Models** (10-20 hours):

- Replace rule-based pricing with ML
- Implement Ensemble Kalman Filter (EnKF)
- Add conformal prediction for uncertainty
- Demand forecasting with historical data

**2. Learning Loop** (5-10 hours):

- Implement `/learn` endpoint logic
- Store outcomes and update models
- Scheduled batch learning (cron job)
- Model versioning and rollback

**3. Advanced Features** (Future):

- Multi-armed bandit for exploration
- Hierarchical Bayesian priors for cold-start
- Real-time compset integration
- Event detection (concerts, holidays)
- Revenue optimization dashboard

**4. Integration with Existing UI** (4-6 hours):

- Wire up API calls to replace mock data
- Add loading states and error handling
- Real-time price updates
- Apply pricing to live inventory

### Migration Path

**Phase 1 → Phase 2** (Smooth transition):

1. Python service already structured for ML models
2. Database tables support learning outcomes
3. Backend endpoints ready for enhanced data
4. Frontend UI can consume richer responses
5. No breaking changes required

**Recommended order**:

1. Collect real booking data (via `/learn` endpoint)
2. Train initial ML models offline
3. Deploy models to Python service
4. Update `/score` to use ML instead of rules
5. Monitor performance vs rule-based baseline
6. Iterate and improve models

---

## Additional Resources

- **Python Service README**: `services/pricing/README.md`
- **Architecture Docs**: `docs/developer/ARCHITECTURE.md`
- **Playbook**: `docs/tasks-todo/X-CLAUDE_TASKS_MASTER_PLAYBOOK.md`
- **Gap Analysis**: `docs/tasks-todo/PRICING-ENGINE-GAP-ANALYSIS.md`

---

**Status**: ✅ Phase 1 Complete - Ready for Testing

**Next Action**: Run end-to-end tests, then decide on Phase 2 timeline.
