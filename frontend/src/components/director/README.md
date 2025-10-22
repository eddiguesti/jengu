# Director Dashboard Charts

**Boardroom-grade interactive analytics components**

## Components

| Component | Purpose | Interactivity |
|-----------|---------|---------------|
| `RevenueGainChart.tsx` | Revenue vs Optimized (ROI) | Zoom, hover-sync, click for waterfall, export |
| `OccupancyPaceChart.tsx` | Pace vs Target by Lead | Click to filter, hover, export |
| `AdrIndexChart.tsx` | ADR vs Market Index | Hover-sync, zoom, color zones, export |
| `RevLeadHeatmap.tsx` | Revenue by Lead × Season | Click cell to filter, export |
| `ForecastActualChart.tsx` | Forecast Validation | Outlier detection, hover-sync, export |
| `ElasticityCurveChart.tsx` | Price Sensitivity | **Click to simulate prices**, export |
| `PriceWaterfallChart.tsx` | Price Decision Breakdown | AntV waterfall, export |

## Usage

All components follow the same pattern:

```tsx
import { RevenueGainChart } from '@/components/director/RevenueGainChart'
import type { RevenueSeries } from '@/types/analytics'

const data: RevenueSeries = {
  dates: ['2025-01', '2025-02'],
  actual: [45000, 52000],
  optimized: [48000, 56000],
  revpau_lift_pct: 12.5
}

<RevenueGainChart data={data} loading={false} />
```

## Props

All components accept:

- `data`: Typed data object (see `@/types/analytics.ts`)
- `loading?`: Optional boolean for loading state

## Features

- **Unified Theme**: All charts use `director-dashboard` theme
- **Export**: Every chart has PNG export button
- **Hover Sync**: Time-series charts sync tooltips via `useDashboardStore`
- **Cross-Filtering**: Click events update global filters
- **Responsive**: Adapts to container size

## State Management

Charts interact with global state via Zustand:

```tsx
import { useDashboardStore } from '@/stores/useDashboardStore'

const { setFilter, setSelectedDate, hoveredDate } = useDashboardStore()

// Update filters
setFilter('leadBucket', '8-21')

// Drill down
setSelectedDate('2025-01-15')
```

## Data Flow

```
Backend API → React Query Hook → Component Props → ECharts/G2Plot
                                       ↓
                              useDashboardStore (filters, hover state)
                                       ↓
                           Other charts (re-render on state change)
```

## Adding a New Chart

1. Create component in this directory
2. Add data type to `@/types/analytics.ts`
3. Use `director-dashboard` theme
4. Add export button
5. Connect to `useDashboardStore` if interactive
6. Import in `DirectorDashboard.tsx`

## Performance

- **Canvas rendering**: Hardware-accelerated via ECharts
- **Lazy updates**: `lazyUpdate={true}` on all ReactECharts
- **No re-merge**: `notMerge={true}` for full re-renders only

## Theme

Theme defined in `@/config/echartsTheme.ts`:

```typescript
Primary: #EBFF57
Cyan: #00D9FF
Red: #FF6B6B
Teal: #4ECDC4
Background: transparent (inherits from card)
```

## Testing Locally

```bash
cd frontend
pnpm run dev
# Visit http://localhost:5173/director
```

---

See full documentation: `docs/developer/DIRECTOR_DASHBOARD.md`
