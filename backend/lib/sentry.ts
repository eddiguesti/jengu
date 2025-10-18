/**
 * Sentry Error Tracking Configuration
 *
 * Initialized in server.ts before all other imports
 */

import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

/**
 * Initialize Sentry error tracking
 *
 * NOTE: Set SENTRY_DSN in .env to enable error tracking
 * Get your DSN from https://sentry.io/
 */
export function initSentry(): void {
  const sentryDSN = process.env.SENTRY_DSN

  if (!sentryDSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled')
    console.log('   Set SENTRY_DSN in .env to enable error tracking')
    return
  }

  Sentry.init({
    dsn: sentryDSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      // Performance profiling
      nodeProfilingIntegration(),
    ],

    // Ignore known errors that don't need tracking
    ignoreErrors: [
      'ValidationError',
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'Unauthorized',
      'Invalid credentials',
    ],

    // Before sending events to Sentry
    beforeSend(event, hint) {
      const error = hint.originalException

      // Don't send validation errors (user input issues)
      if (error && typeof error === 'object' && 'name' in error) {
        if (error.name === 'ZodError' || error.name === 'ValidationError') {
          return null
        }
      }

      // Scrub sensitive data from event
      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }

      return event
    },
  })

  console.log('✅ Sentry error tracking initialized')
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   Traces sample rate: ${process.env.NODE_ENV === 'production' ? '10%' : '100%'}`)
}

export { Sentry }
