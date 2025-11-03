import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
}

export const Modal = ({
  isOpen,
  onClose,
  title,
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
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                'border-border bg-card shadow-elevated w-full rounded-2xl border',
                sizes[size]
              )}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="border-border flex items-center justify-between border-b p-6">
                  {title && <h2 className="text-text text-xl font-semibold">{title}</h2>}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="hover:bg-elevated ml-auto rounded-lg p-2 transition-colors"
                    >
                      <X className="text-muted h-5 w-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-6">{children}</div>
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
      'border-border mt-6 flex items-center justify-end gap-3 border-t pt-4',
      className
    )}
  >
    {children}
  </div>
)
