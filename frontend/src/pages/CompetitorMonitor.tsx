import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Database,
  Download,
  RefreshCw,
  Clock,
  MapPin,
  Settings as SettingsIcon,
} from 'lucide-react'
import { Card, Button, Badge, Progress } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import { useBusinessStore } from '../store'
import {
  searchHotelsByCity,
  getRemainingCalls,
  getCacheStats,
  getHotelPriceTrend,
  exportAllData,
  type HotelPrice,
} from '../lib/api/services/makcorps'
import clsx from 'clsx'

export const CompetitorMonitor = () => {
  const navigate = useNavigate()
  const { profile } = useBusinessStore()

  const [hotels, setHotels] = useState<HotelPrice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dataType, setDataType] = useState<'historical' | 'live' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remainingCalls, setRemainingCalls] = useState(getRemainingCalls())
  const [cacheStats, setCacheStats] = useState(getCacheStats())

  // Check if location is configured
  const hasLocation = profile?.location?.city && profile?.location?.country

  const fetchHistoricalData = async () => {
    if (!hasLocation) {
      setError('Please configure your business location in Settings first')
      return
    }

    setIsLoading(true)
    setError(null)
    setDataType('historical')

    try {
      // Use cached data for historical (no API call)
      const checkIn = new Date()
      checkIn.setDate(checkIn.getDate() + 7)
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + 1)

      const results = await searchHotelsByCity(
        {
          city_id: '1', // Would map from location
          check_in: checkIn.toISOString().split('T')[0],
          check_out: checkOut.toISOString().split('T')[0],
          guests: 2,
          rooms: 1,
          currency: profile?.currency || 'USD',
        },
        false
      ) // Use cache

      setHotels(results)
      setCacheStats(getCacheStats())

      if (results.length === 0) {
        setError('No historical data found. Try fetching live data first.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch historical data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLiveData = async () => {
    if (!hasLocation) {
      setError('Please configure your business location in Settings first')
      return
    }

    if (remainingCalls === 0) {
      setError('No API calls remaining! Please use Historical Data mode.')
      return
    }

    setIsLoading(true)
    setError(null)
    setDataType('live')

    try {
      // Fetch fresh data (uses 1 API call)
      const checkIn = new Date()
      checkIn.setDate(checkIn.getDate() + 7)
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + 1)

      const results = await searchHotelsByCity(
        {
          city_id: '1', // Would map from location
          check_in: checkIn.toISOString().split('T')[0],
          check_out: checkOut.toISOString().split('T')[0],
          guests: 2,
          rooms: 1,
          currency: profile?.currency || 'USD',
        },
        true
      ) // Force refresh

      setHotels(results)
      setRemainingCalls(getRemainingCalls())
      setCacheStats(getCacheStats())

      if (results.length === 0) {
        setError('No hotels found. Check your location settings.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch live data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = () => {
    const data = exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `competitor_data_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-text text-4xl font-bold">Market Data Collection</h1>
        <p className="text-muted mt-2">
          Automatically collect competitor pricing for {profile?.location?.city || 'your location'}
        </p>
      </div>

      {/* Location Status */}
      {!hasLocation ? (
        <Card variant="elevated" className="border-warning/20 bg-warning/5">
          <Card.Body className="flex items-start gap-4">
            <div className="bg-warning/10 flex-shrink-0 rounded-lg p-3">
              <MapPin className="text-warning h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-text mb-1 text-lg font-semibold">Location Required</h3>
              <p className="text-muted mb-3 text-sm">
                Configure your business location in Settings to automatically collect competitor
                pricing data for your market.
              </p>
              <Button variant="warning" size="sm" onClick={() => navigate('/settings')}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Go to Settings
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Card variant="default">
          <Card.Body>
            <div className="flex items-center gap-4">
              <div className="bg-success/10 rounded-lg p-3">
                <MapPin className="text-success h-6 w-6" />
              </div>
              <div>
                <p className="text-muted text-sm">Monitoring Location</p>
                <p className="text-text text-lg font-semibold">
                  {profile.location.city}, {profile.location.country}
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* API Usage */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card variant="default">
          <Card.Body>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted text-sm">API Calls Remaining</span>
              <span className="text-primary text-2xl font-bold">{remainingCalls}/30</span>
            </div>
            <Progress value={(remainingCalls / 30) * 100} className="h-2" />
          </Card.Body>
        </Card>

        <Card variant="default">
          <Card.Body>
            <div className="flex items-center gap-3">
              <Database className="text-success h-5 w-5" />
              <div>
                <p className="text-muted text-sm">Hotels Tracked</p>
                <p className="text-text text-2xl font-bold">{cacheStats.total_histories}</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card variant="default">
          <Card.Body>
            <div className="flex items-center gap-3">
              <Clock className="text-info h-5 w-5" />
              <div>
                <p className="text-muted text-sm">Cache Size</p>
                <p className="text-text text-2xl font-bold">{cacheStats.cache_size_kb} KB</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Data Collection Actions */}
      <Card variant="default">
        <Card.Header>
          <h2 className="text-text text-xl font-semibold">Collect Competitor Data</h2>
          <p className="text-muted mt-1 text-sm">
            Choose Historical (free, cached) or Live (uses 1 API call, real-time)
          </p>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Historical Data */}
            <Card
              variant="elevated"
              className={clsx(
                'cursor-pointer transition-all',
                dataType === 'historical' && 'ring-success ring-2'
              )}
            >
              <Card.Body onClick={fetchHistoricalData}>
                <div className="flex items-start gap-4">
                  <div className="bg-success/10 rounded-xl p-4">
                    <Database className="text-success h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-text mb-1 text-lg font-semibold">Historical Data</h3>
                    <p className="text-muted mb-3 text-sm">
                      Use cached competitor prices. No API calls used.
                    </p>
                    <Badge variant="success">FREE - No API Call</Badge>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  className="mt-4 w-full"
                  onClick={fetchHistoricalData}
                  disabled={isLoading || !hasLocation}
                >
                  {isLoading && dataType === 'historical' ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-5 w-5" />
                      Load Historical Data
                    </>
                  )}
                </Button>
              </Card.Body>
            </Card>

            {/* Live Data */}
            <Card
              variant="elevated"
              className={clsx(
                'cursor-pointer transition-all',
                dataType === 'live' && 'ring-primary ring-2',
                remainingCalls === 0 && 'opacity-50'
              )}
            >
              <Card.Body onClick={remainingCalls > 0 ? fetchLiveData : undefined}>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-xl p-4">
                    <RefreshCw className="text-primary h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-text mb-1 text-lg font-semibold">Live Data</h3>
                    <p className="text-muted mb-3 text-sm">
                      Fetch real-time competitor prices. Uses 1 API call.
                    </p>
                    <Badge variant="warning">Uses 1 API Call</Badge>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  className="mt-4 w-full"
                  onClick={fetchLiveData}
                  disabled={isLoading || !hasLocation || remainingCalls === 0}
                >
                  {isLoading && dataType === 'live' ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5" />
                      Fetch Live Data ({remainingCalls} calls left)
                    </>
                  )}
                </Button>
              </Card.Body>
            </Card>
          </div>

          {error && (
            <div className="border-error/20 bg-error/10 mt-4 flex items-start gap-3 rounded-lg border p-4">
              <AlertCircle className="text-error mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {hotels.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-muted text-sm">
                {hotels.length} hotels loaded from{' '}
                {dataType === 'historical' ? 'cache' : 'live API'}
              </p>
              <Button variant="ghost" size="sm" onClick={handleExportData}>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Results */}
      {hotels.length > 0 && (
        <Card variant="default">
          <Card.Header>
            <div className="flex items-center justify-between">
              <h2 className="text-text text-xl font-semibold">Competitor Prices</h2>
              <Badge variant={dataType === 'live' ? 'primary' : 'success'}>
                {dataType === 'historical' ? 'Cached Data' : 'Live Data'}
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {hotels.map((hotel, index) => {
                const trend = getHotelPriceTrend(hotel.hotel_id)
                const hasHistory = trend.data_points > 1

                return (
                  <motion.div
                    key={`${hotel.hotel_id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-border bg-elevated hover:border-primary/50 rounded-lg border p-4 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-text mb-1 text-lg font-semibold">{hotel.hotel_name}</h3>
                        <div className="text-muted flex items-center gap-4 text-sm">
                          <span>{hotel.city_name}</span>
                          {hasHistory && (
                            <Badge variant="info" size="sm">
                              {trend.data_points} records
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-primary text-2xl font-bold">
                          {hotel.currency} {hotel.price.toFixed(2)}
                        </div>
                        {hasHistory && (
                          <div
                            className={clsx(
                              'mt-1 flex items-center justify-end gap-1 text-sm',
                              trend.price_change_percent > 0 ? 'text-error' : 'text-success'
                            )}
                          >
                            {trend.price_change_percent > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {Math.abs(trend.price_change_percent).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Info Card */}
      <Card
        variant="elevated"
        className="border-primary from-primary/5 border-l-4 bg-gradient-to-r to-transparent"
      >
        <Card.Body>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 flex-shrink-0 rounded-lg p-3">
              <AlertCircle className="text-primary h-6 w-6" />
            </div>
            <div>
              <h3 className="text-text mb-2 text-lg font-semibold">How Market Data Works</h3>
              <ul className="text-muted space-y-2 text-sm">
                <li>
                  • <strong>Historical Data</strong>: Loads previously fetched prices from cache
                  (free)
                </li>
                <li>
                  • <strong>Live Data</strong>: Fetches real-time prices using 1 API call
                </li>
                <li>
                  • All data is automatically saved and used in Insights and Pricing Optimizer
                </li>
                <li>• You have {remainingCalls} API calls remaining out of 30</li>
              </ul>
            </div>
          </div>
        </Card.Body>
      </Card>
    </motion.div>
  )
}
