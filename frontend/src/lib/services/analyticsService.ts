/**
 * Enhanced Analytics Service
 * Integrates with backend ML analytics and AI insights endpoints
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface WeatherImpactAnalysis {
  correlations: {
    temperaturePrice: number
    temperatureOccupancy: number
    priceOccupancy: number
  }
  weatherStats: Array<{
    weather: string
    avgPrice: number
    avgOccupancy: number
    avgTemperature: number | null
    sampleSize: number
  }>
  confidence: 'low' | 'medium' | 'high'
  sampleSize: number
}

export interface DemandForecast {
  forecast: Array<{
    date: string
    day: string
    predictedOccupancy: number
    confidence: 'low' | 'medium' | 'high'
  }>
  accuracy: {
    r2: number
    mape: number
  } | null
  method: string
  trainingSize?: number
}

export interface CompetitorAnalysis {
  yourAveragePrice: number
  competitorAveragePrice: number
  priceDifference: number
  pricePercentage: number
  yourOccupancy: number | null
  recommendation: {
    action: 'increase' | 'decrease' | 'maintain'
    amount: number
    reason: string
  } | null
  sampleSize: {
    yours: number
    competitors: number
  }
}

export interface FeatureImportance {
  feature: string
  priceCorrelation: number
  occupancyCorrelation: number
  importance: number
}

export interface MarketSentiment {
  overallScore: number
  category: string
  categoryLabel: string
  components: {
    weather: { score: number; weight: string }
    occupancy: { score: number; weight: string }
    competitor: { score: number; weight: string }
    demand: { score: number; weight: string }
    seasonal: { score: number; weight: string }
  }
}

export interface ClaudeInsights {
  summary: string
  insights: string[]
  generatedAt: string
  error?: string
}

export interface AnalyticsSummary {
  weatherImpact: WeatherImpactAnalysis
  demandForecast: DemandForecast
  featureImportance: FeatureImportance[]
  dataQuality: {
    totalRecords: number
    dateRange: {
      start: string | null
      end: string | null
    }
    completeness: {
      price: number
      occupancy: number
      weather: number
      temperature: number
    }
  }
}

/**
 * Get comprehensive analytics summary
 */
export async function getAnalyticsSummary(data: any[]): Promise<AnalyticsSummary> {
  try {
    const response = await axios.post(`${API_URL}/analytics/summary`, { data })
    return response.data.data
  } catch (error: any) {
    console.error('Analytics Summary Error:', error.response?.data?.message || error.message)
    throw new Error(error.response?.data?.message || 'Failed to generate analytics summary')
  }
}

/**
 * Analyze weather impact on pricing and occupancy
 */
export async function analyzeWeatherImpact(data: any[]): Promise<WeatherImpactAnalysis> {
  try {
    const response = await axios.post(`${API_URL}/analytics/weather-impact`, { data })
    return response.data.data
  } catch (error: any) {
    console.error('Weather Impact Analysis Error:', error)
    throw new Error(error.response?.data?.message || 'Failed to analyze weather impact')
  }
}

/**
 * Forecast demand for upcoming days
 */
export async function forecastDemand(data: any[], daysAhead: number = 14): Promise<DemandForecast> {
  try {
    const response = await axios.post(`${API_URL}/analytics/demand-forecast`, { data, daysAhead })
    return response.data.data
  } catch (error: any) {
    console.error('Demand Forecast Error:', error)
    throw new Error(error.response?.data?.message || 'Failed to generate demand forecast')
  }
}

/**
 * Analyze competitor pricing patterns
 */
export async function analyzeCompetitorPricing(
  yourData: any[],
  competitorData: any[]
): Promise<CompetitorAnalysis> {
  try {
    const response = await axios.post(`${API_URL}/analytics/competitor-analysis`, {
      yourData,
      competitorData,
    })
    return response.data.data
  } catch (error: any) {
    console.error('Competitor Analysis Error:', error)
    throw new Error(error.response?.data?.message || 'Failed to analyze competitor pricing')
  }
}

/**
 * Calculate feature importance for ML models
 */
export async function calculateFeatureImportance(data: any[]): Promise<FeatureImportance[]> {
  try {
    const response = await axios.post(`${API_URL}/analytics/feature-importance`, { data })
    return response.data.data
  } catch (error: any) {
    console.error('Feature Importance Error:', error)
    throw new Error(error.response?.data?.message || 'Failed to calculate feature importance')
  }
}

/**
 * Analyze market sentiment
 */
export async function analyzeMarketSentiment(params: {
  weatherData?: any
  occupancyData?: any
  competitorData?: any
  yourPricing?: any
  historicalTrends?: any
}): Promise<MarketSentiment> {
  try {
    const response = await axios.post(`${API_URL}/analytics/market-sentiment`, params)
    return response.data.data
  } catch (error: any) {
    console.error('Market Sentiment Error:', error.response?.data?.message || error.message)
    throw new Error(error.response?.data?.message || 'Failed to analyze market sentiment')
  }
}

/**
 * Generate Claude-powered AI insights
 */
export async function generateAIInsights(analyticsData: {
  marketSentiment?: MarketSentiment
  weatherAnalysis?: WeatherImpactAnalysis
  competitorAnalysis?: CompetitorAnalysis
  demandForecast?: DemandForecast
  featureImportance?: FeatureImportance[]
}): Promise<ClaudeInsights> {
  try {
    const response = await axios.post(`${API_URL}/analytics/ai-insights`, { analyticsData })
    return response.data.data
  } catch (error: any) {
    console.error('AI Insights Error:', error.response?.data?.message || error.message)
    throw new Error(error.response?.data?.message || 'Failed to generate AI insights')
  }
}

/**
 * Generate pricing recommendations based on market sentiment
 */
export async function getPricingRecommendations(
  sentimentAnalysis: MarketSentiment,
  currentPrice: number
): Promise<any[]> {
  try {
    const response = await axios.post(`${API_URL}/analytics/pricing-recommendations`, {
      sentimentAnalysis,
      currentPrice,
    })
    return response.data.data
  } catch (error: any) {
    console.error('Pricing Recommendations Error:', error)
    throw new Error(error.response?.data?.message || 'Failed to generate pricing recommendations')
  }
}

/**
 * Load sample booking data from CSV file for testing
 */
export function parseSampleCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1).map(line => {
    const values = line.split(',')
    const row: any = {}
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim()
    })
    return row
  })
}

/**
 * Enrich data with weather information from API
 */
export async function enrichWithWeather(
  data: any[],
  latitude: number,
  longitude: number
): Promise<any[]> {
  try {
    // Extract dates from data
    const dates = data
      .map(row => new Date(row.date || row.check_in).getTime() / 1000)
      .filter(timestamp => !isNaN(timestamp))

    if (dates.length === 0) {
      return data
    }

    // Fetch historical weather data
    const response = await axios.post(`${API_URL}/weather/historical`, {
      latitude,
      longitude,
      dates: dates.slice(0, 50), // Limit to 50 requests
    })

    const weatherData = response.data.data

    // Map weather data to original data
    return data.map(row => {
      const rowDate = new Date(row.date || row.check_in).toISOString().split('T')[0]
      const weather = weatherData.find((w: any) => w.date === rowDate)

      if (weather) {
        return {
          ...row,
          weather: weather.weather,
          temperature: weather.temperature.mean,
        }
      }

      return row
    })
  } catch (error) {
    console.error('Weather Enrichment Error:', error)
    return data // Return original data if enrichment fails
  }
}
