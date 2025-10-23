/**
 * Request ID Middleware
 *
 * Generates unique request IDs for each incoming request
 * Attaches request ID to the request object for logging and tracking
 */

import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { logger } from './logger.js'

/**
 * Generate unique request ID and attach to request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  req.id = randomUUID()
  req.startTime = Date.now()

  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', req.id)

  // Log incoming request
  logger.info(
    {
      reqId: req.id,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    'Incoming request'
  )

  // Log response on finish
  res.on('finish', () => {
    const latencyMs = Date.now() - req.startTime

    logger.info(
      {
        reqId: req.id,
        userId: req.userId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        latencyMs,
      },
      'Request completed'
    )
  })

  next()
}

export default requestIdMiddleware
