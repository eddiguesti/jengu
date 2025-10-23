/**
 * Bandit API Routes
 * Endpoints for contextual bandit configuration and monitoring
 * Task 18: RL Contextual Bandit Pilot
 */

import { Router } from 'express'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { BanditService } from '../services/banditService.js'
import { registry } from '../lib/openapi/index.js'
import { z } from 'zod'

const router = Router()
const banditService = new BanditService(supabaseAdmin)

// OpenAPI: Get bandit configuration
registry.registerPath({
  method: 'get',
  path: '/api/bandit/{propertyId}/config',
  tags: ['Bandit'],
  summary: 'Get bandit configuration',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      propertyId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Bandit configuration',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            config: z.object({
              enabled: z.boolean(),
              trafficPercentage: z.number(),
              policyType: z.string(),
              epsilon: z.number(),
            }).nullable(),
          }),
        },
      },
    },
  },
})

/**
 * GET /api/bandit/:propertyId/config
 * Get bandit configuration
 */
router.get(
  '/:propertyId/config',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!

    // Verify property ownership
    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (error || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found')
    }

    const config = await banditService.getConfig(propertyId)

    res.json({
      success: true,
      config,
    })
  })
)

/**
 * POST /api/bandit/:propertyId/config
 * Update bandit configuration
 */
router.post(
  '/:propertyId/config',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!

    // Verify property ownership
    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (error || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found')
    }

    const config = {
      propertyId,
      userId,
      enabled: req.body.enabled ?? false,
      trafficPercentage: req.body.trafficPercentage ?? 5.0,
      policyType: req.body.policyType ?? 'epsilon-greedy',
      epsilon: req.body.epsilon ?? 0.1,
      learningRate: req.body.learningRate ?? 0.1,
      discountFactor: req.body.discountFactor ?? 0.99,
      minPrice: req.body.minPrice ?? 50.0,
      maxPrice: req.body.maxPrice ?? 500.0,
      conservativeMode: req.body.conservativeMode ?? true,
      resetQValuesFrequency: req.body.resetQValuesFrequency,
    }

    const result = await banditService.upsertConfig(config)

    if (!result.success) {
      return sendError(res, 'INTERNAL', result.error || 'Failed to update config')
    }

    res.json({
      success: true,
      message: 'Bandit configuration updated',
    })
  })
)

/**
 * GET /api/bandit/:propertyId/performance
 * Get bandit performance metrics
 */
router.get(
  '/:propertyId/performance',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!
    const days = parseInt(String(req.query.days || '7'))

    // Verify property ownership
    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (error || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found')
    }

    const performance = await banditService.getPerformance(propertyId, days)
    const armStats = await banditService.getArmStatistics(propertyId, days)

    res.json({
      success: true,
      performance,
      armStatistics: armStats,
    })
  })
)

/**
 * GET /api/bandit/:propertyId/actions
 * Get recent bandit actions
 */
router.get(
  '/:propertyId/actions',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params
    const userId = req.userId!
    const limit = Math.min(parseInt(String(req.query.limit || '50')), 100)

    // Verify property ownership
    const { data: property, error: propError } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (propError || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found')
    }

    const { data: actions, error } = await supabaseAdmin
      .from('bandit_actions')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return sendError(res, 'INTERNAL', 'Failed to get actions')
    }

    res.json({
      success: true,
      actions,
    })
  })
)

export default router
