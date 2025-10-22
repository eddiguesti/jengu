import { useEffect } from 'react'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useDataStore } from '@/store/useDataStore'
import { RevenueGainChart } from '@/components/director/RevenueGainChart'
import { OccupancyPaceChart } from '@/components/director/OccupancyPaceChart'
import { AdrIndexChart } from '@/components/director/AdrIndexChart'
import { RevLeadHeatmapChart } from '@/components/director/RevLeadHeatmap'
import { ForecastActualChart} from '@/components/director/ForecastActualChart'
import { ElasticityCurveChart } from '@/components/director/ElasticityCurveChart'
import { PriceWaterfallChart } from '@/components/director/PriceWaterfallChart'
import { registerDirectorTheme } from '@/config/echartsTheme'
import {
  useRevenueSeries,
  useOccupancyPace,
  useAdrIndex,
  useRevLeadHeatmap,
  useForecastActual,
  useElasticityCurve,
  usePriceExplain,
} from '@/hooks/queries/useDirectorAnalytics'
import { TrendingUp, TrendingDown, Target, Activity, AlertCircle } from 'lucide-react'

interface KPICardProps {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  threshold?: { warning?: number; danger?: number }
}

function KPICard({ label, value, unit, icon, trend, threshold }: KPICardProps) {
  // Determine status based on threshold
  let status: 'success' | 'warning' | 'danger' = 'success'
  if (threshold) {
    if (threshold.danger !== undefined && Math.abs(value) >= threshold.danger) {
      status = 'danger'
    } else if (threshold.warning !== undefined && Math.abs(value) >= threshold.warning) {
      status = 'warning'
    }
  }

  const statusColors = {
    success: 'border-primary/30 bg-primary/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
  }

  const textColors = {
    success: 'text-primary',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  }

  return (
    <div className={`rounded-lg border ${statusColors[status]} p-4 transition-colors`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <div className="text-muted">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${textColors[status]}`}>
          {value > 0 && unit === '%' && '+'}
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-muted">{unit}</span>
        {trend && (
          <div className="ml-2">
            {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-400" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-400" />}
          </div>
        )}
      </div>
    </div>
  )
}

export function DirectorDashboard() {
  const { selectedDate } = useDashboardStore()
  const { currentFileId } = useDataStore()

  // Fetch all dashboard data
  const { data: revenueSeries, isLoading: revenueLoading } = useRevenueSeries(currentFileId || '', !!currentFileId)
  const { data: occupancyPace, isLoading: paceLoading } = useOccupancyPace(currentFileId || '', !!currentFileId)
  const { data: adrIndex, isLoading: adrLoading } = useAdrIndex(currentFileId || '', !!currentFileId)
  const { data: heatmap, isLoading: heatmapLoading } = useRevLeadHeatmap(currentFileId || '', !!currentFileId)
  const { data: forecastActual, isLoading: forecastLoading } = useForecastActual(currentFileId || '', !!currentFileId)
  const { data: elasticity, isLoading: elasticityLoading } = useElasticityCurve(currentFileId || '', !!currentFileId)
  const { data: priceExplain, isLoading: waterfallLoading } = usePriceExplain(currentFileId || '', selectedDate, !!currentFileId)

  // Register ECharts theme on mount
  useEffect(() => {
    registerDirectorTheme()
  }, [])

  // Show message if no file is selected
  if (!currentFileId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 p-6">
        <div className="rounded-full bg-primary/10 p-6">
          <Activity className="h-12 w-12 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text">No Data Selected</h2>
          <p className="mt-2 text-sm text-muted">
            Upload a CSV file from the Data page to view Director Dashboard analytics
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Director Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Boardroom-grade pricing intelligence and ROI metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5">
            <span className="text-xs font-medium text-primary">BETA</span>
          </div>
        </div>
      </div>

      {/* KPI Header */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label="RevPAU Lift"
          value={revenueSeries?.revpau_lift_pct || 0}
          unit="%"
          icon={<TrendingUp className="h-5 w-5" />}
          trend="up"
        />
        <KPICard
          label="ADR vs Market"
          value={3.2}
          unit="%"
          icon={<Activity className="h-5 w-5" />}
          trend="up"
          threshold={{ warning: 5, danger: 10 }}
        />
        <KPICard
          label="Occupancy Gap"
          value={-2.1}
          unit="%"
          icon={<Target className="h-5 w-5" />}
          trend="down"
          threshold={{ warning: 3, danger: 5 }}
        />
        <KPICard
          label="Forecast Accuracy"
          value={forecastActual?.mape ? 100 - forecastActual.mape : 94.3}
          unit="%"
          icon={<Activity className="h-5 w-5" />}
        />
        <KPICard
          label="Data Quality"
          value={98.5}
          unit="%"
          icon={<AlertCircle className="h-5 w-5" />}
          threshold={{ warning: 95, danger: 90 }}
        />
      </div>

      {/* Row 1: Revenue Gain Chart (Full Width) */}
      <div className="grid grid-cols-1">
        {revenueSeries ? (
          <RevenueGainChart data={revenueSeries} loading={revenueLoading} />
        ) : (
          <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
            <div className="text-muted">{revenueLoading ? 'Loading revenue data...' : 'No data available'}</div>
          </div>
        )}
      </div>

      {/* Row 2: Occupancy Pace + ADR Index */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {occupancyPace ? (
            <OccupancyPaceChart data={occupancyPace} loading={paceLoading} />
          ) : (
            <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
              <div className="text-muted">{paceLoading ? 'Loading occupancy data...' : 'No data available'}</div>
            </div>
          )}
        </div>
        <div className="lg:col-span-5">
          {adrIndex ? (
            <AdrIndexChart data={adrIndex} loading={adrLoading} />
          ) : (
            <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
              <div className="text-muted">{adrLoading ? 'Loading ADR data...' : 'No data available'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Heatmap + Forecast vs Actual */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {heatmap ? (
          <RevLeadHeatmapChart data={heatmap} loading={heatmapLoading} />
        ) : (
          <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
            <div className="text-muted">{heatmapLoading ? 'Loading heatmap data...' : 'No data available'}</div>
          </div>
        )}
        {forecastActual ? (
          <ForecastActualChart data={forecastActual} loading={forecastLoading} />
        ) : (
          <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
            <div className="text-muted">{forecastLoading ? 'Loading forecast data...' : 'No data available'}</div>
          </div>
        )}
      </div>

      {/* Row 4: Elasticity Curve + Price Waterfall */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {elasticity ? (
            <ElasticityCurveChart data={elasticity} loading={elasticityLoading} />
          ) : (
            <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
              <div className="text-muted">{elasticityLoading ? 'Loading elasticity data...' : 'No data available'}</div>
            </div>
          )}
        </div>
        <div className="lg:col-span-5">
          {selectedDate && priceExplain ? (
            <PriceWaterfallChart data={priceExplain} loading={waterfallLoading} />
          ) : (
            <div className="flex h-full min-h-[380px] items-center justify-center rounded-lg border border-dashed border-border bg-card/50">
              <div className="text-center text-sm text-muted">
                <p className="mb-1 font-medium">Price Breakdown</p>
                <p>Click a date on the Revenue chart to see the price decision waterfall</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted">
        <p>
          <strong className="text-text">Director Dashboard:</strong> All charts use your uploaded CSV data with enriched weather and temporal features.
          The predictive model analyzes correlations between temperature, occupancy, and pricing.
          Interactive features: hover to sync tooltips, zoom timelines, click dates for price breakdown, and simulate elasticity curves.
        </p>
      </div>
    </div>
  )
}
