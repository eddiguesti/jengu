import { useDashboardStore } from '@/stores/useDashboardStore'
import { Card } from './Card'
import { Select } from './Select'
import type { DashboardKPIs } from '@/types/analytics'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DashboardHeaderProps {
  kpis?: DashboardKPIs
  showFilters?: boolean
  showOverlays?: boolean
}

// Extract KPICard component to avoid creating it during render
const KPICard = ({
  label,
  value,
  suffix = '',
  showTrend = true,
}: {
  label: string
  value: number
  suffix?: string
  showTrend?: boolean
}) => {
  const isPositive = value > 0
  const isNeutral = value === 0

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-100">
            {value.toFixed(1)}
            {suffix}
          </p>
        </div>
        {showTrend && (
          <div className="mt-1">
            {isPositive && <TrendingUp className="h-5 w-5 text-green-400" />}
            {isNeutral && <Minus className="h-5 w-5 text-gray-400" />}
            {!isPositive && !isNeutral && <TrendingDown className="h-5 w-5 text-red-400" />}
          </div>
        )}
      </div>
    </Card>
  )
}

export function DashboardHeader({
  kpis,
  showFilters = true,
  showOverlays = true,
}: DashboardHeaderProps) {
  const { filters, setFilter, overlays, toggleOverlay, usePricingDashV2, toggleDashboardVersion } =
    useDashboardStore()

  return (
    <div className="space-y-4">
      {/* Feature Flag Toggle (Dev Only) */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard Analytics</h1>
        <button
          onClick={toggleDashboardVersion}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            usePricingDashV2
              ? 'bg-[#EBFF57] text-black'
              : 'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {usePricingDashV2 ? 'V2 Enabled' : 'Enable V2'}
        </button>
      </div>

      {/* KPI Tiles */}
      {kpis && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <KPICard label="RevPAU Lift" value={kpis.revpau_lift_pct} suffix="%" />
          <KPICard label="ADR vs Market" value={kpis.adr_delta_vs_market} suffix="%" />
          <KPICard label="Occupancy Gap" value={kpis.occupancy_gap} suffix="%" />
          <KPICard label="Coverage" value={kpis.coverage_pct} suffix="%" showTrend={false} />
          <KPICard
            label="Violations"
            value={kpis.constraint_violations_pct}
            suffix="%"
            showTrend={false}
          />
        </div>
      )}

      {/* Filters and Overlays */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Global Filters */}
          {showFilters && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-100">Global Filters</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Property</label>
                  <Select
                    value={filters.propertyId || ''}
                    onChange={e => setFilter('propertyId', e.target.value)}
                    options={[
                      { value: '', label: 'All Properties' },
                      { value: 'prop1', label: 'Property 1' },
                      { value: 'prop2', label: 'Property 2' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Product Type</label>
                  <Select
                    value={filters.productType || ''}
                    onChange={e => setFilter('productType', e.target.value)}
                    options={[
                      { value: '', label: 'All Products' },
                      { value: 'standard', label: 'Standard' },
                      { value: 'premium', label: 'Premium' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Lead Bucket</label>
                  <Select
                    value={filters.leadBucket || ''}
                    onChange={e => setFilter('leadBucket', e.target.value)}
                    options={[
                      { value: '', label: 'All Leads' },
                      { value: '0-7', label: '0-7 days' },
                      { value: '8-21', label: '8-21 days' },
                      { value: '22-90', label: '22-90 days' },
                      { value: '91+', label: '91+ days' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Strategy Mode</label>
                  <Select
                    value={filters.strategyMode || 'balanced'}
                    onChange={e =>
                      setFilter(
                        'strategyMode',
                        e.target.value as 'conservative' | 'balanced' | 'aggressive'
                      )
                    }
                    options={[
                      { value: 'conservative', label: 'Conservative' },
                      { value: 'balanced', label: 'Balanced' },
                      { value: 'aggressive', label: 'Aggressive' },
                    ]}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() =>
                      setFilter('dateRange', {
                        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0],
                        end: new Date().toISOString().split('T')[0],
                      })
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
                  >
                    Last 90 Days
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chart Overlays */}
          {showOverlays && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-100">Chart Overlays</h3>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.actual}
                    onChange={() => toggleOverlay('actual')}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-[#EBFF57] focus:ring-2 focus:ring-[#EBFF57] focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">Actual</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.optimized}
                    onChange={() => toggleOverlay('optimized')}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-[#EBFF57] focus:ring-2 focus:ring-[#EBFF57] focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">Optimized</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.baseline}
                    onChange={() => toggleOverlay('baseline')}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-[#EBFF57] focus:ring-2 focus:ring-[#EBFF57] focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">Baseline</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.market}
                    onChange={() => toggleOverlay('market')}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-[#EBFF57] focus:ring-2 focus:ring-[#EBFF57] focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">Market</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.forecast}
                    onChange={() => toggleOverlay('forecast')}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-[#EBFF57] focus:ring-2 focus:ring-[#EBFF57] focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">Forecast</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.target}
                    onChange={() => toggleOverlay('target')}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-[#EBFF57] focus:ring-2 focus:ring-[#EBFF57] focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">Target</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
