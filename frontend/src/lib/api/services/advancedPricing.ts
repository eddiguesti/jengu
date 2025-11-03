import apiClient from '../client'

export interface PricingRecommendation {
  date: string
  currentPrice: number
  recommendedPrice: number
  priceChange: number
  priceChangePercent: number
  predictedOccupancy: number
  expectedRevenue: number
  revenueImpact: number
  confidence: 'very_high' | 'high' | 'medium' | 'low'
  explanation: string
  factors: {
    seasonality: number
    weatherImpact: number
    holidayImpact: number
    trendImpact: number
  }
  reasoning: {
    primary: string
    contributing: string[]
  }
}

export interface PricingAnalytics {
  priceElasticity: number
  seasonalPeaks: { month: string; avgOccupancy: number }[]
  peakDays: string[]
  lowDays: string[]
  holidayPremium: number
  weekendPremium: number
  temperatureCorrelation: number
  weatherSensitivity: number
  optimalTemperatureRange: [number, number]
  demandPatterns: {
    seasonal: Record<string, number>
    dayOfWeek: Record<string, number>
  }
}

export interface AdvancedPricingResponse {
  success: boolean
  property: {
    id: string
    name: string
  }
  summary: {
    forecastDays: number
    currentAveragePrice: number
    recommendedAveragePrice: number
    averagePriceChange: number
    averageRevenueImpact: number
    highConfidenceCount: number
    dataQuality: {
      historicalDays: number
      enrichmentComplete: number
      holidayDataAvailable: number
    }
  }
  analytics: PricingAnalytics
  recommendations: PricingRecommendation[]
  metadata: {
    generatedAt: string
    strategy: string
    model: string
    features: string[]
  }
}

export async function getAdvancedPricingRecommendations(params: {
  propertyId: string
  days?: number
  strategy?: 'conservative' | 'balanced' | 'aggressive'
  minPrice?: number
  maxPrice?: number
  targetOccupancy?: number
}): Promise<AdvancedPricingResponse> {
  const response = await apiClient.get<AdvancedPricingResponse>(
    '/pricing/advanced/recommendations',
    { params }
  )
  return response.data
}

export async function getAdvancedPricingAnalytics(propertyId: string) {
  const response = await apiClient.get<{
    success: boolean
    property: { id: string; name: string }
    analytics: PricingAnalytics
    dataQuality: {
      totalDays: number
      enrichedDays: number
      enrichmentRate: number
    }
  }>('/pricing/advanced/analytics', {
    params: { propertyId },
  })
  return response.data
}
