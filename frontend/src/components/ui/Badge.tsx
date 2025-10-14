import { ReactNode } from 'react'
import clsx from 'clsx'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Badge = ({ children, variant = 'default', size = 'md', className }: BadgeProps) => {
  const variants = {
    default: 'bg-elevated text-text border border-border',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    error: 'bg-error/10 text-error border border-error/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    primary: 'bg-primary/10 text-primary border border-primary/20',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}
