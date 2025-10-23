/**
 * Analytics Heavy Worker
 * Processes computationally expensive analytics jobs in the background
 */

import { Worker, Job } from 'bullmq'
import { createRedisConnection } from '../lib/queue/connection.js'
import { AnalyticsJobData } from '../lib/queue/queues.js'
import {
  generateAnalyticsSummary,
  analyzeWeatherImpact,
  forecastDemand,
  calculateFeatureImportance,
} from '../services/mlAnalytics.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { logger } from '../middleware/logger.js'

// Worker concurrency from env (default: 2)
const CONCURRENCY = parseInt(process.env.ANALYTICS_WORKER_CONCURRENCY || '2', 10)

/**
 * Process analytics job
 */
async function processAnalyticsJob(job: Job<AnalyticsJobData>) {
  const { propertyId, userId, analysisType, data, params } = job.data

  logger.info(`🔄 Processing analytics job: ${job.id}`, {
    propertyId,
    userId,
    analysisType,
    dataRows: data.length,
  })

  try {
    await job.updateProgress(10)

    // Verify property ownership
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, userId')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      throw new Error(`Property ${propertyId} not found`)
    }

    if (property.userId !== userId) {
      throw new Error(`Property ${propertyId} does not belong to user ${userId}`)
    }

    await job.updateProgress(20)

    logger.info(`📊 Running ${analysisType} analysis...`)

    let result: unknown

    switch (analysisType) {
      case 'summary':
        await job.updateProgress(40)
        result = generateAnalyticsSummary(data as never[])
        await job.updateProgress(80)
        break

      case 'weather-impact':
        await job.updateProgress(40)
        result = analyzeWeatherImpact(data as never[])
        await job.updateProgress(80)
        break

      case 'demand-forecast':
        await job.updateProgress(40)
        const daysAhead = (params?.daysAhead as number) || 14
        result = forecastDemand(data as never[], daysAhead)
        await job.updateProgress(80)
        break

      case 'feature-importance':
        await job.updateProgress(40)
        result = calculateFeatureImportance(data as never[])
        await job.updateProgress(80)
        break

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`)
    }

    await job.updateProgress(100)

    logger.info(`✅ Analytics complete: ${analysisType}`)

    return {
      success: true,
      propertyId,
      analysisType,
      result,
      completedAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.error({ err: error }, `❌ Analytics job ${job.id} failed`)
    throw error
  }
}

// Create worker
export const analyticsWorker = new Worker<AnalyticsJobData>(
  'analytics-heavy',
  async job => {
    return await processAnalyticsJob(job)
  },
  {
    connection: createRedisConnection(),
    concurrency: CONCURRENCY,
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute
    },
  }
)

// Worker event handlers
analyticsWorker.on('completed', job => {
  logger.info(`✅ Analytics job completed: ${job.id}`, {
    propertyId: job.data.propertyId,
    analysisType: job.data.analysisType,
    duration: job.finishedOn ? job.finishedOn - (job.processedOn || 0) : 0,
  })
})

analyticsWorker.on('failed', (job, error) => {
  logger.error({ err: error }, `❌ Analytics job failed: ${job?.id}`, {
    propertyId: job?.data.propertyId,
    analysisType: job?.data.analysisType,
    attemptsMade: job?.attemptsMade,
  })
})

analyticsWorker.on('error', error => {
  logger.error({ err: error }, '❌ Analytics worker error')
})

analyticsWorker.on('active', job => {
  logger.info(`🔄 Analytics job started: ${job.id}`, {
    propertyId: job.data.propertyId,
    analysisType: job.data.analysisType,
  })
})

logger.info(`🚀 Analytics worker started with concurrency: ${CONCURRENCY}`)

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Analytics worker shutting down gracefully...')
  await analyticsWorker.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('🛑 Analytics worker shutting down gracefully...')
  await analyticsWorker.close()
  process.exit(0)
})
