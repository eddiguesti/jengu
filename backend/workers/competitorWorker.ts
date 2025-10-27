/**
 * Competitor Scraping Worker
 * Processes competitor pricing scrape jobs using Playwright
 */

import { Worker, Job } from 'bullmq'
import { createRedisConnection } from '../lib/queue/connection.js'
import { CompetitorJobData } from '../lib/queue/queues.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { logger } from '../middleware/logger.js'
import { CompetitorScraper, ProxyPool } from '../services/competitorScraper.js'
import { CompetitorDataService } from '../services/competitorDataService.js'

// Worker concurrency from env (default: 2)
const CONCURRENCY = parseInt(process.env.COMPETITOR_WORKER_CONCURRENCY || '2', 10)

// Initialize services
const competitorDataService = new CompetitorDataService(supabaseAdmin)
const proxyPool = ProxyPool.fromEnv()

/**
 * Process competitor scraping job
 */
async function processCompetitorJob(job: Job<CompetitorJobData>) {
  const { propertyId, userId, location, checkIn, checkOut, adults } = job.data
  const startTime = Date.now()

  logger.info(`🔄 Processing competitor job: ${job.id}`, {
    propertyId,
    userId,
    location,
  })

  // Initialize scraper
  const proxy = proxyPool.getNext()
  const scraper = new CompetitorScraper({
    headless: true,
    proxy,
    timeout: 60000,
    respectRobotsTxt: true,
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

    // Initialize browser
    await scraper.initialize()
    await job.updateProgress(30)

    logger.info(`🏨 Scraping competitors for ${location}...`)

    // Parse location (could be string or coordinates)
    const locationData =
      typeof location === 'string'
        ? { city: location, latitude: 0, longitude: 0 } // TODO: Geocode
        : { latitude: location.latitude, longitude: location.longitude }

    // Scrape competitors
    const scrapeResult = await scraper.scrapeBookingCom({
      location: locationData,
      checkIn,
      checkOut,
      guests: adults,
      roomType: 'standard',
      searchRadiusKm: 5,
    })

    await job.updateProgress(70)

    if (!scrapeResult.success || scrapeResult.competitors.length === 0) {
      throw new Error(scrapeResult.error || 'No competitors found')
    }

    logger.info(`✅ Found ${scrapeResult.competitors.length} competitor hotels`)

    // Calculate price percentiles
    const percentiles = scraper.calculatePricePercentiles(scrapeResult.competitors)

    await job.updateProgress(80)

    // Store competitor data
    const storeResult = await competitorDataService.storeCompetitorData({
      propertyId,
      date: checkIn, // Store for check-in date
      priceP10: percentiles.p10,
      priceP50: percentiles.p50,
      priceP90: percentiles.p90,
      source: scrapeResult.source,
      competitorCount: percentiles.count,
      location: locationData,
      searchParams: {
        roomType: 'standard',
        guests: adults,
        searchRadiusKm: 5,
      },
    })

    if (!storeResult.success) {
      throw new Error(`Failed to store data: ${storeResult.error}`)
    }

    await job.updateProgress(100)

    const duration = Date.now() - startTime

    return {
      success: true,
      propertyId,
      location,
      competitorsFound: scrapeResult.competitors.length,
      percentiles,
      duration,
    }
  } catch (error) {
    logger.error({ err: error }, `❌ Competitor job ${job.id} failed`)
    throw error
  } finally {
    // Always close browser
    await scraper.close()
  }
}

// Create worker
export const competitorWorker = new Worker<CompetitorJobData>(
  'competitor',
  async job => {
    return await processCompetitorJob(job)
  },
  {
    connection: createRedisConnection(),
    concurrency: CONCURRENCY,
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // Per minute (rate limiting)
    },
  }
)

// Worker event handlers
competitorWorker.on('completed', job => {
  logger.info(`✅ Competitor job completed: ${job.id}`, {
    propertyId: job.data.propertyId,
    duration: job.finishedOn ? job.finishedOn - (job.processedOn || 0) : 0,
  })
})

competitorWorker.on('failed', (job, error) => {
  logger.error({ err: error }, `❌ Competitor job failed: ${job?.id}`, {
    propertyId: job?.data.propertyId,
    attemptsMade: job?.attemptsMade,
  })
})

competitorWorker.on('error', error => {
  logger.error({ err: error }, '❌ Competitor worker error')
})

competitorWorker.on('active', job => {
  logger.info(`🔄 Competitor job started: ${job.id}`, {
    propertyId: job.data.propertyId,
  })
})

logger.info(`🚀 Competitor worker started with concurrency: ${CONCURRENCY}`)

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Competitor worker shutting down gracefully...')
  await competitorWorker.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('🛑 Competitor worker shutting down gracefully...')
  await competitorWorker.close()
  process.exit(0)
})
