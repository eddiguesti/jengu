# Session: Pricing Dashboard V2 Foundation Implementation

**Date**: 2025-10-22
**Status**: In Progress (Core infrastructure complete)
**Feature Flag**: `PRICING_DASH_V2`

## Overview

This session implements the foundation for an enhanced analytics dashboard system (V2) with new interactive charts for both the Insights and Optimize Price pages. The implementation is behind a feature flag to ensure backward compatibility and allow for gradual rollout.

## Objectives

1. Create 13 new chart components for enhanced analytics visualization
2. Implement 5 new backend analytics endpoints
3. Add feature flag system with overlay controls
4. Integrate with existing prediction models and enriched weather data
5. Prepare for seamless integration into existing Insights and Optimize Price pages

## Implementation Summary

### 1. Feature Flag System

**Location**: `frontend/src/stores/useDashboardStore.ts`

**Features Added**:

- `usePricingDashV2`: Boolean feature flag (default: false)
- `toggleDashboardVersion()`: Toggle function for enabling/disabling V2
- `overlays`: Object tracking visibility of chart overlays (actual, optimized, baseline, market, forecast, target)
- `toggleOverlay()`: Function to toggle individual overlay visibility

**Usage**:

```typescript
const { usePricingDashV2, toggleDashboardVersion, overlays, toggleOverlay } = useDashboardStore()
```

### 2. Backend Analytics Endpoints

**Location**: `backend/routes/analytics.ts`

**New Endpoints**:

#### For Insights Page:

1. **POST /api/analytics/event-uplift**
   - Returns: `EventUplift[]`
   - Purpose: Analyze occupancy and price patterns by event type (Weekday, Weekend, Holiday)
   - Data: Weekday vs Weekend vs Holiday patterns

2. **POST /api/analytics/correlation-heatmap**
   - Returns: `CorrelationHeatmap`
   - Purpose: Calculate Pearson correlation matrix between key features
   - Features: price, occupancy, temperature, day_of_week

#### For Optimize Price Page:

3. **POST /api/analytics/price-frontier**
   - Returns: `PriceFrontier[]`
   - Purpose: Calculate Pareto frontier showing price vs revenue/occupancy trade-offs
   - Uses elasticity model: `occupancy = 0.85 / (priceRatio^1.2)`

4. **POST /api/analytics/risk-return**
   - Returns: `RiskReturn[]`
   - Purpose: Analyze risk (std dev) vs expected return by pricing strategy
   - Strategies: Conservative (<95% median), Balanced (95-105%), Aggressive (>105%)

5. **POST /api/analytics/conformal-range**
   - Returns: `ConformalRange`
   - Purpose: Calculate conformal prediction intervals for safe pricing
   - Intervals: 90%, 95%, 99% confidence levels

**Note**: The following charts reuse existing endpoints:

- Capacity vs Demand Pace: Uses `/api/analytics/occupancy-pace`
- Weather Impact on Bookings: Uses `/api/analytics/weather-impact`
- ADR vs Market Index: Uses `/api/analytics/adr-index`
- Revenue vs Optimized: Uses `/api/analytics/revenue-series`
- Elasticity Curve: Uses `/api/analytics/elasticity`
- Price Waterfall: Uses `/api/analytics/price-explain`
- Lead-Pacing Projection: Uses `/api/analytics/forecast-actual`

### 3. TypeScript Data Contracts

**Location**: `frontend/src/types/analytics.ts`

**New Types**:

```typescript
export interface EventUplift {
  type: string // 'Weekday', 'Weekend', 'Holiday'
  occupancyUplift: number
  priceUplift: number
  count: number
}

export interface CorrelationHeatmap {
  features: string[] // ['price', 'occupancy', 'temperature', 'day_of_week']
  matrix: number[][] // correlation matrix [-1..1]
}

export interface WeatherImpact {
  temperature: number[]
  occupancy: number[]
  bookings: number[]
  correlation: number // -1..1
}

export interface PriceFrontier {
  price: number
  revenue: number
  occupancy: number
}

export interface RiskReturn {
  strategy: string // 'Conservative', 'Balanced', 'Aggressive'
  risk: number // standard deviation
  expectedReturn: number // expected revenue
  count: number
}

export interface ConformalRange {
  intervals: Array<{
    confidence: number // 0.90, 0.95, 0.99
    lower: number
    upper: number
  }>
  recommended: {
    price: number
    lowerBound: number
    upperBound: number
    confidence: number
  }
  currentPrice: number
}
```

### 4. React Query Hooks

**Location**: `frontend/src/hooks/queries/useDirectorAnalytics.ts`

**New Hooks**:

- `useEventUplift(fileId, enabled)` - Fetch event/holiday uplift data
- `useCorrelationHeatmap(fileId, enabled)` - Fetch correlation heatmap
- `useWeatherImpact(fileId, enabled)` - Fetch weather impact scatter data
- `usePriceFrontier(fileId, enabled)` - Fetch price-revenue frontier
- `useRiskReturn(fileId, enabled)` - Fetch risk-return scatter
- `useConformalRange(fileId, enabled)` - Fetch conformal prediction intervals

**Pattern**:

```typescript
const { data, isLoading } = useEventUplift(currentFileId, !!currentFileId)
```

All hooks:

- Auto-fetch file data from `/api/files/{fileId}/data`
- Post to analytics endpoint with file data
- Cache for 5 minutes (staleTime)
- Disabled when fileId is empty

### 5. Chart Components

#### Insights Page Charts (`frontend/src/components/insights/charts/`)

1. **EventUpliftChart.tsx**
   - Type: Dual-axis bar chart (ECharts)
   - Shows: Occupancy % and Price $ by event type
   - Features: Export PNG, hover tooltips

2. **CorrelationHeatmapChart.tsx**
   - Type: Heatmap (ECharts)
   - Shows: Correlation matrix with color gradient (-1 to +1)
   - Features: Export PNG, click cell for details, visual color map (red-white-blue)

3. **WeatherImpactChart.tsx**
   - Type: Scatter plot with trend line (ECharts)
   - Shows: Temperature vs Occupancy with linear regression
   - Features: Export PNG, bubble size by bookings, correlation coefficient display

#### Optimize Price Charts (`frontend/src/components/optimize/charts/`)

4. **PriceFrontierChart.tsx**
   - Type: Scatter plot (ECharts)
   - Shows: Occupancy % vs Revenue $ colored by price
   - Features: Export PNG, visual color gradient, Pareto frontier visualization

5. **RiskReturnChart.tsx**
   - Type: Labeled scatter plot (ECharts)
   - Shows: Risk (std dev) vs Expected Return by strategy
   - Features: Export PNG, color-coded strategies, bubble size by sample count

6. **ConformalRangeChart.tsx**
   - Type: Gauge chart + interval table (ECharts)
   - Shows: Current price position on gauge with confidence intervals
   - Features: Export PNG, color zones (red/teal/yellow), 90%/95%/99% intervals table

**All charts include**:

- Unified theme (`director-dashboard`)
- Export to PNG functionality
- Loading states with spinners
- Error boundaries
- Responsive design (adapts to container width)
- Dark mode styling (#0A0A0A background, #E5E5E5 text)

### 6. Dashboard Header Component

**Location**: `frontend/src/components/ui/DashboardHeader.tsx`

**Features**:

- KPI tiles with trend indicators (TrendingUp/TrendingDown/Minus icons)
- Global filters: Property, Product Type, Lead Bucket, Strategy Mode, Date Range
- Chart overlay checkboxes: Actual, Optimized, Baseline, Market, Forecast, Target
- Feature flag toggle button (V2 Enable/Disable)

**KPIs Displayed**:

1. RevPAU Lift % (with trend)
2. ADR vs Market % (with trend)
3. Occupancy Gap % (with trend)
4. Coverage % (no trend)
5. Constraint Violations % (no trend)

**Usage**:

```typescript
<DashboardHeader
  kpis={kpisData}
  showFilters={true}
  showOverlays={true}
/>
```

## Data Flow

```
User's Uploaded CSV (31 rows enriched with weather/temperature)
    ↓
fetchFileData(fileId) → GET /api/files/{fileId}/data?limit=10000
    ↓
React Query Hook (e.g., useEventUplift)
    ↓
POST /api/analytics/{endpoint} with { data: fileData }
    ↓
Backend: transformDataForAnalytics(data)
    ↓
Backend: Statistical Analysis + Prediction Model
    ↓
Response: { success: true, data: AnalyticsData }
    ↓
Chart Component (ECharts/G2Plot)
    ↓
Interactive Visualization
```

## File Structure

```
backend/
└── routes/
    └── analytics.ts (631 → 913 lines, +5 endpoints)

frontend/
├── src/
│   ├── components/
│   │   ├── insights/
│   │   │   └── charts/
│   │   │       ├── EventUpliftChart.tsx (NEW)
│   │   │       ├── CorrelationHeatmapChart.tsx (NEW)
│   │   │       ├── WeatherImpactChart.tsx (NEW)
│   │   │       └── index.ts (NEW)
│   │   ├── optimize/
│   │   │   └── charts/
│   │   │       ├── PriceFrontierChart.tsx (NEW)
│   │   │       ├── RiskReturnChart.tsx (NEW)
│   │   │       ├── ConformalRangeChart.tsx (NEW)
│   │   │       └── index.ts (NEW)
│   │   └── ui/
│   │       └── DashboardHeader.tsx (NEW)
│   ├── hooks/
│   │   └── queries/
│   │       └── useDirectorAnalytics.ts (UPDATED: +6 hooks)
│   ├── stores/
│   │   └── useDashboardStore.ts (UPDATED: +overlays, +toggleOverlay)
│   └── types/
│       └── analytics.ts (UPDATED: +6 types)
```

## Next Steps (Pending)

### 1. Integrate Charts into Insights Page

**Location**: `frontend/src/pages/Insights.tsx`

**Tasks**:

- [ ] Add feature flag check at top of component
- [ ] Import new chart components
- [ ] Add `DashboardHeader` component with KPIs
- [ ] Conditional rendering based on `usePricingDashV2` flag
- [ ] Wire up React Query hooks for data fetching
- [ ] Integrate with existing file selection logic
- [ ] Apply global filters to chart data

**Charts to Add** (7 total):

1. Capacity vs Demand Pace (use `OccupancyPaceChart` from director)
2. Weather Impact on Bookings (`WeatherImpactChart`)
3. Event/Holiday Uplift Bars (`EventUpliftChart`)
4. Correlation Heatmap (`CorrelationHeatmapChart`)
5. ADR vs Market Index (use `AdrIndexChart` from director)
6. Revenue vs Optimized (use `RevenueGainChart` from director)
7. Occupancy vs Target (use `OccupancyPaceChart` from director)

### 2. Integrate Charts into Optimize Price Page

**Location**: `frontend/src/pages/PricingEngine.tsx` (or create new `OptimizePrice.tsx`)

**Tasks**:

- [ ] Add feature flag check
- [ ] Import new chart components
- [ ] Add `DashboardHeader` component
- [ ] Conditional rendering based on flag
- [ ] Wire up React Query hooks
- [ ] Add interactive elasticity curve with draggable marker
- [ ] Integrate waterfall chart with date selection

**Charts to Add** (6 total):

1. Elasticity Curve (use `ElasticityCurveChart` from director, add draggable marker)
2. Price→Revenue/Occupancy Frontier (`PriceFrontierChart`)
3. Risk–Return Scatter (`RiskReturnChart`)
4. Conformal Safe Range Gauge (`ConformalRangeChart`)
5. Waterfall Explain (use `PriceWaterfallChart` from director)
6. Lead-Pacing Projection (use `ForecastActualChart` from director)

### 3. Implement Cross-Chart Interactivity

**Tasks**:

- [ ] Connect `hoveredDate` from store to all time-series charts
- [ ] Sync tooltips across charts when hovering
- [ ] Implement zoom synchronization
- [ ] Add click-to-filter functionality (e.g., click lead bucket → filter all charts)
- [ ] Test filter persistence

### 4. Testing

**Tasks**:

- [ ] Test feature flag toggle (V2 on/off)
- [ ] Test overlay checkboxes (show/hide lines)
- [ ] Test global filters (property, product, date range, lead, strategy)
- [ ] Test with real enriched CSV data (31 rows)
- [ ] Test export PNG for all charts
- [ ] Verify weather correlation appears in predictions
- [ ] Test cross-chart hover sync
- [ ] Test responsive layout (desktop + mobile)

### 5. Documentation

**Tasks**:

- [ ] Update `DIRECTOR_DASHBOARD.md` with V2 information
- [ ] Create user guide for feature flag
- [ ] Document chart overlay system
- [ ] Add screenshots to documentation

## Technical Decisions

### 1. Feature Flag Approach

**Decision**: Use client-side feature flag in Zustand store
**Rationale**:

- Instant toggle without server restart
- Easy for dev/QA testing
- Can be promoted to env var or database config later
- Users can opt-in to test V2 features

### 2. Chart Technology

**Decision**: Continue using ECharts 6.0 + echarts-for-react
**Rationale**:

- Already integrated in Director Dashboard
- Enterprise-grade performance (canvas rendering)
- Rich interactivity (zoom, brush, hover sync)
- Unified theming system
- AntV G2Plot for specific chart types (waterfall)

### 3. Endpoint Reuse

**Decision**: Reuse existing 7 analytics endpoints where possible
**Rationale**:

- Avoid duplication
- Consistent data contracts
- Reduces backend maintenance
- Faster implementation

### 4. Data Fetching Pattern

**Decision**: Fetch file data once, post to each analytics endpoint
**Rationale**:

- Backend can apply transformations
- Centralized data validation
- Easier to add new analytics without frontend changes
- Better for large datasets (server-side processing)

## Dependencies

**Already Installed**:

- echarts@6.0.0
- echarts-for-react@3.0.2
- @antv/g2plot@2.4.35
- @tanstack/react-query (React Query)
- zustand

**No New Dependencies Required**

## Breaking Changes

**None** - All changes are behind feature flag and do not affect existing functionality.

## Performance Considerations

1. **Chart Rendering**: Canvas-based (hardware accelerated)
2. **Data Caching**: React Query caches for 5 minutes
3. **Lazy Loading**: Charts only load when page is visited
4. **File Data**: Limit to 10,000 rows (pagination available)
5. **Debouncing**: Filter updates debounced (150-250ms recommended)

## Accessibility

- Keyboard focus on chart legends
- High-contrast mode compatible
- Descriptive tooltips
- Export provides alternative format (PNG)

## Known Limitations

1. **No Real-Time Updates**: Charts require manual refresh
2. **Single File Context**: Analytics run on one file at a time
3. **Client-Side Filtering**: Global filters not yet connected to charts
4. **No Drill-Down**: Clicking chart elements doesn't filter yet

## Success Metrics

Once fully integrated, success will be measured by:

- [ ] Feature flag toggle works without errors
- [ ] All 13 charts render with real data
- [ ] Overlays show/hide correctly
- [ ] Global filters update chart data
- [ ] Weather correlation visible in predictions
- [ ] Export PNG works for all charts
- [ ] No performance degradation vs V1

## Session Timeline

- **15:31** - Installed ECharts dependencies
- **15:36-15:38** - Created 5 new backend endpoints
- **15:39** - Added TypeScript types for new analytics
- **15:40-15:48** - Created 6 chart components (3 Insights + 3 Optimize)
- **15:55-15:58** - Created DashboardHeader with KPIs and filters
- **15:58** - Added React Query hooks for new endpoints
- **16:02** - Created session documentation

## References

- **Director Dashboard Implementation**: `docs/developer/DIRECTOR_DASHBOARD.md`
- **Analytics Types**: `frontend/src/types/analytics.ts`
- **ECharts Docs**: https://echarts.apache.org/en/index.html
- **React Query Docs**: https://tanstack.com/query/latest
- **Zustand Docs**: https://zustand.docs.pmnd.rs/

---

**Status**: Foundation complete, integration pending
**Next Session**: Integrate charts into Insights and Optimize Price pages
