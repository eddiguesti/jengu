import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, iconPosition = 'left', className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              // Base styles
              'w-full rounded-xl border bg-surface px-4 py-2.5',
              // Text
              'text-sm text-text placeholder:text-text-muted',
              // Border
              'border-border/50',
              // Focus state - Apple style
              'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10',
              // Hover
              'hover:border-border',
              // Transitions
              'transition-all duration-200',
              // Error state
              error && 'border-error focus:border-error focus:ring-error/10',
              // Icon padding
              icon && iconPosition === 'left' && 'pl-11',
              icon && iconPosition === 'right' && 'pr-11',
              // Disabled
              'disabled:cursor-not-allowed disabled:bg-surface-hover disabled:opacity-60',
              className
            )}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-text-tertiary">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea variant
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-text">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            // Base styles
            'w-full rounded-xl border bg-surface px-4 py-3',
            // Text
            'text-sm text-text placeholder:text-text-muted',
            // Border
            'border-border/50',
            // Focus state
            'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10',
            // Hover
            'hover:border-border',
            // Transitions
            'transition-all duration-200',
            // Error state
            error && 'border-error focus:border-error focus:ring-error/10',
            // Resize
            'resize-none',
            // Disabled
            'disabled:cursor-not-allowed disabled:bg-surface-hover disabled:opacity-60',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-text-tertiary">{helperText}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
