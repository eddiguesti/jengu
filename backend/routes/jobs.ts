/**
 * Job Status API Routes
 * Monitor and inspect async job processing
 */

import { Router } from 'express'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import {
  enrichmentQueue,
  competitorQueue,
  analyticsQueue,
  getJobStatus,
} from '../lib/queue/queues.js'
import { registry } from '../lib/openapi/index.js'
import { z } from 'zod'

const router = Router()

// OpenAPI: Get job status endpoint
registry.registerPath({
  method: 'get',
  path: '/api/jobs/{jobId}',
  tags: ['Jobs'],
  summary: 'Get job status',
  description: 'Get the current status and progress of an async job',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      jobId: z.string().openapi({ description: 'Job ID', example: 'enrich-550e8400-1234567890' }),
    }),
  },
  responses: {
    200: {
      description: 'Job status retrieved',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            job: z.object({
              id: z.string(),
              status: z.enum([
                'waiting',
                'active',
                'completed',
                'failed',
                'delayed',
                'not_found',
              ]),
              progress: z.number().min(0).max(100),
              data: z.unknown().optional(),
              result: z.unknown().optional(),
              error: z.string().optional(),
              attemptsMade: z.number().optional(),
              processedOn: z.number().optional(),
              finishedOn: z.number().optional(),
            }),
          }),
        },
      },
    },
    404: {
      description: 'Job not found',
    },
  },
})

// OpenAPI: List jobs endpoint
registry.registerPath({
  method: 'get',
  path: '/api/jobs',
  tags: ['Jobs'],
  summary: 'List jobs',
  description: 'List all jobs for the authenticated user with optional filtering',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      queue: z
        .enum(['enrichment', 'competitor', 'analytics-heavy'])
        .optional()
        .openapi({ description: 'Filter by queue name' }),
      status: z
        .enum(['waiting', 'active', 'completed', 'failed', 'delayed'])
        .optional()
        .openapi({ description: 'Filter by job status' }),
      limit: z.coerce
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .openapi({ description: 'Number of jobs to return (max 100)', example: 20 }),
    }),
  },
  responses: {
    200: {
      description: 'Jobs list retrieved',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            jobs: z.array(
              z.object({
                id: z.string(),
                queue: z.string(),
                status: z.string(),
                progress: z.number(),
                timestamp: z.number(),
              })
            ),
          }),
        },
      },
    },
  },
})

/**
 * Get job status
 * GET /api/jobs/:jobId
 */
router.get(
  '/:jobId',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const jobId = req.params.jobId
    const userId = req.userId!

    console.log(`🔍 Fetching job status: ${jobId} for user: ${userId}`)

    // Determine queue from jobId prefix
    let queueName: 'enrichment' | 'competitor' | 'analytics-heavy'
    if (jobId.startsWith('enrich-')) {
      queueName = 'enrichment'
    } else if (jobId.startsWith('competitor-')) {
      queueName = 'competitor'
    } else if (jobId.startsWith('analytics-')) {
      queueName = 'analytics-heavy'
    } else {
      return sendError(res, 'VALIDATION', 'Invalid job ID format')
    }

    const jobStatus = await getJobStatus(queueName, jobId)

    if (jobStatus.status === 'not_found') {
      return sendError(res, 'NOT_FOUND', 'Job not found')
    }

    // Verify job ownership (check if propertyId belongs to user)
    if (jobStatus.data && typeof jobStatus.data === 'object' && 'propertyId' in jobStatus.data) {
      const propertyId = jobStatus.data.propertyId as string

      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .select('userId')
        .eq('id', propertyId)
        .single()

      if (propertyError || !property || property.userId !== userId) {
        return sendError(res, 'FORBIDDEN', 'You do not have access to this job')
      }
    }

    res.json({
      success: true,
      job: {
        id: jobId,
        status: jobStatus.status,
        progress: jobStatus.progress || 0,
        data: jobStatus.data,
        result: jobStatus.returnValue,
        error: jobStatus.failedReason,
        attemptsMade: jobStatus.attemptsMade,
        processedOn: jobStatus.processedOn,
        finishedOn: jobStatus.finishedOn,
      },
    })
  })
)

/**
 * List jobs with filtering
 * GET /api/jobs
 */
router.get(
  '/',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const queueFilter = req.query.queue as string | undefined
    const statusFilter = req.query.status as string | undefined
    const limit = Math.min(parseInt(String(req.query.limit || '20')), 100)

    console.log(`📋 Listing jobs for user: ${userId}`, { queueFilter, statusFilter, limit })

    // Determine which queues to query
    const queuesToQuery = queueFilter
      ? [{ name: queueFilter, queue: getQueueByName(queueFilter) }]
      : [
          { name: 'enrichment', queue: enrichmentQueue },
          { name: 'competitor', queue: competitorQueue },
          { name: 'analytics-heavy', queue: analyticsQueue },
        ]

    const allJobs: Array<{
      id: string
      queue: string
      status: string
      progress: number
      timestamp: number
    }> = []

    for (const { name, queue } of queuesToQuery) {
      // Get jobs by status
      const statusTypes = statusFilter
        ? [statusFilter]
        : ['waiting', 'active', 'completed', 'failed', 'delayed']

      for (const status of statusTypes) {
        try {
          const jobs = await (queue as typeof enrichmentQueue).getJobs(status, 0, limit)

          for (const job of jobs) {
            // Filter by userId (from job data)
            if (job.data && typeof job.data === 'object' && 'userId' in job.data) {
              if (job.data.userId === userId) {
                allJobs.push({
                  id: job.id!,
                  queue: name,
                  status: await job.getState(),
                  progress: job.progress || 0,
                  timestamp: job.timestamp,
                })
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching ${status} jobs from ${name}:`, error)
        }
      }
    }

    // Sort by timestamp (newest first)
    allJobs.sort((a, b) => b.timestamp - a.timestamp)

    // Apply limit
    const limitedJobs = allJobs.slice(0, limit)

    res.json({
      success: true,
      jobs: limitedJobs,
      total: allJobs.length,
    })
  })
)

/**
 * Get Dead Letter Queue (failed jobs)
 * GET /api/jobs/dlq
 */
router.get(
  '/dlq/list',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const limit = Math.min(parseInt(String(req.query.limit || '50')), 100)

    console.log(`💀 Fetching DLQ jobs for user: ${userId}`)

    const failedJobs: Array<{
      id: string
      queue: string
      error: string
      attemptsMade: number
      failedAt: number
      data: unknown
    }> = []

    // Fetch failed jobs from all queues
    const queues = [
      { name: 'enrichment', queue: enrichmentQueue },
      { name: 'competitor', queue: competitorQueue },
      { name: 'analytics-heavy', queue: analyticsQueue },
    ]

    for (const { name, queue } of queues) {
      const jobs = await queue.getFailed(0, limit)

      for (const job of jobs) {
        // Filter by userId
        if (job.data && typeof job.data === 'object' && 'userId' in job.data) {
          if (job.data.userId === userId) {
            failedJobs.push({
              id: job.id!,
              queue: name,
              error: job.failedReason || 'Unknown error',
              attemptsMade: job.attemptsMade || 0,
              failedAt: job.finishedOn || job.timestamp,
              data: job.data,
            })
          }
        }
      }
    }

    // Sort by failedAt (newest first)
    failedJobs.sort((a, b) => b.failedAt - a.failedAt)

    res.json({
      success: true,
      failedJobs: failedJobs.slice(0, limit),
      total: failedJobs.length,
    })
  })
)

/**
 * Retry a failed job
 * POST /api/jobs/:jobId/retry
 */
router.post(
  '/:jobId/retry',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const jobId = req.params.jobId
    const userId = req.userId!

    console.log(`🔄 Retrying job: ${jobId} for user: ${userId}`)

    // Determine queue from jobId prefix
    let queueName: 'enrichment' | 'competitor' | 'analytics-heavy'
    if (jobId.startsWith('enrich-')) {
      queueName = 'enrichment'
    } else if (jobId.startsWith('competitor-')) {
      queueName = 'competitor'
    } else if (jobId.startsWith('analytics-')) {
      queueName = 'analytics-heavy'
    } else {
      return sendError(res, 'VALIDATION', 'Invalid job ID format')
    }

    const queue = getQueueByName(queueName)
    const job = await queue.getJob(jobId)

    if (!job) {
      return sendError(res, 'NOT_FOUND', 'Job not found')
    }

    // Verify ownership
    if (job.data && typeof job.data === 'object' && 'userId' in job.data) {
      if (job.data.userId !== userId) {
        return sendError(res, 'FORBIDDEN', 'You do not have access to this job')
      }
    }

    // Retry the job
    await job.retry()

    res.json({
      success: true,
      message: 'Job retry initiated',
      jobId: job.id,
    })
  })
)

// Helper to get queue by name
function getQueueByName(name: string) {
  switch (name) {
    case 'enrichment':
      return enrichmentQueue
    case 'competitor':
      return competitorQueue
    case 'analytics-heavy':
      return analyticsQueue
    default:
      throw new Error(`Unknown queue: ${name}`)
  }
}

export default router
