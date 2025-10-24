/**
 * WebSocket Server (Socket.IO)
 * Real-time job progress updates
 */

import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { logger } from '../../middleware/logger.js'
import { enrichmentQueue, competitorQueue, analyticsQueue } from '../queue/queues.js'

export function setupWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  logger.info('🔌 WebSocket server initialized')

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization

    if (!token) {
      logger.warn('WebSocket connection rejected: No token provided')
      return next(new Error('Authentication required'))
    }

    // TODO: Verify JWT token with Supabase
    // For now, just accept the connection
    // In production, validate the token and attach userId to socket.data

    logger.info(`WebSocket client connected: ${socket.id}`)
    next()
  })

  // Connection handler
  io.on('connection', socket => {
    logger.info(`✅ WebSocket client ${socket.id} connected`)

    // Subscribe to job updates
    socket.on('job:subscribe', async (jobId: string) => {
      logger.info(`📥 Client ${socket.id} subscribed to job: ${jobId}`)

      // Join a room for this specific job
      socket.join(`job:${jobId}`)

      // Send current job status immediately
      try {
        const job = await getJobFromId(jobId)

        if (job) {
          const state = await job.getState()
          socket.emit('job:status', {
            jobId,
            status: state,
            progress: job.progress || 0,
            data: job.data,
          })
        } else {
          socket.emit('job:error', {
            jobId,
            error: 'Job not found',
          })
        }
      } catch (error) {
        logger.error({ err: error }, `Error fetching job ${jobId}`)
        socket.emit('job:error', {
          jobId,
          error: 'Failed to fetch job status',
        })
      }
    })

    // Unsubscribe from job updates
    socket.on('job:unsubscribe', (jobId: string) => {
      logger.info(`📤 Client ${socket.id} unsubscribed from job: ${jobId}`)
      socket.leave(`job:${jobId}`)
    })

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`❌ WebSocket client ${socket.id} disconnected`)
    })
  })

  // Set up worker event listeners to emit real-time updates
  setupWorkerListeners(io)

  return io
}

/**
 * Set up listeners on workers to emit real-time updates
 */
function setupWorkerListeners(io: SocketIOServer) {
  // Import workers (they export their instances)
  import('../../workers/enrichmentWorker.js').then(({ enrichmentWorker }) => {
    enrichmentWorker.on('progress', (job, progress) => {
      io.to(`job:${job.id}`).emit('job:progress', {
        jobId: job.id,
        progress: typeof progress === 'number' ? progress : 0,
      })
    })

    enrichmentWorker.on('completed', job => {
      io.to(`job:${job.id}`).emit('job:completed', {
        jobId: job.id,
        result: job.returnvalue,
      })
    })

    enrichmentWorker.on('failed', (job, error) => {
      if (job) {
        io.to(`job:${job.id}`).emit('job:failed', {
          jobId: job.id,
          error: error.message,
        })
      }
    })

    enrichmentWorker.on('active', job => {
      io.to(`job:${job.id}`).emit('job:active', {
        jobId: job.id,
      })
    })

    logger.info('📡 Enrichment worker events connected to WebSocket')
  })

  // Similar setup for other workers
  import('../../workers/competitorWorker.js')
    .then(({ competitorWorker }) => {
      competitorWorker.on('progress', (job, progress) => {
        io.to(`job:${job.id}`).emit('job:progress', {
          jobId: job.id,
          progress: typeof progress === 'number' ? progress : 0,
        })
      })

      competitorWorker.on('completed', job => {
        io.to(`job:${job.id}`).emit('job:completed', {
          jobId: job.id,
          result: job.returnvalue,
        })
      })

      competitorWorker.on('failed', (job, error) => {
        if (job) {
          io.to(`job:${job.id}`).emit('job:failed', {
            jobId: job.id,
            error: error.message,
          })
        }
      })

      logger.info('📡 Competitor worker events connected to WebSocket')
    })
    .catch(err => {
      logger.warn('Competitor worker not started, skipping WebSocket setup')
    })

  import('../../workers/analyticsWorker.js')
    .then(({ analyticsWorker }) => {
      analyticsWorker.on('progress', (job, progress) => {
        io.to(`job:${job.id}`).emit('job:progress', {
          jobId: job.id,
          progress: typeof progress === 'number' ? progress : 0,
        })
      })

      analyticsWorker.on('completed', job => {
        io.to(`job:${job.id}`).emit('job:completed', {
          jobId: job.id,
          result: job.returnvalue,
        })
      })

      analyticsWorker.on('failed', (job, error) => {
        if (job) {
          io.to(`job:${job.id}`).emit('job:failed', {
            jobId: job.id,
            error: error.message,
          })
        }
      })

      logger.info('📡 Analytics worker events connected to WebSocket')
    })
    .catch(err => {
      logger.warn('Analytics worker not started, skipping WebSocket setup')
    })
}

/**
 * Helper to get job from any queue based on job ID prefix
 */
async function getJobFromId(jobId: string) {
  if (jobId.startsWith('enrich-')) {
    return await enrichmentQueue.getJob(jobId)
  } else if (jobId.startsWith('competitor-')) {
    return await competitorQueue.getJob(jobId)
  } else if (jobId.startsWith('analytics-')) {
    return await analyticsQueue.getJob(jobId)
  }
  return null
}
