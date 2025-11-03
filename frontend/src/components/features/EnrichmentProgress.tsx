/**
 * Enrichment Progress Component
 * Shows real-time progress for data enrichment
 */

import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useEnrichmentStatus } from '../../hooks/queries/useEnrichmentStatus'

interface EnrichmentProgressProps {
  propertyId: string
  onComplete?: () => void
  onError?: (error: string) => void
  className?: string
}

export function EnrichmentProgress({
  propertyId,
  onComplete,
  onError,
  className,
}: EnrichmentProgressProps) {
  const { data: status, isLoading } = useEnrichmentStatus(propertyId, true)
  const previousStatusRef = useRef<string | undefined>()

  // Handle status changes with callbacks only (no state updates)
  useEffect(() => {
    if (!status || status.status === previousStatusRef.current) return

    previousStatusRef.current = status.status

    if (status.status === 'complete' && onComplete) {
      onComplete()
    }

    if (status.status === 'error' && onError) {
      onError('Enrichment failed')
    }
  }, [status?.status, onComplete, onError])

  if (isLoading) {
    return null
  }

  const isInProgress = status?.status === 'pending' || status?.status === 'running'
  const isCompleted = status?.status === 'complete'
  const isFailed = status?.status === 'error'

  return (
    <>
      {/* Progress Bar */}
      {isInProgress && (
        <div className={clsx('border-border rounded-lg border bg-white p-4 shadow-sm', className)}>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Enriching data...</span>
                <span className="text-xs text-gray-500">In progress</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full animate-pulse bg-blue-600" style={{ width: '60%' }} />
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Adding weather, holidays, and temporal features...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {isCompleted && (
        <div
          className={clsx(
            'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-green-500 bg-green-50 p-4 shadow-lg',
            'animate-in slide-in-from-bottom-5'
          )}
        >
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-900">
            Enrichment completed successfully!
          </span>
        </div>
      )}

      {/* Error Toast */}
      {isFailed && (
        <div
          className={clsx(
            'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-red-500 bg-red-50 p-4 shadow-lg',
            'animate-in slide-in-from-bottom-5'
          )}
        >
          <XCircle className="h-5 w-5 text-red-600" />
          <span className="text-sm font-medium text-red-900">
            Enrichment failed. Please try again.
          </span>
        </div>
      )}
    </>
  )
}

/**
 * Simple toast notification without polling
 */
export function Toast({
  message,
  type = 'info',
  onDismiss,
}: {
  message: string
  type?: 'success' | 'error' | 'info'
  onDismiss?: () => void
}) {
  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg',
        'animate-in slide-in-from-bottom-5',
        type === 'success' && 'border-green-500 bg-green-50',
        type === 'error' && 'border-red-500 bg-red-50',
        type === 'info' && 'border-blue-500 bg-blue-50'
      )}
    >
      {type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
      {type === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
      {type === 'info' && <AlertCircle className="h-5 w-5 text-blue-600" />}
      <span
        className={clsx(
          'text-sm font-medium',
          type === 'success' && 'text-green-900',
          type === 'error' && 'text-red-900',
          type === 'info' && 'text-blue-900'
        )}
      >
        {message}
      </span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={clsx(
            'ml-4 text-sm font-medium hover:underline',
            type === 'success' && 'text-green-700',
            type === 'error' && 'text-red-700',
            type === 'info' && 'text-blue-700'
          )}
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
