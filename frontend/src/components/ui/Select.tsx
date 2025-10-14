import { forwardRef, SelectHTMLAttributes } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, className, options, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={clsx(
              'w-full px-4 py-2.5 pr-10 bg-elevated border rounded-lg',
              'text-text placeholder-muted',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
              'transition-all duration-200',
              'appearance-none cursor-pointer',
              error
                ? 'border-error focus:ring-error/50 focus:border-error'
                : 'border-border hover:border-border/60',
              props.disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        {helperText && !error && <p className="text-sm text-muted">{helperText}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
