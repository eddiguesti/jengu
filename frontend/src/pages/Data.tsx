import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Cloud,
  Calendar,
  Clock,
  Play,
  Sparkles,
  ArrowRight,
  Database,
  MapPin,
  Settings as SettingsIcon,
} from 'lucide-react'
import { Card, Button, Table, Badge, Progress } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import { useDataStore, useBusinessStore } from '../stores'
import {
  useUploadedFiles,
  useUploadFile,
  useEnrichFile,
  useDeleteFile,
} from '../hooks/queries/useFileData'
import { ColumnMappingModal } from '../components/data/ColumnMappingModal'
import { EnrichmentProgress } from '../components/features/EnrichmentProgress'
import apiClient from '../lib/api/client'
import clsx from 'clsx'

interface UploadedFile {
  name: string
  size: number
  type: string
  status: 'pending' | 'processing' | 'success' | 'error'
  rows?: number
  columns?: number
  preview?: any[]
  uniqueId?: string
}

interface EnrichmentFeature {
  id: string
  name: string
  description: string
  icon: React.ElementType
  status: 'idle' | 'running' | 'complete' | 'error'
  progress: number
  fields: string[]
}

type Step = 'upload' | 'enrichment'

export const Data = () => {
  const navigate = useNavigate()
  const { uploadedFiles: zustandFiles, addFile, removeFile: removeFromZustand } = useDataStore()
  const { profile } = useBusinessStore()
  const [currentStep, setCurrentStep] = useState<Step>('upload')

  // React Query hooks
  const { data: uploadedFiles = [] } = useUploadedFiles()
  const uploadFileMutation = useUploadFile()
  const enrichFileMutation = useEnrichFile()
  const deleteFileMutation = useDeleteFile()

  // Upload State
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Column Mapping State
  const [mappingModal, setMappingModal] = useState<{
    isOpen: boolean
    propertyId?: string
    fileName?: string
    detectedColumns?: string[]
    autoMapping?: Record<string, string | null>
    missingFields?: string[]
  }>({
    isOpen: false,
  })

  // Enrichment State - MUST be declared before useEffect that uses setFeatures
  const [features, setFeatures] = useState<EnrichmentFeature[]>([
    {
      id: 'weather',
      name: 'Weather Data',
      description: 'Temperature, precipitation, sunshine hours',
      icon: Cloud,
      status: 'idle',
      progress: 0,
      fields: ['temperature', 'precipitation', 'sunshine_hours', 'weather_condition'],
    },
    {
      id: 'holidays',
      name: 'Holidays & Events',
      description: 'Public holidays, school breaks, local events',
      icon: Calendar,
      status: 'idle',
      progress: 0,
      fields: ['is_holiday', 'holiday_name', 'is_school_break'],
    },
    {
      id: 'temporal',
      name: 'Temporal Features',
      description: 'Day of week, season, weekend indicators',
      icon: Clock,
      status: 'idle',
      progress: 0,
      fields: ['day_of_week', 'month', 'season', 'is_weekend'],
    },
  ])
  const [isEnriching, setIsEnriching] = useState(false)

  // Load persisted files on mount AND check enrichment status
  useEffect(() => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      const restoredFiles: UploadedFile[] = uploadedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: 'text/csv',
        status: 'success',
        rows: file.rows,
        columns: file.columns,
        preview: file.preview || [],
        uniqueId: file.id, // Use the stored ID as uniqueId
      }))
      setFiles(restoredFiles)
      console.log('✅ Restored', uploadedFiles.length, 'files from database')

      // FIXED: Only mark enrichment as complete if files exist AND all are enriched
      // This prevents showing stale "enriched" status after file deletion/reupload
      const enrichmentStatuses = uploadedFiles.map(file => file.enrichment_status)
      const allEnriched =
        uploadedFiles.length > 0 && enrichmentStatuses.every(status => status === 'completed')

      if (allEnriched) {
        console.log(
          '✅ All files already enriched - marking features as complete',
          uploadedFiles.map(f => f.id)
        )
        setFeatures(prev => {
          const allComplete = prev.every(f => f.status === 'complete' && f.progress === 100)
          if (allComplete) return prev
          return prev.map(f => ({ ...f, status: 'complete', progress: 100 }))
        })
      } else if (uploadedFiles.length > 0) {
        // Reset enrichment features for new/unenriched files
        console.log(
          'ℹ️  Files not enriched - resetting enrichment features',
          uploadedFiles.map(f => ({ id: f.id, enrichment_status: f.enrichment_status }))
        )
        setFeatures(prev => {
          const allIdle = prev.every(f => f.status === 'idle' && f.progress === 0)
          if (allIdle) return prev
          return prev.map(f => ({ ...f, status: 'idle', progress: 0 }))
        })
      }
    } else {
      // No files loaded - reset enrichment features (only if not already idle)
      setFeatures(prev => {
        const allIdle = prev.every(f => f.status === 'idle' && f.progress === 0)
        if (allIdle) return prev
        console.log('ℹ️  No files loaded - resetting enrichment features')
        return prev.map(f => ({ ...f, status: 'idle', progress: 0 }))
      })
    }
  }, [uploadedFiles])

  // === UPLOAD HANDLERS ===
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }

  const processFiles = async (fileList: File[]) => {
    const timestamp = Date.now()
    const newFiles: UploadedFile[] = fileList.map((file, index) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      uniqueId: `${file.name}-${file.size}-${timestamp}-${index}`,
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Upload each file using React Query mutation
    for (let index = 0; index < fileList.length; index++) {
      const file = fileList[index]
      const uniqueId = `${file.name}-${file.size}-${timestamp}-${index}`

      try {
        // Mark as processing
        setFiles(prev =>
          prev.map(f => (f.uniqueId === uniqueId ? { ...f, status: 'processing' } : f))
        )

        console.log(`📤 Uploading ${file.name} to backend...`)

        // Upload using React Query mutation
        const response = await uploadFileMutation.mutateAsync(file)

        // Check if manual column mapping is required
        if (response.requiresMapping) {
          console.log(`🔧 Manual column mapping required for ${file.name}`)

          // Mark file as needing mapping
          setFiles(prev =>
            prev.map(f =>
              f.uniqueId === uniqueId
                ? {
                    ...f,
                    status: 'processing',
                  }
                : f
            )
          )

          // Show mapping modal
          setMappingModal({
            isOpen: true,
            propertyId: response.propertyId,
            fileName: response.fileName,
            detectedColumns: response.detectedColumns,
            autoMapping: response.autoMapping,
            missingFields: response.missingFields,
          })

          return // Stop processing this file until mapping is done
        }

        // Normal upload success
        const uploadedFile = response.file

        console.log(
          `✅ Uploaded ${file.name}: ${uploadedFile.rows} rows, ${uploadedFile.columns} columns`
        )

        // Update local state
        setFiles(prev =>
          prev.map(f =>
            f.uniqueId === uniqueId
              ? {
                  ...f,
                  status: 'success',
                  rows: uploadedFile.rows,
                  columns: uploadedFile.columns,
                  preview: uploadedFile.preview,
                }
              : f
          )
        )

        // Add to Zustand store for backwards compatibility (only metadata)
        addFile({
          id: uploadedFile.id,
          name: uploadedFile.name,
          size: uploadedFile.size,
          rows: uploadedFile.rows,
          columns: uploadedFile.columns,
          uploaded_at: uploadedFile.uploaded_at,
          status: 'complete',
          preview: uploadedFile.preview,
        })
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error)
        setFiles(prev => prev.map(f => (f.uniqueId === uniqueId ? { ...f, status: 'error' } : f)))
      }

      // Small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  const removeFile = async (uniqueId: string) => {
    try {
      console.log(`🗑️ Deleting file ${uniqueId}...`)
      await deleteFileMutation.mutateAsync(uniqueId)
      setFiles(prev => prev.filter(f => f.uniqueId !== uniqueId))
      // CRITICAL: Also remove from Zustand store to clear persisted cache
      removeFromZustand(uniqueId)
      // Reset enrichment features when deleting files
      setFeatures(prev => prev.map(f => ({ ...f, status: 'idle', progress: 0 })))
      console.log(`✅ File ${uniqueId} deleted from database and cache`)
    } catch (error: any) {
      // If 404, file already deleted - just remove from UI
      if (error?.response?.status === 404) {
        console.log(`⚠️ File ${uniqueId} not found in database, removing from UI only`)
        setFiles(prev => prev.filter(f => f.uniqueId !== uniqueId))
        removeFromZustand(uniqueId)
        setFeatures(prev => prev.map(f => ({ ...f, status: 'idle', progress: 0 })))
      } else {
        console.error(`❌ Failed to delete file:`, error)
      }
    }
  }

  const handleManualMapping = async (columnMapping: Record<string, string | null>) => {
    const { propertyId, fileName } = mappingModal

    if (!propertyId) return

    try {
      console.log(`🔧 Submitting manual column mapping for ${fileName}...`)

      // Call the backend endpoint with the manual mapping using axios client
      const response = await apiClient.post(`/files/${propertyId}/map-columns`, {
        columnMapping,
      })

      const data = response.data
      const uploadedFile = data.file

      console.log(`✅ Manual mapping successful: ${uploadedFile.rows} rows processed`)

      // Update the file in the UI
      setFiles(prev =>
        prev.map(f =>
          f.name === fileName
            ? {
                ...f,
                status: 'success',
                rows: uploadedFile.rows,
                preview: uploadedFile.preview,
                uniqueId: uploadedFile.id,
              }
            : f
        )
      )

      // Add to Zustand store
      addFile({
        id: uploadedFile.id,
        name: fileName || '',
        size: 0,
        rows: uploadedFile.rows,
        columns: 0,
        uploaded_at: new Date().toISOString(),
        status: 'complete',
        preview: uploadedFile.preview,
      })

      // Close modal
      setMappingModal({ isOpen: false })
    } catch (error: any) {
      console.error(`❌ Manual mapping failed:`, error)
      alert(`Failed to process manual mapping: ${error.message}`)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-error" />
      case 'processing':
        return (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )
      default:
        return <FileText className="h-5 w-5 text-muted" />
    }
  }

  // === ENRICHMENT HANDLERS ===
  const startEnrichment = async (featureId?: string) => {
    setIsEnriching(true)

    const featuresToRun = featureId ? features.filter(f => f.id === featureId) : features

    for (let index = 0; index < featuresToRun.length; index++) {
      const feature = featuresToRun[index]

      // Set to running
      setFeatures(prev =>
        prev.map(f => (f.id === feature.id ? { ...f, status: 'running', progress: 0 } : f))
      )

      try {
        if (feature.id === 'weather') {
          // REAL WEATHER ENRICHMENT
          await enrichWithRealWeather(feature.id)
        } else if (feature.id === 'holidays') {
          // REAL HOLIDAY ENRICHMENT
          await enrichWithRealHolidays(feature.id)
        } else {
          // Simulated enrichment for other features
          await enrichFeatureSimulated(feature.id)
        }

        // Mark as complete
        setFeatures(prev =>
          prev.map(f => (f.id === feature.id ? { ...f, status: 'complete', progress: 100 } : f))
        )
      } catch (error) {
        console.error(`Error enriching ${feature.id}:`, error)
        setFeatures(prev =>
          prev.map(f => (f.id === feature.id ? { ...f, status: 'error', progress: 0 } : f))
        )
      }
    }

    setIsEnriching(false)
  }

  // Enrich with REAL weather data via backend API using React Query
  const enrichWithRealWeather = async (featureId: string) => {
    // Check if we have business location
    if (!profile?.location) {
      throw new Error('Business location not set. Please configure in Settings.')
    }

    const { latitude, longitude, country } = profile.location

    // Get the uploaded file ID from React Query or fallback to Zustand
    if (uploadedFiles.length === 0 && zustandFiles.length === 0) {
      throw new Error('No uploaded files found')
    }

    const fileId = uploadedFiles[0]?.id || zustandFiles[0]?.id
    const rowCount = uploadedFiles[0]?.rows || zustandFiles[0]?.rows || 1000

    // Estimate duration: ~30ms per row for enrichment processing
    const estimatedDurationMs = Math.max(60000, rowCount * 30) // At least 1 minute
    const estimatedMinutes = Math.ceil(estimatedDurationMs / 60000)

    console.log(
      `⏱️ Estimated enrichment time: ${estimatedMinutes} minute(s) for ${rowCount.toLocaleString()} rows`
    )

    // Progress simulation - update every 0.5% based on estimated duration
    let progress = 0
    const progressInterval = setInterval(() => {
      progress += 0.5
      if (progress <= 95) {
        setFeatures(prev => prev.map(f => (f.id === featureId ? { ...f, progress } : f)))
      }
    }, estimatedDurationMs / 200)

    try {
      // Call backend enrichment endpoint using React Query mutation
      console.log(`📤 Requesting weather enrichment for file ${fileId}...`)
      const response = await enrichFileMutation.mutateAsync({
        fileId,
        latitude,
        longitude,
        country,
      })

      clearInterval(progressInterval)
      setFeatures(prev => prev.map(f => (f.id === featureId ? { ...f, progress: 100 } : f)))

      console.log(`✅ Weather enrichment complete:`, response.results)
      return response
    } catch (error) {
      clearInterval(progressInterval)
      console.error('Weather enrichment failed:', error)
      throw error
    }
  }

  // Enrich with REAL holiday data - handled by backend during weather enrichment
  const enrichWithRealHolidays = async (featureId: string) => {
    // Holiday enrichment is handled automatically by the backend during weather enrichment
    // Just simulate progress for UI feedback
    console.log('ℹ️ Holiday enrichment is handled automatically by the backend')

    // Show progress simulation
    let progress = 0
    const progressInterval = setInterval(() => {
      progress += 10
      if (progress <= 100) {
        setFeatures(prev => prev.map(f => (f.id === featureId ? { ...f, progress } : f)))
      }
    }, 100)

    // Simulate 1 second processing
    await new Promise(resolve => setTimeout(resolve, 1000))

    clearInterval(progressInterval)
    setFeatures(prev => prev.map(f => (f.id === featureId ? { ...f, progress: 100 } : f)))

    console.log('✅ Holiday enrichment marked as complete (handled by backend)')
  }

  // Simulated enrichment for other features
  const enrichFeatureSimulated = async (featureId: string) => {
    return new Promise<void>(resolve => {
      const duration = 2000
      const interval = 200
      const steps = duration / interval

      let currentStep = 0
      const timer = setInterval(() => {
        currentStep++
        const progress = Math.round((currentStep / steps) * 100)

        setFeatures(prev =>
          prev.map(f => (f.id === featureId ? { ...f, progress: Math.min(100, progress) } : f))
        )

        if (currentStep >= steps) {
          clearInterval(timer)
          resolve()
        }
      }, interval)
    })
  }

  const getStatusBadge = (status: EnrichmentFeature['status']) => {
    switch (status) {
      case 'complete':
        return <Badge variant="success">Complete</Badge>
      case 'running':
        return <Badge variant="primary">Running</Badge>
      case 'error':
        return <Badge variant="error">Error</Badge>
      default:
        return <Badge variant="default">Ready</Badge>
    }
  }

  // === COMPUTED VALUES ===
  const hasSuccessfulUpload = files.some(f => f.status === 'success')
  const allEnrichmentComplete = features.every(f => f.status === 'complete')
  const anyEnrichmentRunning = features.some(f => f.status === 'running')
  const completedEnrichmentCount = features.filter(f => f.status === 'complete').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header with Step Indicator */}
      <div>
        <h1 className="text-4xl font-bold text-text">Data Management</h1>
        <p className="mt-2 text-muted">Upload and enrich your historical booking data</p>

        {/* Step Indicator */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={() => setCurrentStep('upload')}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 transition-all',
              currentStep === 'upload'
                ? 'border-2 border-primary bg-primary/10 text-primary'
                : 'bg-elevated text-muted hover:bg-card'
            )}
          >
            <Database className="h-4 w-4" />
            <span className="font-medium">1. Upload</span>
            {hasSuccessfulUpload && <CheckCircle2 className="h-4 w-4 text-success" />}
          </button>

          <ArrowRight className="h-5 w-5 text-muted" />

          <button
            onClick={() => hasSuccessfulUpload && setCurrentStep('enrichment')}
            disabled={!hasSuccessfulUpload}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 transition-all',
              currentStep === 'enrichment'
                ? 'border-2 border-primary bg-primary/10 text-primary'
                : hasSuccessfulUpload
                  ? 'bg-elevated text-muted hover:bg-card'
                  : 'cursor-not-allowed bg-elevated text-muted/50'
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">2. Enrich</span>
            {allEnrichmentComplete && <CheckCircle2 className="h-4 w-4 text-success" />}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* === UPLOAD STEP === */}
        {currentStep === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Upload Zone */}
            <Card variant="elevated">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={clsx(
                  'cursor-pointer rounded-xl border-2 border-dashed p-12 transition-all duration-200',
                  isDragging
                    ? 'scale-[1.02] border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-elevated/50'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="mb-1 text-lg font-semibold text-text">
                      Drop your files here, or click to browse
                    </h3>
                    <p className="text-sm text-muted">
                      Supported formats: CSV, Excel (.xlsx, .xls)
                    </p>
                  </div>
                  <Button variant="primary" size="lg">
                    Select Files
                  </Button>
                </div>
              </div>
            </Card>

            {/* Uploaded Files */}
            {files.length > 0 && (
              <Card variant="default">
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-text">Uploaded Files</h2>
                    <Badge variant="info">{files.length} file(s)</Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="space-y-3">
                    {files.map(file => (
                      <div
                        key={file.uniqueId || file.name}
                        className="flex items-center gap-4 rounded-lg border border-border bg-elevated p-4"
                      >
                        {getStatusIcon(file.status)}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">{file.name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {formatFileSize(file.size)}
                            {file.rows && ` • ${file.rows.toLocaleString()} rows`}
                            {file.columns && ` • ${file.columns} columns`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              file.status === 'success'
                                ? 'success'
                                : file.status === 'error'
                                  ? 'error'
                                  : 'default'
                            }
                          >
                            {file.status}
                          </Badge>
                          {/* Show enrichment status badge */}
                          {(() => {
                            const enrichmentStatus = uploadedFiles.find(
                              f => f.id === file.uniqueId
                            )?.enrichment_status
                            if (enrichmentStatus === 'completed') {
                              return (
                                <Badge variant="success" className="flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Enriched
                                </Badge>
                              )
                            } else if (enrichmentStatus === 'pending') {
                              return (
                                <Badge variant="primary" className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 animate-pulse" />
                                  Enriching...
                                </Badge>
                              )
                            } else if (enrichmentStatus === 'failed') {
                              return (
                                <Badge variant="error" className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Failed
                                </Badge>
                              )
                            }
                            return null
                          })()}
                        </div>
                        <button
                          onClick={() => removeFile(file.uniqueId || file.name)}
                          className="rounded-lg p-2 transition-colors hover:bg-card"
                        >
                          <X className="h-4 w-4 text-muted hover:text-text" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Data Preview */}
            {hasSuccessfulUpload && (
              <Card variant="default">
                <Card.Header>
                  <h2 className="text-xl font-semibold text-text">Data Preview</h2>
                  <p className="mt-1 text-sm text-muted">
                    First 5 rows
                    {(() => {
                      const firstFile = files.find(f => f.uniqueId)
                      const enrichmentStatus = uploadedFiles.find(
                        f => f.id === firstFile?.uniqueId
                      )?.enrichment_status
                      if (enrichmentStatus === 'completed') {
                        return (
                          <span className="ml-2 text-success">
                            • Enriched columns highlighted in green
                          </span>
                        )
                      }
                      return null
                    })()}
                  </p>
                </Card.Header>
                <Card.Body>
                  <div className="overflow-x-auto">
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          {files.find(f => f.preview)?.preview?.[0] &&
                            Object.keys(files.find(f => f.preview)!.preview![0]).map(column => {
                              // Enriched columns to highlight
                              const enrichedColumns = [
                                'temperature',
                                'precipitation',
                                'weathercondition',
                                'sunshinehours',
                                'isholiday',
                                'holidayname',
                                'dayofweek',
                                'month',
                                'season',
                                'isweekend',
                              ]
                              const isEnriched = enrichedColumns.includes(
                                column.toLowerCase().replace(/_/g, '')
                              )
                              const firstFile = files.find(f => f.uniqueId)
                              const enrichmentStatus = uploadedFiles.find(
                                f => f.id === firstFile?.uniqueId
                              )?.enrichment_status

                              return (
                                <Table.HeaderCell
                                  key={column}
                                  className={clsx(
                                    isEnriched && enrichmentStatus === 'completed'
                                      ? 'bg-green-50 text-green-900'
                                      : ''
                                  )}
                                >
                                  <div className="flex items-center gap-1">
                                    {column.charAt(0).toUpperCase() + column.slice(1)}
                                    {isEnriched && enrichmentStatus === 'completed' && (
                                      <Sparkles className="h-3 w-3 text-green-600" />
                                    )}
                                  </div>
                                </Table.HeaderCell>
                              )
                            })}
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {files
                          .find(f => f.preview)
                          ?.preview?.map((row, index) => (
                            <Table.Row key={index}>
                              {Object.entries(row).map(([key, value]) => {
                                let displayValue: string
                                if (value === null || value === undefined) {
                                  displayValue = '-'
                                } else if (typeof value === 'object') {
                                  displayValue = JSON.stringify(value)
                                } else {
                                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                                  displayValue = String(value)
                                }

                                // Check if column is enriched
                                const enrichedColumns = [
                                  'temperature',
                                  'precipitation',
                                  'weathercondition',
                                  'sunshinehours',
                                  'isholiday',
                                  'holidayname',
                                  'dayofweek',
                                  'month',
                                  'season',
                                  'isweekend',
                                ]
                                const isEnriched = enrichedColumns.includes(
                                  key.toLowerCase().replace(/_/g, '')
                                )
                                const firstFile = files.find(f => f.uniqueId)
                                const enrichmentStatus = uploadedFiles.find(
                                  f => f.id === firstFile?.uniqueId
                                )?.enrichment_status

                                return (
                                  <Table.Cell
                                    key={key}
                                    className={clsx(
                                      key === 'date' ? 'font-medium' : '',
                                      isEnriched && enrichmentStatus === 'completed'
                                        ? 'bg-green-50 text-green-900'
                                        : ''
                                    )}
                                  >
                                    {displayValue}
                                  </Table.Cell>
                                )
                              })}
                            </Table.Row>
                          ))}
                      </Table.Body>
                    </Table>
                  </div>
                </Card.Body>
                <Card.Footer>
                  <div className="flex w-full items-center justify-between">
                    <p className="text-sm text-success">
                      <CheckCircle2 className="mr-1 inline h-4 w-4" />
                      Data looks good!
                    </p>
                    <Button variant="primary" onClick={() => setCurrentStep('enrichment')}>
                      Continue to Enrichment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            )}

            {/* Help Section */}
            <Card variant="default">
              <Card.Header>
                <h3 className="text-lg font-semibold text-text">Data Requirements</h3>
              </Card.Header>
              <Card.Body>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-text">Required Columns</h4>
                    <ul className="space-y-2 text-sm text-muted">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                        <span>Date column (booking_date, check_in, etc.)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                        <span>Price column (price, rate, amount, etc.)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                        <span>Demand indicator (bookings, occupancy, etc.)</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-text">Best Practices</h4>
                    <ul className="space-y-2 text-sm text-muted">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Include at least 6-12 months of data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Use consistent date formats</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Remove sensitive customer information</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </motion.div>
        )}

        {/* === ENRICHMENT STEP === */}
        {currentStep === 'enrichment' && (
          <motion.div
            key="enrichment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Location Warning */}
            {!profile?.location && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card variant="elevated" className="border-warning/20 bg-warning/5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 rounded-lg bg-warning/10 p-3">
                      <MapPin className="h-6 w-6 text-warning" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 text-lg font-semibold text-text">
                        Business Location Required
                      </h3>
                      <p className="mb-3 text-sm text-muted">
                        Weather and Holiday enrichment require your business location to be
                        configured. Please set your city, country, latitude, and longitude in
                        Settings to enable these features.
                      </p>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <span className="text-xs text-muted">
                          Without location data, Weather Data and Holidays & Events enrichment will
                          fail
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => navigate('/settings')}
                      className="flex-shrink-0"
                    >
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Go to Settings
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Progress Summary */}
            <Card variant="elevated">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-text">Enrichment Progress</h2>
                  <p className="mt-1 text-sm text-muted">
                    {completedEnrichmentCount} of {features.length} features completed
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => startEnrichment()}
                  disabled={isEnriching || allEnrichmentComplete}
                  loading={isEnriching}
                >
                  {allEnrichmentComplete ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      All Complete
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Enrich All
                    </>
                  )}
                </Button>
              </div>
              <Progress
                value={(completedEnrichmentCount / features.length) * 100}
                size="lg"
                variant={allEnrichmentComplete ? 'success' : 'primary'}
              />
            </Card>

            {/* Real-time Enrichment Progress Tracking */}
            {uploadedFiles && uploadedFiles.length > 0 && uploadedFiles[0]?.id && (
              <EnrichmentProgress
                propertyId={uploadedFiles[0].id}
                onComplete={() => {
                  console.log('✅ Enrichment completed - refreshing data')
                  // Update features to completed state
                  setFeatures(prev => prev.map(f => ({ ...f, status: 'complete', progress: 100 })))
                }}
                onError={error => {
                  console.error('❌ Enrichment error:', error)
                  setFeatures(prev => prev.map(f => ({ ...f, status: 'error', progress: 0 })))
                }}
              />
            )}

            {/* Feature Cards */}
            <div className="grid grid-cols-1 gap-4">
              {features.map(feature => {
                const Icon = feature.icon
                return (
                  <Card
                    key={feature.id}
                    variant="default"
                    className={clsx(
                      'transition-all duration-300',
                      feature.status === 'running' && 'ring-2 ring-primary/50',
                      feature.status === 'complete' && 'ring-2 ring-success/30'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={clsx(
                          'rounded-lg p-3',
                          feature.status === 'complete'
                            ? 'bg-success/10'
                            : feature.status === 'running'
                              ? 'bg-primary/10'
                              : 'bg-elevated'
                        )}
                      >
                        <Icon
                          className={clsx(
                            'h-6 w-6',
                            feature.status === 'complete'
                              ? 'text-success'
                              : feature.status === 'running'
                                ? 'text-primary'
                                : 'text-muted'
                          )}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-text">{feature.name}</h3>
                          {getStatusBadge(feature.status)}
                        </div>
                        <p className="mb-3 text-sm text-muted">{feature.description}</p>

                        {/* Fields */}
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-2">
                            {feature.fields.map(field => (
                              <span
                                key={field}
                                className="rounded border border-border bg-elevated px-2 py-1 font-mono text-xs text-text"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Progress */}
                        {(feature.status === 'running' || feature.status === 'complete') && (
                          <Progress
                            value={feature.progress}
                            showLabel
                            variant={feature.status === 'complete' ? 'success' : 'primary'}
                          />
                        )}
                      </div>

                      {/* Action Button */}
                      <div>
                        {feature.status === 'complete' ? (
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => startEnrichment(feature.id)}
                            disabled={anyEnrichmentRunning}
                          >
                            Run
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Success State */}
            {allEnrichmentComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card variant="elevated" className="border-success/20 bg-success/5">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-success/10 p-3">
                      <Sparkles className="h-8 w-8 text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 text-lg font-semibold text-text">Enrichment Complete!</h3>
                      <p className="text-sm text-muted">
                        Your data is ready for pricing optimization and insights analysis
                      </p>
                    </div>
                    <Button variant="primary" size="lg" onClick={() => navigate('/pricing-engine')}>
                      Start Optimizing Prices
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={mappingModal.isOpen}
        onClose={() => setMappingModal({ isOpen: false })}
        detectedColumns={mappingModal.detectedColumns || []}
        missingFields={mappingModal.missingFields || []}
        autoMapping={mappingModal.autoMapping || {}}
        onSubmit={handleManualMapping}
      />
    </motion.div>
  )
}
