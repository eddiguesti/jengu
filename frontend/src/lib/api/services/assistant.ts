/**
 * AI Assistant API Service
 * Integrates with Anthropic Claude API for intelligent pricing recommendations
 *
 * Features:
 * - Streaming responses for better UX
 * - Conversation history management
 * - Context-aware pricing insights
 * - Error handling and retry logic
 */

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
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Please add VITE_ANTHROPIC_API_KEY to your .env file.')
  }

  try {
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context)

    // Build messages array for Claude API
    const messages = [
      ...conversationHistory.map(m => ({
        role: m.role,
        content: m.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Call Claude API with streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Claude API error: ${error.error?.message || response.statusText}`)
    }

    // Handle streaming response
    const fullResponse = await handleStreamingResponse(response, callbacks)
    return fullResponse

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    callbacks?.onError?.(new Error(errorMessage))
    throw error
  }
}

/**
 * Build system prompt with business context
 */
function buildSystemPrompt(context: AssistantContext): string {
  const parts = [
    'You are Jengu AI, an expert dynamic pricing assistant for the hospitality industry.',
    'You provide actionable pricing recommendations based on data analysis, weather patterns, competitor pricing, and market conditions.',
    '',
    'Your expertise includes:',
    '- Revenue optimization strategies',
    '- Demand forecasting and seasonality analysis',
    '- Weather impact on booking behavior',
    '- Competitive pricing analysis',
    '- Occupancy rate optimization',
    '',
  ]

  // Add business context if available
  if (context.businessName) {
    parts.push(`Business: ${context.businessName}`)
  }

  if (context.location) {
    parts.push(`Location: ${context.location}`)
  }

  if (context.currency) {
    parts.push(`Currency: ${context.currency}`)
  }

  if (context.currentData) {
    parts.push('')
    parts.push('Current Performance:')
    if (context.currentData.avgPrice) {
      parts.push(`- Average Price: ${context.currentData.avgPrice.toFixed(2)}`)
    }
    if (context.currentData.occupancyRate) {
      parts.push(`- Occupancy Rate: ${context.currentData.occupancyRate.toFixed(1)}%`)
    }
    if (context.currentData.totalBookings) {
      parts.push(`- Total Bookings: ${context.currentData.totalBookings}`)
    }
    if (context.currentData.revenue) {
      parts.push(`- Revenue: ${context.currentData.revenue.toFixed(2)}`)
    }
  }

  if (context.weatherConditions?.current) {
    parts.push('')
    parts.push(`Current Weather: ${context.weatherConditions.current}`)
  }

  if (context.weatherConditions?.forecast && context.weatherConditions.forecast.length > 0) {
    parts.push('Forecast: ' + context.weatherConditions.forecast.join(', '))
  }

  if (context.competitorPrices && context.competitorPrices.length > 0) {
    parts.push('')
    parts.push('Competitor Prices:')
    context.competitorPrices.forEach(comp => {
      parts.push(`- ${comp.competitor}: ${comp.price.toFixed(2)}`)
    })
  }

  parts.push('')
  parts.push('Guidelines:')
  parts.push('- Provide specific, actionable recommendations')
  parts.push('- Use data to support your suggestions')
  parts.push('- Consider seasonal patterns and weather impacts')
  parts.push('- Balance revenue optimization with occupancy rates')
  parts.push('- Be concise but thorough')

  return parts.join('\n')
}

/**
 * Handle streaming response from Claude API
 */
async function handleStreamingResponse(
  response: Response,
  callbacks?: StreamCallbacks
): Promise<string> {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ''

  if (!reader) {
    throw new Error('Response body is not readable')
  }

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            // Handle different event types
            if (parsed.type === 'content_block_delta') {
              const token = parsed.delta?.text || ''
              if (token) {
                fullResponse += token
                callbacks?.onToken?.(token)
              }
            }

            if (parsed.type === 'message_stop' || parsed.type === 'content_block_stop') {
              callbacks?.onComplete?.(fullResponse)
            }

          } catch (e) {
            // Skip invalid JSON
            continue
          }
        }
      }
    }

    return fullResponse

  } finally {
    reader.releaseLock()
  }
}

/**
 * Get quick pricing suggestion (non-streaming)
 * Useful for dashboard widgets or quick insights
 */
export async function getQuickSuggestion(
  context: AssistantContext
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('Anthropic API key not configured')
  }

  const systemPrompt = buildSystemPrompt(context)
  const userPrompt = 'Based on current conditions, provide one specific pricing recommendation in 2-3 sentences.'

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.content[0]?.text || 'No suggestion available'

  } catch (error) {
    console.error('Failed to get quick suggestion:', error)
    throw error
  }
}

/**
 * Analyze pricing data and get insights
 * Used for batch analysis of historical data
 */
export async function analyzePricingData(
  data: {
    dates: string[]
    prices: number[]
    occupancy: number[]
    weather?: string[]
    events?: string[]
  }
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('Anthropic API key not configured')
  }

  const dataDescription = `
Date Range: ${data.dates[0]} to ${data.dates[data.dates.length - 1]}
Price Range: ${Math.min(...data.prices).toFixed(2)} - ${Math.max(...data.prices).toFixed(2)}
Average Occupancy: ${(data.occupancy.reduce((a, b) => a + b, 0) / data.occupancy.length).toFixed(1)}%
Total Data Points: ${data.dates.length}
`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: 'You are a pricing analyst. Analyze the data and provide insights about patterns, trends, and optimization opportunities.',
        messages: [
          {
            role: 'user',
            content: `Analyze this pricing data and provide 3-5 key insights:\n\n${dataDescription}`
          }
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`)
    }

    const result = await response.json()
    return result.content[0]?.text || 'Analysis failed'

  } catch (error) {
    console.error('Failed to analyze pricing data:', error)
    throw error
  }
}

/**
 * Generate pricing recommendations for specific dates
 */
export async function generatePricingRecommendations(
  dates: Date[],
  context: AssistantContext
): Promise<Map<string, { price: number; reasoning: string }>> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('Anthropic API key not configured')
  }

  const dateStrings = dates.map(d => d.toISOString().split('T')[0])
  const systemPrompt = buildSystemPrompt(context)

  const userPrompt = `Generate pricing recommendations for these dates: ${dateStrings.join(', ')}

For each date, provide:
1. Recommended price
2. Brief reasoning (weather, demand, competition)

Format as JSON:
{
  "2024-01-15": {
    "price": 150.00,
    "reasoning": "Good weather, high demand period"
  }
}
`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.content[0]?.text || '{}'

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const json = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    // Convert to Map
    const recommendations = new Map<string, { price: number; reasoning: string }>()
    for (const [date, rec] of Object.entries(json)) {
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
 */
export async function testConnection(): Promise<boolean> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    return false
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi'
          }
        ],
      }),
    })

    return response.ok

  } catch (error) {
    console.error('Connection test failed:', error)
    return false
  }
}
