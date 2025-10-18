/**
 * Sentry Error Tracking Configuration (Frontend)
 *
 * Initialized in main.tsx before React app mounts
 */

import * as Sentry from '@sentry/react'

/**
 * Initialize Sentry error tracking for React
 *
 * NOTE: Set VITE_SENTRY_DSN in .env to enable error tracking
 * Get your DSN from https://sentry.io/
 */
export function initSentry(): void {
  const sentryDSN = import.meta.env.VITE_SENTRY_DSN

  if (!sentryDSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled')
    console.log('   Set VITE_SENTRY_DSN in .env to enable error tracking')
    return
  }

  Sentry.init({
    dsn: sentryDSN,
    environment: import.meta.env.MODE || 'development',

    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text content
        blockAllMedia: true, // Privacy: block all media elements
      }),
    ],

    // Performance traces sample rate
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session replay sample rate
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of error sessions

    // Ignore known errors that don't need tracking
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.epicplay.com',
      "Can't find variable: ZiteReader",
      'jigsaw is not defined',
      'ComboSearch is not defined',
      'atomicFindClose',
      'fb_xd_fragment',
      'bmi_SafeAddOnload',
      'EBCallBackMessageReceived',
      'conduitPage',

      // Network errors (usually expected)
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      'Load failed',

      // Auth errors (expected user flow)
      'Invalid credentials',
      'Unauthorized',
      'Session expired',
    ],

    // Before sending events to Sentry
    beforeSend(event, hint) {
      const error = hint.originalException

      // Don't send validation errors (user input issues)
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message)
        if (
          message.includes('validation') ||
          message.includes('Invalid input') ||
          message.includes('required')
        ) {
          return null
        }
      }

      // Scrub sensitive data from event
      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }

      // Remove localStorage/sessionStorage data
      if (event.contexts?.browser) {
        delete event.contexts.browser
      }

      return event
    },
  })

  console.log('✅ Sentry error tracking initialized (frontend)')
  console.log(`   Environment: ${import.meta.env.MODE || 'development'}`)
  console.log(`   Traces sample rate: ${import.meta.env.MODE === 'production' ? '10%' : '100%'}`)
}

export { Sentry }
