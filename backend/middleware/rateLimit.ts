import { Request, Response, NextFunction } from 'express'

// Simple in-memory rate limiting (for demo)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60')

/**
 * Rate limiting middleware
 * Tracks requests per IP address and enforces a maximum number of requests per minute
 */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress
  const now = Date.now()
  const windowStart = now - 60000 // 1 minute window

  if (!ip) {
    return next()
  }

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [])
  }

  const requests = rateLimitMap.get(ip)!.filter(time => time > windowStart)

  if (requests.length >= RATE_LIMIT) {
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Max ${RATE_LIMIT} requests per minute.`,
    })
    return
  }

  requests.push(now)
  rateLimitMap.set(ip, requests)
  next()
}

export { RATE_LIMIT }
