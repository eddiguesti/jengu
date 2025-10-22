# DIRECTOR_DASHBOARD_CHARTS_GUIDE.md
**Purpose:** Give Claude clear, modern guidance to design and implement **boardroom-grade, interactive charts** for Directors — focusing on ROI, pacing, and trust — while leaving enough freedom to integrate into the existing app architecture.

> Tone: prescriptive on *what* and *why*, flexible on *how*.  
> Do not refactor unrelated code. Implement charts behind a feature flag first.

---

## 0) North Star
Directors should answer in seconds:
1) **Are we making more revenue than we could without the model?**  
2) **Are we pacing occupancy to target by lead?**  
3) **Are prices competitive and explainable?**  
4) **Where do we focus next (season, lead, product, event)?**

**Key KPIs:** RevPAU lift %, ADR Δ vs market, Occupancy vs Target, Coverage of prediction bands, Constraint violations (<1%).

---

## 1) Chart Catalog (what to build + why it matters)

### 1.1 Revenue vs Optimized (Gain Chart)
- **Why:** Quantifies model ROI visually (actual vs model-optimized revenue).
- **What it shows:** Daily revenue (actual) vs simulated optimized line; shaded **gain area** with cumulative tile (+X% RevPAU).
- **Interactions:** Zoom/brush, hover-sync with other charts, click a day to drill into waterfall (explain price).
- **Notes:** Handle seasonality; allow overlays for scenarios (Conservative/Balanced/Aggressive).

### 1.2 Occupancy Pace vs Target (Lead Buckets)
- **Why:** Directors care about sell-through; pacing signals over/under-pricing.
- **What it shows:** Actual pace trajectory vs target curve (per director toggles) and model projection.
- **Interactions:** Click a bucket (e.g., 8–21) → filters heatmap and ADR index; show gap annotations.

### 1.3 ADR vs Market Index
- **Why:** Competitive context; prevents blind over/under-pricing.
- **What it shows:** Indexed ADR (your price ÷ market p50 ×100) vs market index.
- **Interactions:** Hover-sync; bands for red (overpriced) / green (undercut) zones.

### 1.4 Revenue Heatmap by Lead × Season
- **Why:** See where the money comes from (lead windows × season/month).
- **What it shows:** Heatmap of RevPAU; click to filter other charts to that segment.
- **Interactions:** Cell click filters date range + product; tooltip shows top drivers (events/weather, if available).

### 1.5 Forecast vs Actual Bookings (Trust)
- **Why:** Validate forecasting credibility; align expectations.
- **What it shows:** Forecast vs actual with error tiles (MAPE/CRPS); outlier flags on major events.
- **Interactions:** Zoom, select date to annotate with event notes.

### 1.6 Elasticity Curve (Interactive)
- **Why:** Make price sensitivity tangible for Directors.
- **What it shows:** Booking probability vs price (mean + confidence ribbon); markers for market median & chosen price.
- **Interactions:** Draggable vertical line to simulate different prices; updates expected RevPAU tile.

### 1.7 Price Decision Waterfall (Explainability)
- **Why:** Transparency; how the model got to the final price.
- **What it shows:** Baseline → market shift → occupancy gap → risk clamp → event uplift → **final**.
- **Interactions:** Step hover with deltas; link back to Gain chart day.

> Optional **Hero Pieces** (after v1):  
> - **Perspective Pivot** for Director-led exploration (Lead × Product × Season),  
> - **deck.gl Map** to visualize regional demand or weather impact.

---

## 2) Interactivity & Filters (make it feel premium)
- **Global filters:** `propertyId`, `productType`, `dateRange`, `leadBucket`, `strategyMode`.
- **Linked crossfiltering:** Brushing in any chart updates the global store → all charts respond.
- **Hover sync:** Use a shared cursor (`axisPointer.link`) so tooltips align across charts.
- **Scenario toggles:** Animate transitions between Conservative/Balanced/Aggressive precomputed series.
- **Explain button:** “Why this price?” opens the waterfall for selected day.  
- **Export:** PNG/SVG per chart; optional PDF snapshot of dashboard state.

---

## 3) Tech Recommendations (modern, fast, maintainable)
- **Primary:** **Apache ECharts** (`echarts` + `echarts-for-react`) — performance + advanced interactions.
- **Hero visuals:** **AntV G2Plot** (Waterfall) — design polish for explainability.
- **State:** **Zustand** for cross-chart filters; **TanStack Query** for data fetching/caching.
- **Optional:** **FINOS Perspective** for power pivot; **deck.gl** for maps.

> Rationale: This combo maximizes speed & interactivity while keeping the bundle manageable and the codebase coherent.

---

## 4) Data Contracts (keep these stable)
Return shapes from backend must be simple and documented. Use `@/types/analytics.ts` to define TypeScript interfaces.

```ts
// Revenue vs Optimized
type RevenueSeries = {
  dates: string[]
  actual: number[]
  optimized?: number[]        // if /simulate available
  revpau_lift_pct?: number    // optional KPI
}

// Occupancy Pace
type OccupancyPace = {
  lead: string[]              // e.g., ["0-1","2-7","8-21","22-90"]
  actual: number[]            // 0..1
  target: number[]            // 0..1
  model?: number[]            // 0..1 projected
}

// ADR Index
type AdrIndex = {
  dates: string[]
  propertyIndex: number[]     // 100 = parity
  marketIndex?: number[]
}

// Heatmap Rev Lead
type RevLeadHeatmap = {
  leadBuckets: string[]
  seasons: string[]
  matrix: number[][]          // seasons x leads
}

// Forecast vs Actual
type ForecastActual = {
  dates: string[]
  forecast: number[]
  actual: number[]
  mape?: number
  crps?: number
}

// Elasticity Curve
type ElasticityCurve = {
  priceGrid: number[]
  probMean: number[]          // 0..1
  probLow?: number[]
  probHigh?: number[]
  compMedian?: number|null
  chosenPrice?: number|null
}

// Waterfall Explain
type PriceExplain = {
  steps: { name: string; value: number }[]
  final: number
}
```

**Mapping Sources:**  
- Pricing service `/score` → elasticity, chosen price, bands, reasons.  
- Supabase `pricing_data` → actuals (revenue, bookings, occupancy).  
- `pricing_quotes` + `pricing_outcomes` → model learn & optimized backtest.  
- `compset_snapshots` → ADR index.  
- Weather/Events → labels & annotations.

---

## 5) UX & Design System (consistency = trust)
- **Theme:** one ECharts theme (fonts, grid, colors) shared by all charts; keep AntV palette aligned.
- **Layouts:** grid-based (12 cols), cards with consistent padding and headers.
- **Formatting:** `Intl.NumberFormat` for currency and percentages; unify date formats (ISO → UI).
- **Accessibility:** keyboard focus on legends; high-contrast mode; descriptive alt text on exports.
- **Performance:** use `dataZoom`, debounce filter updates (150–250ms), downsample long series server-side (LTTB).

---

## 6) Implementation Hints (not rigid instructions)
- Build a **DashboardShell** that reads global filters from Zustand and renders chart cards.
- Create reusable chart wrappers: `LineWithBand`, `IndexedLines`, `Heatmap`, `WaterfallExplain`.
- Prefer **server-shaping** for chart data (the backend returns already-aligned arrays).
- Use **React.Suspense** + code-splitting for hero charts (AntV).
- Add **Export** button per chart using ECharts `getDataURL()` and AntV `toDataURL()` equivalents.

---

## 7) Minimal Backend Work (safe & modular)
- Add analytics routes under `/api/analytics/*` to serve the data contracts above.
- Keep responses consistent `{ ok: true, data, error: null }`; return empty arrays if data missing.
- If the pricing service lacks `/simulate` (optimized revenue time series), add a lightweight proxy that replays historical days with current policy (or return `optimized=null` initially).

---

## 8) QA & Acceptance Criteria
- **Functionality:** All charts render with filters; hover/zoom synced; water­fall explains the selected day.
- **Performance:** p95 interaction latency < 200ms; first paint < 2s on a year of data.
- **Correctness:** KPIs on tiles match chart calculations; no mismatch on date alignment.
- **Resilience:** Missing optional data (compset/weather) does not break charts (graceful fallbacks).
- **Docs:** `README.md` exists in the feature folder describing charts, data, and state flow.
- **Rollout:** Feature-flagged; legacy charts remain for one week for comparison.

---

## 9) Director-First Dashboard Layout (starter plan)
1. **Header KPIs:** RevPAU lift %, ADR Δ vs market, Occupancy gap, Coverage %, Violations %
2. **Row 1:** Gain Chart (12 cols)
3. **Row 2:** Occupancy Pace (7 cols) + ADR Index (5 cols)
4. **Row 3:** Lead × Season Heatmap (6 cols) + Forecast vs Actual (6 cols)
5. **Row 4:** Elasticity Curve (7 cols) + Price Waterfall (5 cols)

> Keep the layout responsive; on narrow screens stack vertically with collapsible cards.

---

## 10) What NOT to do
- Don’t refactor unrelated routes or components.
- Don’t couple charts directly to Supabase; always go through the backend.
- Don’t push incomplete analytics with breaking shapes — return empty arrays until ready.
- Don’t introduce blocking dependencies for optional features (pivot, maps) — lazy-load them.

---

## 11) Done = ✅
- Charts implemented behind `PRICING_DASH_V2` flag
- Unified theme, formatting, and behavior across charts
- Analytics endpoints live and returning stable shapes
- Export works on all charts
- README and types added
- Performance and accessibility checks pass
- Legacy charts removable after a week

---

**End of guide.**  
Implement incrementally; keep PRs small and focused. If in doubt, ship the Gain Chart + Occupancy Pace first — they deliver the most Director value.
