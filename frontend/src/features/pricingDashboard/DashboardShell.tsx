import { useQuery } from '@tanstack/react-query'
import { useDashboardStore } from './state/useDashboardStore'
import { useDataStore } from '../../store'
import {
  getRevenueSeries,
  getOccupancyPace,
  getHeatmapRevLead,
  getForecastVsActual,
  getElasticityCurve,
  getPriceExplainWaterfall,
} from './api/analyticsClient'
import LineWithBand from './components/charts/LineWithBand'
import HeatmapRevLead from './components/charts/HeatmapRevLead'
import ElasticityCurve from './components/charts/ElasticityCurve'
import WaterfallPrice from './components/charts/WaterfallPrice'
import { Database } from 'lucide-react'

export default function DashboardShell() {
  const { propertyId, dateRange, leadBucket, strategy, productType, set } = useDashboardStore()
  const { uploadedFiles } = useDataStore()

  const qParams = { dateRange, leadBucket, strategy, productType }

  const rev = useQuery({
    queryKey: ['rev', propertyId, qParams],
    queryFn: () => getRevenueSeries(propertyId!, qParams),
    enabled: !!propertyId,
  })
  const pace = useQuery({
    queryKey: ['pace', propertyId, qParams],
    queryFn: () => getOccupancyPace(propertyId!, qParams),
    enabled: !!propertyId,
  })
  const hm = useQuery({
    queryKey: ['hm', propertyId, qParams],
    queryFn: () => getHeatmapRevLead(propertyId!, qParams),
    enabled: !!propertyId,
  })
  const fa = useQuery({
    queryKey: ['fa', propertyId, qParams],
    queryFn: () => getForecastVsActual(propertyId!, qParams),
    enabled: !!propertyId,
  })
  const el = useQuery({
    queryKey: ['el', propertyId, qParams],
    queryFn: () => getElasticityCurve(propertyId!, qParams),
    enabled: !!propertyId,
  })
  const wf = useQuery({
    queryKey: ['wf', propertyId, qParams],
    queryFn: () => getPriceExplainWaterfall(propertyId!, qParams),
    enabled: !!propertyId,
  })

  return (
    <div className="space-y-4">
      {/* Property Selector */}
      {uploadedFiles.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <Database className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-text">
                Select Property for Analytics
              </label>
              <select
                value={propertyId || ''}
                onChange={e => set({ propertyId: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-text focus:border-primary focus:outline-none"
              >
                <option value="">-- Select a property --</option>
                {uploadedFiles.map(file => (
                  <option key={file.id} value={file.id}>
                    {file.name} ({file.rows} records)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {!propertyId ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-card py-12 text-muted">
          {uploadedFiles.length === 0
            ? 'Upload a CSV file to view analytics'
            : 'Select a property above to view analytics'}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Revenue Series */}
          <div className="col-span-12">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-4 text-lg font-semibold text-text">Revenue vs Optimized</h3>
              {rev.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : rev.data ? (
                <LineWithBand x={rev.data.dates} y={rev.data.actual} name="Actual Revenue" />
              ) : (
                <div className="py-12 text-center text-muted">No revenue data available</div>
              )}
            </div>
          </div>

          {/* Occupancy Pace */}
          <div className="col-span-7">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-4 text-lg font-semibold text-text">Occupancy Pace</h3>
              {pace.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : pace.data ? (
                <LineWithBand x={pace.data.lead} y={pace.data.actual} name="Occupancy Pace" />
              ) : (
                <div className="py-12 text-center text-muted">No occupancy data available</div>
              )}
            </div>
          </div>

          {/* Price Waterfall */}
          <div className="col-span-5">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-4 text-lg font-semibold text-text">Price Breakdown</h3>
              {wf.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : wf.data && wf.data.steps && wf.data.steps.length > 0 ? (
                <WaterfallPrice steps={wf.data.steps} />
              ) : (
                <div className="py-12 text-center text-muted">No price breakdown available</div>
              )}
            </div>
          </div>

          {/* Heatmap */}
          <div className="col-span-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-4 text-lg font-semibold text-text">Revenue Heatmap</h3>
              {hm.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : hm.data ? (
                <HeatmapRevLead
                  leads={hm.data.leadBuckets}
                  seasons={hm.data.seasons}
                  matrix={hm.data.matrix}
                />
              ) : (
                <div className="py-12 text-center text-muted">No heatmap data available</div>
              )}
            </div>
          </div>

          {/* Forecast vs Actual */}
          <div className="col-span-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-4 text-lg font-semibold text-text">Forecast vs Actual</h3>
              {fa.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : fa.data ? (
                <LineWithBand x={fa.data.dates} y={fa.data.forecast} name="Forecast Bookings" />
              ) : (
                <div className="py-12 text-center text-muted">No forecast data available</div>
              )}
            </div>
          </div>

          {/* Elasticity Curve */}
          <div className="col-span-12">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-4 text-lg font-semibold text-text">Price Elasticity</h3>
              {el.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : el.data ? (
                <ElasticityCurve
                  prices={el.data.priceGrid}
                  mean={el.data.probMean}
                  low={el.data.probLow}
                  high={el.data.probHigh}
                  compMedian={el.data.compMedian}
                  chosen={el.data.chosenPrice}
                />
              ) : (
                <div className="py-12 text-center text-muted">No elasticity data available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
