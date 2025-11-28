import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, X, Cloud, Sparkles } from 'lucide-react'
import { useUploadedFiles } from '@/hooks/queries/useFileData'
import clsx from 'clsx'

export const BackgroundJobsBanner = () => {
  const { data: files = [], refetch } = useUploadedFiles()
  const [dismissedJobs, setDismissedJobs] = useState<Set<string>>(new Set())
  const [completedJobs, setCompletedJobs] = useState<Set<string>>(new Set())

  // Find files that are currently enriching
  const enrichingFiles = files.filter(
    file =>
      (file.enrichment_status === 'pending' || file.enrichment_status === 'processing') &&
      !dismissedJobs.has(file.id)
  )

  // Find recently completed files (not dismissed)
  const recentlyCompletedFiles = files.filter(
    file =>
      file.enrichment_status === 'completed' &&
      completedJobs.has(file.id) &&
      !dismissedJobs.has(file.id)
  )

  // Poll for updates when there are pending jobs
  useEffect(() => {
    if (enrichingFiles.length === 0) return

    const interval = setInterval(() => {
      refetch()
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [enrichingFiles.length, refetch])

  // Track when jobs complete
  useEffect(() => {
    files.forEach(file => {
      if (file.enrichment_status === 'completed' && !completedJobs.has(file.id)) {
        // Check if this was previously enriching
        setCompletedJobs(prev => new Set([...prev, file.id]))

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          setDismissedJobs(prev => new Set([...prev, file.id]))
        }, 10000)
      }
    })
  }, [files, completedJobs])

  const dismissJob = (fileId: string) => {
    setDismissedJobs(prev => new Set([...prev, fileId]))
  }

  const hasActiveJobs = enrichingFiles.length > 0 || recentlyCompletedFiles.length > 0

  if (!hasActiveJobs) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed left-0 right-0 top-0 z-50 mx-auto max-w-2xl px-4 pt-4"
      >
        <div className="space-y-2">
          {/* Enriching files */}
          {enrichingFiles.map(file => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={clsx(
                'flex items-center gap-3 rounded-xl border px-4 py-3',
                'border-primary/30 bg-primary/10',
                'shadow-lg backdrop-blur-xl'
              )}
            >
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <Cloud className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">
                  Enriching your data in the background
                </p>
                <p className="truncate text-xs text-muted">
                  {file.name || file.originalName} • Adding weather & holiday data
                </p>
              </div>
              <p className="whitespace-nowrap text-xs text-muted">
                Keep working, we'll notify you when done!
              </p>
              <button
                onClick={() => dismissJob(file.id)}
                className="p-1 text-muted transition-colors hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}

          {/* Completed files */}
          {recentlyCompletedFiles.map(file => (
            <motion.div
              key={`complete-${file.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={clsx(
                'flex items-center gap-3 rounded-xl border px-4 py-3',
                'border-success/30 bg-success/10',
                'shadow-lg backdrop-blur-xl'
              )}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <Sparkles className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-success">Enrichment complete!</p>
                <p className="truncate text-xs text-muted">
                  {file.name || file.originalName} • Weather & holiday data added
                </p>
              </div>
              <button
                onClick={() => dismissJob(file.id)}
                className="p-1 text-muted transition-colors hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default BackgroundJobsBanner
