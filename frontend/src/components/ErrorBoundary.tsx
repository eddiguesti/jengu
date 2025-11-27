/**
 * React Error Boundary with Sentry Integration
 *
 * Catches React rendering errors and reports them to Sentry
 */

import React from 'react'
import { Sentry } from '../lib/sentry'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })

    console.error('Error boundary caught error:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="bg-background flex min-h-screen items-center justify-center px-4">
          <div className="border-border bg-surface w-full max-w-md space-y-6 rounded-2xl border p-8 text-center shadow-lg">
            <div className="flex justify-center">
              <div className="bg-error/10 rounded-full p-4">
                <AlertTriangle className="text-error h-12 w-12" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-text text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted">
                We encountered an unexpected error. Our team has been notified and we&apos;re working on
                a fix.
              </p>
            </div>

            {this.state.error && import.meta.env.MODE === 'development' && (
              <div className="bg-elevated rounded-xl p-4 text-left">
                <p className="text-error font-mono text-sm">{this.state.error.message}</p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="bg-primary text-background hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>

            <p className="text-muted text-xs">
              If the problem persists, please contact support
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Lightweight error boundary for nested components
 *
 * Falls back to simple error message instead of full page
 */
export function PartialErrorBoundary({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        <div className="border-error/30 bg-error/10 rounded-xl border p-6 text-center">
          <AlertTriangle className="text-error mx-auto mb-2 h-8 w-8" />
          <p className="text-error font-medium">Failed to load this section</p>
          <p className="text-muted mt-1 text-sm">
            Try refreshing the page. If the problem persists, contact support.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
