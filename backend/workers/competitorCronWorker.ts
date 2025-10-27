/**
 * Competitor Cron Worker
 * Scheduled job to refresh competitor pricing data daily
 */

import { Worker, QueueScheduler } from 'bullmq'
import { createRedisConnection } from '../lib/queue/connection.js'
import { competitorQueue, enqueueCompetitor, JobPriority } from '../lib/queue/queues.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { CompetitorDataService } from '../services/competitorDataService.js'
import { logger } from '../middleware/logger.js'

// Initialize services
const competitorDataService = new CompetitorDataService(supabaseAdmin)

/**
 * Schedule daily competitor scraping for all enabled targets
 */
async function scheduleDailyScrapingJobs(): Promise<void> {
  logger.info('🕐 Starting daily competitor scraping schedule...')

  try {
    // Get all targets that need scraping
    const targets = await competitorDataService.getNextScrapingTargets(50)

    if (targets.length === 0) {
      logger.info('ℹ️  No competitor targets to scrape')
      return
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

        // Enqueue job
        const jobId = await enqueueCompetitor(
          {
            propertyId: target.propertyId,
            userId: target.userId,
            location: target.location as any, // TODO: Fix type
            checkIn: checkIn.toISOString().split('T')[0],
            checkOut: checkOut.toISOString().split('T')[0],
            adults: target.guests,
          },
          target.priority as JobPriority
        )

        logger.info(`✅ Enqueued competitor job ${jobId} for property ${target.propertyId}`)

        // Update next scrape time (tomorrow at same time)
        const nextScrape = new Date()
        nextScrape.setDate(nextScrape.getDate() + 1)
        await competitorDataService.updateNextScrapeTime(target.id!, nextScrape)
      } catch (error) {
        logger.error({ err: error }, `❌ Failed to enqueue job for target ${target.id}: ${error}`)
      }
    }

    logger.info(`✅ Scheduled ${targets.length} competitor scraping jobs`)
  } catch (error) {
    logger.error({ err: error }, '❌ Daily scraping schedule failed')
  }
}

/**
 * Set up cron scheduler
 */
export async function startCompetitorCronScheduler(): Promise<void> {
  // Create queue scheduler (handles delayed/repeat jobs)
  const scheduler = new QueueScheduler('competitor', {
    connection: createRedisConnection(),
  })

  logger.info('🔧 Competitor cron scheduler initialized')

  // Add repeatable job (runs daily at 2 AM)
  await competitorQueue.add(
    'daily-scraping-schedule',
    {},
    {
      repeat: {
        pattern: '0 2 * * *', // Cron: 2 AM daily
      },
      jobId: 'daily-scraping-schedule',
    }
  )

  logger.info('✅ Daily scraping job scheduled (2 AM)')

  // Create worker to process the cron job
  const worker = new Worker(
    'competitor',
    async job => {
      if (job.name === 'daily-scraping-schedule') {
        await scheduleDailyScrapingJobs()
      }
    },
    {
      connection: createRedisConnection(),
    }
  )

  worker.on('completed', job => {
    if (job.name === 'daily-scraping-schedule') {
      logger.info('✅ Daily scraping schedule completed')
    }
  })

  worker.on('failed', (job, error) => {
    logger.error({ err: error }, `❌ Daily scraping schedule failed: ${job?.id}`)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('🛑 Competitor cron scheduler shutting down...')
    await worker.close()
    await scheduler.close()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    logger.info('🛑 Competitor cron scheduler shutting down...')
    await worker.close()
    await scheduler.close()
    process.exit(0)
  })
}

// Start scheduler if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startCompetitorCronScheduler().catch(error => {
    logger.error({ err: error }, '❌ Failed to start competitor cron scheduler')
    process.exit(1)
  })
}
