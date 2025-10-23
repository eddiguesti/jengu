/**
 * Metrics API Routes
 * Expose queue metrics for monitoring (Prometheus-compatible)
 */

import { Router, Request, Response } from 'express'
import { enrichmentQueue, competitorQueue, analyticsQueue } from '../lib/queue/queues.js'
import { logger } from '../middleware/logger.js'

const router = Router()

/**
 * Get queue metrics in Prometheus format
 * GET /metrics
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const metrics: string[] = []

    // Helper to add metric
    const addMetric = (name: string, help: string, type: string, value: number, labels = '') => {
      metrics.push(`# HELP ${name} ${help}`)
      metrics.push(`# TYPE ${name} ${type}`)
      metrics.push(`${name}${labels} ${value}`)
    }

    // Enrichment queue metrics
    const enrichmentCounts = await enrichmentQueue.getJobCounts()
    addMetric(
      'bullmq_queue_waiting_jobs',
      'Number of jobs waiting in queue',
      'gauge',
      enrichmentCounts.waiting || 0,
      '{queue="enrichment"}'
    )
    addMetric(
      'bullmq_queue_active_jobs',
      'Number of jobs currently being processed',
      'gauge',
      enrichmentCounts.active || 0,
      '{queue="enrichment"}'
    )
    addMetric(
      'bullmq_queue_completed_jobs',
      'Number of completed jobs',
      'counter',
      enrichmentCounts.completed || 0,
      '{queue="enrichment"}'
    )
    addMetric(
      'bullmq_queue_failed_jobs',
      'Number of failed jobs',
      'counter',
      enrichmentCounts.failed || 0,
      '{queue="enrichment"}'
    )
    addMetric(
      'bullmq_queue_delayed_jobs',
      'Number of delayed jobs',
      'gauge',
      enrichmentCounts.delayed || 0,
      '{queue="enrichment"}'
    )

    // Competitor queue metrics
    const competitorCounts = await competitorQueue.getJobCounts()
    addMetric(
      'bullmq_queue_waiting_jobs',
      'Number of jobs waiting in queue',
      'gauge',
      competitorCounts.waiting || 0,
      '{queue="competitor"}'
    )
    addMetric(
      'bullmq_queue_active_jobs',
      'Number of jobs currently being processed',
      'gauge',
      competitorCounts.active || 0,
      '{queue="competitor"}'
    )
    addMetric(
      'bullmq_queue_completed_jobs',
      'Number of completed jobs',
      'counter',
      competitorCounts.completed || 0,
      '{queue="competitor"}'
    )
    addMetric(
      'bullmq_queue_failed_jobs',
      'Number of failed jobs',
      'counter',
      competitorCounts.failed || 0,
      '{queue="competitor"}'
    )

    // Analytics queue metrics
    const analyticsCounts = await analyticsQueue.getJobCounts()
    addMetric(
      'bullmq_queue_waiting_jobs',
      'Number of jobs waiting in queue',
      'gauge',
      analyticsCounts.waiting || 0,
      '{queue="analytics-heavy"}'
    )
    addMetric(
      'bullmq_queue_active_jobs',
      'Number of jobs currently being processed',
      'gauge',
      analyticsCounts.active || 0,
      '{queue="analytics-heavy"}'
    )
    addMetric(
      'bullmq_queue_completed_jobs',
      'Number of completed jobs',
      'counter',
      analyticsCounts.completed || 0,
      '{queue="analytics-heavy"}'
    )
    addMetric(
      'bullmq_queue_failed_jobs',
      'Number of failed jobs',
      'counter',
      analyticsCounts.failed || 0,
      '{queue="analytics-heavy"}'
    )

    // Return metrics in Prometheus format
    res.set('Content-Type', 'text/plain; version=0.0.4')
    res.send(metrics.join('\n') + '\n')
  } catch (error) {
    logger.error({ err: error }, 'Error generating metrics')
    res.status(500).send('Error generating metrics')
  }
})

/**
 * Get queue stats in JSON format (for dashboards)
 * GET /metrics/json
 */
router.get('/json', async (_req: Request, res: Response) => {
  try {
    const enrichmentCounts = await enrichmentQueue.getJobCounts()
    const competitorCounts = await competitorQueue.getJobCounts()
    const analyticsCounts = await analyticsQueue.getJobCounts()

    res.json({
      timestamp: new Date().toISOString(),
      queues: {
        enrichment: {
          waiting: enrichmentCounts.waiting || 0,
          active: enrichmentCounts.active || 0,
          completed: enrichmentCounts.completed || 0,
          failed: enrichmentCounts.failed || 0,
          delayed: enrichmentCounts.delayed || 0,
        },
        competitor: {
          waiting: competitorCounts.waiting || 0,
          active: competitorCounts.active || 0,
          completed: competitorCounts.completed || 0,
          failed: competitorCounts.failed || 0,
          delayed: competitorCounts.delayed || 0,
        },
        'analytics-heavy': {
          waiting: analyticsCounts.waiting || 0,
          active: analyticsCounts.active || 0,
          completed: analyticsCounts.completed || 0,
          failed: analyticsCounts.failed || 0,
          delayed: analyticsCounts.delayed || 0,
        },
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error generating metrics')
    res.status(500).json({ error: 'Error generating metrics' })
  }
})

export default router
