/**
 * API Key Rate Limiting Middleware
 * =================================
 * Enforces rate limits based on API key quotas
 * with graceful degradation and retry-after headers.
 *
 * Features:
 *   - Per-minute, per-hour, per-day quotas
 *   - 429 responses with Retry-After header
 *   - Sliding window rate limiting
 *   - Rate limit headers (X-RateLimit-*)
 *
 * Usage:
 *   app.use(rateLimitApiKey());
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Check rate limit for API key
 */
async function checkRateLimit(
  apiKeyId: string,
  windowType: 'minute' | 'hour' | 'day'
): Promise<{
  currentCount: number;
  quota: number;
  isExceeded: boolean;
  resetAt: Date;
} | null> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_api_key_id: apiKeyId,
      p_window_type: windowType,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      currentCount: result.current_count,
      quota: result.quota,
      isExceeded: result.is_exceeded,
      resetAt: new Date(result.reset_at),
    };
  } catch (error) {
    console.error(`Error checking ${windowType} rate limit:`, error);
    return null;
  }
}

/**
 * Increment rate limit counter
 */
async function incrementRateLimit(
  apiKeyId: string,
  windowType: 'minute' | 'hour' | 'day'
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_api_key_id: apiKeyId,
      p_window_type: windowType,
    });

    if (error) {
      console.error(`Error incrementing ${windowType} rate limit:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error incrementing ${windowType} rate limit:`, error);
    return null;
  }
}

/**
 * Calculate seconds until window reset
 */
function getResetSeconds(resetAt: Date): number {
  return Math.ceil((resetAt.getTime() - Date.now()) / 1000);
}

/**
 * Rate Limiting Middleware for API Keys
 *
 * Enforces rate limits based on API key quotas.
 * Must be used AFTER authenticateApiKey middleware.
 *
 * @example
 * app.use(authenticateApiKey());
 * app.use(rateLimitApiKey());
 */
export function rateLimitApiKey() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if no API key (not an API key request)
    if (!req.apiKey) {
      return next();
    }

    const { id: apiKeyId, quotas } = req.apiKey;

    try {
      // Check all rate limit windows
      const [minuteLimit, hourLimit, dayLimit] = await Promise.all([
        checkRateLimit(apiKeyId, 'minute'),
        checkRateLimit(apiKeyId, 'hour'),
        checkRateLimit(apiKeyId, 'day'),
      ]);

      // Check if any limit is exceeded
      if (minuteLimit?.isExceeded) {
        const resetSeconds = getResetSeconds(minuteLimit.resetAt);

        res.setHeader('X-RateLimit-Limit', quotas.perMinute);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.floor(minuteLimit.resetAt.getTime() / 1000));
        res.setHeader('Retry-After', resetSeconds);

        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded: ${quotas.perMinute} requests per minute. Try again in ${resetSeconds} seconds.`,
          retryAfter: resetSeconds,
          limit: quotas.perMinute,
          window: 'minute',
        });
      }

      if (hourLimit?.isExceeded) {
        const resetSeconds = getResetSeconds(hourLimit.resetAt);

        res.setHeader('X-RateLimit-Limit', quotas.perHour);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.floor(hourLimit.resetAt.getTime() / 1000));
        res.setHeader('Retry-After', resetSeconds);

        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded: ${quotas.perHour} requests per hour. Try again in ${resetSeconds} seconds.`,
          retryAfter: resetSeconds,
          limit: quotas.perHour,
          window: 'hour',
        });
      }

      if (dayLimit?.isExceeded) {
        const resetSeconds = getResetSeconds(dayLimit.resetAt);

        res.setHeader('X-RateLimit-Limit', quotas.perDay);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.floor(dayLimit.resetAt.getTime() / 1000));
        res.setHeader('Retry-After', resetSeconds);

        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded: ${quotas.perDay} requests per day. Try again in ${resetSeconds} seconds.`,
          retryAfter: resetSeconds,
          limit: quotas.perDay,
          window: 'day',
        });
      }

      // Increment rate limit counters (async, don't wait)
      Promise.all([
        incrementRateLimit(apiKeyId, 'minute'),
        incrementRateLimit(apiKeyId, 'hour'),
        incrementRateLimit(apiKeyId, 'day'),
      ]).catch((error) => {
        console.error('Error incrementing rate limits:', error);
      });

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit-Minute', quotas.perMinute);
      res.setHeader('X-RateLimit-Limit-Hour', quotas.perHour);
      res.setHeader('X-RateLimit-Limit-Day', quotas.perDay);

      if (minuteLimit) {
        res.setHeader('X-RateLimit-Remaining-Minute', Math.max(0, quotas.perMinute - minuteLimit.currentCount - 1));
        res.setHeader('X-RateLimit-Reset-Minute', Math.floor(minuteLimit.resetAt.getTime() / 1000));
      }

      if (hourLimit) {
        res.setHeader('X-RateLimit-Remaining-Hour', Math.max(0, quotas.perHour - hourLimit.currentCount - 1));
        res.setHeader('X-RateLimit-Reset-Hour', Math.floor(hourLimit.resetAt.getTime() / 1000));
      }

      if (dayLimit) {
        res.setHeader('X-RateLimit-Remaining-Day', Math.max(0, quotas.perDay - dayLimit.currentCount - 1));
        res.setHeader('X-RateLimit-Reset-Day', Math.floor(dayLimit.resetAt.getTime() / 1000));
      }

      next();
    } catch (error) {
      console.error('Error in rate limiting middleware:', error);

      // On error, allow request but log warning
      console.warn('Rate limiting failed, allowing request through');
      next();
    }
  };
}

export default rateLimitApiKey;
