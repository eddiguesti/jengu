import { ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps {
  children: ReactNode
  variant?: 'default' | 'elevated'
  className?: string
  onClick?: () => void
}

export const Card = ({ children, variant = 'default', className, onClick }: CardProps) => {
  const variants = {
    default: 'bg-card border border-border',
    elevated: 'bg-elevated shadow-card hover:shadow-card-hover',
  }

  return (
    <div
      className={clsx(
        'rounded-xl p-6 transition-all duration-200',
        variants[variant],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

Card.Header = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx('mb-4', className)}>{children}</div>
)

Card.Body = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx(className)}>{children}</div>
)

Card.Footer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx('mt-6 pt-4 border-t border-border', className)}>{children}</div>
)
