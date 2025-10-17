/**
 * Request body type definitions for API endpoints
 * These types provide type safety for Express request bodies
 */

// File upload types
export interface FileEnrichmentRequest {
  latitude: number | string
  longitude: number | string
  country?: string
}

// Business settings types
export interface BusinessSettingsRequest {
  business_name?: string
  property_type?: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  currency?: string
  timezone?: string
}

// Assistant types
export interface AssistantMessageRequest {
  message: string
  conversationHistory: Array<{ role: string; content: string }>
  context?: Record<string, unknown>
}

export interface QuickSuggestionRequest {
  context: {
    businessName?: string
    location?: string
    currency?: string
    currentData?: {
      avgPrice?: number
      occupancyRate?: number
      totalBookings?: number
      revenue?: number
    }
    weatherConditions?: {
      current?: string
      forecast?: string[]
    }
    competitorPrices?: Array<{
      competitor: string
      price: number
    }>
  }
}

export interface AnalyzePricingRequest {
  data: {
    dates: string[]
    prices: number[]
    occupancy: number[]
  }
}

export interface PricingRecommendationsRequest {
  dates: string[] | Date[]
  context?: Record<string, unknown>
}

// Weather types
export interface HistoricalWeatherRequest {
  latitude: number
  longitude: number
  dates: number[] // Unix timestamps
}

// Analytics types
export interface AnalyticsSummaryRequest {
  data: Array<Record<string, unknown>>
}

export interface WeatherImpactRequest {
  data: Array<Record<string, unknown>>
}

export interface DemandForecastRequest {
  data: Array<Record<string, unknown>>
  daysAhead?: number
}

export interface CompetitorAnalysisRequest {
  yourData: Array<Record<string, unknown>>
  competitorData: Array<Record<string, unknown>>
}

export interface FeatureImportanceRequest {
  data: Array<Record<string, unknown>>
}

export interface MarketSentimentRequest {
  weatherData?: Record<string, unknown>
  occupancyData?: Record<string, unknown>
  competitorData?: Record<string, unknown>
  yourPricing?: Record<string, unknown>
  historicalTrends?: Record<string, unknown>
}

export interface AIInsightsRequest {
  analyticsData: Record<string, unknown>
}

export interface PricingRecommendationsAnalyticsRequest {
  sentimentAnalysis: Record<string, unknown>
  currentPrice: number
}

// Competitor types
export interface CompetitorScrapeRequest {
  url: string
}

export interface HotelSearchRequest {
  cityId: string
  checkIn: string
  checkOut: string
  adults?: number
  rooms?: number
  currency?: string
}
