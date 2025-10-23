import { Router, Request, Response } from 'express'
import { registry } from '../lib/openapi/index.js'
import { z } from 'zod'

const router = Router()

// OpenAPI schema for health check response
const HealthResponseSchema = z
  .object({
    status: z.literal('healthy').openapi({ example: 'healthy' }),
    timestamp: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
    uptime: z.number().openapi({ example: 3600.5, description: 'Server uptime in seconds' }),
    environment: z
      .enum(['development', 'production', 'test'])
      .openapi({ example: 'development' }),
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

export default router
