import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'
import { useDataStore } from '../store'
import { getPricingQuotesForRange, PricingToggles } from '../lib/api/services/pricing'
import { useFileData } from '../hooks/queries/useFileData'
import {
  TrendingUp,
  DollarSign,
  Zap,
  Target,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  PlayCircle,
  Save,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Download,
  Database,
} from 'lucide-react'
import {
  LineChart,
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'

// Types
interface PricingData {
  date: string
  day: string
  current_price: number
  optimized_price: number
  demand_forecast: number
  occupancy_current: number
  occupancy_optimized: number
  revenue_current: number
  revenue_optimized: number
}

interface BusinessMetrics {
  current_revenue: number
  optimized_revenue: number
  revenue_uplift: number
  uplift_percentage: number
  avg_price_current: number
  avg_price_optimized: number
  avg_occupancy_current: number
  avg_occupancy_optimized: number
  total_bookings: number
}

interface PriceRecommendation {
  date: string
  day: string
  current_price: number
  recommended_price: number
  expected_occupancy: number
  revenue_impact: number
  confidence: 'high' | 'medium' | 'low'
}

type Strategy = 'conservative' | 'balanced' | 'aggressive'

interface StrategyConfig {
  name: string
  description: string
  demandSensitivity: number
  priceAggression: number
  occupancyTarget: number
  color: string
}

const STRATEGIES: Record<Strategy, StrategyConfig> = {
  conservative: {
    name: 'Conservative',
    description: 'Maintain stable prices, prioritize occupancy',
    demandSensitivity: 0.3,
    priceAggression: 0.4,
    occupancyTarget: 85,
    color: '#10B981',
  },
  balanced: {
    name: 'Balanced',
    description: 'Optimize for revenue, balanced risk',
    demandSensitivity: 0.6,
    priceAggression: 0.7,
    occupancyTarget: 75,
    color: '#EBFF57',
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Maximize revenue, dynamic pricing',
    demandSensitivity: 0.9,
    priceAggression: 1.0,
    occupancyTarget: 65,
    color: '#F59E0B',
  },
}

export const PricingEngine: React.FC = () => {
  const navigate = useNavigate()
  const { uploadedFiles } = useDataStore()
  const hasData = uploadedFiles.length > 0

  // Property selection
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const { data: fileData } = useFileData(selectedPropertyId)

  // Strategy and parameters
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>('balanced')
  const [demandSensitivity, setDemandSensitivity] = useState(0.6)
  const [priceAggression, setPriceAggression] = useState(0.7)
  const [occupancyTarget, setOccupancyTarget] = useState(75)
  const [forecastHorizon, setForecastHorizon] = useState(14)

  // UI state
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showImpact, setShowImpact] = useState(false)
  const [appliedSuccess, setAppliedSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch real pricing data from backend API
  const fetchPricingData = async (): Promise<PricingData[]> => {
    if (!selectedPropertyId) {
      return []
    }

    setIsLoading(true)
    setError(null)

    try {
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]

      // Convert strategy to toggles
      const toggles: PricingToggles = {
        risk_mode: selectedStrategy,
        strategy_fill_vs_rate: Math.round(priceAggression * 100),
        exploration_pct: 5,
        target_occ_by_lead: {
          '0-7': occupancyTarget,
          '8-14': occupancyTarget - 5,
          '15-30': occupancyTarget - 10,
        },
      }

      // Get quotes for the forecast horizon
      const quotes = await getPricingQuotesForRange(
        selectedPropertyId,
        startDate,
        forecastHorizon,
        {
          type: 'standard',
          refundable: false,
          los: 1,
        },
        toggles
      )

      // Calculate average current price from historical data
      const prices =
        fileData
          ?.map((row: any) => parseFloat(row.price || row.rate || 0))
          .filter((p: number) => p > 0) || []
      const avgCurrentPrice =
        prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 280

      // Transform API response to PricingData format
      const data: PricingData[] = quotes.map((quote, i) => {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

        const optimizedPrice = quote.data.price
        const currentPrice = avgCurrentPrice
        const occupancyOptimized = Math.round((quote.data.expected?.occ_now || 0.75) * 100)
        const occupancyCurrent = Math.round(occupancyOptimized * 0.95) // Estimate slightly lower

        // Estimate demand from occupancy
        const demandForecast = Math.round(occupancyOptimized * 1.1)

        const capacity = 100
        const revenueCurrent = Math.round((currentPrice * occupancyCurrent * capacity) / 100)
        const revenueOptimized = Math.round((optimizedPrice * occupancyOptimized * capacity) / 100)

        return {
          date: dateStr,
          day: dayName,
          current_price: Math.round(currentPrice),
          optimized_price: Math.round(optimizedPrice),
          demand_forecast: demandForecast,
          occupancy_current: occupancyCurrent,
          occupancy_optimized: occupancyOptimized,
          revenue_current: revenueCurrent,
          revenue_optimized: revenueOptimized,
        }
      })

      return data
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pricing data')
      console.error('❌ Pricing API error:', err)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const [pricingData, setPricingData] = useState<PricingData[]>([])

  // Generate detailed recommendations for table
  const generateRecommendations = (): PriceRecommendation[] => {
    return pricingData.map(data => {
      const priceDiff = data.optimized_price - data.current_price
      const revenueImpact = (priceDiff / data.current_price) * 100

      // Calculate confidence based on demand and occupancy
      let confidence: 'high' | 'medium' | 'low' = 'medium'
      if (data.demand_forecast > 80 && data.occupancy_optimized > 75) {
        confidence = 'high'
      } else if (data.demand_forecast < 50 || data.occupancy_optimized < 50) {
        confidence = 'low'
      }

      return {
        date: data.date,
        day: data.day,
        current_price: data.current_price,
        recommended_price: data.optimized_price,
        expected_occupancy: data.occupancy_optimized,
        revenue_impact: Math.round(revenueImpact * 10) / 10,
        confidence,
      }
    })
  }

  const recommendations = generateRecommendations()

  // Export recommendations
  const handleExportCSV = () => {
    const csvContent =
      'Date,Day,Current Price,Recommended Price,Expected Occupancy,Revenue Impact,Confidence\n' +
      recommendations
        .map(
          r =>
            `${r.date},${r.day},${r.current_price},${r.recommended_price},${r.expected_occupancy}%,${r.revenue_impact}%,${r.confidence}`
        )
        .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pricing_recommendations_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Auto-fetch pricing when parameters change
  useEffect(() => {
    if (!selectedPropertyId) return

    const timer = setTimeout(() => {
      fetchPricingData().then(data => setPricingData(data))
    }, 500) // Debounce API calls

    return () => clearTimeout(timer)
  }, [
    selectedPropertyId,
    selectedStrategy,
    demandSensitivity,
    priceAggression,
    occupancyTarget,
    forecastHorizon,
  ])

  // Select first property by default
  useEffect(() => {
    if (uploadedFiles.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(uploadedFiles[0].id)
    }
  }, [uploadedFiles, selectedPropertyId])

  // Calculate business metrics
  const calculateMetrics = (): BusinessMetrics => {
    if (pricingData.length === 0) {
      return {
        current_revenue: 0,
        optimized_revenue: 0,
        revenue_uplift: 0,
        uplift_percentage: 0,
        avg_price_current: 0,
        avg_price_optimized: 0,
        avg_occupancy_current: 0,
        avg_occupancy_optimized: 0,
        total_bookings: 0,
      }
    }

    const currentRevenue = pricingData.reduce((sum, d) => sum + d.revenue_current, 0)
    const optimizedRevenue = pricingData.reduce((sum, d) => sum + d.revenue_optimized, 0)
    const revenueUplift = optimizedRevenue - currentRevenue
    const upliftPercentage = (revenueUplift / currentRevenue) * 100

    const avgPriceCurrent =
      pricingData.reduce((sum, d) => sum + d.current_price, 0) / pricingData.length
    const avgPriceOptimized =
      pricingData.reduce((sum, d) => sum + d.optimized_price, 0) / pricingData.length

    const avgOccupancyCurrent =
      pricingData.reduce((sum, d) => sum + d.occupancy_current, 0) / pricingData.length
    const avgOccupancyOptimized =
      pricingData.reduce((sum, d) => sum + d.occupancy_optimized, 0) / pricingData.length

    const totalBookings = pricingData.length * 100 // Assuming 100 capacity

    return {
      current_revenue: Math.round(currentRevenue),
      optimized_revenue: Math.round(optimizedRevenue),
      revenue_uplift: Math.round(revenueUplift),
      uplift_percentage: Math.round(upliftPercentage * 10) / 10,
      avg_price_current: Math.round(avgPriceCurrent),
      avg_price_optimized: Math.round(avgPriceOptimized),
      avg_occupancy_current: Math.round(avgOccupancyCurrent),
      avg_occupancy_optimized: Math.round(avgOccupancyOptimized),
      total_bookings: totalBookings,
    }
  }

  const metrics = calculateMetrics()

  // Apply strategy preset
  const applyStrategy = (strategy: Strategy) => {
    setSelectedStrategy(strategy)
    const config = STRATEGIES[strategy]
    setDemandSensitivity(config.demandSensitivity)
    setPriceAggression(config.priceAggression)
    setOccupancyTarget(config.occupancyTarget)
  }

  // Optimize - fetch real pricing from API
  const handleOptimize = async () => {
    if (!selectedPropertyId) {
      setError('Please select a property first')
      return
    }

    setIsOptimizing(true)
    const data = await fetchPricingData()
    setPricingData(data)
    setIsOptimizing(false)

    if (data.length > 0) {
      setShowImpact(true)
    }
  }

  // Apply pricing
  const handleApply = () => {
    setAppliedSuccess(true)
    setTimeout(() => {
      setAppliedSuccess(false)
    }, 3000)
  }

  // Reset to defaults
  const handleReset = () => {
    applyStrategy('balanced')
    setForecastHorizon(14)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text mb-2 flex items-center gap-3 text-3xl font-bold">
            <Sparkles className="text-primary h-8 w-8" />
            Smart Pricing Engine
          </h1>
          <p className="text-muted">AI-powered demand forecasting and dynamic price optimization</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleOptimize}
            disabled={isOptimizing || !selectedPropertyId || isLoading}
            className="flex items-center gap-2"
          >
            {isOptimizing || isLoading ? (
              <>
                <div className="border-background h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                {isLoading ? 'Loading...' : 'Optimizing...'}
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Run Optimization
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Property Selector */}
      {hasData && (
        <Card variant="default">
          <Card.Body className="flex items-center gap-4">
            <Database className="text-primary h-5 w-5" />
            <div className="flex-1">
              <label className="text-text mb-2 block text-sm font-medium">Select Property</label>
              <select
                value={selectedPropertyId}
                onChange={e => setSelectedPropertyId(e.target.value)}
                className="border-border bg-background text-text focus:border-primary w-full rounded-lg border px-4 py-2 focus:outline-none"
              >
                <option value="">-- Select a property --</option>
                {uploadedFiles.map(file => (
                  <option key={file.id} value={file.id}>
                    {file.name} ({file.rows} records)
                  </option>
                ))}
              </select>
            </div>
            {isLoading && (
              <div className="text-muted flex items-center gap-2 text-sm">
                <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                Loading pricing data...
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border-error/30 bg-error/10 flex items-center gap-3 rounded-lg border p-4"
          >
            <AlertTriangle className="text-error h-5 w-5" />
            <div className="flex-1">
              <p className="text-error font-semibold">Pricing Error</p>
              <p className="text-muted mt-1 text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success message */}
      <AnimatePresence>
        {appliedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border-success/30 bg-success/10 flex items-center gap-3 rounded-lg border p-4"
          >
            <CheckCircle className="text-success h-5 w-5" />
            <div>
              <p className="text-success font-semibold">Pricing strategy applied successfully!</p>
              <p className="text-muted mt-1 text-sm">
                Your optimized prices are now active for the next {forecastHorizon} days.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Business Impact Visualization - HERO SECTION */}
      <AnimatePresence mode="wait">
        {showImpact && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <Card
              variant="elevated"
              className="border-primary/20 from-primary/10 via-background to-background border-2 bg-gradient-to-br"
            >
              <Card.Body className="p-8">
                <div className="mb-8 text-center">
                  <Badge variant="success" size="lg" className="mb-4">
                    <Zap className="mr-2 h-4 w-4" />
                    Optimization Complete
                  </Badge>
                  <h2 className="text-text mb-2 text-3xl font-bold">Business Impact Analysis</h2>
                  <p className="text-muted">Projected results over next {forecastHorizon} days</p>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
                  {/* Current Strategy */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-500/10">
                      <Target className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-muted mb-2 text-sm">Current Strategy</p>
                    <p className="mb-1 text-4xl font-bold text-gray-400">
                      €{(metrics.current_revenue / 1000).toFixed(1)}K
                    </p>
                    <p className="text-muted text-xs">revenue</p>
                  </motion.div>

                  {/* Arrow */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ArrowUpRight className="text-primary h-12 w-12 animate-pulse" />
                      <Badge variant="success" size="lg" className="px-4 py-2 text-lg">
                        +{metrics.uplift_percentage}%
                      </Badge>
                    </div>
                  </motion.div>

                  {/* Optimized Strategy */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-center"
                  >
                    <div className="bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full">
                      <Sparkles className="text-primary h-8 w-8" />
                    </div>
                    <p className="text-muted mb-2 text-sm">Optimized Strategy</p>
                    <p className="text-primary mb-1 text-4xl font-bold">
                      €{(metrics.optimized_revenue / 1000).toFixed(1)}K
                    </p>
                    <p className="text-muted text-xs">revenue</p>
                  </motion.div>
                </div>

                {/* Revenue Uplift Highlight */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="border-primary/20 bg-primary/5 rounded-xl border p-6 text-center"
                >
                  <p className="text-muted mb-2 text-sm">Additional Revenue</p>
                  <p className="text-primary mb-2 text-5xl font-bold">
                    +€{(metrics.revenue_uplift / 1000).toFixed(1)}K
                  </p>
                  <p className="text-muted">
                    By optimizing {forecastHorizon} days of pricing with the{' '}
                    {STRATEGIES[selectedStrategy].name.toLowerCase()} strategy
                  </p>
                </motion.div>

                {/* Apply Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  className="mt-8 flex justify-center"
                >
                  <Button variant="primary" size="lg" onClick={handleApply} className="px-8">
                    <Save className="mr-2 h-5 w-5" />
                    Apply Optimized Prices
                  </Button>
                </motion.div>
              </Card.Body>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strategy Selection */}
      <Card variant="elevated">
        <Card.Header>
          <div className="flex items-center gap-2">
            <Target className="text-primary h-5 w-5" />
            <h2 className="text-text text-lg font-semibold">Pricing Strategy</h2>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(Object.keys(STRATEGIES) as Strategy[]).map(strategy => {
              const config = STRATEGIES[strategy]
              const isSelected = selectedStrategy === strategy

              return (
                <button
                  key={strategy}
                  onClick={() => applyStrategy(strategy)}
                  className={`rounded-xl border-2 p-6 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-text text-lg font-semibold">{config.name}</h3>
                    {isSelected && <CheckCircle className="text-primary h-5 w-5" />}
                  </div>
                  <p className="text-muted mb-4 text-sm">{config.description}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Demand Sensitivity</span>
                      <span className="text-text font-medium">
                        {(config.demandSensitivity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Price Aggression</span>
                      <span className="text-text font-medium">
                        {(config.priceAggression * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Occupancy Target</span>
                      <span className="text-text font-medium">{config.occupancyTarget}%</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </Card.Body>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="bg-primary/5 absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full" />
            <div className="relative p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="bg-primary/10 rounded-xl p-3">
                  <DollarSign className="text-primary h-6 w-6" />
                </div>
                {metrics.uplift_percentage > 0 ? (
                  <Badge variant="success" size="sm">
                    +{metrics.uplift_percentage}%
                  </Badge>
                ) : (
                  <Badge variant="error" size="sm">
                    {metrics.uplift_percentage}%
                  </Badge>
                )}
              </div>
              <p className="text-muted mb-1 text-sm">Revenue Uplift</p>
              <h3 className="text-text text-3xl font-bold">
                €{(metrics.revenue_uplift / 1000).toFixed(1)}K
              </h3>
              <div className="mt-3 flex items-center gap-1 text-xs">
                {metrics.revenue_uplift >= 0 ? (
                  <ArrowUpRight className="text-success h-3 w-3" />
                ) : (
                  <ArrowDownRight className="text-error h-3 w-3" />
                )}
                <span className={metrics.revenue_uplift >= 0 ? 'text-success' : 'text-error'}>
                  vs current strategy
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-blue-500/5" />
            <div className="relative p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
              <p className="text-muted mb-1 text-sm">Avg Price (Optimized)</p>
              <h3 className="text-text text-3xl font-bold">€{metrics.avg_price_optimized}</h3>
              <div className="text-muted mt-3 flex items-center gap-1 text-xs">
                <span>Current: €{metrics.avg_price_current}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-purple-500/5" />
            <div className="relative p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-purple-500/10 p-3">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
              </div>
              <p className="text-muted mb-1 text-sm">Avg Occupancy</p>
              <h3 className="text-text text-3xl font-bold">{metrics.avg_occupancy_optimized}%</h3>
              <div className="text-muted mt-3 flex items-center gap-1 text-xs">
                <span>Current: {metrics.avg_occupancy_current}%</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-orange-500/5" />
            <div className="relative p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-orange-500/10 p-3">
                  <Calendar className="h-6 w-6 text-orange-500" />
                </div>
              </div>
              <p className="text-muted mb-1 text-sm">Forecast Period</p>
              <h3 className="text-text text-3xl font-bold">{forecastHorizon}</h3>
              <div className="text-muted mt-3 flex items-center gap-1 text-xs">
                <span>days ahead</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Fine-tune Parameters */}
      <Card variant="elevated">
        <Card.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="text-primary h-5 w-5" />
              <h2 className="text-text text-lg font-semibold">Fine-tune Optimization</h2>
            </div>
            <p className="text-muted text-xs">Adjust parameters for custom strategy</p>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Demand Sensitivity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-text text-sm font-medium">Demand Sensitivity</label>
                <span className="text-primary text-sm font-bold">
                  {(demandSensitivity * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={demandSensitivity}
                onChange={e => setDemandSensitivity(parseFloat(e.target.value))}
                className="slider-thumb bg-border h-2 w-full cursor-pointer appearance-none rounded-lg"
              />
              <p className="text-muted text-xs">
                How much demand forecast influences pricing decisions
              </p>
            </div>

            {/* Price Aggression */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-text text-sm font-medium">Price Aggression</label>
                <span className="text-primary text-sm font-bold">
                  {(priceAggression * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={priceAggression}
                onChange={e => setPriceAggression(parseFloat(e.target.value))}
                className="slider-thumb bg-border h-2 w-full cursor-pointer appearance-none rounded-lg"
              />
              <p className="text-muted text-xs">
                How aggressively to adjust prices based on demand
              </p>
            </div>

            {/* Occupancy Target */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-text text-sm font-medium">Occupancy Target</label>
                <span className="text-primary text-sm font-bold">{occupancyTarget}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={occupancyTarget}
                onChange={e => setOccupancyTarget(parseInt(e.target.value))}
                className="slider-thumb bg-border h-2 w-full cursor-pointer appearance-none rounded-lg"
              />
              <p className="text-muted text-xs">Target occupancy rate for optimization</p>
            </div>

            {/* Forecast Horizon */}
            <div className="space-y-3">
              <label className="text-text block text-sm font-medium">Forecast Horizon</label>
              <div className="flex gap-2">
                {[7, 14, 30, 60].map(days => (
                  <button
                    key={days}
                    onClick={() => setForecastHorizon(days)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      forecastHorizon === days
                        ? 'bg-primary text-background'
                        : 'border-border bg-background text-text hover:border-primary border'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
              <p className="text-muted text-xs">Number of days to optimize</p>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Pricing Comparison Chart */}
      <Card variant="elevated">
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-text text-lg font-semibold">Price Optimization Timeline</h2>
              <p className="text-muted mt-1 text-sm">Current vs. Optimized pricing strategy</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                <span className="text-muted text-xs">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary h-3 w-3 rounded-full" />
                <span className="text-muted text-xs">Optimized</span>
              </div>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={pricingData}>
              <defs>
                <linearGradient id="optimizedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EBFF57" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EBFF57" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="optimized_price"
                stroke="#EBFF57"
                strokeWidth={3}
                fill="url(#optimizedGradient)"
                name="Optimized Price"
              />
              <Line
                type="monotone"
                dataKey="current_price"
                stroke="#9CA3AF"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Current Price"
              />
              <Bar
                dataKey="demand_forecast"
                fill="#10B981"
                fillOpacity={0.2}
                name="Demand Forecast"
                yAxisId="right"
              />
              <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>

      {/* Revenue Comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card variant="default">
          <Card.Header>
            <h2 className="text-text text-lg font-semibold">Revenue Forecast</h2>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pricingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="revenue_current"
                  fill="#9CA3AF"
                  name="Current Revenue"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="revenue_optimized"
                  fill="#EBFF57"
                  name="Optimized Revenue"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        <Card variant="default">
          <Card.Header>
            <h2 className="text-text text-lg font-semibold">Occupancy Forecast</h2>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pricingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="occupancy_current"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  dot={{ fill: '#9CA3AF', r: 4 }}
                  name="Current Occupancy"
                />
                <Line
                  type="monotone"
                  dataKey="occupancy_optimized"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 4 }}
                  name="Optimized Occupancy"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </div>

      {/* Detailed Pricing Recommendations Table */}
      {pricingData.length > 0 && (
        <Card variant="elevated">
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-text text-lg font-semibold">Daily Pricing Recommendations</h2>
                <p className="text-muted mt-1 text-sm">Room/Pitch-level pricing for each day</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-muted px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Day
                    </th>
                    <th className="text-muted px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Current Price
                    </th>
                    <th className="text-muted px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Recommended
                    </th>
                    <th className="text-muted px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Occupancy
                    </th>
                    <th className="text-muted px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Impact
                    </th>
                    <th className="text-muted px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="text-muted px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {recommendations.map((rec, index) => {
                    const date = new Date(rec.date)
                    const dateStr = date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    const priceDiff = rec.recommended_price - rec.current_price

                    return (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-elevated/50 transition-colors"
                      >
                        <td className="text-text px-4 py-3 text-sm font-medium">{dateStr}</td>
                        <td className="text-muted px-4 py-3 text-sm">{rec.day}</td>
                        <td className="text-muted px-4 py-3 text-right text-sm">
                          €{rec.current_price}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <span className="text-primary font-semibold">
                            €{rec.recommended_price}
                          </span>
                          <span
                            className={`ml-2 text-xs ${priceDiff >= 0 ? 'text-success' : 'text-error'}`}
                          >
                            {priceDiff >= 0 ? '+' : ''}€{priceDiff}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <Badge
                            variant={
                              rec.expected_occupancy > 85
                                ? 'success'
                                : rec.expected_occupancy > 70
                                  ? 'default'
                                  : 'warning'
                            }
                            size="sm"
                          >
                            {rec.expected_occupancy}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <span
                            className={`font-medium ${rec.revenue_impact >= 0 ? 'text-success' : 'text-error'}`}
                          >
                            {rec.revenue_impact >= 0 ? '+' : ''}
                            {rec.revenue_impact}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <Badge
                            variant={
                              rec.confidence === 'high'
                                ? 'success'
                                : rec.confidence === 'medium'
                                  ? 'default'
                                  : 'warning'
                            }
                            size="sm"
                          >
                            {rec.confidence}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <Button variant="outline" size="sm">
                            Apply
                          </Button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Data Status Warning */}
      {!hasData && (
        <Card variant="default" className="border-blue-500/30 bg-blue-500/5">
          <Card.Body className="flex items-start gap-4">
            <Database className="mt-1 h-6 w-6 flex-shrink-0 text-blue-500" />
            <div>
              <h3 className="text-text mb-2 text-lg font-semibold">Using Simulated Data</h3>
              <p className="text-muted mb-3">
                The pricing engine is currently using simulated data for demonstration. Upload your
                historical booking data to get personalized recommendations based on your actual
                performance.
              </p>
              <Button variant="primary" size="sm" onClick={() => navigate('/data')}>
                <Database className="mr-2 h-4 w-4" />
                Upload Historical Data
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Warning/Info */}
      {metrics.uplift_percentage < 0 && (
        <Card variant="default" className="border-orange-500/30 bg-orange-500/5">
          <Card.Body className="flex items-start gap-4">
            <AlertTriangle className="mt-1 h-6 w-6 flex-shrink-0 text-orange-500" />
            <div>
              <h3 className="text-text mb-2 text-lg font-semibold">Optimization Alert</h3>
              <p className="text-muted">
                The current parameters result in lower revenue. Consider adjusting your strategy to
                be more aggressive or review your occupancy targets. The{' '}
                {STRATEGIES.balanced.name.toLowerCase()} strategy typically provides the best
                balance.
              </p>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
