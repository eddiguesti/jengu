import { Router, Request, Response } from 'express'
import { registry } from '../lib/openapi/index.js'
import { z } from 'zod'
import { enrichmentQueue, competitorQueue, analyticsQueue, cronQueue } from '../lib/queue/queues.js'
import { logger } from '../middleware/logger.js'

const router = Router()

// OpenAPI schema for health check response
const HealthResponseSchema = z
  .object({
    status: z.literal('healthy').openapi({ example: 'healthy' }),
    timestamp: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
    uptime: z.number().openapi({ example: 3600.5, description: 'Server uptime in seconds' }),
    environment: z.enum(['development', 'production', 'test']).openapi({ example: 'development' }),
  })
  .openapi('HealthResponse')

// Register health check endpoint
registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Health check',
  description: 'Returns server health status, uptime, and environment information',
  responses: {
    200: {
      description: 'Server is healthy',
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
    },
  },
})

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  })
})

// OpenAPI schema for workers health check response
const WorkersHealthResponseSchema = z
  .object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']).openapi({ example: 'healthy' }),
    timestamp: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
    redis: z.object({
      connected: z.boolean().openapi({ example: true }),
    }),
    queues: z.object({
      enrichment: z.object({
        waiting: z.number().openapi({ example: 5 }),
        active: z.number().openapi({ example: 2 }),
        completed: z.number().openapi({ example: 100 }),
        failed: z.number().openapi({ example: 1 }),
      }),
      competitor: z.object({
        waiting: z.number(),
        active: z.number(),
        completed: z.number(),
        failed: z.number(),
      }),
      analytics: z.object({
        waiting: z.number(),
        active: z.number(),
        completed: z.number(),
        failed: z.number(),
      }),
      cron: z.object({
        waiting: z.number(),
        active: z.number(),
        completed: z.number(),
        failed: z.number(),
      }),
    }),
  })
  .openapi('WorkersHealthResponse')

// Register workers health check endpoint
registry.registerPath({
  method: 'get',
  path: '/health/workers',
  tags: ['Health'],
  summary: 'Workers health check',
  description: 'Returns health status of background job workers and queue statistics',
  responses: {
    200: {
      description: 'Workers status retrieved',
      content: {
        'application/json': {
          schema: WorkersHealthResponseSchema,
        },
      },
    },
  },
})

/**
 * Workers health check endpoint
 * GET /health/workers
 *
 * Returns queue statistics and Redis connection status
 */
router.get('/workers', async (_req: Request, res: Response) => {
  try {
    // Get queue counts
    const [enrichmentCounts, competitorCounts, analyticsCounts, cronCounts] = await Promise.all([
      getQueueCounts(enrichmentQueue),
      getQueueCounts(competitorQueue),
      getQueueCounts(analyticsQueue),
      getQueueCounts(cronQueue),
    ])

    // Check if Redis is connected (if we got counts, it's connected)
    const redisConnected = true // Would have thrown if not connected

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    const totalFailed =
      enrichmentCounts.failed + competitorCounts.failed + analyticsCounts.failed + cronCounts.failed

    if (totalFailed > 10) {
      status = 'degraded'
    }

    res.json({
      status,
      timestamp: new Date().toISOString(),
      redis: {
        connected: redisConnected,
      },
      queues: {
        enrichment: enrichmentCounts,
        competitor: competitorCounts,
        analytics: analyticsCounts,
        cron: cronCounts,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to get workers health')

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      redis: {
        connected: false,
      },
      error: 'Failed to connect to Redis or retrieve queue statistics',
    })
  }
})

/**
 * Helper to get queue counts
 * Using any to support different queue types with same interface
 */
async function getQueueCounts(queue: {
  getWaitingCount: () => Promise<number>
  getActiveCount: () => Promise<number>
  getCompletedCount: () => Promise<number>
  getFailedCount: () => Promise<number>
}) {
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ])

  return { waiting, active, completed, failed }
}

export default router
