import { Router } from 'express'
import axios from 'axios'
import { asyncHandler, sendError } from '../utils/errorHandler.js'

const router = Router()

/**
 * AI Assistant message endpoint
 * POST /api/assistant/message
 */
router.post(
  '/message',
  asyncHandler(async (req, res) => {
    const { message, conversationHistory, context } = req.body

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [...conversationHistory, { role: 'user', content: message }],
        system: `You are a helpful AI assistant for a dynamic pricing platform for hospitality businesses. ${context ? JSON.stringify(context) : ''}`,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      }
    )

    res.json(response.data)
  })
)

/**
 * Quick pricing suggestion
 * POST /api/assistant/quick-suggestion
 */
router.post(
  '/quick-suggestion',
  asyncHandler(async (req, res) => {
    const { context } = req.body

    if (!context) {
      return sendError(res, 'VALIDATION', 'Missing required field: context')
    }

    const systemPrompt = buildSystemPrompt(context)
    const userPrompt =
      'Based on current conditions, provide one specific pricing recommendation in 2-3 sentences.'

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      }
    )

    res.json({
      success: true,
      suggestion: response.data.content[0]?.text || 'No suggestion available',
    })
  })
)

/**
 * Analyze pricing data
 * POST /api/assistant/analyze-pricing
 */
router.post(
  '/analyze-pricing',
  asyncHandler(async (req, res) => {
    const { data } = req.body

    if (!data || !data.dates || !data.prices || !data.occupancy) {
      return sendError(
        res,
        'VALIDATION',
        'Missing required fields: data.dates, data.prices, data.occupancy'
      )
    }

    const dataDescription = `
Date Range: ${data.dates[0]} to ${data.dates[data.dates.length - 1]}
Price Range: ${Math.min(...data.prices).toFixed(2)} - ${Math.max(...data.prices).toFixed(2)}
Average Occupancy: ${(data.occupancy.reduce((a: number, b: number) => a + b, 0) / data.occupancy.length).toFixed(1)}%
Total Data Points: ${data.dates.length}
`

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system:
          'You are a pricing analyst. Analyze the data and provide insights about patterns, trends, and optimization opportunities.',
        messages: [
          {
            role: 'user',
            content: `Analyze this pricing data and provide 3-5 key insights:\n\n${dataDescription}`,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      }
    )

    res.json({
      success: true,
      analysis: response.data.content[0]?.text || 'Analysis failed',
    })
  })
)

/**
 * Generate pricing recommendations for specific dates
 * POST /api/assistant/pricing-recommendations
 */
router.post(
  '/pricing-recommendations',
  asyncHandler(async (req, res) => {
    const { dates, context } = req.body

    if (!dates || !Array.isArray(dates)) {
      return sendError(res, 'VALIDATION', 'Missing or invalid field: dates (array)')
    }

    const systemPrompt = buildSystemPrompt(context || {})
    const dateStrings = dates.map((d: string | Date) =>
      typeof d === 'string' ? d : new Date(d).toISOString().split('T')[0]
    )

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

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      }
    )

    const content = response.data.content[0]?.text || '{}'

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    res.json({
      success: true,
      recommendations,
    })
  })
)

// Helper function to build system prompt with context
function buildSystemPrompt(context: {
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
}): string {
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

export default router
