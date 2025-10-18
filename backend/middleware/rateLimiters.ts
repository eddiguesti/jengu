/**
 * Enhanced Rate Limiting Middleware
 *
 * Different rate limits for different endpoint types
 */

import rateLimit from 'express-rate-limit'

/**
 * General API rate limiter
 * Applies to all routes by default
 */
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '100'), // 100 requests per minute
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Store in memory (good for single-server deployments)
  // For multi-server deployments, use Redis store
})

/**
 * Auth endpoints limiter
 * Stricter limits for login/signup to prevent brute force
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
})

/**
 * File upload limiter
 * Moderate limits to prevent abuse while allowing legitimate uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    error: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    message: 'Too many file uploads, please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * AI/Pricing endpoints limiter
 * Lower limits for expensive operations
 */
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'AI_RATE_LIMIT_EXCEEDED',
    message: 'Too many AI requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Pricing engine limiter
 * Moderate limits for pricing quotes
 */
export const pricingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 pricing quotes per minute
  message: {
    error: 'PRICING_RATE_LIMIT_EXCEEDED',
    message: 'Too many pricing requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Analytics endpoints limiter
 * Moderate limits for analytics queries
 */
export const analyticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 analytics requests per minute
  message: {
    error: 'ANALYTICS_RATE_LIMIT_EXCEEDED',
    message: 'Too many analytics requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
