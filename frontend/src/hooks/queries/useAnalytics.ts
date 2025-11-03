import { useQuery } from '@tanstack/react-query'
import * as analyticsService from '@/lib/api/services/analytics'
import * as advancedPricingService from '@/lib/api/services/advancedPricing'

// Query keys factory
export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (fileId: string) => [...analyticsKeys.all, 'summary', fileId] as const,
  sentiment: (fileId: string) => [...analyticsKeys.all, 'sentiment', fileId] as const,
  demand: (fileId: string) => [...analyticsKeys.all, 'demand', fileId] as const,
  weather: (fileId: string) => [...analyticsKeys.all, 'weather', fileId] as const,
  ai: (fileId: string) => [...analyticsKeys.all, 'ai', fileId] as const,
  advanced: (propertyId: string) => [...analyticsKeys.all, 'advanced', propertyId] as const,
}

/**
 * Fetch analytics summary
 */
export function useAnalyticsSummary(fileId: string, data: unknown[]) {
  return useQuery({
    queryKey: analyticsKeys.summary(fileId),
    queryFn: async () => {
      const response = await analyticsService.getAnalyticsSummary({ data })
      return response.data
    },
    enabled: !!fileId && data.length > 0,
    staleTime: 15 * 60 * 1000, // Analytics results stable, cache 15 min
  })
}

/**
 * Fetch market sentiment analysis
 */
export function useMarketSentiment(fileId: string, data: unknown[]) {
  return useQuery({
    queryKey: analyticsKeys.sentiment(fileId),
    queryFn: async () => {
      const response = await analyticsService.analyzeMarketSentiment({ data })
      return response.data
    },
    enabled: !!fileId && data.length > 0,
    staleTime: 15 * 60 * 1000,
  })
}

/**
 * Fetch demand forecast
 */
export function useDemandForecast(fileId: string, data: unknown[], daysAhead: number = 14) {
  return useQuery({
    queryKey: analyticsKeys.demand(fileId),
    queryFn: async () => {
      const response = await analyticsService.forecastDemand({ data, daysAhead })
      return response.data
    },
    enabled: !!fileId && data.length > 0,
    staleTime: 15 * 60 * 1000,
  })
}

/**
 * Fetch weather impact analysis
 */
export function useWeatherAnalysis(fileId: string, data: unknown[]) {
  return useQuery({
    queryKey: analyticsKeys.weather(fileId),
    queryFn: async () => {
      const response = await analyticsService.analyzeWeatherImpact({ data })
      return response.data
    },
    enabled: !!fileId && data.length > 0,
    staleTime: 15 * 60 * 1000,
  })
}

/**
 * Fetch AI-powered insights
 */
export function useAIInsights(fileId: string, analyticsData: unknown) {
  return useQuery({
    queryKey: analyticsKeys.ai(fileId),
    queryFn: async () => {
      const response = await analyticsService.generateAIInsights({ analyticsData })
      return response.data
    },
    enabled: !!fileId && !!analyticsData,
    staleTime: 30 * 60 * 1000, // AI insights expensive, cache 30 min
    retry: 1, // AI calls can fail, don't retry too much
  })
}

/**
 * Fetch advanced pricing analytics for a property
 */
export function useAdvancedAnalytics(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyId ? analyticsKeys.advanced(propertyId) : [],
    queryFn: () => {
      if (!propertyId) throw new Error('Property ID is required')
      return advancedPricingService.getAdvancedPricingAnalytics(propertyId)
    },
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
