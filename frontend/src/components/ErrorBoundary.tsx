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
          <div className="border-border bg-card w-full max-w-md space-y-6 rounded-lg border p-8 text-center shadow-lg">
            <div className="flex justify-center">
              <div className="bg-destructive/10 rounded-full p-4">
                <AlertTriangle className="text-destructive h-12 w-12" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-foreground text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted-foreground">
                We encountered an unexpected error. Our team has been notified and we're working on
                a fix.
              </p>
            </div>

            {this.state.error && import.meta.env.MODE === 'development' && (
              <div className="bg-muted rounded-lg p-4 text-left">
                <p className="text-destructive font-mono text-sm">{this.state.error.message}</p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="text-primary-foreground bg-primary hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>

            <p className="text-muted-foreground text-xs">
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
        <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-6 text-center">
          <AlertTriangle className="text-destructive mx-auto mb-2 h-8 w-8" />
          <p className="text-destructive font-medium">Failed to load this section</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Try refreshing the page. If the problem persists, contact support.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
