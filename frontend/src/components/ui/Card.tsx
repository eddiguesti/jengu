import { ReactNode, forwardRef, HTMLAttributes, memo } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'glass' | 'outline' | 'gradient'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

// Card component with compound components
interface CardComponent
  extends React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>> {
  Header: typeof CardHeader
  Body: typeof CardBody
  Footer: typeof CardFooter
}

const CardBase = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', hover = false, padding = 'md', className, onClick, ...props }, ref) => {
    const baseStyles = clsx(
      // Base shape
      'rounded-2xl',
      // Transitions - Apple-style smooth
      'transition-all duration-300',
      'transform-gpu'
    )

    const variants = {
      default: clsx(
        'bg-surface',
        'border border-border/50',
        'shadow-sm'
      ),
      elevated: clsx(
        'bg-surface',
        'shadow-card',
        'border border-transparent'
      ),
      glass: clsx(
        'bg-surface/80',
        'backdrop-blur-xl backdrop-saturate-150',
        'border border-white/20',
        'shadow-lg'
      ),
      outline: clsx(
        'bg-transparent',
        'border-2 border-border',
        'hover:border-primary/50'
      ),
      gradient: clsx(
        'bg-gradient-to-br from-surface via-surface to-primary/5',
        'border border-border/30',
        'shadow-sm'
      ),
    }

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    const hoverStyles = hover
      ? clsx(
          'hover:shadow-card-hover',
          'hover:-translate-y-1',
          'hover:border-border',
          'cursor-pointer',
          'active:scale-[0.99]'
        )
      : ''

    return (
      <div
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          paddings[padding],
          hoverStyles,
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardBase.displayName = 'Card'

// Card.Header sub-component
const CardHeader = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string; border?: boolean } & HTMLAttributes<HTMLDivElement>
>(({ children, className, border = false, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      'mb-4',
      border && 'border-b border-border/50 pb-4',
      className
    )}
    {...props}
  >
    {children}
  </div>
))
CardHeader.displayName = 'Card.Header'

// Card.Body sub-component
const CardBody = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={clsx(className)} {...props}>
    {children}
  </div>
))
CardBody.displayName = 'Card.Body'

// Card.Footer sub-component
const CardFooter = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string; border?: boolean } & HTMLAttributes<HTMLDivElement>
>(({ children, className, border = true, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      'mt-6 pt-4',
      border && 'border-t border-border/50',
      className
    )}
    {...props}
  >
    {children}
  </div>
))
CardFooter.displayName = 'Card.Footer'

// Create compound component
export const Card = CardBase as CardComponent
Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

// Stat Card variant for dashboards
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label?: string }
  className?: string
}

export const StatCard = memo(function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
  <Card variant="elevated" hover className={clsx('overflow-hidden', className)}>
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <p className="text-3xl font-bold tracking-tight text-text">{value}</p>
        {subtitle && <p className="text-xs text-text-tertiary">{subtitle}</p>}
        {trend && (
          <div
            className={clsx(
              'inline-flex items-center gap-1 text-xs font-medium',
              trend.value >= 0 ? 'text-success' : 'text-error'
            )}
          >
            <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
            {trend.label && <span className="text-text-muted">{trend.label}</span>}
          </div>
        )}
      </div>
      {icon && (
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          {icon}
        </div>
      )}
    </div>
  </Card>
  )
})
