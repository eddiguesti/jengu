# Pricing Engine - Quick Start

**Get the Jengu Pricing Engine up and running in 15 minutes**

---

## What Was Built

✅ **Database**: 3 new tables (`pricing_quotes`, `pricing_outcomes`, `inventory_snapshots`)
✅ **Backend API**: `/api/pricing/*` endpoints in Express
✅ **Python Service**: FastAPI microservice with rule-based pricing
✅ **Frontend API Client**: Type-safe TypeScript client
✅ **Documentation**: Complete setup guides and API docs

**Phase**: 1 (MVP) - Rule-based pricing with occupancy awareness
**Status**: Ready to deploy and test!

---

## Step 1: Database Setup (5 minutes)

### Run Migration

1. Open your Supabase project → SQL Editor
2. Copy contents of `backend/migrations/add_pricing_engine_tables.sql`
3. Paste and click **Run**

### Verify Tables

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'pricing%';
```

You should see: `pricing_quotes`, `pricing_outcomes`, `inventory_snapshots`

### Set Capacity (Optional)

```sql
UPDATE business_settings
SET capacity_config = '{"standard": 50, "premium": 10}'::jsonb
WHERE userid = 'your-user-id';
```

---

## Step 2: Python Service Setup (5 minutes)

```bash
# Navigate to pricing service
cd services/pricing

# Create virtual environment
python -m venv venv

# Activate (Windows: venv\Scripts\activate)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start service
python main.py
```

**Verify**: Visit `http://localhost:8000/docs` for API documentation

**Test**:

```bash
curl http://localhost:8000/live
# Should return: {"status":"alive","timestamp":"..."}
```

---

## Step 3: Backend Configuration (2 minutes)

### Add Environment Variable

Edit `backend/.env`:

```env
PRICING_SERVICE_URL=http://localhost:8000
```

### Restart Backend

```bash
cd backend
pnpm run dev
```

**Verify**: Startup message should include:

```
💰 Dynamic Pricing Engine:
   - POST /api/pricing/quote (get price quote)
   - POST /api/pricing/learn (submit outcomes for ML)
   - GET  /api/pricing/check-readiness
```

---

## Step 4: Test End-to-End (3 minutes)

### Check Readiness

```bash
# Login via frontend to get JWT, then:
curl -X GET http://localhost:3001/api/pricing/check-readiness \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Should show all checks passing.

### Get Price Quote

```bash
curl -X POST http://localhost:3001/api/pricing/quote \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "your-property-id",
    "stayDate": "2025-08-20",
    "product": {"type": "standard", "refundable": false, "los": 1},
    "toggles": {"strategy_fill_vs_rate": 50, "risk_mode": "balanced"}
  }'
```

Should return a price quote with reasoning!

---

## What's Next?

### Frontend Integration (Optional)

The Pricing Engine UI already exists at `/pricing` in your frontend! To connect it to the backend:

1. Open [frontend/src/pages/PricingEngine.tsx](frontend/src/pages/PricingEngine.tsx)
2. Replace `generatePricingData()` with `getPricingQuotesForRange()` from API client
3. Add loading states and error handling

### Phase 2: Machine Learning (Future)

- Collect real booking data for 3-6 months
- Train ML models (EnKF, conformal prediction)
- Replace rule-based pricing with ML inference
- Enable automated learning loop

---

## Documentation

- **Complete Setup Guide**: [docs/developer/PRICING_ENGINE_SETUP.md](docs/developer/PRICING_ENGINE_SETUP.md)
- **Python Service README**: [services/pricing/README.md](services/pricing/README.md)
- **Completion Report**: [docs/tasks-done/PRICING-ENGINE-PHASE-1-COMPLETED-2025-01-18.md](docs/tasks-done/PRICING-ENGINE-PHASE-1-COMPLETED-2025-01-18.md)

---

## Troubleshooting

### Python Service Won't Start

```bash
pip install -r requirements.txt
```

### Backend Can't Reach Pricing Service

1. Verify Python service is running: `curl http://localhost:8000/live`
2. Check `PRICING_SERVICE_URL` in `backend/.env`

### Database Tables Missing

Re-run the migration SQL in Supabase SQL Editor

---

**Status**: ✅ Ready to Deploy

**Estimated Setup Time**: 15 minutes
**Estimated Phase 1 → Phase 2**: 15-20 hours (when ready for ML)
