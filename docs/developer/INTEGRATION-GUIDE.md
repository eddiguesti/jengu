# Frontend Integration Guide - ML Pricing Engine

**Status**: Backend 100% Complete ✅ | Frontend Integration Pending

This guide explains how to connect the frontend calendar/dashboard to the advanced ML pricing engine.

---

## 🎯 Quick Summary

**What's Ready**:
- ✅ Advanced ML pricing engine (backend)
- ✅ REST API endpoints deployed
- ✅ 59 days of enriched data
- ✅ Revenue optimization algorithm

**What's Needed**:
- Connect calendar to ML recommendations API
- Display pricing insights in dashboard
- Show confidence scores and explanations

---

## 📡 API Endpoints

### 1. Get Pricing Recommendations

**Endpoint**: `GET /api/pricing/advanced/recommendations`

**Parameters**:
```typescript
{
  propertyId: string        // Required: Property UUID
  days?: number            // Optional: 1-90 (default: 30)
  strategy?: string        // Optional: 'conservative' | 'balanced' | 'aggressive'
  minPrice?: number        // Optional: Minimum price constraint
  maxPrice?: number        // Optional: Maximum price constraint
  targetOccupancy?: number // Optional: Target occupancy %
}
```

**Response**:
```typescript
{
  success: true,
  property: {
    id: string
    name: string
  },
  summary: {
    forecastDays: number
    currentAveragePrice: number
    recommendedAveragePrice: number
    averagePriceChange: number
    averageRevenueImpact: number
    highConfidenceCount: number
    dataQuality: {
      historicalDays: number
      enrichmentComplete: number
      holidayDataAvailable: number
    }
  },
  analytics: {
    priceElasticity: number
    seasonalPeaks: { month: string; avgOccupancy: number }[]
    peakDays: string[]
    lowDays: string[]
    holidayPremium: number
    weekendPremium: number
    temperatureCorrelation: number
    weatherSensitivity: number
    optimalTemperatureRange: [number, number]
    demandPatterns: {
      seasonal: Record<string, number>
      dayOfWeek: Record<string, number>
    }
  },
  recommendations: Array<{
    date: string
    currentPrice: number
    recommendedPrice: number
    priceChange: number
    priceChangePercent: number
    predictedOccupancy: number
    expectedRevenue: number
    revenueImpact: number
    confidence: 'very_high' | 'high' | 'medium' | 'low'
    factors: {
      seasonality: number
      weatherImpact: number
      holidayImpact: number
      trendImpact: number
    }
    explanation: string
    reasoning: {
      primary: string
      contributing: string[]
    }
  }>
}
```

### 2. Get Analytics Only

**Endpoint**: `GET /api/pricing/advanced/analytics`

**Parameters**:
```typescript
{
  propertyId: string  // Required
}
```

Returns just the analytics object without recommendations.

---

## 🔌 Integration Steps

### Step 1: Create API Service Function

**File**: `frontend/src/lib/api/services/advancedPricing.ts` (create new)

```typescript
import { apiClient } from '../client'

export interface PricingRecommendation {
  date: string
  currentPrice: number
  recommendedPrice: number
  priceChange: number
  priceChangePercent: number
  predictedOccupancy: number
  expectedRevenue: number
  revenueImpact: number
  confidence: 'very_high' | 'high' | 'medium' | 'low'
  explanation: string
  factors: {
    seasonality: number
    weatherImpact: number
    holidayImpact: number
    trendImpact: number
  }
  reasoning: {
    primary: string
    contributing: string[]
  }
}

export interface PricingAnalytics {
  priceElasticity: number
  seasonalPeaks: { month: string; avgOccupancy: number }[]
  peakDays: string[]
  lowDays: string[]
  holidayPremium: number
  weekendPremium: number
  temperatureCorrelation: number
  weatherSensitivity: number
  optimalTemperatureRange: [number, number]
  demandPatterns: {
    seasonal: Record<string, number>
    dayOfWeek: Record<string, number>
  }
}

export interface AdvancedPricingResponse {
  success: boolean
  property: {
    id: string
    name: string
  }
  summary: {
    forecastDays: number
    currentAveragePrice: number
    recommendedAveragePrice: number
    averagePriceChange: number
    averageRevenueImpact: number
    highConfidenceCount: number
    dataQuality: {
      historicalDays: number
      enrichmentComplete: number
      holidayDataAvailable: number
    }
  }
  analytics: PricingAnalytics
  recommendations: PricingRecommendation[]
}

export async function getAdvancedPricingRecommendations(params: {
  propertyId: string
  days?: number
  strategy?: 'conservative' | 'balanced' | 'aggressive'
  minPrice?: number
  maxPrice?: number
  targetOccupancy?: number
}): Promise<AdvancedPricingResponse> {
  const response = await apiClient.get<AdvancedPricingResponse>(
    '/api/pricing/advanced/recommendations',
    { params }
  )
  return response.data
}

export async function getAdvancedPricingAnalytics(propertyId: string) {
  const response = await apiClient.get<{
    success: boolean
    property: { id: string; name: string }
    analytics: PricingAnalytics
  }>('/api/pricing/advanced/analytics', {
    params: { propertyId }
  })
  return response.data
}
```

### Step 2: Update Calendar Component

**Option A: Update PriceDemandCalendar.tsx**

Add ML recommendations to the existing calendar:

```typescript
// At the top of the component
import { getAdvancedPricingRecommendations } from '../lib/api/services/advancedPricing'

// Inside the component
const [mlRecommendations, setMlRecommendations] = useState<
  Record<string, PricingRecommendation>
>({})

// Fetch ML recommendations on mount
useEffect(() => {
  if (!propertyId) return

  getAdvancedPricingRecommendations({
    propertyId,
    days: 30,
    strategy: 'balanced'
  })
    .then(response => {
      // Convert array to lookup object by date
      const lookup = response.recommendations.reduce((acc, rec) => {
        acc[rec.date] = rec
        return acc
      }, {} as Record<string, PricingRecommendation>)
      setMlRecommendations(lookup)
    })
    .catch(error => {
      console.error('Failed to load ML recommendations:', error)
    })
}, [propertyId])

// In the calendar day rendering
const dayRecommendation = mlRecommendations[formattedDate]
if (dayRecommendation) {
  // Show recommended price
  // Show confidence indicator
  // Show revenue impact
}
```

**Option B: Create New ML-Powered Pricing Page**

Create a dedicated page for ML pricing insights at `frontend/src/pages/MLPricing.tsx`.

### Step 3: Display Recommendations in Calendar

Update the calendar day cells to show:

1. **Current Price** vs **Recommended Price**
2. **Revenue Impact** percentage (+15.2%)
3. **Confidence Level** (color-coded badge)
4. **Explanation** tooltip on hover

Example UI:

```tsx
<div className="calendar-day">
  <div className="date">{day}</div>

  {dayRecommendation && (
    <div className="ml-pricing">
      <div className="price-comparison">
        <span className="current">€{dayRecommendation.currentPrice}</span>
        <span className="arrow">→</span>
        <span className="recommended">€{dayRecommendation.recommendedPrice}</span>
      </div>

      <div className="metrics">
        <span className={`confidence ${dayRecommendation.confidence}`}>
          {dayRecommendation.confidence}
        </span>
        <span className="revenue-impact">
          +{dayRecommendation.revenueImpact.toFixed(1)}%
        </span>
      </div>

      <Tooltip content={dayRecommendation.explanation}>
        <InfoIcon />
      </Tooltip>
    </div>
  )}
</div>
```

### Step 4: Add Analytics Dashboard Widget

Create a new card in Dashboard.tsx showing ML insights:

```tsx
<Card title="ML Pricing Insights">
  <div className="analytics-summary">
    <Metric
      label="Price Elasticity"
      value={analytics.priceElasticity.toFixed(2)}
      description="How demand responds to price changes"
    />

    <Metric
      label="Holiday Premium"
      value={`${(analytics.holidayPremium * 100).toFixed(1)}%`}
      description="Additional revenue on holidays"
    />

    <Metric
      label="Peak Days"
      value={analytics.peakDays.join(', ')}
      description="Highest demand days"
    />

    <Metric
      label="Weather Sensitivity"
      value={analytics.weatherSensitivity.toFixed(2)}
      description="Impact of weather on bookings"
    />
  </div>
</Card>
```

---

## 🎨 UI/UX Recommendations

### Confidence Level Colors

```css
.confidence.very_high {
  background: #10b981; /* green */
}

.confidence.high {
  background: #3b82f6; /* blue */
}

.confidence.medium {
  background: #f59e0b; /* amber */
}

.confidence.low {
  background: #6b7280; /* gray */
}
```

### Price Change Indicators

```tsx
const priceChangeClass = dayRecommendation.priceChange > 0
  ? 'price-increase'
  : dayRecommendation.priceChange < 0
    ? 'price-decrease'
    : 'price-same'
```

### Revenue Impact Display

Show positive impact in green, negative in red:

```tsx
<span className={revenueImpact > 0 ? 'text-green-600' : 'text-red-600'}>
  {revenueImpact > 0 ? '+' : ''}{revenueImpact.toFixed(1)}%
</span>
```

---

## 🔄 Strategy Selector

Add a dropdown to let users choose pricing strategy:

```tsx
<Select
  value={strategy}
  onChange={setStrategy}
  options={[
    { value: 'conservative', label: 'Conservative (85% target)' },
    { value: 'balanced', label: 'Balanced (75% target)' },
    { value: 'aggressive', label: 'Aggressive (60% target)' }
  ]}
/>
```

Re-fetch recommendations when strategy changes:

```typescript
useEffect(() => {
  if (!propertyId) return

  getAdvancedPricingRecommendations({
    propertyId,
    days: 30,
    strategy
  }).then(/* ... */)
}, [propertyId, strategy])
```

---

## 📊 Example Complete Integration

**File**: `frontend/src/pages/PricingCalendarDemo.tsx` (existing file)

```typescript
import React, { useState, useEffect } from 'react'
import { PriceDemandCalendar } from '../components/pricing/PriceDemandCalendar'
import {
  getAdvancedPricingRecommendations,
  type PricingRecommendation
} from '../lib/api/services/advancedPricing'

export function PricingCalendarDemo() {
  const [propertyId] = useState('bbf67c1f-974d-43b4-81e8-e9a834ceefe1')
  const [strategy, setStrategy] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced')
  const [recommendations, setRecommendations] = useState<PricingRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getAdvancedPricingRecommendations({
      propertyId,
      days: 30,
      strategy
    })
      .then(response => {
        setRecommendations(response.recommendations)
      })
      .catch(error => {
        console.error('Failed to load ML recommendations:', error)
      })
      .finally(() => setLoading(false))
  }, [propertyId, strategy])

  return (
    <div className="ml-pricing-page">
      <header>
        <h1>ML-Powered Pricing Recommendations</h1>
        <Select value={strategy} onChange={setStrategy}>
          <option value="conservative">Conservative</option>
          <option value="balanced">Balanced</option>
          <option value="aggressive">Aggressive</option>
        </Select>
      </header>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <PriceDemandCalendar
          propertyId={propertyId}
          mlRecommendations={recommendations}
        />
      )}
    </div>
  )
}
```

---

## ✅ Testing the Integration

### 1. Test API Connection

```bash
# From browser console or Postman
curl "http://localhost:3001/api/pricing/advanced/recommendations?propertyId=bbf67c1f-974d-43b4-81e8-e9a834ceefe1&days=7&strategy=balanced" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Verify Response

Check that you receive:
- ✅ 200 OK status
- ✅ `success: true`
- ✅ Array of recommendations with dates
- ✅ Analytics object with elasticity, premiums, etc.

### 3. Check Data Quality

Look at `summary.dataQuality`:
- `historicalDays` should be >= 14 (you have 59 ✅)
- `enrichmentComplete` should be close to 1.0 (100%)
- `holidayDataAvailable` shows upcoming holidays

---

## 🚀 Next Steps

1. **Create API service file** (`advancedPricing.ts`)
2. **Update calendar component** to fetch and display recommendations
3. **Add analytics dashboard widget** showing ML insights
4. **Test with current property ID**: `bbf67c1f-974d-43b4-81e8-e9a834ceefe1`
5. **Add strategy selector** for user control
6. **Style confidence badges** and revenue impact indicators

---

## 📝 Notes

- **Current Property ID**: `bbf67c1f-974d-43b4-81e8-e9a834ceefe1` (use this for testing)
- **Data Available**: 59 days of enriched historical data
- **Recommended Strategy**: Start with 'balanced' for most users
- **Confidence Levels**: Based on data quality and forecast horizon
  - `very_high`: Strong historical patterns, high data quality
  - `high`: Good patterns, sufficient data
  - `medium`: Limited data or uncertain patterns
  - `low`: Insufficient data or high uncertainty

---

## 🔗 Related Documentation

- **[FINAL-STATUS.md](FINAL-STATUS.md)** - Current status and capabilities
- **[ML-PRICING-ENGINE-COMPLETE.md](ML-PRICING-ENGINE-COMPLETE.md)** - Complete technical docs
- **[DATA-FLOW-COMPLETE-ANALYSIS.md](DATA-FLOW-COMPLETE-ANALYSIS.md)** - Data flow analysis

---

**Ready to integrate!** The backend ML engine is 100% complete and waiting for frontend connection.
