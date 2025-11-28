/**
 * Competitor Cron Worker
 * Scheduled job to refresh competitor pricing data daily
 *
 * In BullMQ v4+, QueueScheduler is removed. Delayed and repeatable jobs
 * are handled automatically when a Worker is connected to the queue.
 *
 * Architecture:
 * - cronQueue: Holds the repeatable cron job (runs at 2 AM)
 * - competitorQueue: Holds actual scraping jobs (processed by competitorWorker)
 * - This worker listens on cronQueue and enqueues jobs to competitorQueue
 */

import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/queue/connection.js'
import { cronQueue, enqueueCompetitor, JobPriority } from '../lib/queue/queues.js'
import { CompetitorDataService } from '../services/competitorDataService.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { logger } from '../middleware/logger.js'

// Initialize services
const competitorDataService = new CompetitorDataService(supabaseAdmin)

/**
 * Schedule daily competitor scraping for all enabled targets
 */
async function scheduleDailyScrapingJobs(): Promise<{ scheduled: number; errors: number }> {
  logger.info('🕐 Starting daily competitor scraping schedule...')

  let scheduled = 0
  let errors = 0

  try {
    // Get all targets that need scraping
    const targets = await competitorDataService.getNextScrapingTargets(50)

    if (targets.length === 0) {
      logger.info('ℹ️  No competitor targets to scrape')
      return { scheduled: 0, errors: 0 }
    }

    logger.info(`📋 Found ${targets.length} targets to scrape`)

    // Enqueue scraping jobs for each target
    for (const target of targets) {
      try {
        // Calculate date range (next 14-30 days)
        const today = new Date()
        const checkIn = new Date(today)
        checkIn.setDate(today.getDate() + 7) // Start from 1 week ahead

        const checkOut = new Date(checkIn)
        checkOut.setDate(checkIn.getDate() + 1) // 1-night stay

        // Enqueue job to competitor queue (processed by competitorWorker)
        // Convert location object to string (city name) if it's an object
        const locationString =
          typeof target.location === 'string'
            ? target.location
            : (target.location as { city?: string })?.city || 'Unknown'

        const jobId = await enqueueCompetitor(
          {
            propertyId: target.propertyId,
            userId: target.userId,
            location: locationString,
            checkIn: checkIn.toISOString().split('T')[0],
            checkOut: checkOut.toISOString().split('T')[0],
            adults: target.guests,
          },
          target.priority as JobPriority
        )

        logger.info(`✅ Enqueued competitor job ${jobId} for property ${target.propertyId}`)
        scheduled++

        // Update next scrape time (tomorrow at same time)
        const nextScrape = new Date()
        nextScrape.setDate(nextScrape.getDate() + 1)
        await competitorDataService.updateNextScrapeTime(target.id!, nextScrape)
      } catch (error) {
        errors++
        logger.error({ err: error }, `❌ Failed to enqueue job for target ${target.id}`)
      }
    }

    logger.info(`✅ Scheduled ${scheduled} competitor scraping jobs (${errors} errors)`)
  } catch (error) {
    logger.error({ err: error }, '❌ Daily scraping schedule failed')
    throw error
  }

  return { scheduled, errors }
}

/**
 * Set up cron scheduler
 * Creates a repeatable job on cronQueue and a worker to process it
 */
export async function startCompetitorCronScheduler(): Promise<Worker> {
  logger.info('🔧 Starting competitor cron scheduler...')

  // Add repeatable job to cron queue (runs daily at 2 AM)
  // This only needs to be done once - BullMQ will persist the schedule in Redis
  await cronQueue.add(
    'daily-competitor-scraping',
    { type: 'competitor-scraping' },
    {
      repeat: {
        pattern: '0 2 * * *', // Cron: 2 AM daily
      },
      jobId: 'daily-competitor-scraping',
    }
  )

  logger.info('✅ Daily scraping job scheduled (2 AM on cron queue)')

  // Create worker to process the cron jobs
  const cronWorker = new Worker(
    'cron',
    async job => {
      logger.info({ jobId: job.id }, `🕐 Processing cron job: ${job.name}`)

      if (job.name === 'daily-competitor-scraping') {
        const result = await scheduleDailyScrapingJobs()
        return result
      }

      // Unknown cron job type
      logger.warn(`Unknown cron job type: ${job.name}`)
      return { skipped: true }
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // Only one cron job at a time
    }
  )

  cronWorker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, result }, `✅ Cron job completed: ${job.name}`)
  })

  cronWorker.on('failed', (job, error) => {
    logger.error({ err: error, jobId: job?.id }, `❌ Cron job failed: ${job?.name}`)
  })

  cronWorker.on('error', error => {
    logger.error({ err: error }, '❌ Cron worker error')
  })

  logger.info('🚀 Competitor cron worker started (listening on cron queue)')

  return cronWorker
}

// Export for use in unified worker entry point
export { scheduleDailyScrapingJobs }

// Graceful shutdown helper
export async function stopCronWorker(worker: Worker): Promise<void> {
  logger.info('🛑 Competitor cron worker shutting down...')
  await worker.close()
  logger.info('✅ Competitor cron worker stopped')
}

// Start scheduler if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = await startCompetitorCronScheduler()

  // Graceful shutdown
  const shutdown = async () => {
    await stopCronWorker(worker)
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
