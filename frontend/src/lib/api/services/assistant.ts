/**
 * AI Assistant API Service
 * Integrates with Anthropic Claude API for intelligent pricing recommendations
 *
 * Features:
 * - Streaming responses for better UX
 * - Conversation history management
 * - Context-aware pricing insights
 * - Error handling and retry logic
 *
 * NOTE: All Claude API calls now go through backend proxy to secure API keys
 */

import apiClient from '../client'

export interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface AssistantContext {
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
  competitorPrices?: {
    competitor: string
    price: number
  }[]
}

export interface StreamCallbacks {
  onToken?: (token: string) => void
  onComplete?: (fullResponse: string) => void
  onError?: (error: Error) => void
}

/**
 * Send a message to Claude and get streaming response
 * Now uses backend proxy - no API key needed in frontend
 *
 * @param message - User's message
 * @param conversationHistory - Previous messages for context
 * @param context - Business and pricing context
 * @param callbacks - Streaming callbacks
 * @returns Full response text
 */
export async function sendMessage(
  message: string,
  conversationHistory: Message[] = [],
  context: AssistantContext = {},
  callbacks?: StreamCallbacks
): Promise<string> {
  try {
    const response = await apiClient.post('/assistant/message', {
      message,
      conversationHistory,
      context,
    })

    const fullResponse = response.data.content[0]?.text || ''

    // Call completion callback
    if (callbacks?.onComplete) {
      callbacks.onComplete(fullResponse)
    }

    return fullResponse
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    callbacks?.onError?.(new Error(errorMessage))
    throw error
  }
}

/**
 * Get quick pricing suggestion (non-streaming)
 * Useful for dashboard widgets or quick insights
 * Now uses backend proxy - no API key needed in frontend
 */
export async function getQuickSuggestion(context: AssistantContext): Promise<string> {
  try {
    const response = await apiClient.post('/assistant/quick-suggestion', { context })
    return response.data.suggestion || 'No suggestion available'
  } catch (error) {
    console.error('Failed to get quick suggestion:', error)
    throw error
  }
}

/**
 * Analyze pricing data and get insights
 * Used for batch analysis of historical data
 * Now uses backend proxy - no API key needed in frontend
 */
export async function analyzePricingData(data: {
  dates: string[]
  prices: number[]
  occupancy: number[]
  weather?: string[]
  events?: string[]
}): Promise<string> {
  try {
    const response = await apiClient.post('/assistant/analyze-pricing', { data })
    return response.data.analysis || 'Analysis failed'
  } catch (error) {
    console.error('Failed to analyze pricing data:', error)
    throw error
  }
}

/**
 * Generate pricing recommendations for specific dates
 * Now uses backend proxy - no API key needed in frontend
 */
export async function generatePricingRecommendations(
  dates: Date[],
  context: AssistantContext
): Promise<Map<string, { price: number; reasoning: string }>> {
  try {
    const response = await apiClient.post('/assistant/pricing-recommendations', {
      dates,
      context,
    })

    const recommendations = new Map<string, { price: number; reasoning: string }>()

    // Convert object to Map
    for (const [date, rec] of Object.entries(response.data.recommendations)) {
      recommendations.set(date, rec as { price: number; reasoning: string })
    }

    return recommendations
  } catch (error) {
    console.error('Failed to generate pricing recommendations:', error)
    throw error
  }
}

/**
 * Test API connection
 * Now tests backend connectivity instead of direct Anthropic connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Test with a simple quick suggestion request
    await apiClient.post('/assistant/quick-suggestion', {
      context: {
        businessName: 'Test',
      },
    })
    return true
  } catch (error) {
    console.error('Connection test failed:', error)
    return false
  }
}
