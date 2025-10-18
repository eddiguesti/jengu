# CLAUDE_UI_CHARTS_IMPLEMENTATION.md
**Purpose:** Replace legacy charts in the Pricing Dashboard with premium, interactive visuals and wire them to the **Hybrid Pricing Service** outputs and existing backend APIs. This is a fully-scoped task list for Claude to execute safely.

> **Safety rules (do not break):**
> - Do **NOT** refactor or delete existing modules outside the paths listed here.
> - Do **NOT** touch authentication or existing endpoints beyond what’s specified.
> - Keep the **frontend + backend contracts** stable; only **add** new components and swap chart mounts in the dashboard page(s).

---

## 0) What we’re building (visuals & data sources)

**Primary stack**: React + **ECharts** (`echarts-for-react`) for 90% of visuals.  
**Hero polish**: **AntV G2Plot** for specific charts (Waterfall, Violin).  
**Optional pivot**: FINOS Perspective (later).

**Charts to implement & data wiring:**

1) **Revenue vs Optimized (Gain)**  
   - Data: `actual_revenue_by_date`, `optimized_revenue_by_date` (from pricing service simulation or backend analytics).
   - Interactions: zoom/brush, tooltip sync, shaded “gain” area, KPI tiles.

2) **Occupancy Pace vs Target (by lead bucket)**  
   - Data: `occ_actual_by_lead`, `occ_target_by_lead`, `occ_model_by_lead` (from pricing service `/score` aggregates and daily assimilation job).
   - Interactions: click a lead bucket → filter all charts.

3) **ADR vs Competitor Index**  
   - Data: `adr_property_index`, `adr_market_index` (backend: compset snapshot; optional if table exists).
   - Interactions: hover sync; red/green bands for over/under market.

4) **Lead × Season Revenue Heatmap**  
   - Data: `rev_by_lead_season` (backend analytics route over `pricing_data` + quotes/outcomes).
   - Interactions: click cell → filter date range + product.

5) **Forecast vs Actual Bookings**  
   - Data: `forecast_bookings`, `actual_bookings` (pricing service forecast + `pricing_data.bookings`).
   - Interactions: zoom; error metrics tile (MAPE/CRPS).

6) **Interactive Elasticity Curve**  
   - Data: `price_grid`, `booking_prob_mean`, `booking_prob_low/high` (from `/score` response; or batch endpoint `/api/pricing/simulate-grid`).
   - Interactions: draggable price marker; show comp_median marker.

7) **Price Adjustment Waterfall (“Why this price”) — AntV**  
   - Data: `{baseline, market_shift, occupancy_gap, risk_clamp, event_uplift, final}` (from pricing service reasons or a new lightweight explain endpoint).
   - Interactions: step hover, delta labels.

---

## 1) Packages to add (frontend only)

```bash
# Core
pnpm add echarts echarts-for-react zustand

# Hero visuals
pnpm add @ant-design/plots

# Optional (later): power pivot
# pnpm add @finos/perspective @finos/perspective-viewer @finos/perspective-viewer-datagrid
```

> **Note:** Keep bundle size reasonable: lazy-load AntV charts where used.

---

## 2) File structure (frontend)

Create a cohesive chart suite with shared theming and props.

```
frontend/src/features/pricingDashboard/
├─ state/useDashboardStore.ts           # global cross-filters (Zustand)
├─ api/analyticsClient.ts               # typed fetchers for series
├─ components/tiles/KpiTiles.tsx        # RevPAU lift, ADR delta, Occ gap
├─ components/charts/LineWithBand.tsx   # ECharts line + confidence band
├─ components/charts/IndexedLines.tsx   # ADR index vs market
├─ components/charts/HeatmapRevLead.tsx # Lead×Season heatmap
├─ components/charts/ElasticityCurve.tsx# Price elasticity (interactive)
├─ components/charts/WaterfallPrice.tsx # AntV waterfall (explain price)
├─ DashboardShell.tsx                   # layout + linked interactions
└─ index.ts                             # barrel exports
```

> **Do not** remove `frontend/src/pages/PricingEngine.tsx`. Replace its **old chart mounts** by importing `DashboardShell` and the new components. Keep legacy code behind a feature flag for rollback.

---

## 3) Shared state (Zustand)

```ts
// frontend/src/features/pricingDashboard/state/useDashboardStore.ts
import { create } from 'zustand'

type DashboardState = {
  propertyId: string | null
  dateRange: { start: string; end: string } | null
  leadBucket: string | null // "0-1" | "2-7" | "8-21" | "22-90"
  strategy: 'conservative'|'balanced'|'aggressive'
  productType: string | null
  set: (s: Partial<DashboardState>) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  propertyId: null,
  dateRange: null,
  leadBucket: null,
  strategy: 'balanced',
  productType: null,
  set: (s) => set(s),
}))
```

---

## 4) Data layer (TanStack Query fetchers)

```ts
// frontend/src/features/pricingDashboard/api/analyticsClient.ts
import apiClient from '@/lib/api/client'

export async function getRevenueSeries(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/revenue-series', { propertyId, ...params })
  return data // { dates, actual, optimized }
}

export async function getOccupancyPace(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/occupancy-pace', { propertyId, ...params })
  return data // { lead, actual, target, model }
}

export async function getAdrIndex(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/adr-index', { propertyId, ...params })
  return data // { dates, propertyIndex, marketIndex }
}

export async function getHeatmapRevLead(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/rev-lead-heatmap', { propertyId, ...params })
  return data // { leadBuckets, seasons, matrix }
}

export async function getForecastVsActual(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/forecast-actual', { propertyId, ...params })
  return data // { dates, forecast, actual, mape, crps }
}

export async function getElasticityCurve(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/elasticity', { propertyId, ...params })
  return data // { priceGrid, probMean, probLow, probHigh, compMedian, chosenPrice }
}

export async function getPriceExplainWaterfall(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/price-explain', { propertyId, ...params })
  return data // { steps: [{name, value}], final }
}
```

> **Backend:** add these `/api/analytics/*` endpoints to read from Supabase and/or the pricing service. See section **8 Backend endpoints**.

---

## 5) Core components (ECharts)

### 5.1 Line with confidence band
```tsx
// frontend/src/features/pricingDashboard/components/charts/LineWithBand.tsx
import React from 'react'
import ReactECharts from 'echarts-for-react'

export type LineWithBandProps = {
  x: string[]
  y: number[]
  yLow?: number[]
  yHigh?: number[]
  name: string
  height?: number
}

export default function LineWithBand({ x, y, yLow, yHigh, name, height=320 }: LineWithBandProps) {
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 36, right: 12, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: x, boundaryGap: false },
    yAxis: { type: 'value', scale: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider' }],
    series: [
      ...(yHigh && yLow ? [{
        type: 'line', name: `${name} band`, data: yHigh, lineStyle: { width: 0 },
        stack: 'band', areaStyle: {}, symbol: 'none'
      }, {
        type: 'line', data: yLow, lineStyle: { width: 0 }, stack: 'band', areaStyle: {}, symbol: 'none'
      }] : []),
      { type: 'line', name, data: y, smooth: true, symbolSize: 3 }
    ]
  }
  return <ReactECharts option={option} style={{ height }} />
}
```

### 5.2 Indexed lines (ADR vs Market)
```tsx
// frontend/src/features/pricingDashboard/components/charts/IndexedLines.tsx
import React from 'react'
import ReactECharts from 'echarts-for-react'

export default function IndexedLines({ x, series }: { x: string[]; series: {name:string; data:number[]}[] }) {
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    xAxis: { type: 'category', data: x },
    yAxis: { type: 'value', min: 70, max: 130 },
    series: series.map(s => ({ type: 'line', ...s })),
    visualMap: [{ // optional green/red zones
      show: false, seriesIndex: 0, dimension: 1
    }]
  }
  return <ReactECharts option={option} style={{ height: 320 }} />
}
```

### 5.3 Heatmap (Lead × Season)
```tsx
// frontend/src/features/pricingDashboard/components/charts/HeatmapRevLead.tsx
import React from 'react'
import ReactECharts from 'echarts-for-react'

export default function HeatmapRevLead({ leads, seasons, matrix }: {
  leads: string[]; seasons: string[]; matrix: number[][];
}) {
  const data = []
  for (let i=0;i<seasons.length;i++) {
    for (let j=0;j<leads.length;j++) data.push([j, i, matrix[i][j] ?? 0])
  }
  const option = {
    tooltip: { position: 'top' },
    grid: { left: 70, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: leads, splitArea: { show: true } },
    yAxis: { type: 'category', data: seasons, splitArea: { show: true } },
    visualMap: { min: 0, max: Math.max(...data.map(d=>d[2]||0))||1, orient: 'horizontal', left: 'center', bottom: 0 },
    series: [{ name: 'RevPAU', type: 'heatmap', data, emphasis: { itemStyle: { shadowBlur: 10 } } }]
  }
  return <ReactECharts option={option} style={{ height: 360 }} />
}
```

### 5.4 Elasticity curve with band
```tsx
// frontend/src/features/pricingDashboard/components/charts/ElasticityCurve.tsx
import React from 'react'
import ReactECharts from 'echarts-for-react'

export default function ElasticityCurve({ prices, mean, low, high, compMedian, chosen }: {
  prices: number[]; mean: number[]; low?: number[]; high?: number[]; compMedian?: number|null; chosen?: number|null
}) {
  const marks = []
  if (compMedian != null) marks.push({ xAxis: compMedian, label: { formatter: 'Comp' }})
  if (chosen != null) marks.push({ xAxis: chosen, label: { formatter: 'Chosen' }})
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', data: prices },
    yAxis: { type: 'value', min: 0, max: 1 },
    series: [
      ...(high && low ? [{
        type: 'line', data: high, lineStyle: { width: 0 }, stack: 'b', areaStyle: {}, symbol: 'none'
      }, { type: 'line', data: low, lineStyle: { width: 0 }, stack: 'b', areaStyle: {}, symbol: 'none' }] : []),
      { type: 'line', data: mean, smooth: true, name: 'Booking prob' }
    ],
    markLine: { data: marks }
  }
  return <ReactECharts option={option} style={{ height: 300 }} />
}
```

---

## 6) Waterfall (AntV G2Plot) — Explain price

```tsx
// frontend/src/features/pricingDashboard/components/charts/WaterfallPrice.tsx
import React from 'react'
import { Waterfall } from '@ant-design/plots'

export default function WaterfallPrice({ steps }: { steps: { name: string; value: number }[] }) {
  const total = steps.reduce((a, b) => a + b.value, 0)
  const config = {
    data: steps, xField: 'name', yField: 'value',
    total: { label: 'Final', value: total },
    interactions: [{ type: 'element-active' }],
    label: { position: 'middle' },
    tooltip: { shared: true }
  }
  // @ts-expect-error lib types
  return <Waterfall {...config} />
}
```

**Expected data** from backend `/api/analytics/price-explain`:
```json
{
  "steps": [
    { "name": "Baseline", "value": 100 },
    { "name": "Market shift", "value": 5 },
    { "name": "Occupancy gap", "value": -3 },
    { "name": "Risk clamp", "value": -2 },
    { "name": "Event uplift", "value": 4 }
  ],
  "final": 104
}
```

---

## 7) Dashboard Shell (mount and replace old charts)

```tsx
// frontend/src/features/pricingDashboard/DashboardShell.tsx
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDashboardStore } from './state/useDashboardStore'
import { getRevenueSeries, getOccupancyPace, getAdrIndex, getHeatmapRevLead, getForecastVsActual, getElasticityCurve, getPriceExplainWaterfall } from './api/analyticsClient'
import LineWithBand from './components/charts/LineWithBand'
import IndexedLines from './components/charts/IndexedLines'
import HeatmapRevLead from './components/charts/HeatmapRevLead'
import ElasticityCurve from './components/charts/ElasticityCurve'
import WaterfallPrice from './components/charts/WaterfallPrice'

export default function DashboardShell() {
  const { propertyId, dateRange, leadBucket, strategy, productType } = useDashboardStore()

  const qParams = { dateRange, leadBucket, strategy, productType }

  const rev = useQuery({ queryKey: ['rev', propertyId, qParams], queryFn: () => getRevenueSeries(propertyId!, qParams), enabled: !!propertyId })
  const pace = useQuery({ queryKey: ['pace', propertyId, qParams], queryFn: () => getOccupancyPace(propertyId!, qParams), enabled: !!propertyId })
  const adr = useQuery({ queryKey: ['adr', propertyId, qParams], queryFn: () => getAdrIndex(propertyId!, qParams), enabled: !!propertyId })
  const hm = useQuery({ queryKey: ['hm', propertyId, qParams], queryFn: () => getHeatmapRevLead(propertyId!, qParams), enabled: !!propertyId })
  const fa = useQuery({ queryKey: ['fa', propertyId, qParams], queryFn: () => getForecastVsActual(propertyId!, qParams), enabled: !!propertyId })
  const el = useQuery({ queryKey: ['el', propertyId, qParams], queryFn: () => getElasticityCurve(propertyId!, qParams), enabled: !!propertyId })
  const wf = useQuery({ queryKey: ['wf', propertyId, qParams], queryFn: () => getPriceExplainWaterfall(propertyId!, qParams), enabled: !!propertyId })

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        {rev.data && <LineWithBand x={rev.data.dates} y={rev.data.actual} name="Actual revenue" />}
      </div>
      <div className="col-span-7">
        {pace.data && <LineWithBand x={pace.data.lead} y={pace.data.actual} name="Occupancy pace" />}
      </div>
      <div className="col-span-5">
        {adr.data && <IndexedLines x={adr.data.dates} series={[
          { name: 'Property ADR idx', data: adr.data.propertyIndex },
          { name: 'Market ADR idx', data: adr.data.marketIndex },
        ]} />}
      </div>
      <div className="col-span-6">
        {hm.data && <HeatmapRevLead leads={hm.data.leadBuckets} seasons={hm.data.seasons} matrix={hm.data.matrix} />}
      </div>
      <div className="col-span-6">
        {fa.data && <LineWithBand x={fa.data.dates} y={fa.data.forecast} name="Forecast bookings" />}
      </div>
      <div className="col-span-7">
        {el.data && <ElasticityCurve prices={el.data.priceGrid} mean={el.data.probMean} low={el.data.probLow} high={el.data.probHigh} compMedian={el.data.compMedian} chosen={el.data.chosenPrice} />}
      </div>
      <div className="col-span-5">
        {wf.data && <WaterfallPrice steps={wf.data.steps} />}
      </div>
    </div>
  )
}
```

**Replace old charts** by importing `DashboardShell` in `frontend/src/pages/PricingEngine.tsx` and conditionally rendering it based on a feature flag (environment variable or simple boolean).

---

## 8) Backend analytics endpoints (minimal)

Add the following routes using your existing Express + Supabase pattern. **Do not** break existing routes.

```ts
// backend/routes/analytics.pricing.ts
import { Router } from 'express'
import { authenticateUser } from '../lib/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'

export const pricingAnalyticsRouter = Router()

pricingAnalyticsRouter.post('/revenue-series', authenticateUser, async (req, res) => {
  const { userId } = req as any
  const { propertyId, dateRange } = req.body
  // Build actual revenue from pricing_data (price * bookings) by date
  // Build optimized revenue (call Python service /simulate if available, else placeholder)
  res.json({ dates: [], actual: [], optimized: [] })
})

pricingAnalyticsRouter.post('/occupancy-pace', authenticateUser, async (req, res) => {
  res.json({ lead: [], actual: [], target: [], model: [] })
})

pricingAnalyticsRouter.post('/adr-index', authenticateUser, async (req, res) => {
  res.json({ dates: [], propertyIndex: [], marketIndex: [] })
})

pricingAnalyticsRouter.post('/rev-lead-heatmap', authenticateUser, async (req, res) => {
  res.json({ leadBuckets: [], seasons: [], matrix: [] })
})

pricingAnalyticsRouter.post('/forecast-actual', authenticateUser, async (req, res) => {
  res.json({ dates: [], forecast: [], actual: [], mape: null, crps: null })
})

pricingAnalyticsRouter.post('/elasticity', authenticateUser, async (req, res) => {
  res.json({ priceGrid: [], probMean: [], probLow: [], probHigh: [], compMedian: null, chosenPrice: null })
})

pricingAnalyticsRouter.post('/price-explain', authenticateUser, async (req, res) => {
  res.json({ steps: [], final: 0 })
})
```

Mount it in `backend/server.ts`:
```ts
import { pricingAnalyticsRouter } from './routes/analytics.pricing.js'
app.use('/api/analytics', pricingAnalyticsRouter)
```

---

## 9) Data mapping — pricing model & API keys

- **Hybrid Pricing Service** (`/score` or `/simulate`): use `price_grid`, `expected` (rev, occ_now, occ_end_bucket), and `reasons` to populate **Elasticity** and **Waterfall** charts. If `/simulate` does not exist, Claude should implement it as a non-persistent endpoint returning optimized revenue for a date range.
- **Supabase `pricing_data`**: actuals for revenue/occupancy and heatmap.
- **Compset API** (if API key present): persist snapshots into `compset_snapshots` and compute ADR index; otherwise return empty arrays.
- **Weather/Holidays APIs**: already in `pricing_data` for historical; use forecast only for tooltips/labels if keys are present.

> **Claude:** Ensure env keys (e.g., `COMPS_API_KEY`, `WEATHER_API_KEY`) are **optional** and code returns sane defaults if not present.

---

## 10) Feature flag & rollout

- Add `PRICING_DASH_V2=true` to `.env`.
- In `PricingEngine.tsx`, render the new `DashboardShell` when flag is on; keep legacy charts available for a week.

---

## 11) QA & acceptance

- Charts render with mock data (no 500s if endpoints return empty arrays).
- Zoom/brush and tooltip sync work; export buttons present (ECharts `getDataURL()`).
- KPI tiles compute `% RevPAU lift`, `ADR Δ`, `Occ gap` correctly.
- Waterfall totals match final price from backend.
- No performance jank on large series (use dataZoom + optional downsampling).

**End of file.**
