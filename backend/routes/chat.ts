import { Router } from 'express'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import {
  generateChatCompletion,
  generateStreamingCompletion,
  quickResponses,
} from '../services/openaiService.js'
import { chatLimiter } from '../middleware/rateLimiters.js'
import { getCachedUserContext, setCachedUserContext } from '../services/chatContextCache.js'

const router = Router()

/**
 * POST /api/chat
 * Generate chat completion with OpenAI
 *
 * Body:
 * - messages: Array of chat messages
 * - currentPage: Current page user is on (optional)
 * - stream: Boolean - whether to stream response (optional)
 */
router.post(
  '/',
  chatLimiter,
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { messages, currentPage, stream = false } = req.body

    // Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return sendError(res, 'INVALID_INPUT', 'Messages array is required')
    }

    // Validate message structure and content
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return sendError(res, 'INVALID_INPUT', 'Each message must have role and content')
      }
      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        return sendError(res, 'INVALID_INPUT', 'Invalid message role')
      }
      if (typeof msg.content !== 'string') {
        return sendError(res, 'INVALID_INPUT', 'Message content must be a string')
      }
      if (msg.content.length > 10000) {
        return sendError(res, 'INVALID_INPUT', 'Message content too long (max 10000 characters)')
      }
    }

    // Limit conversation history
    if (messages.length > 50) {
      return sendError(res, 'INVALID_INPUT', 'Too many messages (max 50)')
    }

    console.log(`💬 Chat request from user ${userId}`)
    console.log(`   Messages: ${messages.length}`)
    console.log(`   Current page: ${currentPage || 'unknown'}`)
    console.log(`   Last message: ${messages[messages.length - 1]?.content}`)

    // Try to get user context from cache first
    const cachedContext = await getCachedUserContext(userId)
    let dataStats, files

    if (cachedContext) {
      console.log(
        `   ⚡ Using cached context (age: ${Math.round((Date.now() - cachedContext.cachedAt) / 1000)}s)`
      )
      dataStats = cachedContext.dataStats
      files = cachedContext.files
    } else {
      console.log(`   🔍 Fetching fresh context from database`)

      // Get comprehensive user context from database
      const { data: filesData } = (await supabaseAdmin
        .from('properties')
        .select('id, name, enrichmentstatus, actualRows, uploadedAt')
        .eq('userId', userId)
        .order('uploadedAt', { ascending: false })) as { data: any[] | null }

      // Get recent pricing data summary
      const { data: recentPricing, count: totalRecords } = await supabaseAdmin
        .from('pricing_data')
        .select('price, occupancy, date', { count: 'exact' })
        .in('propertyId', filesData?.map(f => f.id) || [])
        .order('date', { ascending: false })
        .limit(100)

      // Calculate data insights
      const hasEnrichedData = filesData?.some((f: any) => f.enrichmentstatus === 'completed')
      const avgPrice = recentPricing?.length
        ? recentPricing.reduce((sum, r) => sum + (r.price || 0), 0) / recentPricing.length
        : 0
      const avgOccupancy = recentPricing?.length
        ? recentPricing.reduce((sum, r) => sum + (r.occupancy || 0), 0) / recentPricing.length
        : 0

      dataStats = {
        totalFiles: filesData?.length || 0,
        enrichedFiles:
          filesData?.filter((f: any) => f.enrichmentstatus === 'completed').length || 0,
        totalRecords: totalRecords || 0,
        avgPrice: avgPrice ? Math.round(avgPrice) : null,
        avgOccupancy: avgOccupancy ? Math.round(avgOccupancy * 100) : null,
        latestDate: recentPricing?.[0]?.date || null,
        hasEnrichedData: hasEnrichedData ?? false,
      }

      files =
        filesData?.map((f: any) => ({
          name: f.name,
          enriched: f.enrichmentstatus === 'completed',
          rows: f.actualRows,
        })) || []

      // Cache the context for next time
      await setCachedUserContext(userId, { dataStats, files })
    }

    const userContext = {
      userId,
      currentPage,
      hasUploadedData: (dataStats.totalFiles || 0) > 0,
      propertiesCount: dataStats.totalFiles || 0,
      dataStats,
      files,
    }

    // Check for quick response keywords (fallback)
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''
    const foundQuickResponseKey = Object.keys(quickResponses).find(key => lastMessage.includes(key))

    try {
      // Streaming response
      if (stream) {
        console.log('🌊 Starting streaming response...')

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const streamResponse = await generateStreamingCompletion(messages, userContext)
        const reader = streamResponse.getReader()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }

        res.end()
        console.log('✅ Streaming response completed')
        return
      }

      // Non-streaming response
      const response = await generateChatCompletion(messages, userContext)

      console.log(`✅ Generated chat completion`)
      console.log(`   Tokens used: ${response.usage?.total_tokens || 'unknown'}`)
      console.log(`   Function call: ${response.function_call?.name || 'none'}`)

      res.json({
        success: true,
        message: response.message,
        function_call: response.function_call,
        usage: response.usage,
      })
    } catch (error) {
      console.error('❌ Chat completion failed:', error)

      // Fallback to quick response if available
      if (foundQuickResponseKey) {
        return res.json({
          success: true,
          message: quickResponses[foundQuickResponseKey],
          fallback: true,
        })
      }

      return sendError(
        res,
        'AI_ERROR',
        error instanceof Error ? error.message : 'Failed to generate chat response'
      )
    }
  })
)

/**
 * GET /api/chat/suggestions
 * Get conversation starters and quick actions
 */
router.get(
  '/suggestions',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!

    // Get user context to provide relevant suggestions
    const { data: files } = (await supabaseAdmin
      .from('properties')
      .select('id, name, enrichmentstatus')
      .eq('userId', userId)) as { data: any[] | null }

    const hasFiles = (files?.length || 0) > 0
    const hasUnenrichedFiles = files?.some((f: any) => f.enrichmentstatus !== 'completed')

    const suggestions = []

    if (!hasFiles) {
      suggestions.push(
        {
          id: 'upload-data',
          title: 'Upload Your First Dataset',
          description: 'Get started by uploading historical pricing data',
          icon: 'upload',
          action: 'upload_data',
        },
        {
          id: 'learn-analytics',
          title: 'What is Price Elasticity?',
          description: 'Learn about key pricing analytics',
          icon: 'info',
          question: 'What is price elasticity and why does it matter?',
        }
      )
    } else {
      if (hasUnenrichedFiles) {
        suggestions.push({
          id: 'enrich-data',
          title: 'Enrich Your Data',
          description: 'Add weather and holiday data for better insights',
          icon: 'sparkles',
          action: 'run_enrichment',
        })
      }

      suggestions.push(
        {
          id: 'get-recommendations',
          title: 'Get Pricing Recommendations',
          description: 'ML-powered prices for the next 30 days',
          icon: 'trending-up',
          action: 'get_pricing_recommendations',
        },
        {
          id: 'view-analytics',
          title: 'View Analytics Dashboard',
          description: 'See demand patterns and weather impact',
          icon: 'bar-chart',
          action: 'navigate_to_page',
          actionParams: { page: 'analytics' },
        },
        {
          id: 'optimize-weekends',
          title: 'Optimize Weekend Pricing',
          description: 'Set up automatic weekend surge pricing',
          icon: 'calendar',
          question: 'How can I optimize pricing for weekends?',
        }
      )
    }

    // Always include help
    suggestions.push({
      id: 'help',
      title: 'How Can I Help?',
      description: 'Learn what the AI assistant can do',
      icon: 'help-circle',
      question: 'What can you help me with?',
    })

    res.json({
      success: true,
      suggestions,
      userContext: {
        hasFiles,
        fileCount: files?.length || 0,
        hasUnenrichedFiles,
      },
    })
  })
)

/**
 * POST /api/chat/execute-function
 * Execute a function call from the AI
 * (This endpoint would be called by the frontend after receiving a function_call)
 */
router.post(
  '/execute-function',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { functionName, arguments: functionArgs } = req.body

    console.log(`🔧 Executing function: ${functionName}`)
    console.log(`   Arguments:`, functionArgs)

    // This is a placeholder - frontend will handle most function execution
    // But we can log analytics here (if table exists)
    try {
      await (supabaseAdmin as any).from('user_actions').insert({
        user_id: userId,
        action_type: 'ai_function_call',
        action_data: {
          function: functionName,
          arguments: functionArgs,
        },
        created_at: new Date().toISOString(),
      })
    } catch {
      // Table may not exist, ignore
    }

    res.json({
      success: true,
      message: `Function ${functionName} acknowledged`,
    })
  })
)

export default router
