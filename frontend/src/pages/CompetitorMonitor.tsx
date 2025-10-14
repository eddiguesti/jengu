import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, TrendingUp, TrendingDown, AlertCircle, Database, Download,
  RefreshCw, Clock, MapPin, Settings as SettingsIcon
} from 'lucide-react'
import { Card, Button, Badge, Progress } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import { useBusinessStore } from '../store'
import {
  searchHotelsByCity,
  getRemainingCalls,
  getCacheStats,
  getHotelPriceHistory,
  getHotelPriceTrend,
  exportAllData,
  type HotelPrice,
} from '../lib/api/services/makcorps'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'

export const CompetitorMonitor = () => {
  const navigate = useNavigate()
  const { profile } = useBusinessStore()

  const [hotels, setHotels] = useState<HotelPrice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dataType, setDataType] = useState<'historical' | 'live' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedHotel, setSelectedHotel] = useState<HotelPrice | null>(null)
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

      const results = await searchHotelsByCity({
        city_id: '1', // Would map from location
        check_in: checkIn.toISOString().split('T')[0],
        check_out: checkOut.toISOString().split('T')[0],
        guests: 2,
        rooms: 1,
        currency: profile?.currency || 'USD',
      }, false) // Use cache

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

      const results = await searchHotelsByCity({
        city_id: '1', // Would map from location
        check_in: checkIn.toISOString().split('T')[0],
        check_out: checkOut.toISOString().split('T')[0],
        guests: 2,
        rooms: 1,
        currency: profile?.currency || 'USD',
      }, true) // Force refresh

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
        <h1 className="text-4xl font-bold text-text">Market Data Collection</h1>
        <p className="text-muted mt-2">
          Automatically collect competitor pricing for {profile?.location?.city || 'your location'}
        </p>
      </div>

      {/* Location Status */}
      {!hasLocation ? (
        <Card variant="elevated" className="bg-warning/5 border-warning/20">
          <Card.Body className="flex items-start gap-4">
            <div className="p-3 bg-warning/10 rounded-lg flex-shrink-0">
              <MapPin className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text mb-1">
                Location Required
              </h3>
              <p className="text-sm text-muted mb-3">
                Configure your business location in Settings to automatically collect
                competitor pricing data for your market.
              </p>
              <Button
                variant="warning"
                size="sm"
                onClick={() => navigate('/settings')}
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Go to Settings
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Card variant="default">
          <Card.Body>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <MapPin className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted">Monitoring Location</p>
                <p className="text-lg font-semibold text-text">
                  {profile.location.city}, {profile.location.country}
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* API Usage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="default">
          <Card.Body>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">API Calls Remaining</span>
              <span className="text-2xl font-bold text-primary">{remainingCalls}/30</span>
            </div>
            <Progress value={(remainingCalls / 30) * 100} className="h-2" />
          </Card.Body>
        </Card>

        <Card variant="default">
          <Card.Body>
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-success" />
              <div>
                <p className="text-sm text-muted">Hotels Tracked</p>
                <p className="text-2xl font-bold text-text">{cacheStats.total_histories}</p>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card variant="default">
          <Card.Body>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-info" />
              <div>
                <p className="text-sm text-muted">Cache Size</p>
                <p className="text-2xl font-bold text-text">{cacheStats.cache_size_kb} KB</p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Data Collection Actions */}
      <Card variant="default">
        <Card.Header>
          <h2 className="text-xl font-semibold text-text">Collect Competitor Data</h2>
          <p className="text-sm text-muted mt-1">
            Choose Historical (free, cached) or Live (uses 1 API call, real-time)
          </p>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Historical Data */}
            <Card variant="elevated" className={clsx(
              'cursor-pointer transition-all',
              dataType === 'historical' && 'ring-2 ring-success'
            )}>
              <Card.Body onClick={fetchHistoricalData}>
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-success/10 rounded-xl">
                    <Database className="w-8 h-8 text-success" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text mb-1">
                      Historical Data
                    </h3>
                    <p className="text-sm text-muted mb-3">
                      Use cached competitor prices. No API calls used.
                    </p>
                    <Badge variant="success">FREE - No API Call</Badge>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full mt-4"
                  onClick={fetchHistoricalData}
                  disabled={isLoading || !hasLocation}
                >
                  {isLoading && dataType === 'historical' ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5 mr-2" />
                      Load Historical Data
                    </>
                  )}
                </Button>
              </Card.Body>
            </Card>

            {/* Live Data */}
            <Card variant="elevated" className={clsx(
              'cursor-pointer transition-all',
              dataType === 'live' && 'ring-2 ring-primary',
              remainingCalls === 0 && 'opacity-50'
            )}>
              <Card.Body onClick={remainingCalls > 0 ? fetchLiveData : undefined}>
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-primary/10 rounded-xl">
                    <RefreshCw className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text mb-1">
                      Live Data
                    </h3>
                    <p className="text-sm text-muted mb-3">
                      Fetch real-time competitor prices. Uses 1 API call.
                    </p>
                    <Badge variant="warning">Uses 1 API Call</Badge>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full mt-4"
                  onClick={fetchLiveData}
                  disabled={isLoading || !hasLocation || remainingCalls === 0}
                >
                  {isLoading && dataType === 'live' ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Fetch Live Data ({remainingCalls} calls left)
                    </>
                  )}
                </Button>
              </Card.Body>
            </Card>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {hotels.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted">
                {hotels.length} hotels loaded from {dataType === 'historical' ? 'cache' : 'live API'}
              </p>
              <Button variant="ghost" size="sm" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
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
              <h2 className="text-xl font-semibold text-text">Competitor Prices</h2>
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
                    className="p-4 bg-elevated border border-border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-text mb-1">{hotel.hotel_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted">
                          <span>{hotel.city_name}</span>
                          {hasHistory && (
                            <Badge variant="info" size="sm">{trend.data_points} records</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {hotel.currency} {hotel.price.toFixed(2)}
                        </div>
                        {hasHistory && (
                          <div className={clsx(
                            'text-sm flex items-center justify-end gap-1 mt-1',
                            trend.price_change_percent > 0 ? 'text-error' : 'text-success'
                          )}>
                            {trend.price_change_percent > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
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
      <Card variant="elevated" className="bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary">
        <Card.Body>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text mb-2">
                How Market Data Works
              </h3>
              <ul className="space-y-2 text-sm text-muted">
                <li>• <strong>Historical Data</strong>: Loads previously fetched prices from cache (free)</li>
                <li>• <strong>Live Data</strong>: Fetches real-time prices using 1 API call</li>
                <li>• All data is automatically saved and used in Insights and Pricing Optimizer</li>
                <li>• You have {remainingCalls} API calls remaining out of 30</li>
              </ul>
            </div>
          </div>
        </Card.Body>
      </Card>
    </motion.div>
  )
}
