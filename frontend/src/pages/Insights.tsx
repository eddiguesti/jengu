import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Database, TrendingUp } from 'lucide-react'
import { useDataStore } from '../store'
import { getCombinedInsights, hasRealData as checkHasRealData } from '../lib/services/insightsData'

export const Insights = () => {
  const navigate = useNavigate()
  const { uploadedFiles } = useDataStore()
  const [dateRange, setDateRange] = useState('6months')
  const [weatherFilter, setWeatherFilter] = useState('all')

  // Check if we have real data
  const hasUploadedData = uploadedFiles.length > 0
  const hasCompetitorData = checkHasRealData()
  const hasAnyData = hasUploadedData || hasCompetitorData

  // Get real insights data (will be empty if no data)
  const [insights, setInsights] = useState(() => getCombinedInsights())

  // Refresh insights when uploaded files change
  useEffect(() => {
    // TODO: Load actual CSV data from uploaded files
    // For now, regenerate insights
    setInsights(getCombinedInsights())
  }, [uploadedFiles])

  const priceByWeather = insights.priceByWeather
  const occupancyByDay = insights.occupancyByDay
  const correlationData = insights.priceCorrelation
  const competitorData = insights.competitorPricing

  // Weather impact calculation
  const weatherImpact = insights.metrics.weatherImpact.toFixed(1)
  const peakOccupancyDay = insights.metrics.peakOccupancyDay
  const competitorPosition = insights.metrics.competitorPosition.toFixed(1)

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
          <h1 className="text-4xl font-bold text-text">Insights</h1>
          <p className="text-muted mt-2">Interactive pricing analytics and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: '1month', label: 'Last Month' },
              { value: '3months', label: 'Last 3 Months' },
              { value: '6months', label: 'Last 6 Months' },
              { value: '1year', label: 'Last Year' },
            ]}
          />
          <Select
            value={weatherFilter}
            onChange={(e) => setWeatherFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Weather' },
              { value: 'sunny', label: 'Sunny Days' },
              { value: 'rainy', label: 'Rainy Days' },
            ]}
          />
        </div>
      </div>

      {/* Empty State - Show when no data available */}
      {!hasAnyData && (
        <Card variant="elevated" className="text-center py-20">
          <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
            <div className="p-6 bg-primary/10 rounded-full">
              <TrendingUp className="w-16 h-16 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text mb-3">
                No Data Available for Insights
              </h2>
              <p className="text-muted text-lg mb-6">
                Upload your historical booking data and collect competitor pricing to unlock powerful insights and analytics.
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="primary" size="lg" onClick={() => navigate('/data')}>
                <Database className="w-5 h-5 mr-2" />
                Upload Data
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/competitor-monitor')}>
                <TrendingUp className="w-5 h-5 mr-2" />
                Collect Market Data
              </Button>
            </div>
            <div className="mt-6 p-4 bg-muted/5 border border-muted/20 rounded-lg text-left w-full">
              <h3 className="text-sm font-semibold text-text mb-2">What you'll see with data:</h3>
              <ul className="space-y-1 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Weather impact on pricing and occupancy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Day-of-week demand patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Temperature vs. price correlations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Competitor pricing comparisons</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Show insights when data is available */}
      {hasAnyData && (
        <>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated">
          <div className="space-y-2">
            <p className="text-sm text-muted">Weather Impact</p>
            {priceByWeather.length >= 2 ? (
              <>
                <p className="text-3xl font-bold text-primary">+{weatherImpact}%</p>
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
                  {occupancyByDay.find(d => d.day === peakOccupancyDay)?.occupancy || 0}% average occupancy
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
            {competitorData.length > 0 && competitorData.some(d => d.competitor1 || d.competitor2) ? (
              <>
                <p className={`text-3xl font-bold ${parseFloat(competitorPosition) >= 0 ? 'text-warning' : 'text-success'}`}>
                  {parseFloat(competitorPosition) >= 0 ? '+' : ''}{competitorPosition}%
                </p>
                <p className="text-xs text-muted">
                  {parseFloat(competitorPosition) >= 0 ? 'Above' : 'Below'} market average
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
            <p className="text-sm text-muted mt-1">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="default">
          <Card.Header>
            <h2 className="text-xl font-semibold text-text">Occupancy by Day of Week</h2>
            <p className="text-sm text-muted mt-1">Weekly demand patterns</p>
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
                      fill={entry.occupancy > 90 ? '#10B981' : entry.occupancy > 75 ? '#EBFF57' : '#9CA3AF'}
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
            <p className="text-sm text-muted mt-1">Pricing across the week</p>
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
      <Card variant="default">
        <Card.Header>
          <h2 className="text-xl font-semibold text-text">Temperature vs. Price Correlation</h2>
          <p className="text-sm text-muted mt-1">
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

      {/* Competitor Pricing Comparison */}
      <Card variant="default">
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text">Competitor Pricing Dynamics</h2>
              <p className="text-sm text-muted mt-1">Your pricing vs. nearby competitors</p>
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

      {/* Statistical Summary */}
      <Card variant="default">
        <Card.Header>
          <h2 className="text-xl font-semibold text-text">Key Statistical Insights</h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Weather Impact</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2 text-muted">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-success">Sunny days</strong> command{' '}
                    <strong className="text-text">+{weatherImpact}%</strong> higher prices with{' '}
                    <strong className="text-text">92% occupancy</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2 text-muted">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-warning">Rainy conditions</strong> see{' '}
                    <strong className="text-text">35% fewer bookings</strong> on average
                  </span>
                </li>
                <li className="flex items-start gap-2 text-muted">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-text">Snowy weather</strong> enables premium pricing (+36%)
                    for winter destinations
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Demand Patterns</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2 text-muted">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-success">Weekends</strong> show{' '}
                    <strong className="text-text">30% higher occupancy</strong> than weekdays
                  </span>
                </li>
                <li className="flex items-start gap-2 text-muted">
                  <span className="text-primary">•</span>
                  <span>
                    Peak pricing opportunity: <strong className="text-text">Friday-Saturday</strong>{' '}
                    with 95%+ occupancy
                  </span>
                </li>
                <li className="flex items-start gap-2 text-muted">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-warning">Monday-Wednesday</strong> require competitive
                    pricing to maintain 70%+ occupancy
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Card.Body>
      </Card>
      </>
      )}
    </motion.div>
  )
}
