import { Router } from 'express'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import { enqueueEnrichment } from '../lib/queue/queues.js'
import { z } from 'zod'

const router = Router()

/**
 * Start enrichment for a file
 * POST /api/enrichment/start
 *
 * Request body:
 * {
 *   data_id: string (property file ID)
 *   features: Array<'weather' | 'holidays' | 'temporal'>
 * }
 *
 * Response:
 * {
 *   success: true,
 *   job_id: string,
 *   message: string
 * }
 */
router.post(
  '/start',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { data_id, features } = req.body
    const userId = req.userId

    // Validate request
    if (!data_id || typeof data_id !== 'string') {
      return sendError(res, 'VALIDATION', 'Missing or invalid data_id')
    }

    if (!Array.isArray(features) || features.length === 0) {
      return sendError(res, 'VALIDATION', 'features must be a non-empty array')
    }

    const validFeatures = ['weather', 'holidays', 'temporal']
    const invalidFeatures = features.filter(f => !validFeatures.includes(f))
    if (invalidFeatures.length > 0) {
      return sendError(
        res,
        'VALIDATION',
        `Invalid features: ${invalidFeatures.join(', ')}. Valid options: ${validFeatures.join(', ')}`
      )
    }

    console.log(`🚀 Starting enrichment for file ${data_id} with features:`, features)

    try {
      // Verify file exists and belongs to user
      const { data: file, error: fileError } = await supabaseAdmin
        .from('properties')
        .select('id, name, userId, status, actualRows, rows')
        .eq('id', data_id)
        .eq('userId', userId)
        .single()

      if (fileError || !file) {
        console.error('❌ File not found:', fileError)
        return sendError(res, 'NOT_FOUND', 'File not found or access denied')
      }

      // Check if file has data
      const rowCount = file.actualRows || file.rows || 0
      if (rowCount === 0) {
        return sendError(res, 'VALIDATION', 'Cannot enrich file with no data')
      }

      // Enqueue enrichment job
      const job = await enqueueEnrichment({
        propertyId: data_id,
        userId: userId!,
        features: features,
      })

      console.log(`✅ Enrichment job enqueued: ${job.id}`)

      res.json({
        success: true,
        job_id: job.id,
        message: `Enrichment started for ${rowCount.toLocaleString()} records`,
      })
    } catch (error: any) {
      console.error('❌ Error starting enrichment:', error)
      return sendError(res, 'DATABASE_ERROR', error.message || 'Failed to start enrichment')
    }
  })
)

/**
 * Get enrichment job status
 * GET /api/enrichment/status/:jobId
 *
 * Response:
 * {
 *   status: 'pending' | 'running' | 'complete' | 'error',
 *   progress: number (0-100),
 *   current_feature?: string,
 *   message: string,
 *   completed_features: string[]
 * }
 */
router.get(
  '/status/:jobId',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { jobId } = req.params

    if (!jobId) {
      return sendError(res, 'VALIDATION', 'Missing jobId parameter')
    }

    console.log(`📊 Checking enrichment status for job: ${jobId}`)

    try {
      // Import Queue dynamically to avoid circular dependencies
      const { Queue } = await import('bullmq')
      const { redis } = await import('../lib/queue/connection.js')

      const enrichmentQueue = new Queue('enrichment', { connection: redis })
      const job = await enrichmentQueue.getJob(jobId)

      if (!job) {
        console.log(`⚠️  Job not found: ${jobId}`)
        return sendError(res, 'NOT_FOUND', 'Enrichment job not found')
      }

      // Get job state
      const state = await job.getState()
      const progress = job.progress as any
      const data = job.data

      // Map BullMQ state to our status format
      let status: 'pending' | 'running' | 'complete' | 'error'
      if (state === 'completed') {
        status = 'complete'
      } else if (state === 'failed') {
        status = 'error'
      } else if (state === 'active') {
        status = 'running'
      } else {
        status = 'pending'
      }

      // Extract progress info
      const progressPercent = typeof progress === 'number' ? progress : 0
      const currentFeature = progress?.currentFeature || data?.features?.[0] || undefined
      const completedFeatures = progress?.completedFeatures || []

      res.json({
        status,
        progress: progressPercent,
        current_feature: currentFeature,
        message:
          status === 'complete'
            ? 'Enrichment completed successfully'
            : status === 'error'
              ? `Enrichment failed: ${job.failedReason || 'Unknown error'}`
              : status === 'running'
                ? `Processing ${currentFeature}...`
                : 'Enrichment queued',
        completed_features: completedFeatures,
      })
    } catch (error: any) {
      console.error('❌ Error getting enrichment status:', error)
      return sendError(res, 'INTERNAL_ERROR', error.message || 'Failed to get enrichment status')
    }
  })
)

/**
 * Cancel enrichment job
 * POST /api/enrichment/cancel/:jobId
 *
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
router.post(
  '/cancel/:jobId',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { jobId } = req.params

    if (!jobId) {
      return sendError(res, 'VALIDATION', 'Missing jobId parameter')
    }

    console.log(`🛑 Cancelling enrichment job: ${jobId}`)

    try {
      // Import Queue dynamically
      const { Queue } = await import('bullmq')
      const { redis } = await import('../lib/queue/connection.js')

      const enrichmentQueue = new Queue('enrichment', { connection: redis })
      const job = await enrichmentQueue.getJob(jobId)

      if (!job) {
        return sendError(res, 'NOT_FOUND', 'Enrichment job not found')
      }

      // Cancel the job
      await job.remove()

      console.log(`✅ Job cancelled: ${jobId}`)

      res.json({
        success: true,
        message: 'Enrichment job cancelled successfully',
      })
    } catch (error: any) {
      console.error('❌ Error cancelling enrichment:', error)
      return sendError(res, 'INTERNAL_ERROR', error.message || 'Failed to cancel enrichment')
    }
  })
)

export default router
