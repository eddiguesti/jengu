import apiClient from '../client'

/**
 * Get analytics summary
 */
export const getAnalyticsSummary = async (payload: { data: unknown[] }) => {
  const response = await apiClient.post('/analytics/summary', payload)
  return response.data
}

/**
 * Analyze market sentiment
 */
export const analyzeMarketSentiment = async (payload: { data: unknown[] }) => {
  const response = await apiClient.post('/analytics/market-sentiment', payload)
  return response.data
}

/**
 * Forecast demand
 */
export const forecastDemand = async (payload: { data: unknown[]; daysAhead?: number }) => {
  const response = await apiClient.post('/analytics/demand-forecast', payload)
  return response.data
}

/**
 * Analyze weather impact
 */
export const analyzeWeatherImpact = async (payload: { data: unknown[] }) => {
  const response = await apiClient.post('/analytics/weather-impact', payload)
  return response.data
}

/**
 * Generate AI insights
 */
export const generateAIInsights = async (payload: { analyticsData: unknown }) => {
  const response = await apiClient.post('/analytics/ai-insights', payload)
  return response.data
}

/**
 * Get feature importance
 */
export const getFeatureImportance = async (payload: { data: unknown[] }) => {
  const response = await apiClient.post('/analytics/feature-importance', payload)
  return response.data
}

/**
 * Generate pricing recommendations
 */
export const getPricingRecommendations = async (payload: {
  sentimentAnalysis: unknown
  currentPrice: number
}) => {
  const response = await apiClient.post('/analytics/pricing-recommendations', payload)
  return response.data
}
