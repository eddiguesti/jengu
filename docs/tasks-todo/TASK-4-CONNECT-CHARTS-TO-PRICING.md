# Task 4: Connect Pricing Charts to Real Pricing Service

**Priority**: MEDIUM
**Status**: NOT STARTED
**Effort**: 2-3 hours
**Blocker**: Task 3 (Premium charts must be built first)
**Assigned**: Future sprint

---

## 🎯 Objective

Wire the premium ECharts/AntV charts to the real Python pricing service endpoints to display actual pricing model outputs, elasticity curves, and price explanations.

---

## 📋 Implementation Steps

### Step 1: Add Pricing Service Integration to analyticsClient

**File**: `frontend/src/features/pricingDashboard/api/analyticsClient.ts`

Add new functions:
```typescript
export async function getPriceElasticityCurve(propertyId: string, params: any) {
  // Call Python pricing service /score endpoint multiple times
  // with different price points to generate elasticity curve
  const { data } = await apiClient.post('/pricing/elasticity-grid', {
    propertyId,
    ...params
  })
  return data // { priceGrid, probMean, probLow, probHigh, compMedian, chosenPrice }
}

export async function getPriceExplanation(propertyId: string, params: any) {
  // Extract 'reasons' from /pricing/quote response
  const { data } = await apiClient.post('/pricing/explain', {
    propertyId,
    ...params
  })
  return data // { steps: [{name, value}], final }
}
```

### Step 2: Create Backend Endpoints

**File**: `backend/routes/pricing.ts`

Add routes:
```typescript
// Generate elasticity curve by calling Python service with price grid
router.post('/elasticity-grid', authenticateUser, async (req, res) => {
  const { propertyId, check_in_date, strategy } = req.body

  const priceGrid = []
  const probMean = []
  const probLow = []
  const probHigh = []

  // Call Python service /score for each price point
  for (let price = 50; price <= 200; price += 5) {
    const response = await fetch(`${PRICING_SERVICE_URL}/score`, {
      method: 'POST',
      body: JSON.stringify({
        property_id: propertyId,
        check_in_date,
        override_price: price,
        strategy
      })
    })
    const result = await response.json()

    priceGrid.push(price)
    probMean.push(result.expected.booking_probability)
    probLow.push(result.confidence_interval[0])
    probHigh.push(result.confidence_interval[1])
  }

  res.json({
    priceGrid,
    probMean,
    probLow,
    probHigh,
    compMedian: null, // TODO: Get from compset API
    chosenPrice: null // TODO: Get recommended price
  })
})

// Extract price breakdown from quote
router.post('/explain', authenticateUser, async (req, res) => {
  const quote = await getPricingQuote(req.body)

  const steps = [
    { name: 'Baseline', value: quote.reasons.baseline },
    { name: 'Market shift', value: quote.reasons.market_shift },
    { name: 'Occupancy gap', value: quote.reasons.occupancy_gap },
    { name: 'Risk clamp', value: quote.reasons.risk_clamp },
    { name: 'Event uplift', value: quote.reasons.event_uplift },
  ]

  res.json({ steps, final: quote.price })
})
```

### Step 3: Wire Charts to Data

**File**: `frontend/src/features/pricingDashboard/DashboardShell.tsx`

Update queries:
```typescript
const el = useQuery({
  queryKey: ['elasticity', propertyId, qParams],
  queryFn: () => getPriceElasticityCurve(propertyId!, qParams),
  enabled: !!propertyId,
  staleTime: 5 * 60 * 1000, // 5 min cache (expensive to compute)
})

const wf = useQuery({
  queryKey: ['explain', propertyId, qParams],
  queryFn: () => getPriceExplanation(propertyId!, qParams),
  enabled: !!propertyId,
})
```

### Step 4: Test Integration

- [ ] Backend calls Python service successfully
- [ ] Elasticity curve populates with real probabilities
- [ ] Waterfall shows actual pricing breakdown
- [ ] Charts update when strategy changes
- [ ] Performance acceptable (< 3s for elasticity grid)

---

## ✅ Acceptance Criteria

- [ ] Elasticity curve shows booking probability vs price
- [ ] Waterfall chart explains price components
- [ ] Data from real Python pricing service
- [ ] Charts interactive and performant

---

**Dependencies**: Task 3 (charts must exist)
**Next Task**: Task 5 (Pre-commit hooks)
