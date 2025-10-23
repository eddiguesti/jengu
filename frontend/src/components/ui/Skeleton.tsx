/**
 * Skeleton Loader Components
 * Provides loading placeholders while data is being fetched
 */

import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * Base Skeleton component
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={clsx('animate-pulse rounded-md bg-muted/50', className)} {...props} />
}

/**
 * Chart Skeleton - for analytics charts
 */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('space-y-4', className)}>
      {/* Chart title */}
      <Skeleton className="h-6 w-48" />

      {/* Chart area */}
      <div className="space-y-2">
        <Skeleton className="h-64 w-full" />
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

/**
 * Card Skeleton - for dashboard cards
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('space-y-4 rounded-lg border border-border p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Value */}
      <Skeleton className="h-10 w-24" />

      {/* Description */}
      <Skeleton className="h-4 w-full" />
    </div>
  )
}

/**
 * Table Skeleton - for data tables
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="flex gap-4 border-b border-border pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 w-full" />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-6 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * List Skeleton - for vertical lists
 */
export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Dashboard Grid Skeleton - for dashboard layout
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}
