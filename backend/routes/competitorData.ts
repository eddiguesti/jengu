/**
 * Competitor Data API Routes
 * Endpoints for managing competitor pricing data and scraping targets
 */

import { Router } from 'express'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { CompetitorDataService } from '../services/competitorDataService.js'
import { enqueueCompetitor, JobPriority } from '../lib/queue/queues.js'
import { registry } from '../lib/openapi/index.js'
import { z } from 'zod'

const router = Router()
const competitorDataService = new CompetitorDataService(supabaseAdmin)

// OpenAPI: Get competitor data for a date
registry.registerPath({
  method: 'get',
  path: '/api/competitor-data/{propertyId}/{date}',
  tags: ['Competitor Data'],
  summary: 'Get competitor pricing for a specific date',
  description: 'Returns P10, P50, P90 competitor prices for a property on a given date',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      propertyId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: '2024-06-15' }),
    }),
  },
  responses: {
    200: {
      description: 'Competitor data retrieved',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              propertyId: z.string().uuid(),
              date: z.string(),
              priceP10: z.number(),
              priceP50: z.number(),
              priceP90: z.number(),
              competitorCount: z.number(),
              source: z.string(),
            }).nullable(),
          }),
        },
      },
    },
  },
})

// OpenAPI: Get competitor data range
registry.registerPath({
  method: 'get',
  path: '/api/competitor-data/{propertyId}/range',
  tags: ['Competitor Data'],
  summary: 'Get competitor pricing for a date range',
  description: 'Returns P10, P50, P90 competitor prices for multiple dates',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      propertyId: z.string().uuid(),
    }),
    query: z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: '2024-06-01' }),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: '2024-06-30' }),
    }),
  },
  responses: {
    200: {
      description: 'Competitor data range retrieved',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(z.object({
              date: z.string(),
              priceP10: z.number(),
              priceP50: z.number(),
              priceP90: z.number(),
              competitorCount: z.number(),
            })),
          }),
        },
      },
    },
  },
})

/**
 * Get competitor data for a specific date
 * GET /api/competitor-data/:propertyId/:date
 */
router.get(
  '/:propertyId/:date',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId, date } = req.params
    const userId = req.userId!

    // Verify property ownership
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, userId')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found')
    }

    // Get competitor data
    const data = await competitorDataService.getCompetitorData(propertyId, date)

    res.json({
      success: true,
      data,
    })
  })
)

/**
 * Get competitor data for a date range
 * GET /api/competitor-data/:propertyId/range?startDate=...&endDate=...
 */
router.get(
  '/:propertyId/range',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const { startDate, endDate } = req.query
    const userId = req.userId!

    if (!startDate || !endDate) {
      return sendError(res, 'VALIDATION', 'startDate and endDate are required')
    }

    // Verify property ownership
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, userId')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found')
    }

    // Get competitor data range
    const data = await competitorDataService.getCompetitorDataRange(
      propertyId,
      startDate as string,
      endDate as string
    )

    res.json({
      success: true,
      data,
    })
  })
)

/**
 * Trigger competitor scraping
 * POST /api/competitor-data/:propertyId/scrape
 */
router.post(
  '/:propertyId/scrape',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!
    const { location, checkIn, checkOut, guests, priority } = req.body

    if (!location || !checkIn || !checkOut) {
      return sendError(res, 'VALIDATION', 'location, checkIn, and checkOut are required')
    }

    // Verify property ownership
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, userId')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found')
    }

    // Enqueue competitor scraping job
    const jobId = await enqueueCompetitor(
      {
        propertyId,
        userId,
        location,
        checkIn,
        checkOut,
        adults: guests || 2,
      },
      priority || JobPriority.NORMAL
    )

    res.json({
      success: true,
      message: 'Competitor scraping job enqueued',
      jobId,
      statusUrl: `/api/jobs/${jobId}`,
    })
  })
)

/**
 * Get scraping history
 * GET /api/competitor-data/:propertyId/history
 */
router.get(
  '/:propertyId/history',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!
    const limit = Math.min(parseInt(String(req.query.limit || '50')), 100)

    // Verify property ownership
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, userId')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found')
    }

    // Get scrape history
    const history = await competitorDataService.getScrapeHistory(propertyId, limit)

    res.json({
      success: true,
      history,
    })
  })
)

/**
 * Create/update competitor scraping target
 * POST /api/competitor-data/targets
 */
router.post(
  '/targets',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { propertyId, location, roomType, guests, searchRadiusKm, enabled, priority } = req.body

    if (!propertyId || !location) {
      return sendError(res, 'VALIDATION', 'propertyId and location are required')
    }

    // Verify property ownership
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, userId')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found')
    }

    // Create/update target
    const result = await competitorDataService.upsertCompetitorTarget({
      propertyId,
      userId,
      location,
      roomType: roomType || 'standard',
      guests: guests || 2,
      searchRadiusKm: searchRadiusKm || 5,
      enabled: enabled !== false,
      scrapeFrequency: 'daily',
      priority: priority || 5,
    })

    if (!result.success) {
      return sendError(res, 'INTERNAL', result.error || 'Failed to create target')
    }

    res.json({
      success: true,
      targetId: result.targetId,
      message: 'Competitor scraping target configured',
    })
  })
)

/**
 * Get competitor scraping targets for user
 * GET /api/competitor-data/targets
 */
router.get(
  '/targets',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!

    // Get all targets for user's properties
    const { data: targets, error } = await supabaseAdmin
      .from('competitor_targets')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true })

    if (error) {
      return sendError(res, 'INTERNAL', 'Failed to get targets')
    }

    res.json({
      success: true,
      targets,
    })
  })
)

export default router
