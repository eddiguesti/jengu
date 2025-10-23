import { useState } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/Button'
import clsx from 'clsx'

interface ColumnMappingModalProps {
  isOpen: boolean
  onClose: () => void
  detectedColumns: string[]
  missingFields: string[]
  autoMapping: Record<string, string | null>
  onSubmit: (mapping: Record<string, string | null>) => void
}

const FIELD_DEFINITIONS = {
  date: {
    label: 'Date',
    description: 'The date of the pricing data (required)',
    required: true,
  },
  price: {
    label: 'Price',
    description: 'The price/rate for the date (required)',
    required: true,
  },
  occupancy: {
    label: 'Occupancy',
    description: 'Occupancy rate (0-100% or 0-1)',
    required: false,
  },
  bookings: {
    label: 'Bookings',
    description: 'Number of bookings/reservations',
    required: false,
  },
  availability: {
    label: 'Availability',
    description: 'Total available rooms/units',
    required: false,
  },
  unit_type: {
    label: 'Unit Type',
    description: 'Type of unit (e.g., Deluxe, Standard)',
    required: false,
  },
  channel: {
    label: 'Channel',
    description: 'Booking channel (e.g., Direct, Booking.com)',
    required: false,
  },
}

export function ColumnMappingModal({
  isOpen,
  onClose,
  detectedColumns,
  missingFields,
  autoMapping,
  onSubmit,
}: ColumnMappingModalProps) {
  const [mapping, setMapping] = useState<Record<string, string | null>>(autoMapping)

  if (!isOpen) return null

  const handleSubmit = () => {
    // Validate required fields
    if (!mapping.date || !mapping.price) {
      alert('Please map both Date and Price columns (required)')
      return
    }

    onSubmit(mapping)
  }

  const handleMappingChange = (field: string, column: string | null) => {
    setMapping(prev => ({ ...prev, [field]: column }))
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl animate-slide-up flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-text">Map CSV Columns</h2>
            <p className="mt-1 text-sm text-muted">
              We couldn't automatically detect all columns. Please map them manually.
            </p>
          </div>
          <button onClick={onClose} className="text-muted transition-colors hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {Object.entries(FIELD_DEFINITIONS).map(([field, def]) => {
              const isMissing = missingFields.includes(field)
              const currentValue = mapping[field]

              return (
                <div
                  key={field}
                  className={clsx(
                    'rounded-lg border p-4 transition-all duration-200',
                    def.required && !currentValue
                      ? 'border-error/50 bg-error/5'
                      : 'border-border bg-elevated hover:bg-elevated/80'
                  )}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-text">
                        {def.label}
                        {def.required && <span className="ml-1 text-error">*</span>}
                      </label>
                      <p className="mt-0.5 text-xs text-muted">{def.description}</p>
                    </div>
                    {isMissing && def.required && (
                      <span className="flex items-center gap-1 rounded bg-error/10 px-2 py-1 text-xs font-medium text-error">
                        <AlertCircle className="h-3 w-3" />
                        Missing
                      </span>
                    )}
                  </div>

                  <select
                    value={currentValue || ''}
                    onChange={e => handleMappingChange(field, e.target.value || null)}
                    className={clsx(
                      'w-full rounded-lg border bg-background px-3 py-2 text-sm text-text',
                      'transition-all duration-200 focus:outline-none focus:ring-2',
                      def.required && !currentValue
                        ? 'border-error/50 focus:border-error focus:ring-error'
                        : 'border-border focus:border-primary focus:ring-primary'
                    )}
                  >
                    <option value="" className="bg-background text-muted">
                      -- Skip this field --
                    </option>
                    {detectedColumns.map(col => (
                      <option key={col} value={col} className="bg-background text-text">
                        {col}
                      </option>
                    ))}
                  </select>

                  {currentValue && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Mapped to: <span className="font-mono">{currentValue}</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Info Box */}
          <div className="mt-6 rounded-lg border border-border bg-elevated p-4">
            <h4 className="flex items-center gap-2 text-sm font-medium text-text">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Detected CSV Columns ({detectedColumns.length})
            </h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {detectedColumns.map(col => (
                <span
                  key={col}
                  className="inline-flex items-center rounded border border-border bg-card px-2.5 py-1 font-mono text-xs font-medium text-text"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-elevated px-6 py-4">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!mapping.date || !mapping.price}
          >
            Apply Mapping & Process
          </Button>
        </div>
      </div>
    </div>
  )
}
