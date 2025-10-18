/* eslint-disable */
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, Select, Badge, Button } from '../components/ui'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Sparkles } from 'lucide-react'
import { useDataStore } from '../store'
import { MarketSentimentCard } from '../components/insights/MarketSentimentCard'
import { AIInsightsCard } from '../components/insights/AIInsightsCard'
import { MLAnalyticsCard } from '../components/insights/MLAnalyticsCard'
import { useUploadedFiles, useFileData } from '../hooks/queries/useFileData'
import {
  useAnalyticsSummary,
  useMarketSentiment,
  useAIInsights,
} from '../hooks/queries/useAnalytics'

export const Insights = () => {
  const { uploadedFiles: zustandFiles } = useDataStore() // Backwards compatibility
  const [dateRange, setDateRange] = useState('6months')
  const [weatherFilter, setWeatherFilter] = useState('all')

  // Fetch files list using React Query
  const { data: uploadedFiles = [] } = useUploadedFiles()

  // Get first file ID for data fetching
  const firstFileId = uploadedFiles[0]?.id || zustandFiles[0]?.id || ''

  // Fetch file data using React Query
  const { data: fileData = [], isLoading: isLoadingData } = useFileData(firstFileId, 10000)

  // Process real data from Supabase for charts
  const processedData = useMemo(() => {
    if (!fileData || fileData.length === 0) {
      return {
        priceByWeather: [],
        occupancyByDay: [],
        correlationData: [],
        competitorData: [],
        weatherImpact: 0,
        peakOccupancyDay: '--',
        competitorPosition: 0,
      }
    }

    // Group data by weather condition
    const weatherGroups: Record<string, { prices: number[]; occupancies: number[] }> = {}

    fileData.forEach((row: any) => {
      const weather = row.weather || row.weather_condition || ''
      const price = parseFloat(row.price || row.rate || 0)
      let occupancy = parseFloat(row.occupancy || row.occupancy_rate || 0)

      if (occupancy > 1 && occupancy <= 100) {
        // Already percentage
      } else if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100
      }

      // Categorize weather
      let category = ''
      if (weather.toLowerCase().includes('sun') || weather.toLowerCase().includes('clear')) {
        category = 'Sunny'
      } else if (
        weather.toLowerCase().includes('cloud') ||
        weather.toLowerCase().includes('overcast')
      ) {
        category = 'Cloudy'
      } else if (
        weather.toLowerCase().includes('rain') ||
        weather.toLowerCase().includes('drizzle')
      ) {
        category = 'Rainy'
      } else if (weather.toLowerCase().includes('snow') || weather.toLowerCase().includes('ice')) {
        category = 'Snowy'
      }

      if (category && price > 0) {
        if (!weatherGroups[category]) {
          weatherGroups[category] = { prices: [], occupancies: [] }
        }
        weatherGroups[category].prices.push(price)
        if (occupancy > 0) {
          weatherGroups[category].occupancies.push(occupancy)
        }
      }
    })

    // Calculate weather averages
    const priceByWeather = Object.entries(weatherGroups)
      .filter(([_, data]) => data.prices.length > 0)
      .map(([weather, data]) => ({
        weather,
        avgPrice: Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length),
        occupancy:
          data.occupancies.length > 0
            ? Math.round(data.occupancies.reduce((a, b) => a + b, 0) / data.occupancies.length)
            : 0,
        bookings: data.prices.length,
      }))

    // Calculate weather impact (sunny vs rainy)
    let weatherImpact = 0
    const sunny = priceByWeather.find(w => w.weather === 'Sunny')
    const rainy = priceByWeather.find(w => w.weather === 'Rainy')
    if (sunny && rainy && rainy.avgPrice > 0) {
      weatherImpact = ((sunny.avgPrice - rainy.avgPrice) / rainy.avgPrice) * 100
    }

    // Group by day of week
    const dayGroups: Record<string, { prices: number[]; occupancies: number[] }> = {
      Mon: { prices: [], occupancies: [] },
      Tue: { prices: [], occupancies: [] },
      Wed: { prices: [], occupancies: [] },
      Thu: { prices: [], occupancies: [] },
      Fri: { prices: [], occupancies: [] },
      Sat: { prices: [], occupancies: [] },
      Sun: { prices: [], occupancies: [] },
    }

    fileData.forEach((row: any) => {
      const date = new Date(row.date || row.check_in || row.booking_date)
      if (isNaN(date.getTime())) return

      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
      const price = parseFloat(row.price || row.rate || 0)
      let occupancy = parseFloat(row.occupancy || row.occupancy_rate || 0)

      if (occupancy > 1 && occupancy <= 100) {
        // Already percentage
      } else if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100
      }

      if (price > 0 && dayOfWeek in dayGroups) {
        dayGroups[dayOfWeek].prices.push(price)
        if (occupancy > 0) {
          dayGroups[dayOfWeek].occupancies.push(occupancy)
        }
      }
    })

    // Calculate day averages
    const occupancyByDay = Object.entries(dayGroups).map(([day, data]) => ({
      day,
      price:
        data.prices.length > 0
          ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
          : 0,
      occupancy:
        data.occupancies.length > 0
          ? Math.round(data.occupancies.reduce((a, b) => a + b, 0) / data.occupancies.length)
          : 0,
    }))

    // Find peak occupancy day
    const peakDay = occupancyByDay.reduce((max, day) => (day.occupancy > max.occupancy ? day : max))
    const peakOccupancyDay = peakDay.occupancy > 0 ? peakDay.day : '--'

    // Temperature vs Price correlation data
    const correlationData = fileData
      .map((row: any) => {
        const temperature = parseFloat(row.temperature || row.temp || 0)
        const price = parseFloat(row.price || row.rate || 0)
        let occupancy = parseFloat(row.occupancy || row.occupancy_rate || 0)

        if (occupancy > 1 && occupancy <= 100) {
          // Already percentage
        } else if (occupancy > 0 && occupancy <= 1) {
          occupancy = occupancy * 100
        }

        if (temperature > 0 && price > 0 && occupancy > 0) {
          return { temperature, price, occupancy }
        }
        return null
      })
      .filter(Boolean)

    // Competitor data placeholder (TODO: integrate with Makcorps API if available)
    const competitorData: any[] = []
    const competitorPosition = 0

    return {
      priceByWeather,
      occupancyByDay,
      correlationData,
      competitorData,
      weatherImpact,
      peakOccupancyDay,
      competitorPosition,
    }
  }, [fileData])

  // Fetch analytics using React Query hooks
  const {
    data: analyticsSummary,
    isLoading: isLoadingAnalytics,
    refetch: refetchAnalytics,
  } = useAnalyticsSummary(firstFileId, fileData)

  // Extract data from analytics summary
  const demandForecast = analyticsSummary?.demandForecast || null
  const weatherAnalysis = analyticsSummary?.weatherImpact || null

  // Fetch market sentiment using React Query
  const {
    data: marketSentiment,
    isLoading: isLoadingSentiment,
    refetch: refetchSentiment,
  } = useMarketSentiment(firstFileId, fileData)

  // Prepare analytics data for AI insights
  const analyticsData = analyticsSummary
    ? { marketSentiment, weatherAnalysis, demandForecast }
    : null

  // Fetch AI insights using React Query (only when analytics data is ready)
  const {
    data: aiInsights,
    isLoading: isLoadingAI,
    refetch: refetchAI,
  } = useAIInsights(firstFileId, analyticsData)

  // Simple handlers for refetching (React Query handles all the data loading)
  const generateAnalytics = () => {
    refetchAnalytics()
    refetchSentiment()
  }

  const generateAI = () => {
    refetchAI()
  }

  // Extract processed data
  const {
    priceByWeather,
    occupancyByDay,
    correlationData,
    competitorData,
    weatherImpact,
    peakOccupancyDay,
    competitorPosition,
  } = processedData

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-bold text-text">
            Insights
            {(isLoadingData || isLoadingAnalytics || isLoadingSentiment || isLoadingAI) && (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </h1>
          <p className="mt-2 text-muted">Interactive pricing analytics and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={generateAnalytics}
            disabled={isLoadingAnalytics || isLoadingSentiment || !firstFileId}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isLoadingAnalytics || isLoadingSentiment ? 'Loading...' : 'Generate Analytics'}
          </Button>
          <Select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            options={[
              { value: '1month', label: 'Last Month' },
              { value: '3months', label: 'Last 3 Months' },
              { value: '6months', label: 'Last 6 Months' },
              { value: '1year', label: 'Last Year' },
            ]}
          />
          <Select
            value={weatherFilter}
            onChange={e => setWeatherFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Weather' },
              { value: 'sunny', label: 'Sunny Days' },
              { value: 'rainy', label: 'Rainy Days' },
            ]}
          />
        </div>
      </div>

      {/* Market Sentiment Analysis - NEW (Always show with loading/empty states) */}
      <MarketSentimentCard sentiment={marketSentiment} isLoading={isLoadingSentiment} />

      {/* AI-Powered Insights - NEW (Always show with loading/empty states) */}
      <AIInsightsCard insights={aiInsights} isLoading={isLoadingAI} onRefresh={generateAI} />

      {/* ML Analytics (Forecast & Correlations) - NEW (Always show with loading/empty states) */}
      <MLAnalyticsCard demandForecast={demandForecast} weatherAnalysis={weatherAnalysis} />

      {/* Key Insights - Always show */}
      <>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card variant="elevated">
            <div className="space-y-2">
              <p className="text-sm text-muted">Weather Impact</p>
              {priceByWeather.length >= 2 ? (
                <>
                  <p className="text-3xl font-bold text-primary">+{weatherImpact.toFixed(1)}%</p>
                  <p className="text-xs text-muted">Sunny days vs. Rainy days</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-muted">--</p>
                  <p className="text-xs text-muted">Upload data with weather column</p>
                </>
              )}
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-2">
              <p className="text-sm text-muted">Peak Occupancy Day</p>
              {occupancyByDay.length > 0 && occupancyByDay.some(d => d.occupancy > 0) ? (
                <>
                  <p className="text-3xl font-bold text-success">{peakOccupancyDay}</p>
                  <p className="text-xs text-muted">
                    {occupancyByDay.find(d => d.day === peakOccupancyDay)?.occupancy || 0}% average
                    occupancy
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-muted">--</p>
                  <p className="text-xs text-muted">Upload data with occupancy column</p>
                </>
              )}
            </div>
          </Card>
          <Card variant="elevated">
            <div className="space-y-2">
              <p className="text-sm text-muted">Competitor Position</p>
              {competitorData.length > 0 &&
              competitorData.some(d => d.competitor1 || d.competitor2) ? (
                <>
                  <p
                    className={`text-3xl font-bold ${competitorPosition >= 0 ? 'text-warning' : 'text-success'}`}
                  >
                    {competitorPosition >= 0 ? '+' : ''}
                    {competitorPosition.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted">
                    {competitorPosition >= 0 ? 'Above' : 'Below'} market average
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-muted">--</p>
                  <p className="text-xs text-muted">Collect competitor & upload your prices</p>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Price by Weather - Only show if we have weather data */}
        {priceByWeather.length > 0 && (
          <Card variant="default">
            <Card.Header>
              <div>
                <h2 className="text-xl font-semibold text-text">Price & Occupancy by Weather</h2>
                <p className="mt-1 text-sm text-muted">
                  How weather conditions impact pricing and demand
                </p>
              </div>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priceByWeather}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="weather" stroke="#9CA3AF" />
                  <YAxis yAxisId="left" stroke="#9CA3AF" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      color: '#FAFAFA',
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avgPrice" fill="#EBFF57" name="Avg Price (€)" />
                  <Bar yAxisId="right" dataKey="occupancy" fill="#10B981" name="Occupancy (%)" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        )}

        {/* Occupancy by Day of Week */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card variant="default">
            <Card.Header>
              <h2 className="text-xl font-semibold text-text">Occupancy by Day of Week</h2>
              <p className="mt-1 text-sm text-muted">Weekly demand patterns</p>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={occupancyByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="day" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      color: '#FAFAFA',
                    }}
                  />
                  <Bar dataKey="occupancy" name="Occupancy (%)">
                    {occupancyByDay.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.occupancy > 90
                            ? '#10B981'
                            : entry.occupancy > 75
                              ? '#EBFF57'
                              : '#9CA3AF'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>

          <Card variant="default">
            <Card.Header>
              <h2 className="text-xl font-semibold text-text">Price by Day of Week</h2>
              <p className="mt-1 text-sm text-muted">Pricing across the week</p>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={occupancyByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="day" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      color: '#FAFAFA',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#EBFF57"
                    strokeWidth={3}
                    dot={{ fill: '#EBFF57', r: 5 }}
                    name="Price (€)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </div>

        {/* Temperature vs Price Correlation */}
        {correlationData.length > 0 && (
          <Card variant="default">
            <Card.Header>
              <h2 className="text-xl font-semibold text-text">Temperature vs. Price Correlation</h2>
              <p className="mt-1 text-sm text-muted">
                Relationship between temperature and pricing
              </p>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis
                    type="number"
                    dataKey="temperature"
                    name="Temperature"
                    unit="°C"
                    stroke="#9CA3AF"
                  />
                  <YAxis type="number" dataKey="price" name="Price" unit="€" stroke="#9CA3AF" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      color: '#FAFAFA',
                    }}
                  />
                  <Scatter name="Price vs Temperature" data={correlationData} fill="#EBFF57" />
                </ScatterChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        )}

        {/* Competitor Pricing Comparison - Only show if we have competitor data */}
        {competitorData.length > 0 && (
          <Card variant="default">
            <Card.Header>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-text">Competitor Pricing Dynamics</h2>
                  <p className="mt-1 text-sm text-muted">Your pricing vs. nearby competitors</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="primary">Your Price</Badge>
                  <Badge variant="default">Competitor 1</Badge>
                  <Badge variant="default">Competitor 2</Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={competitorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      color: '#FAFAFA',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="yourPrice"
                    stroke="#EBFF57"
                    strokeWidth={3}
                    name="Your Price"
                    dot={{ fill: '#EBFF57', r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="competitor1"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    name="Competitor 1"
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="competitor2"
                    stroke="#6B7280"
                    strokeWidth={2}
                    name="Competitor 2"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        )}
      </>
    </motion.div>
  )
}
