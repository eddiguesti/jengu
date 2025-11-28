/**
 * Neighborhood Index Worker
 * Scheduled job to compute daily neighborhood competitive index
 * Task 15: Competitor Graph & Neighborhood Index
 */

import { Worker, Queue } from 'bullmq'
import { createRedisConnection } from '../lib/queue/connection.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { NeighborhoodIndexService } from '../services/neighborhoodIndexService.js'
import { CompetitorGraphService } from '../services/competitorGraphService.js'
import { logger } from '../middleware/logger.js'

const QUEUE_NAME = 'neighborhood-index'

// Create queue
export const neighborhoodIndexQueue = new Queue(QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // Keep for 1 day
      count: 100,
    },
    removeOnFail: {
      age: 604800, // Keep for 7 days
      count: 500,
    },
  },
})

// Initialize services
const neighborhoodIndexService = new NeighborhoodIndexService(supabaseAdmin)
const competitorGraphService = new CompetitorGraphService(supabaseAdmin)

/**
 * Compute neighborhood index for all active properties
 */
async function computeNeighborhoodIndexes(): Promise<void> {
  logger.info('📊 Starting daily neighborhood index computation...')

  try {
    const today = new Date().toISOString().split('T')[0]

    // Get all properties with competitor relationships
    const { data: propertiesWithRelationships, error } = await supabaseAdmin
      .from('competitor_relationships')
      .select('property_id')
      .order('property_id')

    if (error) {
      logger.error({ err: error }, '❌ Failed to fetch properties with relationships')
      return
    }

    if (!propertiesWithRelationships || propertiesWithRelationships.length === 0) {
      logger.info('ℹ️  No properties with competitor relationships')
      return
    }

    // Get unique property IDs
    const propertyIds = [...new Set(propertiesWithRelationships.map((r: any) => r.property_id))]

    logger.info(`📋 Computing index for ${propertyIds.length} properties`)

    let successCount = 0
    let failCount = 0

    // Compute index for each property
    for (const propertyId of propertyIds) {
      try {
        // Get property details
        const { data: property, error: propError } = await supabaseAdmin
          .from('properties')
          .select('*')
          .eq('id', propertyId)
          .single()

        if (propError || !property) {
          logger.warn(`⚠️  Property ${propertyId} not found`)
          failCount++
          continue
        }

        // Get current pricing data if available (for property price context)
        const { data: recentPricing } = await supabaseAdmin
          .from('pricing_data')
          .select('price')
          .eq('property_id', propertyId)
          .order('stay_date', { ascending: false })
          .limit(1)
          .single()

        const propertyPrice = recentPricing?.price

        // Compute neighborhood index
        const result = await neighborhoodIndexService.computeNeighborhoodIndex(
          propertyId,
          today,
          propertyPrice,
          {
            reviewScore: property.review_score || undefined,
            starRating: property.star_rating || undefined,
            amenities: property.amenities || undefined,
          }
        )

        if (result.success) {
          logger.info(
            `✅ Computed index for property ${propertyId}: ${result.index?.overallIndex.toFixed(1)}/100`
          )
          successCount++
        } else {
          logger.warn(`⚠️  Failed to compute index for property ${propertyId}: ${result.error}`)
          failCount++
        }
      } catch (error) {
        logger.error({ err: error }, `❌ Exception computing index for property ${propertyId}`)
        failCount++
      }
    }

    logger.info(
      `✅ Neighborhood index computation complete: ${successCount} succeeded, ${failCount} failed`
    )
  } catch (error) {
    logger.error({ err: error }, '❌ Daily neighborhood index computation failed')
  }
}

/**
 * Build competitor graphs for properties that don't have them yet
 */
async function buildMissingCompetitorGraphs(): Promise<void> {
  logger.info('🔗 Building missing competitor graphs...')

  try {
    // Get properties without competitor relationships
    const { data: allProperties, error: allError } = await supabaseAdmin
      .from('properties')
      .select('id, userId, location')
      .order('created_at', { ascending: false })
      .limit(100) // Process up to 100 properties per run

    if (allError || !allProperties || allProperties.length === 0) {
      logger.info('ℹ️  No properties to process')
      return
    }

    // Check which properties have relationships
    const { data: existingRelationships } = await supabaseAdmin
      .from('competitor_relationships')
      .select('property_id')

    const propertiesWithGraphs = new Set(
      (existingRelationships || []).map((r: any) => r.property_id)
    )

    const propertiesNeedingGraphs = allProperties.filter(
      (p: any) => !propertiesWithGraphs.has(p.id) && p.location
    )

    if (propertiesNeedingGraphs.length === 0) {
      logger.info('ℹ️  No properties need competitor graphs')
      return
    }

    logger.info(`📋 Building graphs for ${propertiesNeedingGraphs.length} properties`)

    let successCount = 0
    let failCount = 0

    for (const property of propertiesNeedingGraphs) {
      try {
        const location = property.location as any
        if (!location.latitude || !location.longitude) {
          logger.warn(`⚠️  Property ${property.id} missing location coordinates`)
          failCount++
          continue
        }

        const result = await competitorGraphService.buildCompetitorGraph(
          property.id,
          {
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
          },
          {
            // Fetch from properties table if available
            starRating: undefined,
            reviewScore: undefined,
            amenities: undefined,
          },
          {
            maxDistanceKm: 10,
            maxCompetitors: 30,
          }
        )

        if (result.success && result.relationshipsCreated > 0) {
          logger.info(
            `✅ Built graph for property ${property.id}: ${result.relationshipsCreated} relationships`
          )
          successCount++
        } else {
          logger.warn(
            `⚠️  No competitors found for property ${property.id}: ${result.error || 'No nearby hotels'}`
          )
          failCount++
        }
      } catch (error) {
        logger.error({ err: error }, `❌ Failed to build graph for property ${property.id}`)
        failCount++
      }
    }

    logger.info(
      `✅ Competitor graph building complete: ${successCount} succeeded, ${failCount} failed`
    )
  } catch (error) {
    logger.error({ err: error }, '❌ Competitor graph building failed')
  }
}

/**
 * Set up cron scheduler
 * In BullMQ v4+, QueueScheduler is removed - Worker handles repeatable jobs automatically
 */
export async function startNeighborhoodIndexScheduler(): Promise<Worker> {
  logger.info('🔧 Starting neighborhood index scheduler...')

  // Add repeatable jobs (BullMQ persists these in Redis)
  await neighborhoodIndexQueue.add(
    'daily-index-computation',
    {},
    {
      repeat: {
        pattern: '0 3 * * *', // Cron: 3 AM daily (after competitor scraping at 2 AM)
      },
      jobId: 'daily-index-computation',
    }
  )

  await neighborhoodIndexQueue.add(
    'build-missing-graphs',
    {},
    {
      repeat: {
        pattern: '0 4 * * *', // Cron: 4 AM daily
      },
      jobId: 'build-missing-graphs',
    }
  )

  logger.info('✅ Neighborhood index jobs scheduled (3 AM, 4 AM)')

  // Create worker to process jobs
  const worker = new Worker(
    QUEUE_NAME,
    async job => {
      if (job.name === 'daily-index-computation') {
        await computeNeighborhoodIndexes()
      } else if (job.name === 'build-missing-graphs') {
        await buildMissingCompetitorGraphs()
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // Process one at a time
    }
  )

  worker.on('completed', job => {
    logger.info(`✅ Neighborhood index job completed: ${job.name}`)
  })

  worker.on('failed', (job, error) => {
    logger.error({ err: error }, `❌ Neighborhood index job failed: ${job?.name}`)
  })

  worker.on('error', error => {
    logger.error({ err: error }, '❌ Neighborhood index worker error')
  })

  logger.info('🚀 Neighborhood index worker started')

  return worker
}

// Graceful shutdown helper
export async function stopNeighborhoodIndexWorker(worker: Worker): Promise<void> {
  logger.info('🛑 Neighborhood index worker shutting down...')
  await worker.close()
  logger.info('✅ Neighborhood index worker stopped')
}

// Start scheduler if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = await startNeighborhoodIndexScheduler()

  // Graceful shutdown
  const shutdown = async () => {
    await stopNeighborhoodIndexWorker(worker)
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
