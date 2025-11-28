/**
 * BullMQ Queue Definitions
 * Manages job queues for enrichment, competitor scraping, and heavy analytics
 */

import { Queue, QueueOptions } from 'bullmq'
import { createRedisConnection } from './connection.js'
import { logger } from '../../middleware/logger.js'

// Job data types
export interface EnrichmentJobData {
  propertyId: string
  userId: string
  location: {
    latitude: number
    longitude: number
  }
  countryCode?: string
  calendarificApiKey?: string
}

export interface CompetitorJobData {
  propertyId: string
  userId: string
  location: string
  checkIn: string
  checkOut: string
  adults: number
}

export interface AnalyticsJobData {
  propertyId: string
  userId: string
  analysisType: 'summary' | 'weather-impact' | 'demand-forecast' | 'feature-importance'
  data: unknown[]
  params?: Record<string, unknown>
}

// Queue configuration with retry and backoff
const defaultQueueOptions: QueueOptions = {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days (for DLQ inspection)
    },
  },
}

// Create queues
export const enrichmentQueue = new Queue<EnrichmentJobData>('enrichment', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 5, // More retries for enrichment (external API issues)
  },
})

export const competitorQueue = new Queue<CompetitorJobData>('competitor', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 3, // Standard retries for scraping
  },
})

export const analyticsQueue = new Queue<AnalyticsJobData>('analytics-heavy', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 2, // Fewer retries for analytics (usually deterministic failures)
  },
})

// Cron queue for scheduled jobs (separate from main competitor queue)
export const cronQueue = new Queue('cron', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 1, // Cron jobs should not retry - next scheduled run will occur
  },
})

// Log queue creation
logger.info(
  {
    enrichment: enrichmentQueue.name,
    competitor: competitorQueue.name,
    analytics: analyticsQueue.name,
    cron: cronQueue.name,
  },
  '📦 BullMQ Queues initialized'
)

// Job priority levels
export enum JobPriority {
  LOW = 10,
  NORMAL = 5,
  HIGH = 3,
  URGENT = 1, // Lower number = higher priority in BullMQ
}

// Helper function to add enrichment job
export async function enqueueEnrichment(
  data: EnrichmentJobData,
  priority: JobPriority = JobPriority.NORMAL
): Promise<string> {
  try {
    const job = await enrichmentQueue.add('enrich-property', data, {
      jobId: `enrich-${data.propertyId}-${Date.now()}`,
      priority, // Add priority support
    })

    logger.info(
      {
        propertyId: data.propertyId,
        userId: data.userId,
        priority,
      },
      `📥 Enrichment job enqueued: ${job.id}`
    )

    return job.id!
  } catch (error) {
    // If enqueueing fails (Redis down), return sync placeholder
    logger.warn({ error }, '⚠️  Failed to enqueue job - enrichment will run synchronously')
    return `sync-${data.propertyId}-${Date.now()}`
  }
}

// Helper function to add competitor job
export async function enqueueCompetitor(
  data: CompetitorJobData,
  priority: JobPriority = JobPriority.NORMAL
): Promise<string> {
  const job = await competitorQueue.add('scrape-competitors', data, {
    jobId: `competitor-${data.propertyId}-${Date.now()}`,
    priority,
  })

  logger.info(
    {
      propertyId: data.propertyId,
      location: data.location,
      priority,
    },
    `📥 Competitor job enqueued: ${job.id}`
  )

  return job.id!
}

// Helper function to add analytics job
export async function enqueueAnalytics(
  data: AnalyticsJobData,
  priority: JobPriority = JobPriority.NORMAL
): Promise<string> {
  const job = await analyticsQueue.add(`analytics-${data.analysisType}`, data, {
    jobId: `analytics-${data.propertyId}-${data.analysisType}-${Date.now()}`,
    priority,
  })

  logger.info(
    {
      propertyId: data.propertyId,
      analysisType: data.analysisType,
      priority,
    },
    `📥 Analytics job enqueued: ${job.id}`
  )

  return job.id!
}

// Helper function to get job status
export async function getJobStatus(
  queueName: 'enrichment' | 'competitor' | 'analytics-heavy',
  jobId: string
) {
  const queue = {
    enrichment: enrichmentQueue,
    competitor: competitorQueue,
    'analytics-heavy': analyticsQueue,
  }[queueName]

  const job = await queue.getJob(jobId)

  if (!job) {
    return { status: 'not_found', progress: 0 }
  }

  const state = await job.getState()
  const progress = job.progress

  return {
    status: state,
    progress,
    data: job.data,
    returnValue: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  }
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  logger.info('🔌 Closing BullMQ queues...')

  await Promise.all([
    enrichmentQueue.close(),
    competitorQueue.close(),
    analyticsQueue.close(),
    cronQueue.close(),
  ])

  logger.info('✅ All queues closed')
}
