/**
 * Chat Context Caching Service
 *
 * Caches user database context (files, pricing data, stats) to reduce database queries
 * for the chat endpoint. Context is cached for 5 minutes.
 */

import { createRedisConnection } from '../lib/queue/connection.js'
import { logger } from '../middleware/logger.js'

// Create dedicated Redis client for caching
const redisCache = createRedisConnection()

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 5 * 60

export interface CachedUserContext {
  dataStats: {
    totalFiles: number
    enrichedFiles: number
    totalRecords: number
    avgPrice: number | null
    avgOccupancy: number | null
    latestDate: string | null
    hasEnrichedData: boolean
  }
  files: Array<{ name: string; enriched: boolean; rows: number }>
  cachedAt: number
}

/**
 * Get cached user context
 * Returns null if not in cache or expired
 */
export async function getCachedUserContext(userId: string): Promise<CachedUserContext | null> {
  try {
    const cacheKey = `chat:context:${userId}`
    const cached = await redisCache.get(cacheKey)

    if (!cached) {
      logger.debug(`Cache miss for user ${userId}`)
      return null
    }

    const data = JSON.parse(cached) as CachedUserContext
    logger.debug(`Cache hit for user ${userId}`)
    return data
  } catch (error) {
    logger.error({ err: error }, 'Error reading from cache')
    return null
  }
}

/**
 * Cache user context
 */
export async function setCachedUserContext(
  userId: string,
  context: Omit<CachedUserContext, 'cachedAt'>
): Promise<void> {
  try {
    const cacheKey = `chat:context:${userId}`
    const data: CachedUserContext = {
      ...context,
      cachedAt: Date.now(),
    }

    await redisCache.setex(cacheKey, CACHE_TTL, JSON.stringify(data))
    logger.debug(`Cached context for user ${userId} (TTL: ${CACHE_TTL}s)`)
  } catch (error) {
    logger.error({ err: error }, 'Error writing to cache')
    // Don't throw - caching is not critical
  }
}

/**
 * Invalidate user context cache
 * Call this when user uploads new data or runs enrichment
 */
export async function invalidateUserContext(userId: string): Promise<void> {
  try {
    const cacheKey = `chat:context:${userId}`
    await redisCache.del(cacheKey)
    logger.debug(`Invalidated cache for user ${userId}`)
  } catch (error) {
    logger.error({ err: error }, 'Error invalidating cache')
  }
}

/**
 * Invalidate all chat context caches
 * Useful for maintenance or debugging
 */
export async function invalidateAllChatContexts(): Promise<void> {
  try {
    const keys = await redisCache.keys('chat:context:*')
    if (keys.length > 0) {
      await redisCache.del(...keys)
      logger.info(`Invalidated ${keys.length} chat context caches`)
    }
  } catch (error) {
    logger.error({ err: error }, 'Error invalidating all caches')
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisCache.quit()
})

process.on('SIGINT', async () => {
  await redisCache.quit()
})
