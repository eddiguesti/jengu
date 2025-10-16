/**
 * Standardized Error Response Formatter
 * Provides consistent error handling across all API endpoints
 */

/**
 * Standard error response structure
 * @param {string} error - Error title/category
 * @param {string} message - Detailed error message
 * @param {number} statusCode - HTTP status code
 * @param {object} details - Additional error details (optional)
 * @returns {object} - Formatted error response
 */
export function formatErrorResponse(error, message, statusCode = 500, details = null) {
  const response = {
    error,
    message,
    timestamp: new Date().toISOString()
  };

  // Add details if provided
  if (details) {
    response.details = details;
  }

  // Add environment info in development
  if (process.env.NODE_ENV === 'development') {
    response.environment = 'development';
  }

  return response;
}

/**
 * Common error types with standard messages
 */
export const ErrorTypes = {
  VALIDATION: {
    error: 'Validation Error',
    statusCode: 400
  },
  AUTHENTICATION: {
    error: 'Authentication Error',
    statusCode: 401
  },
  AUTHORIZATION: {
    error: 'Authorization Error',
    statusCode: 403
  },
  NOT_FOUND: {
    error: 'Resource Not Found',
    statusCode: 404
  },
  RATE_LIMIT: {
    error: 'Rate Limit Exceeded',
    statusCode: 429
  },
  DATABASE: {
    error: 'Database Error',
    statusCode: 500
  },
  EXTERNAL_API: {
    error: 'External API Error',
    statusCode: 502
  },
  INTERNAL: {
    error: 'Internal Server Error',
    statusCode: 500
  }
};

/**
 * Send error response
 * @param {object} res - Express response object
 * @param {string} errorType - Error type from ErrorTypes
 * @param {string} message - Custom error message
 * @param {object} details - Additional error details (optional)
 */
export function sendError(res, errorType, message, details = null) {
  const errorConfig = ErrorTypes[errorType] || ErrorTypes.INTERNAL;
  const response = formatErrorResponse(
    errorConfig.error,
    message,
    errorConfig.statusCode,
    details
  );

  res.status(errorConfig.statusCode).json(response);
}

/**
 * Handle async errors in Express routes
 * Wrapper for async route handlers to catch errors
 * @param {function} fn - Async route handler
 * @returns {function} - Wrapped handler with error catching
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {object} metadata - Additional metadata (optional)
 */
export function logError(error, context, metadata = {}) {
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    ...metadata,
    timestamp: new Date().toISOString()
  });
}
