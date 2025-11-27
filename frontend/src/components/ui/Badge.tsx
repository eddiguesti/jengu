import { ReactNode, memo } from 'react'
import clsx from 'clsx'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  dot?: boolean
  icon?: ReactNode
  className?: string
}

export const Badge = memo(function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  className,
}: BadgeProps) {
  const variants = {
    default: clsx(
      'bg-surface-hover text-text-secondary',
      'border border-border/50'
    ),
    success: clsx(
      'bg-success/10 text-success',
      'border border-success/20'
    ),
    warning: clsx(
      'bg-warning/10 text-warning',
      'border border-warning/20'
    ),
    error: clsx(
      'bg-error/10 text-error',
      'border border-error/20'
    ),
    info: clsx(
      'bg-info/10 text-info',
      'border border-info/20'
    ),
    primary: clsx(
      'bg-primary/10 text-primary',
      'border border-primary/20'
    ),
    outline: clsx(
      'bg-transparent text-text-secondary',
      'border border-border'
    ),
  }

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-1.5',
  }

  const dotColors = {
    default: 'bg-text-tertiary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
    primary: 'bg-primary',
    outline: 'bg-text-tertiary',
  }

  return (
    <span
      className={clsx(
        // Base
        'inline-flex items-center justify-center',
        // Shape
        'rounded-full',
        // Font
        'font-medium tracking-tight',
        // Variant & Size
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            'h-1.5 w-1.5 rounded-full',
            dotColors[variant]
          )}
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
})

// Status Badge with animation
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away'
  label?: string
  size?: 'sm' | 'md'
}

export const StatusBadge = memo(function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const statusConfig = {
    online: { color: 'bg-success', label: 'Online', ping: true },
    offline: { color: 'bg-text-muted', label: 'Offline', ping: false },
    busy: { color: 'bg-error', label: 'Busy', ping: true },
    away: { color: 'bg-warning', label: 'Away', ping: false },
  }

  const config = statusConfig[status]
  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex">
        {config.ping && (
          <span
            className={clsx(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.color
            )}
          />
        )}
        <span className={clsx('relative inline-flex rounded-full', config.color, dotSize)} />
      </span>
      {label !== undefined ? (
        <span className={clsx('font-medium text-text-secondary', textSize)}>{label}</span>
      ) : (
        <span className={clsx('font-medium text-text-secondary', textSize)}>{config.label}</span>
      )}
    </span>
  )
})

// Count Badge (for notifications)
interface CountBadgeProps {
  count: number
  max?: number
  variant?: 'primary' | 'error'
  size?: 'sm' | 'md'
}

export const CountBadge = memo(function CountBadge({ count, max = 99, variant = 'error', size = 'md' }: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count.toString()

  const variants = {
    primary: 'bg-primary text-white',
    error: 'bg-error text-white',
  }

  const sizes = {
    sm: 'min-w-4 h-4 text-[10px] px-1',
    md: 'min-w-5 h-5 text-xs px-1.5',
  }

  if (count === 0) return null

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-bold',
        variants[variant],
        sizes[size]
      )}
    >
      {displayCount}
    </span>
  )
})
