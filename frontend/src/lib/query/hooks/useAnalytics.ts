/**
 * React Query hooks for analytics API
 * Note: These are simplified hooks. Actual analytics endpoints may differ.
 */

import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '../../api/services/analytics'

// Query keys for analytics
export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (data: unknown[]) => [...analyticsKeys.all, 'summary', data] as const,
  demandForecast: (data: unknown[]) => [...analyticsKeys.all, 'demand-forecast', data] as const,
  featureImportance: (data: unknown[]) =>
    [...analyticsKeys.all, 'feature-importance', data] as const,
  marketSentiment: (data: unknown[]) => [...analyticsKeys.all, 'market-sentiment', data] as const,
  weatherImpact: (data: unknown[]) => [...analyticsKeys.all, 'weather-impact', data] as const,
  aiInsights: (analyticsData: unknown) =>
    [...analyticsKeys.all, 'ai-insights', analyticsData] as const,
}

/**
 * Get analytics summary
 * NOTE: Disabled by default - enable when data is ready
 */
export function useAnalyticsSummary(data: unknown[], enabled: boolean = false) {
  return useQuery({
    queryKey: analyticsKeys.summary(data),
    queryFn: async () => {
      return await analyticsApi.getAnalyticsSummary({ data })
    },
    enabled: enabled && data.length > 0,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Forecast demand
 */
export function useDemandForecast(data: unknown[], daysAhead?: number, enabled: boolean = false) {
  return useQuery({
    queryKey: analyticsKeys.demandForecast(data),
    queryFn: async () => {
      return await analyticsApi.forecastDemand({ data, daysAhead })
    },
    enabled: enabled && data.length > 0,
    staleTime: 15 * 60 * 1000,
  })
}

/**
 * Get feature importance
 */
export function useFeatureImportance(data: unknown[], enabled: boolean = false) {
  return useQuery({
    queryKey: analyticsKeys.featureImportance(data),
    queryFn: async () => {
      return await analyticsApi.getFeatureImportance({ data })
    },
    enabled: enabled && data.length > 0,
    staleTime: 20 * 60 * 1000, // 20 minutes
  })
}

/**
 * Analyze market sentiment
 */
export function useMarketSentiment(data: unknown[], enabled: boolean = false) {
  return useQuery({
    queryKey: analyticsKeys.marketSentiment(data),
    queryFn: async () => {
      return await analyticsApi.analyzeMarketSentiment({ data })
    },
    enabled: enabled && data.length > 0,
    staleTime: 15 * 60 * 1000,
  })
}

/**
 * Analyze weather impact
 */
export function useWeatherImpact(data: unknown[], enabled: boolean = false) {
  return useQuery({
    queryKey: analyticsKeys.weatherImpact(data),
    queryFn: async () => {
      return await analyticsApi.analyzeWeatherImpact({ data })
    },
    enabled: enabled && data.length > 0,
    staleTime: 20 * 60 * 1000,
  })
}

/**
 * Generate AI insights
 */
export function useAIInsights(analyticsData: unknown, enabled: boolean = false) {
  return useQuery({
    queryKey: analyticsKeys.aiInsights(analyticsData),
    queryFn: async () => {
      return await analyticsApi.generateAIInsights({ analyticsData })
    },
    enabled: enabled && !!analyticsData,
    staleTime: 15 * 60 * 1000,
  })
}
