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
        {label && <label className="block text-sm font-medium text-text">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            className={clsx(
              'w-full rounded-lg border bg-elevated px-4 py-2.5 pr-10',
              'text-text placeholder-muted',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
              'transition-all duration-200',
              'cursor-pointer appearance-none',
              error
                ? 'border-error focus:border-error focus:ring-error/50'
                : 'border-border hover:border-border/60',
              props.disabled && 'cursor-not-allowed opacity-50',
              className
            )}
            {...props}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        {helperText && !error && <p className="text-sm text-muted">{helperText}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
