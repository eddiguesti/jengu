import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, Toast as ToastType } from '@/stores/useToastStore'
import clsx from 'clsx'

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: {
    bg: 'bg-success/10 border-success/30',
    icon: 'text-success',
    title: 'text-success',
  },
  error: {
    bg: 'bg-error/10 border-error/30',
    icon: 'text-error',
    title: 'text-error',
  },
  warning: {
    bg: 'bg-warning/10 border-warning/30',
    icon: 'text-warning',
    title: 'text-warning',
  },
  info: {
    bg: 'bg-primary/10 border-primary/30',
    icon: 'text-primary',
    title: 'text-primary',
  },
}

interface ToastItemProps {
  toast: ToastType
  onRemove: (id: string) => void
}

const ToastItem = ({ toast, onRemove }: ToastItemProps) => {
  const Icon = icons[toast.type]
  const style = styles[toast.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={clsx(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-xl',
        style.bg
      )}
    >
      <Icon className={clsx('h-5 w-5 flex-shrink-0 mt-0.5', style.icon)} />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-semibold', style.title)}>{toast.title}</p>
        {toast.message && (
          <p className="text-muted mt-1 text-sm">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-muted hover:text-text flex-shrink-0 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="pointer-events-none fixed right-0 top-0 z-[100] flex flex-col items-end gap-3 p-4 sm:p-6">
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ToastContainer
