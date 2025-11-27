import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'warning' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      // Base layout
      'inline-flex items-center justify-center gap-2',
      // Typography
      'font-semibold tracking-tight',
      // Shape
      'rounded-xl',
      // Transitions - Apple-style smooth
      'transition-all duration-300',
      'transform-gpu',
      // Focus state
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      // Disabled state
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
      // Active press effect
      'active:scale-[0.97]'
    )

    const variants = {
      primary: clsx(
        'bg-primary text-white',
        'hover:bg-primary-hover hover:shadow-lg',
        'shadow-md shadow-primary/20',
        // Subtle gradient overlay for depth
        'bg-gradient-to-b from-white/10 to-transparent'
      ),
      secondary: clsx(
        'bg-surface text-text',
        'border border-border',
        'hover:bg-surface-hover hover:border-border-hover hover:shadow-md',
        'shadow-sm'
      ),
      ghost: clsx(
        'text-text',
        'hover:bg-surface-hover',
        'bg-transparent'
      ),
      danger: clsx(
        'bg-error text-white',
        'hover:bg-error/90 hover:shadow-lg',
        'shadow-md shadow-error/20',
        'bg-gradient-to-b from-white/10 to-transparent'
      ),
      outline: clsx(
        'border-2 border-primary text-primary',
        'hover:bg-primary hover:text-white',
        'bg-transparent'
      ),
      warning: clsx(
        'bg-warning text-white',
        'hover:bg-warning/90 hover:shadow-lg',
        'shadow-md shadow-warning/20',
        'bg-gradient-to-b from-white/10 to-transparent'
      ),
      success: clsx(
        'bg-success text-white',
        'hover:bg-success/90 hover:shadow-lg',
        'shadow-md shadow-success/20',
        'bg-gradient-to-b from-white/10 to-transparent'
      ),
    }

    const sizes = {
      xs: 'px-2.5 py-1 text-xs h-7',
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-4 py-2 text-sm h-10',
      lg: 'px-5 py-2.5 text-base h-11',
      xl: 'px-6 py-3 text-base h-12',
    }

    const iconSizes = {
      xs: 'h-3 w-3',
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
      xl: 'h-5 w-5',
    }

    const renderIcon = (iconElement: ReactNode) => {
      if (!iconElement) return null
      return (
        <span className={clsx(iconSizes[size], 'flex-shrink-0')}>
          {iconElement}
        </span>
      )
    }

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className={clsx(iconSizes[size], 'animate-spin')} />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && renderIcon(icon)}
            {children}
            {icon && iconPosition === 'right' && renderIcon(icon)}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
