import { InputHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="text-text mb-1.5 block text-sm font-medium">{label}</label>}
        <input
          ref={ref}
          className={clsx(
            'border-border bg-elevated w-full rounded-lg border px-4 py-2',
            'text-text placeholder:text-muted',
            'focus:ring-primary focus:border-transparent focus:outline-none focus:ring-2',
            'transition-all duration-200',
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-error mt-1 text-sm">{error}</p>}
        {helperText && !error && <p className="text-muted mt-1 text-sm">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
