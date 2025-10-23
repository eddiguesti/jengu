/**
 * Redis Connection Configuration for BullMQ
 * Manages Redis connection lifecycle and settings
 */

import Redis from 'ioredis'
import { logger } from '../middleware/logger.js'

// Redis connection options with resilience
const redisOptions = {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false, // Required for BullMQ
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`)
    return delay
  },
}

// Create Redis connection from environment variable
export function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  logger.info(`🔌 Connecting to Redis at ${redisUrl.replace(/:([^:@]+)@/, ':****@')}`)

  const connection = new Redis(redisUrl, redisOptions)

  connection.on('connect', () => {
    logger.info('✅ Redis connected successfully')
  })

  connection.on('error', (error: Error) => {
    logger.error({ err: error }, '❌ Redis connection error')
  })

  connection.on('close', () => {
    logger.warn('⚠️  Redis connection closed')
  })

  connection.on('reconnecting', () => {
    logger.info('🔄 Redis reconnecting...')
  })

  return connection
}

// Graceful shutdown handler
export async function closeRedisConnections(connections: Redis[]): Promise<void> {
  logger.info('🔌 Closing Redis connections...')

  await Promise.all(
    connections.map(async conn => {
      try {
        await conn.quit()
        logger.info('✅ Redis connection closed gracefully')
      } catch (error) {
        logger.error({ err: error }, '❌ Error closing Redis connection')
      }
    })
  )
}
