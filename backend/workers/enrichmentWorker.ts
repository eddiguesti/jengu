/**
 * Enrichment Worker
 * Processes enrichment jobs from the queue in the background
 */

import { Worker, Job } from 'bullmq'
import { createRedisConnection } from '../lib/queue/connection.js'
import { EnrichmentJobData, enqueueAnalytics, JobPriority } from '../lib/queue/queues.js'
import { enrichPropertyData } from '../services/enrichmentService.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { logger } from '../middleware/logger.js'

// Worker concurrency from env (default: 3)
const CONCURRENCY = parseInt(process.env.ENRICHMENT_WORKER_CONCURRENCY || '3', 10)

/**
 * Process enrichment job
 */
async function processEnrichmentJob(job: Job<EnrichmentJobData>) {
  const { propertyId, userId, location, countryCode, calendarificApiKey } = job.data

  logger.info(`🔄 Processing enrichment job: ${job.id}`, {
    propertyId,
    userId,
    location,
  })

  try {
    // Update job progress
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

    // Mark property as processing (actively being enriched)
    await supabaseAdmin
      .from('properties')
      .update({
        enrichmentstatus: 'processing',
      })
      .eq('id', propertyId)

    await job.updateProgress(30)

    // Run enrichment
    logger.info(`🌤️  Starting enrichment for property ${propertyId}...`)

    const enrichmentResult = await enrichPropertyData(
      propertyId,
      {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        countryCode: countryCode || 'FR',
        calendarificApiKey,
      },
      supabaseAdmin
    )

    await job.updateProgress(90)

    if (enrichmentResult.success) {
      logger.info(`✅ Enrichment complete for property ${propertyId}:`, enrichmentResult.results)

      // Mark property as enriched
      await supabaseAdmin
        .from('properties')
        .update({
          enrichmentstatus: 'completed',
          enrichedat: new Date().toISOString(),
        })
        .eq('id', propertyId)

      await job.updateProgress(100)

      // Job chaining: Auto-trigger analytics summary after successful enrichment
      if (process.env.ENABLE_AUTO_ANALYTICS !== 'false') {
        logger.info(`🔗 Chaining analytics job for property ${propertyId}...`)

        try {
          // Fetch enriched data
          const { data: pricingData, error: dataError } = await supabaseAdmin
            .from('pricing_data')
            .select('*')
            .eq('propertyId', propertyId)
            .limit(10000)

          if (!dataError && pricingData && pricingData.length > 0) {
            // Enqueue analytics summary with low priority (not urgent)
            await enqueueAnalytics(
              {
                propertyId,
                userId,
                analysisType: 'summary',
                data: pricingData,
              },
              JobPriority.LOW
            )

            logger.info(`✅ Chained analytics job enqueued for property ${propertyId}`)
          }
        } catch (chainError) {
          logger.warn(
            { err: chainError },
            `⚠️  Failed to chain analytics job (non-fatal): ${propertyId}`
          )
          // Don't fail the enrichment job if chaining fails
        }
      }

      return {
        success: true,
        propertyId,
        results: enrichmentResult.results,
      }
    } else {
      throw new Error(enrichmentResult.error || 'Enrichment failed')
    }
  } catch (error) {
    logger.error({ err: error }, `❌ Enrichment job ${job.id} failed`)

    // Mark property as failed
    await supabaseAdmin
      .from('properties')
      .update({
        enrichmentstatus: 'failed',
        enrichmenterror: error instanceof Error ? error.message : String(error),
      })
      .eq('id', propertyId)

    throw error
  }
}

// Create worker
export const enrichmentWorker = new Worker<EnrichmentJobData>(
  'enrichment',
  async job => {
    return await processEnrichmentJob(job)
  },
  {
    connection: createRedisConnection(),
    concurrency: CONCURRENCY,
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute (rate limiting)
    },
  }
)

// Worker event handlers
enrichmentWorker.on('completed', job => {
  logger.info(`✅ Enrichment job completed: ${job.id}`, {
    propertyId: job.data.propertyId,
    duration: job.finishedOn ? job.finishedOn - (job.processedOn || 0) : 0,
  })
})

enrichmentWorker.on('failed', (job, error) => {
  logger.error({ err: error }, `❌ Enrichment job failed: ${job?.id}`, {
    propertyId: job?.data.propertyId,
    attemptsMade: job?.attemptsMade,
    maxAttempts: job?.opts.attempts,
  })
})

enrichmentWorker.on('error', error => {
  logger.error({ err: error }, '❌ Enrichment worker error')
})

enrichmentWorker.on('active', job => {
  logger.info(`🔄 Enrichment job started: ${job.id}`, {
    propertyId: job.data.propertyId,
  })
})

logger.info(`🚀 Enrichment worker started with concurrency: ${CONCURRENCY}`)

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Enrichment worker shutting down gracefully...')
  await enrichmentWorker.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('🛑 Enrichment worker shutting down gracefully...')
  await enrichmentWorker.close()
  process.exit(0)
})
