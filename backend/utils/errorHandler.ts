/**
 * Standardized Error Response Formatter
 * Provides consistent error handling across all API endpoints
 */

import type { Response, Request, NextFunction } from 'express'

interface ErrorResponse {
  error: string
  message: string
  timestamp: string
  details?: unknown
  environment?: string
}

interface ErrorTypeConfig {
  error: string
  statusCode: number
}

/**
 * Standard error response structure
 */
export function formatErrorResponse(
  error: string,
  message: string,
  _statusCode = 500,
  details: unknown = null
): ErrorResponse {
  const response: ErrorResponse = {
    error,
    message,
    timestamp: new Date().toISOString(),
  }

  // Add details if provided
  if (details) {
    response.details = details
  }

  // Add environment info in development
  if (process.env.NODE_ENV === 'development') {
    response.environment = 'development'
  }

  return response
}

/**
 * Common error types with standard messages
 */
export const ErrorTypes: Record<string, ErrorTypeConfig> = {
  VALIDATION: {
    error: 'Validation Error',
    statusCode: 400,
  },
  AUTHENTICATION: {
    error: 'Authentication Error',
    statusCode: 401,
  },
  AUTHORIZATION: {
    error: 'Authorization Error',
    statusCode: 403,
  },
  NOT_FOUND: {
    error: 'Resource Not Found',
    statusCode: 404,
  },
  RATE_LIMIT: {
    error: 'Rate Limit Exceeded',
    statusCode: 429,
  },
  DATABASE: {
    error: 'Database Error',
    statusCode: 500,
  },
  EXTERNAL_API: {
    error: 'External API Error',
    statusCode: 502,
  },
  INTERNAL: {
    error: 'Internal Server Error',
    statusCode: 500,
  },
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  errorType: string,
  message: string,
  details: unknown = null
): void {
  const errorConfig = (ErrorTypes[errorType] ?? ErrorTypes.INTERNAL) as ErrorTypeConfig
  const response = formatErrorResponse(errorConfig.error, message, errorConfig.statusCode, details)

  res.status(errorConfig.statusCode).json(response)
}

/**
 * Handle async errors in Express routes
 * Wrapper for async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Log error with context
 */
export function logError(
  error: Error,
  context: string,
  metadata: Record<string, unknown> = {}
): void {
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    ...metadata,
    timestamp: new Date().toISOString(),
  })
}
