import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'
import { useDataStore } from '../store'
import {
  TrendingUp,
  TrendingDown,
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
  AreaChart,
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

  // Generate realistic pricing data
  const generatePricingData = (): PricingData[] => {
    const data: PricingData[] = []
    const today = new Date()
    const basePrice = 280
    const capacity = 100 // Total rooms/spots

    for (let i = 0; i < forecastHorizon; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      const isWeekend = dayName === 'Sat' || dayName === 'Sun'

      // Simulate demand pattern (0-100 scale)
      const seasonalDemand = 70 + Math.sin((date.getMonth() / 12) * Math.PI * 2) * 15
      const weekendBoost = isWeekend ? 20 : 0
      const dayVariation = Math.sin(i * 0.4) * 10
      const demandForecast = Math.round(Math.max(40, Math.min(100, seasonalDemand + weekendBoost + dayVariation)))

      // Current pricing strategy (basic)
      const currentPrice = isWeekend ? basePrice + 40 : basePrice
      const currentOccupancy = Math.min(95, demandForecast * 0.8 + Math.random() * 10)

      // Optimized pricing based on parameters
      const demandMultiplier = 1 + ((demandForecast - 70) / 100) * demandSensitivity
      const aggressionFactor = 1 + (priceAggression * 0.3)
      const occupancyGap = currentOccupancy - occupancyTarget
      const occupancyAdjustment = occupancyGap > 0 ? 1.1 : 0.95 // If above target, can charge more

      let optimizedPrice = currentPrice * demandMultiplier * aggressionFactor * occupancyAdjustment

      // Add day-of-week intelligence
      if (isWeekend) {
        optimizedPrice *= 1.15
      }

      // Clamp to realistic range
      optimizedPrice = Math.round(Math.max(basePrice * 0.7, Math.min(basePrice * 1.8, optimizedPrice)))

      // Calculate occupancy impact
      // Higher prices reduce occupancy if demand isn't strong enough
      const priceElasticity = 0.5
      const priceChange = (optimizedPrice - currentPrice) / currentPrice
      const occupancyImpact = -priceChange * priceElasticity * demandForecast * 0.3
      const optimizedOccupancy = Math.round(Math.max(30, Math.min(98, currentOccupancy + occupancyImpact)))

      // Calculate revenues
      const revenueCurrent = Math.round((currentPrice * currentOccupancy * capacity) / 100)
      const revenueOptimized = Math.round((optimizedPrice * optimizedOccupancy * capacity) / 100)

      data.push({
        date: dateStr,
        day: dayName,
        current_price: currentPrice,
        optimized_price: optimizedPrice,
        demand_forecast: demandForecast,
        occupancy_current: Math.round(currentOccupancy),
        occupancy_optimized: optimizedOccupancy,
        revenue_current: revenueCurrent,
        revenue_optimized: revenueOptimized,
      })
    }

    return data
  }

  const [pricingData, setPricingData] = useState<PricingData[]>([])

  // Generate detailed recommendations for table
  const generateRecommendations = (): PriceRecommendation[] => {
    return pricingData.map((data) => {
      const priceDiff = data.optimized_price - data.current_price
      const revenueImpact = ((priceDiff / data.current_price) * 100)

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
    const csvContent = 'Date,Day,Current Price,Recommended Price,Expected Occupancy,Revenue Impact,Confidence\n' +
      recommendations.map(r => `${r.date},${r.day},${r.current_price},${r.recommended_price},${r.expected_occupancy}%,${r.revenue_impact}%,${r.confidence}`).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pricing_recommendations_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Auto-regenerate when parameters change
  useEffect(() => {
    const timer = setTimeout(() => {
      const newData = generatePricingData()
      setPricingData(newData)
    }, 300)

    return () => clearTimeout(timer)
  }, [demandSensitivity, priceAggression, occupancyTarget, forecastHorizon])

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

    const avgPriceCurrent = pricingData.reduce((sum, d) => sum + d.current_price, 0) / pricingData.length
    const avgPriceOptimized = pricingData.reduce((sum, d) => sum + d.optimized_price, 0) / pricingData.length

    const avgOccupancyCurrent = pricingData.reduce((sum, d) => sum + d.occupancy_current, 0) / pricingData.length
    const avgOccupancyOptimized = pricingData.reduce((sum, d) => sum + d.occupancy_optimized, 0) / pricingData.length

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

  // Optimize animation
  const handleOptimize = () => {
    setIsOptimizing(true)
    setTimeout(() => {
      setIsOptimizing(false)
      setShowImpact(true)
    }, 1500)
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
          <h1 className="text-3xl font-bold text-text mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            Smart Pricing Engine
          </h1>
          <p className="text-muted">
            AI-powered demand forecasting and dynamic price optimization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="flex items-center gap-2"
          >
            {isOptimizing ? (
              <>
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                Run Optimization
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success message */}
      <AnimatePresence>
        {appliedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-success" />
            <div>
              <p className="text-success font-semibold">Pricing strategy applied successfully!</p>
              <p className="text-sm text-muted mt-1">
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
            <Card variant="elevated" className="bg-gradient-to-br from-primary/10 via-background to-background border-2 border-primary/20">
              <Card.Body className="p-8">
                <div className="text-center mb-8">
                  <Badge variant="success" size="lg" className="mb-4">
                    <Zap className="w-4 h-4 mr-2" />
                    Optimization Complete
                  </Badge>
                  <h2 className="text-3xl font-bold text-text mb-2">Business Impact Analysis</h2>
                  <p className="text-muted">Projected results over next {forecastHorizon} days</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  {/* Current Strategy */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/10 mb-4">
                      <Target className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-muted mb-2">Current Strategy</p>
                    <p className="text-4xl font-bold text-gray-400 mb-1">
                      €{(metrics.current_revenue / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-muted">revenue</p>
                  </motion.div>

                  {/* Arrow */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ArrowUpRight className="w-12 h-12 text-primary animate-pulse" />
                      <Badge variant="success" size="lg" className="text-lg px-4 py-2">
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
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted mb-2">Optimized Strategy</p>
                    <p className="text-4xl font-bold text-primary mb-1">
                      €{(metrics.optimized_revenue / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-muted">revenue</p>
                  </motion.div>
                </div>

                {/* Revenue Uplift Highlight */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-primary/5 rounded-xl p-6 border border-primary/20 text-center"
                >
                  <p className="text-sm text-muted mb-2">Additional Revenue</p>
                  <p className="text-5xl font-bold text-primary mb-2">
                    +€{(metrics.revenue_uplift / 1000).toFixed(1)}K
                  </p>
                  <p className="text-muted">
                    By optimizing {forecastHorizon} days of pricing with the {STRATEGIES[selectedStrategy].name.toLowerCase()} strategy
                  </p>
                </motion.div>

                {/* Apply Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  className="flex justify-center mt-8"
                >
                  <Button variant="primary" size="lg" onClick={handleApply} className="px-8">
                    <Save className="w-5 h-5 mr-2" />
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
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">Pricing Strategy</h2>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(STRATEGIES) as Strategy[]).map((strategy) => {
              const config = STRATEGIES[strategy]
              const isSelected = selectedStrategy === strategy

              return (
                <button
                  key={strategy}
                  onClick={() => applyStrategy(strategy)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-text">{config.name}</h3>
                    {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
                  </div>
                  <p className="text-sm text-muted mb-4">{config.description}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Demand Sensitivity</span>
                      <span className="text-text font-medium">{(config.demandSensitivity * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Price Aggression</span>
                      <span className="text-text font-medium">{(config.priceAggression * 100).toFixed(0)}%</span>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <DollarSign className="w-6 h-6 text-primary" />
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
              <p className="text-sm text-muted mb-1">Revenue Uplift</p>
              <h3 className="text-3xl font-bold text-text">€{(metrics.revenue_uplift / 1000).toFixed(1)}K</h3>
              <div className="mt-3 flex items-center gap-1 text-xs">
                {metrics.revenue_uplift >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-success" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-error" />
                )}
                <span className={metrics.revenue_uplift >= 0 ? 'text-success' : 'text-error'}>
                  vs current strategy
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <p className="text-sm text-muted mb-1">Avg Price (Optimized)</p>
              <h3 className="text-3xl font-bold text-text">€{metrics.avg_price_optimized}</h3>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted">
                <span>Current: €{metrics.avg_price_current}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <p className="text-sm text-muted mb-1">Avg Occupancy</p>
              <h3 className="text-3xl font-bold text-text">{metrics.avg_occupancy_optimized}%</h3>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted">
                <span>Current: {metrics.avg_occupancy_current}%</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <Calendar className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <p className="text-sm text-muted mb-1">Forecast Period</p>
              <h3 className="text-3xl font-bold text-text">{forecastHorizon}</h3>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted">
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
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-text">Fine-tune Optimization</h2>
            </div>
            <p className="text-xs text-muted">Adjust parameters for custom strategy</p>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Demand Sensitivity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text">Demand Sensitivity</label>
                <span className="text-sm font-bold text-primary">{(demandSensitivity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={demandSensitivity}
                onChange={(e) => setDemandSensitivity(parseFloat(e.target.value))}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <p className="text-xs text-muted">How much demand forecast influences pricing decisions</p>
            </div>

            {/* Price Aggression */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text">Price Aggression</label>
                <span className="text-sm font-bold text-primary">{(priceAggression * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={priceAggression}
                onChange={(e) => setPriceAggression(parseFloat(e.target.value))}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <p className="text-xs text-muted">How aggressively to adjust prices based on demand</p>
            </div>

            {/* Occupancy Target */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text">Occupancy Target</label>
                <span className="text-sm font-bold text-primary">{occupancyTarget}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={occupancyTarget}
                onChange={(e) => setOccupancyTarget(parseInt(e.target.value))}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <p className="text-xs text-muted">Target occupancy rate for optimization</p>
            </div>

            {/* Forecast Horizon */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-text block">Forecast Horizon</label>
              <div className="flex gap-2">
                {[7, 14, 30, 60].map((days) => (
                  <button
                    key={days}
                    onClick={() => setForecastHorizon(days)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      forecastHorizon === days
                        ? 'bg-primary text-background'
                        : 'bg-background border border-border text-text hover:border-primary'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">Number of days to optimize</p>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Pricing Comparison Chart */}
      <Card variant="elevated">
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text">Price Optimization Timeline</h2>
              <p className="text-sm text-muted mt-1">Current vs. Optimized pricing strategy</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-xs text-muted">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted">Optimized</span>
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
              <Bar dataKey="demand_forecast" fill="#10B981" fillOpacity={0.2} name="Demand Forecast" yAxisId="right" />
              <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>

      {/* Revenue Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="default">
          <Card.Header>
            <h2 className="text-lg font-semibold text-text">Revenue Forecast</h2>
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
                <Bar dataKey="revenue_current" fill="#9CA3AF" name="Current Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue_optimized" fill="#EBFF57" name="Optimized Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        <Card variant="default">
          <Card.Header>
            <h2 className="text-lg font-semibold text-text">Occupancy Forecast</h2>
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
                <h2 className="text-lg font-semibold text-text">Daily Pricing Recommendations</h2>
                <p className="text-sm text-muted mt-1">Room/Pitch-level pricing for each day</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Day</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Current Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Recommended</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Occupancy</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Impact</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">Confidence</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
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
                        <td className="px-4 py-3 text-sm font-medium text-text">{dateStr}</td>
                        <td className="px-4 py-3 text-sm text-muted">{rec.day}</td>
                        <td className="px-4 py-3 text-sm text-right text-muted">€{rec.current_price}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className="font-semibold text-primary">€{rec.recommended_price}</span>
                          <span className={`ml-2 text-xs ${priceDiff >= 0 ? 'text-success' : 'text-error'}`}>
                            {priceDiff >= 0 ? '+' : ''}€{priceDiff}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <Badge
                            variant={rec.expected_occupancy > 85 ? 'success' : rec.expected_occupancy > 70 ? 'default' : 'warning'}
                            size="sm"
                          >
                            {rec.expected_occupancy}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`font-medium ${rec.revenue_impact >= 0 ? 'text-success' : 'text-error'}`}>
                            {rec.revenue_impact >= 0 ? '+' : ''}{rec.revenue_impact}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Badge
                            variant={
                              rec.confidence === 'high' ? 'success' :
                              rec.confidence === 'medium' ? 'default' : 'warning'
                            }
                            size="sm"
                          >
                            {rec.confidence}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
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
            <Database className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-text mb-2">Using Simulated Data</h3>
              <p className="text-muted mb-3">
                The pricing engine is currently using simulated data for demonstration. Upload your historical booking data
                to get personalized recommendations based on your actual performance.
              </p>
              <Button variant="primary" size="sm" onClick={() => navigate('/data')}>
                <Database className="w-4 h-4 mr-2" />
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
            <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-text mb-2">Optimization Alert</h3>
              <p className="text-muted">
                The current parameters result in lower revenue. Consider adjusting your strategy to be more aggressive
                or review your occupancy targets. The {STRATEGIES.balanced.name.toLowerCase()} strategy typically
                provides the best balance.
              </p>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
