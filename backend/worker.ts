/**
 * Unified Worker Entry Point
 * Starts all BullMQ workers for background job processing
 *
 * Usage:
 *   pnpm run worker          # Start all workers
 *   pnpm run worker:competitor  # Start just competitor worker
 *   pnpm run worker:cron        # Start just cron worker
 *   pnpm run worker:enrichment  # Start just enrichment worker
 *
 * Environment variables:
 *   REDIS_URL                    - Redis connection URL (default: redis://localhost:6379)
 *   COMPETITOR_WORKER_CONCURRENCY - Concurrent competitor jobs (default: 2)
 *   ENRICHMENT_WORKER_CONCURRENCY - Concurrent enrichment jobs (default: 3)
 *   ENABLE_AUTO_ANALYTICS         - Auto-trigger analytics after enrichment (default: true)
 *
 * Prerequisites:
 *   - Redis server running (local or cloud)
 *   - Playwright browsers installed: npx playwright install chromium
 *   - Database tables created in Supabase
 */

import dotenv from 'dotenv'
dotenv.config()

import { Worker } from 'bullmq'
import { createRedisConnection } from './lib/queue/connection.js'
import { closeQueues } from './lib/queue/queues.js'
import { logger } from './middleware/logger.js'

// Track all workers for graceful shutdown
const workers: Worker[] = []
let isShuttingDown = false

/**
 * Start competitor scraping worker
 */
async function startCompetitorWorker(): Promise<Worker> {
  logger.info('🔧 Starting competitor worker...')

  // Dynamic import to avoid loading all workers at once
  const { competitorWorker } = await import('./workers/competitorWorker.js')
  workers.push(competitorWorker)

  logger.info('✅ Competitor worker started')
  return competitorWorker
}

/**
 * Start cron scheduler worker
 */
async function startCronWorker(): Promise<Worker> {
  logger.info('🔧 Starting cron worker...')

  const { startCompetitorCronScheduler } = await import('./workers/competitorCronWorker.js')
  const cronWorker = await startCompetitorCronScheduler()
  workers.push(cronWorker)

  logger.info('✅ Cron worker started')
  return cronWorker
}

/**
 * Start enrichment worker
 */
async function startEnrichmentWorker(): Promise<Worker> {
  logger.info('🔧 Starting enrichment worker...')

  const { enrichmentWorker } = await import('./workers/enrichmentWorker.js')
  workers.push(enrichmentWorker)

  logger.info('✅ Enrichment worker started')
  return enrichmentWorker
}

/**
 * Test Redis connection before starting workers
 */
async function testRedisConnection(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  logger.info(`🔌 Testing Redis connection to ${redisUrl.replace(/:([^:@]+)@/, ':****@')}...`)

  try {
    const testConnection = createRedisConnection()

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout (5s)'))
      }, 5000)

      testConnection.once('ready', () => {
        clearTimeout(timeout)
        resolve()
      })

      testConnection.once('error', (err: Error) => {
        clearTimeout(timeout)
        reject(err)
      })
    })

    await testConnection.quit()
    logger.info('✅ Redis connection successful')
    return true
  } catch (error) {
    logger.error({ err: error }, '❌ Redis connection failed')
    return false
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress...')
    return
  }

  isShuttingDown = true
  logger.info(`\n🛑 Received ${signal}, shutting down gracefully...`)

  // Close all workers
  const closePromises = workers.map(async worker => {
    try {
      logger.info(`  Closing worker: ${worker.name}...`)
      await worker.close()
      logger.info(`  ✅ Worker ${worker.name} closed`)
    } catch (error) {
      logger.error({ err: error }, `  ❌ Error closing worker ${worker.name}`)
    }
  })

  await Promise.all(closePromises)

  // Close queues
  try {
    await closeQueues()
  } catch (error) {
    logger.error({ err: error }, '❌ Error closing queues')
  }

  logger.info('✅ All workers shut down gracefully')
  process.exit(0)
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          🚀 Jengu Background Worker Process 🚀             ║
╠════════════════════════════════════════════════════════════╣
║  Workers: Competitor Scraping, Cron Scheduler, Enrichment  ║
║  Queue:   BullMQ + Redis                                   ║
╚════════════════════════════════════════════════════════════╝
`)

  // Test Redis connection first
  const redisOk = await testRedisConnection()
  if (!redisOk) {
    logger.error('❌ Cannot start workers without Redis. Please ensure Redis is running.')
    logger.info('💡 Tip: Run "docker-compose -f docker-compose.dev.yml up -d" for local Redis')
    process.exit(1)
  }

  // Start all workers
  logger.info('🔧 Starting all workers...')

  try {
    // Start workers in parallel
    await Promise.all([startCompetitorWorker(), startCronWorker(), startEnrichmentWorker()])

    logger.info(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All workers started successfully!

📊 Worker Status:
   • Competitor Worker: Running (scrapes competitor prices)
   • Cron Worker: Running (schedules daily scraping at 2 AM)
   • Enrichment Worker: Running (enriches uploaded data)

📡 Listening for jobs on Redis queues:
   • competitor: Competitor scraping jobs
   • cron: Scheduled cron jobs
   • enrichment: Data enrichment jobs
   • analytics-heavy: Heavy analytics jobs

Press Ctrl+C to stop all workers gracefully.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to start workers')
    process.exit(1)
  }

  // Register shutdown handlers
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // Keep process alive
  process.on('uncaughtException', error => {
    logger.error({ err: error }, '❌ Uncaught exception in worker process')
    // Don't exit - let workers continue
  })

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, '❌ Unhandled rejection in worker process')
    // Don't exit - let workers continue
  })
}

// Run main
main().catch(error => {
  logger.error({ err: error }, '❌ Worker process failed to start')
  process.exit(1)
})
