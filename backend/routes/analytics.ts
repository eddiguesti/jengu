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
  asyncHandler(async (_req, res) => {
    // Return mock data for now - implement real data later
    res.json({
      dates: [],
      actual: [],
      optimized: [],
    })
  })
)

/**
 * Occupancy pace by lead bucket
 * POST /api/analytics/occupancy-pace
 */
router.post(
  '/occupancy-pace',
  asyncHandler(async (_req, res) => {
    res.json({
      lead: [],
      actual: [],
      target: [],
      model: [],
    })
  })
)

/**
 * ADR index vs market
 * POST /api/analytics/adr-index
 */
router.post(
  '/adr-index',
  asyncHandler(async (_req, res) => {
    res.json({
      dates: [],
      propertyIndex: [],
      marketIndex: [],
    })
  })
)

/**
 * Revenue heatmap by lead × season
 * POST /api/analytics/rev-lead-heatmap
 */
router.post(
  '/rev-lead-heatmap',
  asyncHandler(async (_req, res) => {
    res.json({
      leadBuckets: [],
      seasons: [],
      matrix: [],
    })
  })
)

/**
 * Forecast vs actual bookings
 * POST /api/analytics/forecast-actual
 */
router.post(
  '/forecast-actual',
  asyncHandler(async (_req, res) => {
    res.json({
      dates: [],
      forecast: [],
      actual: [],
      mape: null,
      crps: null,
    })
  })
)

/**
 * Price elasticity curve
 * POST /api/analytics/elasticity
 */
router.post(
  '/elasticity',
  asyncHandler(async (_req, res) => {
    res.json({
      priceGrid: [],
      probMean: [],
      probLow: [],
      probHigh: [],
      compMedian: null,
      chosenPrice: null,
    })
  })
)

/**
 * Price explanation waterfall
 * POST /api/analytics/price-explain
 */
router.post(
  '/price-explain',
  asyncHandler(async (_req, res) => {
    res.json({
      steps: [],
      final: 0,
    })
  })
)

export default router
