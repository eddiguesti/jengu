import { Router } from 'express'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import { enqueueEnrichment, getJobStatus, enrichmentQueue } from '../lib/queue/queues.js'
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
      const jobId = await enqueueEnrichment({
        propertyId: data_id,
        userId: userId!,
        location: {
          latitude: 0, // TODO: Get from property data
          longitude: 0,
        },
      })

      console.log(`✅ Enrichment job enqueued: ${jobId}`)

      res.json({
        success: true,
        job_id: jobId,
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
 * GET /api/enrichment/status/:jobIdOrPropertyId
 *
 * Accepts either:
 * - Full job ID: enrich-{propertyId}-{timestamp}
 * - Property ID: {uuid} (will find latest job for this property)
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
  '/status/:jobIdOrPropertyId',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { jobIdOrPropertyId } = req.params
    const userId = req.userId

    if (!jobIdOrPropertyId) {
      return sendError(res, 'VALIDATION', 'Missing jobId or propertyId parameter')
    }

    console.log(`📊 Checking enrichment status for: ${jobIdOrPropertyId}`)

    try {
      let jobStatus = await getJobStatus('enrichment', jobIdOrPropertyId)

      // If not found and looks like a property ID (UUID without prefix), find latest job
      if (jobStatus.status === 'not_found' && !jobIdOrPropertyId.startsWith('enrich-')) {
        console.log(`🔍 Not a job ID, searching for latest job for property: ${jobIdOrPropertyId}`)

        // Verify property belongs to user
        const { data: property, error: propertyError } = await supabaseAdmin
          .from('properties')
          .select('id')
          .eq('id', jobIdOrPropertyId)
          .eq('userId', userId)
          .single()

        if (propertyError || !property) {
          return sendError(res, 'NOT_FOUND', 'Property not found or access denied')
        }

        // Find latest enrichment job for this property
        const jobs = await enrichmentQueue.getJobs(['active', 'waiting', 'completed', 'failed', 'delayed'])
        const propertyJobs = jobs
          .filter(j => j.data && j.data.propertyId === jobIdOrPropertyId)
          .sort((a, b) => b.timestamp - a.timestamp)

        if (propertyJobs.length > 0) {
          const latestJob = propertyJobs[0]
          console.log(`✅ Found latest job: ${latestJob.id}`)
          jobStatus = await getJobStatus('enrichment', latestJob.id!)
        } else {
          // No jobs found - check if property is already enriched
          const { data: pricingData } = await supabaseAdmin
            .from('pricing_data')
            .select('temperature, is_holiday, day_of_week')
            .eq('propertyId', jobIdOrPropertyId)
            .not('temperature', 'is', null)
            .limit(1)
            .single()

          if (pricingData) {
            // Data is already enriched
            return res.json({
              status: 'complete',
              progress: 100,
              message: 'Data already enriched',
              completed_features: ['temporal', 'weather', 'holidays'],
            })
          }

          console.log(`⚠️  No enrichment jobs found for property: ${jobIdOrPropertyId}`)
          return sendError(res, 'NOT_FOUND', 'No enrichment jobs found for this property')
        }
      } else if (jobStatus.status === 'not_found') {
        console.log(`⚠️  Job not found: ${jobIdOrPropertyId}`)
        return sendError(res, 'NOT_FOUND', 'Enrichment job not found')
      }

      // Map BullMQ state to our status format
      let status: 'pending' | 'running' | 'complete' | 'error'
      if (jobStatus.status === 'completed') {
        status = 'complete'
      } else if (jobStatus.status === 'failed') {
        status = 'error'
      } else if (jobStatus.status === 'active') {
        status = 'running'
      } else {
        status = 'pending'
      }

      // Extract progress info
      const progress = jobStatus.progress as any
      const progressPercent = typeof progress === 'number' ? progress : 0
      const currentFeature = progress?.currentFeature || jobStatus.data?.features?.[0] || undefined
      const completedFeatures = progress?.completedFeatures || []

      res.json({
        status,
        progress: progressPercent,
        current_feature: currentFeature,
        message:
          status === 'complete'
            ? 'Enrichment completed successfully'
            : status === 'error'
              ? `Enrichment failed: ${jobStatus.failedReason || 'Unknown error'}`
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
