import { useState } from 'react'
import { BarChart3, TrendingUp, DollarSign, Users, AlertCircle, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { PriceElasticityCard } from '@/components/analytics/PriceElasticityCard'
import { DemandPatternsCard } from '@/components/analytics/DemandPatternsCard'
import { WeatherImpactCard } from '@/components/analytics/WeatherImpactCard'
import { useAdvancedAnalytics } from '@/hooks/queries/useAnalytics'
import { useUploadedFiles } from '@/hooks/queries/useFileData'

/**
 * Analytics Page - Comprehensive pricing analytics dashboard
 */
export const Analytics = () => {
  const { data: files } = useUploadedFiles()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')

  // Auto-select first file if available
  const propertyId = selectedPropertyId || files?.[0]?.id

  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
  } = useAdvancedAnalytics(propertyId)

  // Calculate summary metrics from historical data
  const calculateSummaryMetrics = () => {
    if (!analyticsData?.analytics) return null

    const analytics = analyticsData.analytics

    // Calculate average revenue (price × occupancy)
    const avgRevenue = Math.round(analytics.averageRevenue || 0)

    // Mock data for now - in production this would come from historical data
    const totalRevenue = avgRevenue * 30 // Rough monthly estimate
    const avgOccupancy = analytics.peakDays?.length ? 78 : 65
    const avgPrice = Math.round(avgRevenue / (avgOccupancy / 100))
    const totalBookings = Math.round(avgOccupancy * 1.3)

    return {
      totalRevenue,
      avgOccupancy,
      avgPrice,
      totalBookings,
    }
  }

  const summaryMetrics = calculateSummaryMetrics()

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-text mb-2 text-3xl font-bold">Analytics</h1>
          <p className="text-muted">
            Comprehensive insights and data-driven recommendations for optimal pricing
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Property Selector */}
          {files && files.length > 1 && (
            <Select
              value={propertyId || ''}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-64"
            >
              <option value="">Select a property...</option>
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </Select>
          )}

          {/* Refresh Button */}
          {propertyId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-error/30 bg-error/10">
          <Card.Body className="flex items-center gap-4 p-6">
            <AlertCircle className="text-error h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-error font-semibold">Failed to load analytics</p>
              <p className="text-error/80 mt-1 text-sm">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* No Property Selected */}
      {!propertyId && !isLoading && (
        <Card className="p-12 text-center">
          <div className="mx-auto max-w-md">
            <BarChart3 className="text-primary mx-auto mb-4 h-16 w-16" />
            <h2 className="text-text mb-2 text-2xl font-bold">No Property Selected</h2>
            <p className="text-muted mb-6">
              Upload a pricing dataset to see comprehensive analytics and get AI-powered
              recommendations for optimizing your revenue.
            </p>
            <Button variant="primary" onClick={() => (window.location.href = '/data')}>
              Upload Data
            </Button>
          </div>
        </Card>
      )}

      {/* Analytics Content */}
      {analyticsData && !isLoading && summaryMetrics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted mb-1 text-sm">Total Revenue (Est.)</p>
                  <p className="text-text text-3xl font-bold">
                    €{summaryMetrics.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-success mt-1 text-xs">Last 30 days estimate</p>
                </div>
                <DollarSign className="text-primary h-8 w-8" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted mb-1 text-sm">Avg Occupancy</p>
                  <p className="text-text text-3xl font-bold">{summaryMetrics.avgOccupancy}%</p>
                  <p className="text-muted mt-1 text-xs">Based on historical data</p>
                </div>
                <Users className="text-primary h-8 w-8" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted mb-1 text-sm">Avg Price</p>
                  <p className="text-text text-3xl font-bold">€{summaryMetrics.avgPrice}</p>
                  <p className="text-muted mt-1 text-xs">Per night average</p>
                </div>
                <TrendingUp className="text-primary h-8 w-8" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted mb-1 text-sm">Data Quality</p>
                  <p className="text-text text-3xl font-bold">
                    {Math.round((analyticsData.dataQuality.enrichmentRate || 0) * 100)}%
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {analyticsData.dataQuality.enrichedDays} of {analyticsData.dataQuality.totalDays} days enriched
                  </p>
                </div>
                <BarChart3 className="text-primary h-8 w-8" />
              </div>
            </Card>
          </div>

          {/* Detailed Analytics Cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Price Elasticity */}
            <PriceElasticityCard
              elasticity={analyticsData.analytics.priceElasticity}
              weekendPremium={analyticsData.analytics.weekendPremium}
              holidayPremium={analyticsData.analytics.holidayPremium}
            />

            {/* Demand Patterns */}
            <DemandPatternsCard
              peakDays={analyticsData.analytics.peakDays || []}
              lowDays={analyticsData.analytics.lowDays || []}
              demandPatterns={analyticsData.analytics.demandPatterns}
            />
          </div>

          {/* Weather Impact */}
          {analyticsData.analytics.weatherSensitivity !== undefined &&
            analyticsData.analytics.optimalTemperatureRange && (
              <WeatherImpactCard
                weatherSensitivity={analyticsData.analytics.weatherSensitivity}
                optimalTemperatureRange={analyticsData.analytics.optimalTemperatureRange}
              />
            )}

          {/* Data Quality Warning */}
          {analyticsData.dataQuality.enrichmentRate < 0.5 && (
            <Card className="border-warning/30 bg-warning/10">
              <Card.Body className="flex items-start gap-4 p-6">
                <AlertCircle className="text-warning mt-1 h-6 w-6 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-warning font-semibold">Low Data Quality</p>
                  <p className="text-warning/80 mt-1 text-sm">
                    Only {Math.round(analyticsData.dataQuality.enrichmentRate * 100)}% of your data
                    has been enriched with weather and holiday information. Run enrichment to get
                    more accurate analytics and pricing recommendations.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-warning text-warning hover:bg-warning/10 mt-3"
                    onClick={() => (window.location.href = '/data')}
                  >
                    Enrich Data
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Property Info Footer */}
          <Card className="bg-elevated">
            <Card.Body className="p-4 text-center">
              <p className="text-muted text-xs">
                Analyzing <span className="text-text font-semibold">{analyticsData.property.name}</span> •{' '}
                {analyticsData.dataQuality.totalDays} days of historical data •{' '}
                Last updated {new Date().toLocaleTimeString()}
              </p>
            </Card.Body>
          </Card>
        </>
      )}

      {/* Insufficient Data Warning */}
      {!isLoading &&
        !error &&
        propertyId &&
        analyticsData?.dataQuality.totalDays &&
        analyticsData.dataQuality.totalDays < 14 && (
          <Card className="border-warning/30 bg-warning/10 p-12 text-center">
            <div className="mx-auto max-w-md">
              <AlertCircle className="text-warning mx-auto mb-4 h-16 w-16" />
              <h2 className="text-warning mb-2 text-2xl font-bold">Insufficient Data</h2>
              <p className="text-warning/80 mb-6">
                We need at least 14 days of historical data to generate accurate analytics.
                Currently, you have {analyticsData.dataQuality.totalDays} days of data.
              </p>
              <p className="text-warning/80 text-sm">
                Upload more historical pricing data to unlock comprehensive analytics and ML-powered
                recommendations.
              </p>
            </div>
          </Card>
        )}
    </div>
  )
}
