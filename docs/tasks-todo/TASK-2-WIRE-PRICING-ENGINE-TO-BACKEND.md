# Task 2: Wire Frontend PricingEngine to Real Backend APIs

**Priority**: HIGH
**Status**: NOT STARTED
**Effort**: 2-3 hours
**Blocker**: Task 1 must complete first
**Assigned**: Next sprint

---

## 🎯 Objective

Connect the existing frontend PricingEngine page to the real backend pricing API endpoints. Currently, the frontend uses client-side simulation with mock data. The backend `/api/pricing/*` endpoints and Python pricing service are already fully operational.

---

## 📊 Current State

### ✅ What's Already Done
- ✅ Backend `/api/pricing/quote` endpoint (438 lines in `backend/routes/pricing.ts`)
- ✅ Python FastAPI pricing service (`services/pricing/main.py`)
- ✅ Database tables (`pricing_quotes`, `pricing_outcomes`, `inventory_snapshots`)
- ✅ Frontend API client (`frontend/src/lib/api/services/pricing.ts`)
- ✅ Frontend UI components (PricingEngine.tsx - 1,090 lines)

### ❌ What's Missing
- ❌ Frontend PricingEngine.tsx still uses `generateSimulatedRecommendations()`
- ❌ No API calls to backend (all simulation is client-side)
- ❌ Results not saved to database
- ❌ No loading/error states for async operations

**Reference**: `docs/tasks-done/PRICING-ENGINE-PHASE-1-COMPLETED-2025-01-18.md`

---

## 📋 Implementation Steps

### Step 1: Understand Current Mock Flow

**File**: `frontend/src/pages/PricingEngine.tsx`

**Current behavior** (client-side simulation):
```typescript
// Line ~500-600 (approximate)
function generateSimulatedRecommendations(params) {
  // Client-side rule-based pricing
  // Generates fake data with:
  // - Base price calculations
  // - Occupancy multipliers
  // - Competitor adjustments
  // - Weather factors
  // Returns: { recommendations: [...], revenueImpact: {...} }
}

// Called when user clicks "Generate Recommendations"
const handleGenerate = () => {
  const results = generateSimulatedRecommendations({
    strategy,
    demandSensitivity,
    priceAggression,
    occupancyTarget,
    // ... other params
  })
  setRecommendations(results.recommendations)
  setRevenueImpact(results.revenueImpact)
}
```

### Step 2: Replace with Real API Calls

**Use existing API client**: `frontend/src/lib/api/services/pricing.ts`

**Already defined functions**:
```typescript
export const getPricingQuote = async (payload: PricingQuoteRequest) => {
  const response = await apiClient.post('/pricing/quote', payload)
  return response.data
}

export const submitPricingOutcome = async (payload: PricingOutcomeRequest) => {
  const response = await apiClient.post('/pricing/learn', payload)
  return response.data
}

export const checkPricingReadiness = async () => {
  const response = await apiClient.get('/pricing/check-readiness')
  return response.data
}
```

**New implementation**:
```typescript
import { getPricingQuote } from '@/lib/api/services/pricing'

const handleGenerate = async () => {
  setIsLoading(true)
  setError(null)

  try {
    // 1. Prepare request payload
    const payload = {
      property_id: selectedPropertyId,
      check_in_date: checkInDate,
      strategy: strategy, // 'conservative' | 'balanced' | 'aggressive'

      // Fine-tuning parameters
      demand_sensitivity: demandSensitivity,
      price_aggression: priceAggression,
      occupancy_target: occupancyTarget,

      // Context (optional)
      num_guests: 2,
      product_type: 'standard_room',
      lead_days: calculateLeadDays(checkInDate),
    }

    // 2. Call backend API
    const response = await getPricingQuote(payload)

    // 3. Extract results
    const { price, confidence_interval, expected, reasons } = response.data

    // 4. Update UI state
    setRecommendedPrice(price)
    setConfidenceInterval(confidence_interval)
    setExpectedRevenue(expected.revenue)
    setExpectedOccupancy(expected.occupancy_now)
    setReasons(reasons)

    // 5. Optional: Generate 14-day forecast
    const forecast = await generate14DayForecast(payload)
    setRecommendations(forecast)

  } catch (err) {
    setError(err.message)
    console.error('Pricing quote failed:', err)
  } finally {
    setIsLoading(false)
  }
}
```

### Step 3: Map Backend Response to UI Components

**Backend response structure** (from Python service):
```json
{
  "price": 125.50,
  "confidence_interval": [110.00, 140.00],
  "expected": {
    "revenue": 125.50,
    "occupancy_now": 0.75,
    "occupancy_end_bucket": 0.82
  },
  "reasons": {
    "baseline": 100.00,
    "market_shift": 5.00,
    "occupancy_gap": -3.00,
    "risk_clamp": -2.00,
    "event_uplift": 4.50
  },
  "metadata": {
    "model_version": "1.0.0-rule-based",
    "strategy": "balanced"
  }
}
```

**UI components to update**:

1. **Price Display Card**
   ```tsx
   <Card>
     <h3>Recommended Price</h3>
     <p className="text-4xl font-bold">€{price.toFixed(2)}</p>
     <p className="text-sm text-muted">
       Range: €{confidence_interval[0]} - €{confidence_interval[1]}
     </p>
   </Card>
   ```

2. **Revenue Impact Card**
   ```tsx
   <Card>
     <h3>Expected Revenue</h3>
     <p>€{expected.revenue.toFixed(2)}</p>
     <p>Occupancy: {(expected.occupancy_now * 100).toFixed(1)}%</p>
   </Card>
   ```

3. **Pricing Breakdown (Waterfall Chart)**
   ```tsx
   <WaterfallChart data={[
     { name: 'Baseline', value: reasons.baseline },
     { name: 'Market Shift', value: reasons.market_shift },
     { name: 'Occupancy Gap', value: reasons.occupancy_gap },
     { name: 'Risk Clamp', value: reasons.risk_clamp },
     { name: 'Event Uplift', value: reasons.event_uplift },
   ]} />
   ```

### Step 4: Generate 14-Day Forecast

**Current UI**: Shows a table of daily recommendations

**Implementation**:
```typescript
async function generate14DayForecast(basePayload) {
  const forecast = []
  const startDate = new Date(basePayload.check_in_date)

  for (let i = 0; i < 14; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)

    const payload = {
      ...basePayload,
      check_in_date: date.toISOString().split('T')[0],
      lead_days: calculateLeadDays(date),
    }

    const response = await getPricingQuote(payload)

    forecast.push({
      date: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      price: response.data.price,
      expectedRevenue: response.data.expected.revenue,
      expectedOccupancy: response.data.expected.occupancy_now,
      confidence: confidence_interval,
    })
  }

  return forecast
}
```

**Optimization**: Batch API for multiple dates (Phase 2)

### Step 5: Add Loading & Error States

**Loading state**:
```tsx
{isLoading && (
  <div className="flex items-center gap-2">
    <Spinner />
    <p>Calculating optimal pricing...</p>
  </div>
)}
```

**Error state**:
```tsx
{error && (
  <Alert variant="error">
    <AlertTitle>Failed to generate pricing</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
    <Button onClick={() => setError(null)}>Dismiss</Button>
  </Alert>
)}
```

**Disabled state during loading**:
```tsx
<Button
  onClick={handleGenerate}
  disabled={isLoading || !selectedPropertyId}
>
  {isLoading ? 'Calculating...' : 'Generate Recommendations'}
</Button>
```

### Step 6: Save Results to Database (Automatic)

**Backend already does this!** When you call `/api/pricing/quote`, it automatically:

1. Saves to `pricing_quotes` table:
   - `property_id`
   - `check_in_date`
   - `price`
   - `confidence_low`, `confidence_high`
   - `expected_revenue`
   - `strategy`
   - `reasons` (JSONB)

2. Updates `inventory_snapshots` if needed

**Frontend just needs to call the API** - no additional work required!

### Step 7: Test with Real Property Data

**Test scenarios**:

1. **Happy path**
   - User has uploaded CSV with historical data
   - Select property from dropdown
   - Choose strategy (balanced)
   - Click "Generate Recommendations"
   - See recommended price appear
   - See 14-day forecast populate

2. **No historical data**
   - New property with no history
   - Should fallback to baseline pricing
   - Show warning: "Limited data, using default pricing"

3. **Extreme parameters**
   - Set price aggression to 100%
   - Set occupancy target to 100%
   - Verify prices don't become unrealistic

4. **API errors**
   - Python service down
   - Backend returns 500
   - Show error message, allow retry

---

## 📁 Files to Modify

### Primary File
**frontend/src/pages/PricingEngine.tsx** (1,090 lines)
- Remove `generateSimulatedRecommendations()` function
- Add async API calls with `getPricingQuote()`
- Add loading/error state management
- Update state variables to match backend response
- Add 14-day forecast generation
- Estimated changes: ~150 lines

### Supporting Files (May Need Updates)
1. **frontend/src/lib/api/services/pricing.ts** - Already created ✅
2. **frontend/src/types/pricing.ts** - May need type definitions
3. **frontend/src/components/pricing/PriceCard.tsx** - Update props if needed

---

## 🧪 Testing Checklist

### Unit Testing (Optional)
- [ ] Mock API responses
- [ ] Test loading states
- [ ] Test error handling
- [ ] Test data transformation

### Integration Testing
- [ ] Backend server running on port 3001
- [ ] Python service running on port 8000
- [ ] Frontend running on port 5173
- [ ] Call `/api/pricing/quote` successfully
- [ ] Verify database logging in Supabase

### Manual Testing
- [ ] Select property from dropdown
- [ ] Choose pricing strategy
- [ ] Adjust fine-tuning sliders
- [ ] Click "Generate Recommendations"
- [ ] Verify price appears (not NaN)
- [ ] Verify confidence interval shown
- [ ] Verify 14-day forecast populates
- [ ] Check revenue impact card
- [ ] Export to CSV works
- [ ] Check Supabase `pricing_quotes` table has new rows

### Edge Cases
- [ ] No properties uploaded
- [ ] Property with 0 historical records
- [ ] Future date > 365 days
- [ ] Past date (should error)
- [ ] Invalid strategy parameter
- [ ] Network timeout (slow connection)

---

## 🚨 Critical Notes

### Do NOT Break
- ✅ Keep existing UI components and layout
- ✅ Keep fine-tuning sliders functional
- ✅ Keep export to CSV feature
- ✅ Keep strategy selection (conservative/balanced/aggressive)
- ✅ Keep revenue impact visualizations

### Safe to Remove
- ❌ `generateSimulatedRecommendations()` function
- ❌ Client-side pricing calculation logic
- ❌ Hardcoded baseline prices
- ❌ Mock competitor data generation

### Important
- ⚠️ Backend expects ISO date format: `YYYY-MM-DD`
- ⚠️ Strategy must be lowercase: `'conservative'`, not `'Conservative'`
- ⚠️ Lead days calculation: `Math.floor((checkInDate - today) / 86400000)`

---

## ✅ Acceptance Criteria

This task is complete when:

1. **API Integration Works**
   - [ ] Frontend calls `/api/pricing/quote`
   - [ ] Response mapped to UI components
   - [ ] Loading states display during API calls
   - [ ] Errors handled gracefully

2. **Real Pricing Displayed**
   - [ ] Recommended price from backend (not simulated)
   - [ ] Confidence intervals from backend
   - [ ] Expected revenue from backend
   - [ ] Pricing reasons (waterfall breakdown)

3. **Database Logging**
   - [ ] Quotes saved to `pricing_quotes` table
   - [ ] Can verify in Supabase dashboard
   - [ ] User ID correctly associated

4. **User Experience**
   - [ ] Fast response (< 2 seconds per quote)
   - [ ] Smooth loading animations
   - [ ] Clear error messages
   - [ ] 14-day forecast generates successfully

5. **No Regressions**
   - [ ] All existing UI features still work
   - [ ] Export to CSV still functional
   - [ ] Charts still render
   - [ ] No console errors

---

## 🔗 Related Documentation

- [Backend Pricing Routes](../../backend/routes/pricing.ts) - API implementation
- [Python Pricing Service](../../services/pricing/main.py) - ML service
- [Frontend API Client](../../frontend/src/lib/api/services/pricing.ts) - HTTP client
- [Pricing Engine Setup](../developer/PRICING_ENGINE_SETUP.md) - Complete guide
- [Phase 1 Completion](../tasks-done/PRICING-ENGINE-PHASE-1-COMPLETED-2025-01-18.md) - What's already done

---

## 📊 Estimated Timeline

| Step | Effort | Status |
|------|--------|--------|
| 1. Understand current mock flow | 15m | ⏳ TODO |
| 2. Replace with API calls | 45m | ⏳ TODO |
| 3. Map response to UI | 30m | ⏳ TODO |
| 4. Generate 14-day forecast | 30m | ⏳ TODO |
| 5. Add loading/error states | 15m | ⏳ TODO |
| 6. Verify database logging | 10m | ⏳ TODO |
| 7. Test with real data | 30m | ⏳ TODO |
| **TOTAL** | **2-3h** | **0% DONE** |

---

**Dependencies**: Task 1 (Remove fake data) should complete first
**Next Task**: Task 3 (Premium Charts with ECharts)
**Target Completion**: After Task 1 verification
