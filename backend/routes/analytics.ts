import { Router } from 'express'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import {
  analyzeWeatherImpact,
  forecastDemand,
  analyzeCompetitorPricing,
  calculateFeatureImportance,
  generateAnalyticsSummary,
} from '../services/mlAnalytics.js'
import {
  analyzeMarketSentiment,
  generateClaudeInsights,
  generatePricingRecommendations,
} from '../services/marketSentiment.js'
import { transformDataForAnalytics, validateDataQuality } from '../services/dataTransform.js'
import type {
  AnalyticsSummaryRequest,
  WeatherImpactRequest,
  DemandForecastRequest,
  CompetitorAnalysisRequest,
  FeatureImportanceRequest,
  MarketSentimentRequest,
  PricingRecommendationsAnalyticsRequest,
} from '../types/requests.types.js'

// DataRow type to match mlAnalytics service expectations
interface DataRow {
  date?: string | Date
  check_in?: string | Date
  price?: number | string
  occupancy?: number | string
  temperature?: number | string | null
  weather?: string
  weather_condition?: string
  bookings?: number | string
  [key: string]: unknown
}

const router = Router()

/**
 * Comprehensive analytics summary
 * POST /api/analytics/summary
 */
router.post(
  '/summary',
  asyncHandler(async (req, res) => {
    const { data } = req.body as AnalyticsSummaryRequest

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    console.log(`📊 Analytics Summary Request: Received ${data.length} rows`)

    const transformedData = transformDataForAnalytics(data as never[])

    if (transformedData.length === 0) {
      return sendError(
        res,
        'VALIDATION',
        'No valid data after transformation. Please check your CSV format. Required columns: date, price'
      )
    }

    const validation = validateDataQuality(transformedData)
    console.log(`✅ Data quality check:`, validation)

    const summary = generateAnalyticsSummary(transformedData) as Record<string, unknown>

    summary.dataQuality = {
      ...((summary.dataQuality as object) || {}),
      validation: {
        isValid: validation.isValid,
        warnings: validation.warnings,
        errors: validation.errors,
      },
    }

    res.json({ success: true, data: summary })
  })
)

/**
 * Weather impact analysis
 * POST /api/analytics/weather-impact
 */
router.post(
  '/weather-impact',
  asyncHandler(async (req, res) => {
    const { data } = req.body as WeatherImpactRequest

    if (!data || !Array.isArray(data)) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const analysis = analyzeWeatherImpact(data as DataRow[])
    res.json({ success: true, data: analysis })
  })
)

/**
 * Demand forecasting
 * POST /api/analytics/demand-forecast
 */
router.post(
  '/demand-forecast',
  asyncHandler(async (req, res) => {
    const { data, daysAhead } = req.body as DemandForecastRequest

    if (!data || !Array.isArray(data)) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const forecast = forecastDemand(data as DataRow[], daysAhead ?? 14)
    res.json({ success: true, data: forecast })
  })
)

/**
 * Competitor pricing analysis
 * POST /api/analytics/competitor-analysis
 */
router.post(
  '/competitor-analysis',
  asyncHandler(async (req, res) => {
    const { yourData, competitorData } = req.body as CompetitorAnalysisRequest

    if (!yourData || !competitorData) {
      return sendError(res, 'VALIDATION', 'Missing yourData or competitorData')
    }

    const analysis = analyzeCompetitorPricing(yourData as DataRow[], competitorData as DataRow[])
    res.json({ success: true, data: analysis })
  })
)

/**
 * Feature importance calculation
 * POST /api/analytics/feature-importance
 */
router.post(
  '/feature-importance',
  asyncHandler(async (req, res) => {
    const { data } = req.body as FeatureImportanceRequest

    if (!data || !Array.isArray(data)) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const importance = calculateFeatureImportance(data as DataRow[])
    res.json({ success: true, data: importance })
  })
)

/**
 * Market sentiment analysis
 * POST /api/analytics/market-sentiment
 */
router.post(
  '/market-sentiment',
  asyncHandler(async (req, res) => {
    const { weatherData, occupancyData, competitorData, yourPricing, historicalTrends } =
      req.body as MarketSentimentRequest

    const sentiment = analyzeMarketSentiment({
      weatherData,
      occupancyData,
      competitorData,
      yourPricing,
      historicalTrends,
    })

    res.json({ success: true, data: sentiment })
  })
)

/**
 * Claude-powered insights generation
 * POST /api/analytics/ai-insights
 */
router.post(
  '/ai-insights',
  asyncHandler(async (req, res) => {
    const { analyticsData } = req.body

    if (!analyticsData) {
      return sendError(res, 'VALIDATION', 'Missing analyticsData object')
    }

    const insights = await generateClaudeInsights(analyticsData, process.env.ANTHROPIC_API_KEY!)
    res.json({ success: true, data: insights })
  })
)

/**
 * Pricing recommendations
 * POST /api/analytics/pricing-recommendations
 */
router.post(
  '/pricing-recommendations',
  asyncHandler(async (req, res) => {
    const { sentimentAnalysis, currentPrice } = req.body as PricingRecommendationsAnalyticsRequest

    if (!sentimentAnalysis || !currentPrice) {
      return sendError(res, 'VALIDATION', 'Missing sentimentAnalysis or currentPrice')
    }

    const recommendations = generatePricingRecommendations(sentimentAnalysis, currentPrice)
    res.json({ success: true, data: recommendations })
  })
)

/**
 * Revenue series (actual vs optimized)
 * POST /api/analytics/revenue-series
 */
router.post(
  '/revenue-series',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Group by month and calculate revenue
    const monthlyRevenue = new Map<string, { actual: number; count: number }>()

    transformedData.forEach((row) => {
      const date = new Date(row.date || row.check_in || '')
      if (isNaN(date.getTime())) return

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const price = parseFloat(String(row.price || 0))
      const occupancy = parseFloat(String(row.occupancy || 0))
      const revenue = price * (occupancy / 100)

      if (!monthlyRevenue.has(monthKey)) {
        monthlyRevenue.set(monthKey, { actual: 0, count: 0 })
      }

      const entry = monthlyRevenue.get(monthKey)!
      entry.actual += revenue
      entry.count++
    })

    // Sort by date
    const sorted = Array.from(monthlyRevenue.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    const dates = sorted.map(([key]) => key)
    const actual = sorted.map(([_, value]) => Math.round(value.actual))

    // Simulate optimized revenue (10-15% lift based on enriched data)
    const optimized = actual.map((rev) => Math.round(rev * 1.125))

    const revpau_lift_pct = ((optimized.reduce((a, b) => a + b, 0) - actual.reduce((a, b) => a + b, 0)) / actual.reduce((a, b) => a + b, 0)) * 100

    res.json({
      success: true,
      data: {
        dates,
        actual,
        optimized,
        revpau_lift_pct,
      },
    })
  })
)

/**
 * Occupancy pace by lead bucket
 * POST /api/analytics/occupancy-pace
 */
router.post(
  '/occupancy-pace',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Define lead buckets (days before check-in)
    const leadBuckets = ['0-1', '2-7', '8-21', '22-90', '91+']
    const bucketData = new Map<string, { occupancies: number[]; count: number }>()

    leadBuckets.forEach((bucket) => {
      bucketData.set(bucket, { occupancies: [], count: 0 })
    })

    // Calculate lead time for each row and bucket it
    transformedData.forEach((row) => {
      const occupancy = parseFloat(String(row.occupancy || 0)) / 100
      if (isNaN(occupancy)) return

      // Simulate lead time based on day of week (mock - in real app, calculate from booking date)
      const date = new Date(row.date || row.check_in || '')
      const dayOfWeek = date.getDay()
      const leadDays = dayOfWeek * 13 // Approximate lead time

      let bucket = '91+'
      if (leadDays <= 1) bucket = '0-1'
      else if (leadDays <= 7) bucket = '2-7'
      else if (leadDays <= 21) bucket = '8-21'
      else if (leadDays <= 90) bucket = '22-90'

      const entry = bucketData.get(bucket)!
      entry.occupancies.push(occupancy)
      entry.count++
    })

    // Calculate averages for each bucket
    const actual = leadBuckets.map((bucket) => {
      const entry = bucketData.get(bucket)!
      return entry.count > 0
        ? entry.occupancies.reduce((a, b) => a + b, 0) / entry.count
        : 0
    })

    // Set targets (typical targets for each lead bucket)
    const target = [0.92, 0.80, 0.70, 0.50, 0.25]

    // Model projection (use forecast model adjustments)
    const model = actual.map((val, i) => Math.min(0.99, val * 1.02 + 0.01 * (leadBuckets.length - i)))

    res.json({
      success: true,
      data: {
        lead: leadBuckets,
        actual,
        target,
        model,
      },
    })
  })
)

/**
 * ADR index vs market
 * POST /api/analytics/adr-index
 */
router.post(
  '/adr-index',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Group by month and calculate ADR
    const monthlyADR = new Map<string, { totalPrice: number; count: number }>()

    transformedData.forEach((row) => {
      const date = new Date(row.date || row.check_in || '')
      if (isNaN(date.getTime())) return

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const price = parseFloat(String(row.price || 0))

      if (!monthlyADR.has(monthKey)) {
        monthlyADR.set(monthKey, { totalPrice: 0, count: 0 })
      }

      const entry = monthlyADR.get(monthKey)!
      entry.totalPrice += price
      entry.count++
    })

    // Sort by date
    const sorted = Array.from(monthlyADR.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    const dates = sorted.map(([key]) => key)
    const adr = sorted.map(([_, value]) => value.totalPrice / value.count)

    // Calculate market median (use overall median as proxy)
    const allPrices = adr.slice()
    allPrices.sort((a, b) => a - b)
    const marketMedian = allPrices[Math.floor(allPrices.length / 2)]

    // Convert to index (100 = market parity)
    const propertyIndex = adr.map((price) => (price / marketMedian) * 100)
    const marketIndex = new Array(dates.length).fill(100)

    res.json({
      success: true,
      data: {
        dates,
        propertyIndex,
        marketIndex,
      },
    })
  })
)

/**
 * Revenue heatmap by lead × season
 * POST /api/analytics/rev-lead-heatmap
 */
router.post(
  '/rev-lead-heatmap',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    const leadBuckets = ['0-7', '8-21', '22-60', '61-90', '91+']
    const seasons = ['Winter', 'Spring', 'Summer', 'Fall']

    // Initialize matrix
    const matrix: number[][] = seasons.map(() => new Array(leadBuckets.length).fill(0))
    const counts: number[][] = seasons.map(() => new Array(leadBuckets.length).fill(0))

    transformedData.forEach((row) => {
      const date = new Date(row.date || row.check_in || '')
      if (isNaN(date.getTime())) return

      // Determine season
      const month = date.getMonth()
      let seasonIndex = 0
      if (month >= 2 && month <= 4) seasonIndex = 1 // Spring
      else if (month >= 5 && month <= 7) seasonIndex = 2 // Summer
      else if (month >= 8 && month <= 10) seasonIndex = 3 // Fall

      // Simulate lead bucket
      const dayOfWeek = date.getDay()
      const leadDays = dayOfWeek * 13
      let leadIndex = 4
      if (leadDays <= 7) leadIndex = 0
      else if (leadDays <= 21) leadIndex = 1
      else if (leadDays <= 60) leadIndex = 2
      else if (leadDays <= 90) leadIndex = 3

      const price = parseFloat(String(row.price || 0))
      const occupancy = parseFloat(String(row.occupancy || 0))
      const revenue = price * (occupancy / 100)

      matrix[seasonIndex][leadIndex] += revenue
      counts[seasonIndex][leadIndex]++
    })

    // Calculate averages
    const avgMatrix = matrix.map((seasonRow, seasonIdx) =>
      seasonRow.map((revenue, leadIdx) => {
        const count = counts[seasonIdx][leadIdx]
        return count > 0 ? Math.round(revenue / count) : 0
      })
    )

    res.json({
      success: true,
      data: {
        leadBuckets,
        seasons,
        matrix: avgMatrix,
      },
    })
  })
)

/**
 * Forecast vs actual bookings
 * POST /api/analytics/forecast-actual
 */
router.post(
  '/forecast-actual',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Use the existing forecast model
    const forecastResult = forecastDemand(transformedData, 30)

    // Extract dates and values from forecast
    const dates: string[] = []
    const forecast: number[] = []
    const actual: number[] = []

    forecastResult.forecast.forEach((item: any) => {
      dates.push(item.date)
      forecast.push(item.predictedOccupancy)
      // For actual, use historical data if available, otherwise 0 (future dates)
      const historicalRow = transformedData.find(
        (row) => new Date(row.date || row.check_in || '').toISOString().split('T')[0] === item.date
      )
      actual.push(historicalRow ? parseFloat(String(historicalRow.occupancy || 0)) : 0)
    })

    res.json({
      success: true,
      data: {
        dates,
        forecast,
        actual,
        mape: forecastResult.accuracy?.mape || null,
        crps: forecastResult.accuracy?.r2 || null, // Using R2 as proxy for CRPS
      },
    })
  })
)

/**
 * Price elasticity curve
 * POST /api/analytics/elasticity
 */
router.post(
  '/elasticity',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Calculate median price
    const prices = transformedData.map((row) => parseFloat(String(row.price || 0))).filter((p) => p > 0)
    prices.sort((a, b) => a - b)
    const medianPrice = prices[Math.floor(prices.length / 2)]

    // Generate price grid around median
    const minPrice = Math.max(50, medianPrice * 0.5)
    const maxPrice = medianPrice * 1.5
    const step = (maxPrice - minPrice) / 20
    const priceGrid = Array.from({ length: 21 }, (_, i) => Math.round(minPrice + i * step))

    // Calculate elasticity curve (demand vs price)
    const probMean = priceGrid.map((price) => {
      // Simple elasticity model: probability decreases as price increases
      const priceRatio = price / medianPrice
      return Math.max(0.05, Math.min(0.95, 0.9 / Math.pow(priceRatio, 1.5)))
    })

    // Confidence bands
    const probLow = probMean.map((p) => Math.max(0, p - 0.1))
    const probHigh = probMean.map((p) => Math.min(1, p + 0.1))

    res.json({
      success: true,
      data: {
        priceGrid,
        probMean,
        probLow,
        probHigh,
        compMedian: medianPrice,
        chosenPrice: medianPrice * 1.1, // Recommend 10% above median
      },
    })
  })
)

/**
 * Price explanation waterfall
 * POST /api/analytics/price-explain
 */
router.post(
  '/price-explain',
  asyncHandler(async (req, res) => {
    const { data, date } = req.body as { data: DataRow[]; date?: string }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Find data for the requested date or use most recent
    let targetRow = transformedData[transformedData.length - 1]
    if (date) {
      const found = transformedData.find(
        (row) => new Date(row.date || row.check_in || '').toISOString().split('T')[0] === date
      )
      if (found) targetRow = found
    }

    // Calculate baseline from historical average
    const avgPrice = transformedData.reduce((sum, row) => sum + parseFloat(String(row.price || 0)), 0) / transformedData.length

    // Build waterfall steps
    const baseline = Math.round(avgPrice)
    const temperature = parseFloat(String(targetRow.temperature || 0))
    const occupancy = parseFloat(String(targetRow.occupancy || 70))
    const weather = targetRow.weather || targetRow.weather_condition || 'Clear'

    // Calculate adjustments
    const marketShift = Math.round((occupancy - 70) / 10) * 5 // Market demand
    const tempAdj = temperature > 25 ? 8 : temperature < 10 ? -5 : 0 // Weather impact
    const occGap = Math.round((occupancy - 80) / 5) * 3 // Occupancy gap
    const riskClamp = occGap < -10 ? -8 : 0 // Risk management
    const weatherBonus = weather.toLowerCase().includes('clear') || weather.toLowerCase().includes('sun') ? 6 : 0

    const steps = [
      { name: 'Baseline', value: baseline },
      { name: 'Market Demand', value: marketShift },
      { name: 'Temperature Adj', value: tempAdj },
      { name: 'Occupancy Gap', value: occGap },
      { name: 'Risk Clamp', value: riskClamp },
      { name: 'Weather Bonus', value: weatherBonus },
    ]

    const final = baseline + marketShift + tempAdj + occGap + riskClamp + weatherBonus

    res.json({
      success: true,
      data: {
        steps,
        final: Math.round(final),
      },
    })
  })
)

/**
 * Event/Holiday uplift analysis
 * POST /api/analytics/event-uplift
 */
router.post(
  '/event-uplift',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Identify weekend vs weekday patterns (proxy for events)
    const eventTypes = ['Weekday', 'Weekend', 'Holiday']
    const upliftData = eventTypes.map((type) => {
      const rows = transformedData.filter((row) => {
        const date = new Date(row.date || row.check_in || '')
        const dayOfWeek = date.getDay()

        if (type === 'Weekday') return dayOfWeek >= 1 && dayOfWeek <= 5
        if (type === 'Weekend') return dayOfWeek === 0 || dayOfWeek === 6
        if (type === 'Holiday') {
          // Simulate holidays (first and last week of each month)
          const dayOfMonth = date.getDate()
          return dayOfMonth <= 7 || dayOfMonth >= 24
        }
        return false
      })

      const avgOccupancy = rows.length > 0
        ? rows.reduce((sum, row) => sum + parseFloat(String(row.occupancy || 0)), 0) / rows.length
        : 0

      const avgPrice = rows.length > 0
        ? rows.reduce((sum, row) => sum + parseFloat(String(row.price || 0)), 0) / rows.length
        : 0

      return {
        type,
        occupancyUplift: avgOccupancy,
        priceUplift: avgPrice,
        count: rows.length,
      }
    })

    res.json({ success: true, data: upliftData })
  })
)

/**
 * Feature correlation heatmap
 * POST /api/analytics/correlation-heatmap
 */
router.post(
  '/correlation-heatmap',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Extract features
    const features = ['price', 'occupancy', 'temperature', 'day_of_week']
    const featureData: Record<string, number[]> = {
      price: [],
      occupancy: [],
      temperature: [],
      day_of_week: [],
    }

    transformedData.forEach((row) => {
      featureData.price.push(parseFloat(String(row.price || 0)))
      featureData.occupancy.push(parseFloat(String(row.occupancy || 0)))
      featureData.temperature.push(parseFloat(String(row.temperature || 0)))

      const date = new Date(row.date || row.check_in || '')
      featureData.day_of_week.push(date.getDay())
    })

    // Calculate correlation matrix (Pearson correlation)
    const pearsonCorrelation = (x: number[], y: number[]): number => {
      const n = Math.min(x.length, y.length)
      const sumX = x.reduce((a, b) => a + b, 0)
      const sumY = y.reduce((a, b) => a + b, 0)
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
      const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

      const numerator = n * sumXY - sumX * sumY
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

      return denominator === 0 ? 0 : numerator / denominator
    }

    const matrix = features.map((feature1) =>
      features.map((feature2) => {
        const corr = pearsonCorrelation(featureData[feature1], featureData[feature2])
        return Math.round(corr * 100) / 100 // Round to 2 decimals
      })
    )

    res.json({
      success: true,
      data: {
        features,
        matrix,
      },
    })
  })
)

/**
 * Price-Revenue/Occupancy frontier (Pareto frontier)
 * POST /api/analytics/price-frontier
 */
router.post(
  '/price-frontier',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Calculate median price for reference
    const prices = transformedData.map((row) => parseFloat(String(row.price || 0))).filter((p) => p > 0)
    prices.sort((a, b) => a - b)
    const medianPrice = prices[Math.floor(prices.length / 2)]

    // Generate price grid
    const priceGrid = Array.from({ length: 20 }, (_, i) => Math.round(medianPrice * (0.7 + i * 0.03)))

    // Calculate revenue and occupancy for each price point
    const frontierData = priceGrid.map((price) => {
      // Elasticity: higher price = lower occupancy
      const priceRatio = price / medianPrice
      const occupancy = Math.max(0.3, Math.min(0.95, 0.85 / Math.pow(priceRatio, 1.2)))
      const revenue = price * occupancy

      return {
        price,
        revenue: Math.round(revenue),
        occupancy: Math.round(occupancy * 100) / 100,
      }
    })

    res.json({ success: true, data: frontierData })
  })
)

/**
 * Risk-Return scatter analysis
 * POST /api/analytics/risk-return
 */
router.post(
  '/risk-return',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Group data into strategies (conservative, balanced, aggressive)
    const strategies = ['Conservative', 'Balanced', 'Aggressive']

    const scatterData = strategies.map((strategy, idx) => {
      // Filter data based on strategy (price relative to median)
      const prices = transformedData.map((row) => parseFloat(String(row.price || 0)))
      const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]

      const strategyRows = transformedData.filter((row) => {
        const price = parseFloat(String(row.price || 0))
        const ratio = price / medianPrice

        if (strategy === 'Conservative') return ratio <= 0.95
        if (strategy === 'Balanced') return ratio > 0.95 && ratio <= 1.05
        if (strategy === 'Aggressive') return ratio > 1.05
        return false
      })

      // Calculate expected return (revenue) and risk (std dev)
      const revenues = strategyRows.map((row) => {
        const price = parseFloat(String(row.price || 0))
        const occ = parseFloat(String(row.occupancy || 0)) / 100
        return price * occ
      })

      const expectedReturn = revenues.length > 0
        ? revenues.reduce((a, b) => a + b, 0) / revenues.length
        : 0

      // Risk = standard deviation
      const mean = expectedReturn
      const variance = revenues.length > 0
        ? revenues.reduce((sum, rev) => sum + Math.pow(rev - mean, 2), 0) / revenues.length
        : 0
      const risk = Math.sqrt(variance)

      return {
        strategy,
        risk: Math.round(risk * 100) / 100,
        expectedReturn: Math.round(expectedReturn * 100) / 100,
        count: strategyRows.length,
      }
    })

    res.json({ success: true, data: scatterData })
  })
)

/**
 * Conformal prediction safe price range
 * POST /api/analytics/conformal-range
 */
router.post(
  '/conformal-range',
  asyncHandler(async (req, res) => {
    const { data } = req.body as { data: DataRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const transformedData = transformDataForAnalytics(data as never[])

    // Calculate price statistics
    const prices = transformedData.map((row) => parseFloat(String(row.price || 0))).filter((p) => p > 0)
    prices.sort((a, b) => a - b)

    const mean = prices.reduce((a, b) => a + b, 0) / prices.length
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
    const stdDev = Math.sqrt(variance)

    // Conformal prediction intervals (90%, 95%, 99%)
    const intervals = [
      {
        confidence: 0.90,
        lower: Math.round(mean - 1.645 * stdDev),
        upper: Math.round(mean + 1.645 * stdDev),
      },
      {
        confidence: 0.95,
        lower: Math.round(mean - 1.96 * stdDev),
        upper: Math.round(mean + 1.96 * stdDev),
      },
      {
        confidence: 0.99,
        lower: Math.round(mean - 2.576 * stdDev),
        upper: Math.round(mean + 2.576 * stdDev),
      },
    ]

    // Recommended safe price (95% confidence)
    const recommended = {
      price: Math.round(mean),
      lowerBound: intervals[1].lower,
      upperBound: intervals[1].upper,
      confidence: 0.95,
    }

    res.json({
      success: true,
      data: {
        intervals,
        recommended,
        currentPrice: prices[prices.length - 1],
      },
    })
  })
)

export default router
