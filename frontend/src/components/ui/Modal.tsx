import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{
                duration: 0.25,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className={clsx(
                // Base
                'relative w-full overflow-hidden',
                // Shape
                'rounded-2xl',
                // Background with glass effect
                'bg-surface/95 backdrop-blur-xl',
                // Border
                'border border-border/50',
                // Shadow
                'shadow-elevated',
                // Size
                sizes[size]
              )}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between border-b border-border/50 px-6 py-5">
                  <div className="flex-1 pr-4">
                    {title && (
                      <h2 className="text-lg font-semibold tracking-tight text-text">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="mt-1 text-sm text-text-secondary">{description}</p>
                    )}
                  </div>
                  {showCloseButton && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-text-tertiary transition-colors hover:bg-border/50 hover:text-text"
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} />
                    </motion.button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="px-6 py-5">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// Compound components for structured content
Modal.Body = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx('space-y-4', className)}>{children}</div>
)

Modal.Footer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={clsx(
      'mt-6 flex items-center justify-end gap-3 border-t border-border/50 pt-5',
      className
    )}
  >
    {children}
  </div>
)

// Alert Dialog variant
interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
}

export const AlertDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: AlertDialogProps) => {
  const variantStyles = {
    danger: 'bg-error text-white hover:bg-error/90',
    warning: 'bg-warning text-white hover:bg-warning/90',
    info: 'bg-primary text-white hover:bg-primary/90',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{description}</p>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition-all hover:bg-surface-hover"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={clsx(
            'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
            variantStyles[variant]
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
