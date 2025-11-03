import clsx from 'clsx'

interface ProgressProps {
  value: number // 0-100
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  className?: string
}

export const Progress = ({
  value,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  className,
}: ProgressProps) => {
  const clampedValue = Math.min(100, Math.max(0, value))

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const variants = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
  }

  return (
    <div className={clsx('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Progress</span>
          <span className="text-text font-medium">{clampedValue}%</span>
        </div>
      )}
      <div className={clsx('bg-elevated w-full overflow-hidden rounded-full', sizes[size])}>
        <div
          className={clsx('h-full transition-all duration-300 ease-out', variants[variant])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
