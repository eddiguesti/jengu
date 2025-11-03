import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  console.warn('⚠️  OPENAI_API_KEY not configured - chatbot will not work')
}

const openai = apiKey ? new OpenAI({ apiKey }) : null

/**
 * Jengu App Context - Comprehensive guide for the AI assistant
 */
const APP_CONTEXT = `# Jengu - Dynamic Pricing for Outdoor Hospitality

## What This App Does
Jengu helps campground owners optimize pricing using historical data + weather + ML forecasting.
Core value: **Maximize revenue while maintaining healthy occupancy**.

## Key Pages & Their Purpose

1. **Dashboard** - Quick overview, metrics at a glance
2. **Data** - Upload CSV files, run enrichment (adds weather/holidays)
3. **Analytics** - Price elasticity, demand patterns, weather impact
4. **Pricing Engine** - ML recommendations (next 30-90 days)
5. **Competitor Monitor** - Track market prices
6. **Assistant** - This AI chat

## User Journey

**First-time users:**
1. Upload CSV → Data page
2. Enrich data (adds weather/holidays) → Click "Enrich" button
3. View analytics → Analytics page
4. Get pricing recommendations → Pricing Engine page

**Returning users:**
- Check dashboard for quick insights
- Generate new recommendations as conditions change
- Monitor competitors
- Adjust strategy based on analytics

## Analytics Explained Simply

**Price Elasticity** = "How sensitive are customers to price changes?"
- High elasticity: Lower price → Much more demand
- Low elasticity: Price changes don't affect demand much
- Sweet spot: Find the max price before demand drops

**Demand Patterns** = "When do people book campsites?"
- Peak days: Weekends, holidays, summer
- Low days: Weekdays, off-season
- Use this to set surge pricing

**Weather Impact** = "How does weather affect bookings?"
- Sunny + 20-25°C = Peak demand
- Rain/cold = Lower demand
- Use forecasts to adjust prices proactively

## Pricing Strategies

**Conservative** (High occupancy focus)
- Target: 90%+ occupancy
- Lower prices, more bookings
- Safe for new users

**Balanced** (Revenue optimization)
- Target: 80% occupancy
- Balance price vs bookings
- Recommended for most

**Aggressive** (Maximum revenue)
- Target: 70% occupancy
- Higher prices, fewer bookings
- Best for high-demand periods

## Industry Context

Camping/outdoor hospitality is **capacity-constrained**:
- Empty sites = $0 revenue (unlike hotels with other services)
- Weekend/holiday demand >> weekday demand
- Weather is a major booking driver
- Competitors are easy to check (RV parks often publish prices)
- Customer price sensitivity varies by season

## Common User Questions

"How do I start?" → Upload data, enrich it, view analytics
"What prices should I charge?" → Use Pricing Engine for ML recommendations
"Why is elasticity important?" → It tells you if you can raise prices without losing demand
"How does weather help?" → Predicts demand, allows proactive pricing
"What's the best strategy?" → Balanced for most, conservative if new, aggressive for peak season`

/**
 * Simplified function tools - using OpenAI's function calling
 * Fewer, more powerful functions
 */
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'navigate',
      description:
        'Navigate user to a page. Use when user wants to see/do something on a specific page.',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['dashboard', 'data', 'analytics', 'pricing', 'competitor-monitor'],
            description: 'Which page to navigate to',
          },
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'take_action',
      description:
        'Execute an action in the app. Use when user wants to DO something (upload, enrich, etc.)',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'upload_data',
              'enrich_data',
              'get_recommendations',
              'view_elasticity',
              'check_weather_impact',
            ],
            description: 'The action to perform',
          },
          context: {
            type: 'string',
            description: 'Brief context about why this action helps the user',
          },
        },
        required: ['action', 'context'],
      },
    },
  },
]

/**
 * Optimized system prompt - concise, action-oriented
 */
const SYSTEM_PROMPT = `You are Jengu, an expert pricing assistant for campgrounds and outdoor hospitality.

## Your Personality
- **Concise**: Short, actionable answers (2-3 sentences max unless explaining concepts)
- **Proactive**: Always suggest the next logical step
- **Smart**: Use context to infer what users need
- **Friendly**: Casual but professional tone

## Core Expertise
You understand:
- Revenue management for outdoor hospitality
- How weather, seasonality, and events drive camping demand
- Price elasticity and demand forecasting
- Competitive pricing strategies

## When to Use Tools

**navigate()**: User wants to see/access a page
Examples: "show me analytics", "I want to upload data", "take me to pricing"

**take_action()**: User wants to DO something
Examples: "enrich my data", "get recommendations", "upload pricing history"

## Response Strategy

1. **Understand intent** - What does the user really want?
2. **Be concise** - Answer in 1-3 sentences
3. **Take action** - Use tools proactively
4. **Guide next steps** - Always suggest what to do next

## Context Awareness

Use the user context provided to give smart responses:
- No data uploaded? → Suggest uploading data
- Data not enriched? → Suggest enrichment
- Has data? → Suggest viewing analytics or getting recommendations

## Example Responses

❌ Bad: "The Analytics page is a comprehensive dashboard that displays various metrics including price elasticity, demand patterns, and weather impact. You can access it by clicking on the Analytics tab in the sidebar..."

✅ Good: "I'll take you to Analytics where you can see your price elasticity and demand patterns. [Call navigate('analytics')]"

❌ Bad: "To upload data, you need to navigate to the Data page, then click the upload button, select your CSV file..."

✅ Good: "Let's upload your pricing data. [Call take_action('upload_data')]"

## Key Principles

1. **Assume intelligence**: Users don't need hand-holding
2. **Be direct**: Say what you'll do, then do it
3. **Add value**: Every response should teach something or move them forward
4. **Stay in character**: You're a pricing expert, not a generic assistant

${APP_CONTEXT}`

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function'
  content: string
  name?: string
  function_call?: {
    name: string
    arguments: string
  }
}

export interface ChatCompletionResponse {
  message: string
  function_call?: {
    name: string
    arguments: Record<string, any>
  }
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Generate chat completion with function calling support
 */
export async function generateChatCompletion(
  messages: ChatMessage[],
  userContext?: {
    userId: string
    currentPage?: string
    hasUploadedData?: boolean
    propertiesCount?: number
    dataStats?: {
      totalFiles: number
      enrichedFiles: number
      totalRecords: number
      avgPrice: number | null
      avgOccupancy: number | null
      latestDate: string | null
      hasEnrichedData: boolean
    }
    files?: Array<{ name: string; enriched: boolean; rows: number }>
  }
): Promise<ChatCompletionResponse> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  // Add system context about user's current state and actual data
  let contextualSystemMessage = SYSTEM_PROMPT
  if (userContext) {
    contextualSystemMessage += `\n\n## Current User Context\n`
    contextualSystemMessage += `**Page**: ${userContext.currentPage || 'unknown'}\n`

    if (userContext.dataStats) {
      const stats = userContext.dataStats
      contextualSystemMessage += `\n**User's Data:**\n`

      if (stats.totalFiles === 0) {
        contextualSystemMessage += `- No data uploaded yet (suggest uploading data)\n`
      } else {
        contextualSystemMessage += `- Files: ${stats.totalFiles} uploaded, ${stats.enrichedFiles} enriched\n`
        contextualSystemMessage += `- Records: ${stats.totalRecords} pricing records\n`

        if (stats.avgPrice) {
          contextualSystemMessage += `- Average price: €${stats.avgPrice}\n`
        }
        if (stats.avgOccupancy) {
          contextualSystemMessage += `- Average occupancy: ${stats.avgOccupancy}%\n`
        }
        if (stats.latestDate) {
          contextualSystemMessage += `- Latest data: ${stats.latestDate}\n`
        }

        if (!stats.hasEnrichedData) {
          contextualSystemMessage += `- ⚠️ Data not enriched yet (suggest enrichment to add weather/holidays)\n`
        }
      }

      if (userContext.files && userContext.files.length > 0) {
        contextualSystemMessage += `\n**Files:**\n`
        userContext.files.forEach(f => {
          contextualSystemMessage += `- "${f.name}": ${f.rows} rows, ${f.enriched ? '✅ enriched' : '❌ not enriched'}\n`
        })
      }
    }

    contextualSystemMessage += `\nUse this context to give smart, personalized responses. Mention specific data when relevant.`
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-5', // GPT-5 released August 2025 - smarter, faster, cheaper
    messages: [
      { role: 'system', content: contextualSystemMessage },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name,
        function_call: msg.function_call,
      })),
    ],
    tools,
    tool_choice: 'auto', // Let AI decide when to use tools
    temperature: 0.8, // Slightly higher for more natural responses
    max_tokens: 400, // Longer responses for GPT-5's better reasoning
  })

  const choice = completion.choices[0]
  if (!choice) {
    throw new Error('No completion generated')
  }

  const message = choice.message

  // Check if tool calls were requested (new format)
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0]
    return {
      message: message.content || '',
      function_call: {
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments || '{}'),
      },
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
      },
    }
  }

  return {
    message: message.content || "I'm here to help! What would you like to know?",
    usage: {
      prompt_tokens: completion.usage?.prompt_tokens || 0,
      completion_tokens: completion.usage?.completion_tokens || 0,
      total_tokens: completion.usage?.total_tokens || 0,
    },
  }
}

/**
 * Generate streaming chat completion
 */
export async function generateStreamingCompletion(
  messages: ChatMessage[],
  userContext?: {
    userId: string
    currentPage?: string
    hasUploadedData?: boolean
    propertiesCount?: number
    dataStats?: {
      totalFiles: number
      enrichedFiles: number
      totalRecords: number
      avgPrice: number | null
      avgOccupancy: number | null
      latestDate: string | null
      hasEnrichedData: boolean
    }
    files?: Array<{ name: string; enriched: boolean; rows: number }>
  }
): Promise<ReadableStream> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  // Add system context (same as generateChatCompletion)
  let contextualSystemMessage = SYSTEM_PROMPT
  if (userContext) {
    contextualSystemMessage += `\n\n## Current User Context\n`
    contextualSystemMessage += `**Page**: ${userContext.currentPage || 'unknown'}\n`

    if (userContext.dataStats) {
      const stats = userContext.dataStats
      contextualSystemMessage += `\n**User's Data:**\n`

      if (stats.totalFiles === 0) {
        contextualSystemMessage += `- No data uploaded yet (suggest uploading data)\n`
      } else {
        contextualSystemMessage += `- Files: ${stats.totalFiles} uploaded, ${stats.enrichedFiles} enriched\n`
        contextualSystemMessage += `- Records: ${stats.totalRecords} pricing records\n`

        if (stats.avgPrice) {
          contextualSystemMessage += `- Average price: €${stats.avgPrice}\n`
        }
        if (stats.avgOccupancy) {
          contextualSystemMessage += `- Average occupancy: ${stats.avgOccupancy}%\n`
        }
        if (stats.latestDate) {
          contextualSystemMessage += `- Latest data: ${stats.latestDate}\n`
        }

        if (!stats.hasEnrichedData) {
          contextualSystemMessage += `- ⚠️ Data not enriched yet (suggest enrichment to add weather/holidays)\n`
        }
      }

      if (userContext.files && userContext.files.length > 0) {
        contextualSystemMessage += `\n**Files:**\n`
        userContext.files.forEach(f => {
          contextualSystemMessage += `- "${f.name}": ${f.rows} rows, ${f.enriched ? '✅ enriched' : '❌ not enriched'}\n`
        })
      }
    }

    contextualSystemMessage += `\nUse this context to give smart, personalized responses. Mention specific data when relevant.`
  }

  const stream = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: contextualSystemMessage },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ],
    stream: true,
    temperature: 0.8,
    max_tokens: 400,
  })

  // Convert OpenAI stream to Web ReadableStream
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

/**
 * Quick responses for common questions (fallback if OpenAI fails)
 * Simplified and more conversational
 */
export const quickResponses: Record<string, string> = {
  hello: "Hey! I'm Jengu, your pricing assistant. What can I help you with today?",
  help: "I can help you:\n• Upload and enrich pricing data\n• Understand your analytics\n• Get ML pricing recommendations\n• Navigate the app\n\nWhat would you like to do?",
  'upload-data': "Let's get your data uploaded. Head to the Data page and I'll guide you through it.",
  analytics:
    'Your analytics show price elasticity, demand patterns, and weather impact. Want me to explain any of these?',
  pricing:
    'I can generate ML-powered price recommendations based on your data, weather, and seasonality. Ready to see them?',
}
