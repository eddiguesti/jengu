/**
 * Neighborhood Competitive Index API Routes
 * Endpoints for competitor graph and neighborhood index
 * Task 15: Competitor Graph & Neighborhood Index
 */

import { Router } from 'express'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { CompetitorGraphService } from '../services/competitorGraphService.js'
import { NeighborhoodIndexService } from '../services/neighborhoodIndexService.js'
import { registry } from '../lib/openapi/index.js'
import { z } from 'zod'

const router = Router()
const competitorGraphService = new CompetitorGraphService(supabaseAdmin)
const neighborhoodIndexService = new NeighborhoodIndexService(supabaseAdmin)

// ====================================================
// OpenAPI Schemas
// ====================================================

registry.registerPath({
  method: 'get',
  path: '/api/neighborhood-index/{propertyId}/latest',
  tags: ['Neighborhood Index'],
  summary: 'Get latest neighborhood competitive index',
  description: 'Returns the most recent competitive positioning index for a property',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      propertyId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Latest neighborhood index',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            index: z
              .object({
                date: z.string(),
                overallIndex: z.number(),
                priceCompetitivenessScore: z.number(),
                valueScore: z.number(),
                positioningScore: z.number(),
                marketPosition: z.string(),
                competitorsAnalyzed: z.number(),
              })
              .nullable(),
          }),
        },
      },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/neighborhood-index/{propertyId}/trend',
  tags: ['Neighborhood Index'],
  summary: 'Get neighborhood index trend',
  description: 'Returns historical neighborhood index trend over specified number of days',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      propertyId: z.string().uuid(),
    }),
    query: z.object({
      days: z.coerce.number().min(1).max(90).default(30).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Index trend data',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            trend: z.array(
              z.object({
                date: z.string(),
                overallIndex: z.number(),
                priceCompetitivenessScore: z.number(),
              })
            ),
          }),
        },
      },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/neighborhood-index/{propertyId}/compute',
  tags: ['Neighborhood Index'],
  summary: 'Compute neighborhood index',
  description:
    'Triggers computation of neighborhood competitive index for a property on a specific date',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      propertyId: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            date: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .openapi({ example: '2024-06-15' }),
            propertyPrice: z.number().positive().optional(),
            propertyAttributes: z
              .object({
                reviewScore: z.number().min(0).max(10).optional(),
                starRating: z.number().min(0).max(5).optional(),
                amenities: z.array(z.string()).optional(),
              })
              .optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Index computed successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            index: z.object({
              overallIndex: z.number(),
              marketPosition: z.string(),
            }),
          }),
        },
      },
    },
  },
})

// ====================================================
// API Endpoints
// ====================================================

/**
 * Get latest neighborhood index for a property
 * GET /api/neighborhood-index/:propertyId/latest
 */
router.get(
  '/:propertyId/latest',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
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

    // Get latest index
    const index = await neighborhoodIndexService.getLatestIndex(propertyId)

    res.json({
      success: true,
      index,
    })
  })
)

/**
 * Get neighborhood index trend
 * GET /api/neighborhood-index/:propertyId/trend?days=30
 */
router.get(
  '/:propertyId/trend',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!
    const days = parseInt(String(req.query.days || '30'))

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

    // Get trend data
    const trend = await neighborhoodIndexService.getIndexTrend(propertyId, Math.min(days, 90))

    res.json({
      success: true,
      trend,
    })
  })
)

/**
 * Compute neighborhood index for a property on a specific date
 * POST /api/neighborhood-index/:propertyId/compute
 */
router.post(
  '/:propertyId/compute',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!
    const { date, propertyPrice, propertyAttributes } = req.body

    if (!date) {
      return sendError(res, 'VALIDATION', 'date is required')
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

    // Compute index
    const result = await neighborhoodIndexService.computeNeighborhoodIndex(
      propertyId,
      date,
      propertyPrice,
      propertyAttributes
    )

    if (!result.success) {
      return sendError(res, 'INTERNAL', result.error || 'Failed to compute neighborhood index')
    }

    res.json({
      success: true,
      index: result.index,
      message: 'Neighborhood index computed successfully',
    })
  })
)

/**
 * Build competitor graph for a property
 * POST /api/neighborhood-index/:propertyId/build-graph
 */
router.post(
  '/:propertyId/build-graph',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!
    const { location, attributes, options } = req.body

    if (!location || !location.latitude || !location.longitude) {
      return sendError(res, 'VALIDATION', 'location with latitude and longitude is required')
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

    // Build graph
    const result = await competitorGraphService.buildCompetitorGraph(
      propertyId,
      location,
      attributes || {},
      options || {}
    )

    if (!result.success) {
      return sendError(res, 'INTERNAL', result.error || 'Failed to build competitor graph')
    }

    res.json({
      success: true,
      relationshipsCreated: result.relationshipsCreated,
      message: `Created ${result.relationshipsCreated} competitor relationships`,
    })
  })
)

/**
 * Get top competitors for a property
 * GET /api/neighborhood-index/:propertyId/competitors?limit=10
 */
router.get(
  '/:propertyId/competitors',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!
    const limit = Math.min(parseInt(String(req.query.limit || '10')), 50)

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

    // Get top competitors
    const competitors = await competitorGraphService.getTopCompetitors(propertyId, limit)

    res.json({
      success: true,
      competitors,
    })
  })
)

/**
 * Get competitor relationships for a property
 * GET /api/neighborhood-index/:propertyId/relationships
 */
router.get(
  '/:propertyId/relationships',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!
    const limit = parseInt(String(req.query.limit || '20'))
    const minSimilarity = parseFloat(String(req.query.minSimilarity || '0'))

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

    // Get relationships
    const relationships = await competitorGraphService.getCompetitorRelationships(propertyId, {
      limit,
      minSimilarity,
    })

    res.json({
      success: true,
      relationships,
    })
  })
)

export default router
