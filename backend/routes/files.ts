import { Router, Request, Response } from 'express'
import fs from 'fs'
import csv from 'csv-parser'
import { randomUUID } from 'crypto'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { asyncHandler, sendError, logError } from '../utils/errorHandler.js'
import { upload } from '../middleware/upload.js'
import { enrichPropertyData } from '../services/enrichmentService.js'
import { CSVRow, ParsedPricingData } from '../types/api.types.js'
import { validateCSVContent, validateFileSize } from '../utils/csvValidator.js'
import { uploadLimiter } from '../middleware/rateLimiters.js'
import {
  detectColumnMapping,
  mapCSVRow,
  validateBatch,
  generateMappingReport,
  StandardizedRow,
} from '../services/csvMapper.js'
import {
  registry,
  FileMetadataSchema,
  FileDataResponseSchema,
  FilesListResponseSchema,
  EnrichmentRequestSchema,
  EnrichmentResponseSchema,
  ErrorResponseSchema,
} from '../lib/openapi/index.js'
import { z } from 'zod'
import { enqueueEnrichment } from '../lib/queue/queues.js'

const router = Router()

// OpenAPI: Upload CSV file endpoint
registry.registerPath({
  method: 'post',
  path: '/api/files/upload',
  tags: ['Files'],
  summary: 'Upload CSV file',
  description:
    'Upload a CSV file with pricing data. Supports automatic column mapping, validation, and background enrichment.',
  security: [{ bearerAuth: [] }],
  requestBody: {
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              format: 'binary',
              description: 'CSV file containing pricing data',
            },
          },
          required: ['file'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'File uploaded successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            file: FileMetadataSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid file or content',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

// OpenAPI: Get file data endpoint
registry.registerPath({
  method: 'get',
  path: '/api/files/{fileId}/data',
  tags: ['Files'],
  summary: 'Get file pricing data',
  description: 'Retrieve pricing data for a specific file with pagination support',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      fileId: z.string().uuid().openapi({ description: 'File ID' }),
    }),
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .positive()
        .max(10000)
        .optional()
        .openapi({ description: 'Number of rows to return (max 10000)', example: 1000 }),
      offset: z.coerce
        .number()
        .int()
        .nonnegative()
        .optional()
        .openapi({ description: 'Offset for pagination', example: 0 }),
    }),
  },
  responses: {
    200: {
      description: 'File data retrieved successfully',
      content: {
        'application/json': {
          schema: FileDataResponseSchema,
        },
      },
    },
    404: {
      description: 'File not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

// OpenAPI: List files endpoint
registry.registerPath({
  method: 'get',
  path: '/api/files',
  tags: ['Files'],
  summary: 'List uploaded files',
  description: 'Get all files uploaded by the authenticated user, with row counts and preview data',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Files retrieved successfully',
      content: {
        'application/json': {
          schema: FilesListResponseSchema,
        },
      },
    },
  },
})

// OpenAPI: Delete file endpoint
registry.registerPath({
  method: 'delete',
  path: '/api/files/{fileId}',
  tags: ['Files'],
  summary: 'Delete file',
  description: 'Delete a file and all associated pricing data',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      fileId: z.string().uuid().openapi({ description: 'File ID to delete' }),
    }),
  },
  responses: {
    200: {
      description: 'File deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            deleted: z.object({
              pricingDataRows: z.number(),
            }),
          }),
        },
      },
    },
    404: {
      description: 'File not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

// OpenAPI: Enrich file endpoint
registry.registerPath({
  method: 'post',
  path: '/api/files/{fileId}/enrich',
  tags: ['Files'],
  summary: 'Enrich file with external data',
  description: 'Add weather, holiday, and temporal features to pricing data',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      fileId: z.string().uuid().openapi({ description: 'File ID to enrich' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: EnrichmentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Enrichment completed successfully',
      content: {
        'application/json': {
          schema: EnrichmentResponseSchema,
        },
      },
    },
    404: {
      description: 'File not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

// Helper to get error message from unknown error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Upload CSV file with streaming and batch inserts
 * POST /api/files/upload
 */
router.post(
  '/upload',
  uploadLimiter, // Apply upload rate limiter
  authenticateUser,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const userId = req.userId!
      const filePath = req.file.path

      // Step 1: Validate file size
      const sizeValidation = validateFileSize(req.file.size)
      if (!sizeValidation.valid) {
        fs.unlinkSync(filePath)
        return res.status(400).json({
          error: 'INVALID_FILE_SIZE',
          message: sizeValidation.error,
        })
      }

      console.log(
        `📥 Processing CSV file: ${req.file.originalname} (${req.file.size} bytes) for user: ${userId}`
      )

      // Step 2: Validate file content for malicious code
      console.log('🔍 Scanning file for malicious content...')
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const contentValidation = validateCSVContent(fileContent)

      if (!contentValidation.valid) {
        fs.unlinkSync(filePath)
        console.warn(`⚠️  Security: Malicious content detected in ${req.file.originalname}`)
        return res.status(400).json({
          error: 'INVALID_CONTENT',
          message: contentValidation.error,
        })
      }

      console.log('✅ Content security check passed')

      console.log('⏳ Creating property record...')
      const propertyId = randomUUID()
      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .insert({
          id: propertyId,
          name: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          rows: 0,
          columns: 0,
          status: 'processing',
          userId: userId,
        })
        .select()
        .single()

      if (propertyError) {
        console.error('Failed to create property:', propertyError)
        throw new Error(`Database error: ${propertyError.message}`)
      }

      console.log(`✅ Created property record: ${property.id}`)

      const BATCH_SIZE = 1000
      let totalRows = 0
      let columnCount = 0
      const preview: CSVRow[] = []
      const allRows: CSVRow[] = []
      let headers: string[] = []

      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('headers', headersArray => {
            headers = headersArray
            columnCount = headersArray.length
            console.log(`📊 CSV Columns (${columnCount}):`, headersArray)
          })
          .on('data', (row: CSVRow) => {
            totalRows++
            allRows.push(row)

            if (preview.length < 5) {
              preview.push(row)
            }
          })
          .on('end', () => resolve())
          .on('error', reject)
      })

      // Step 3: Intelligent Column Mapping
      console.log('🧠 Detecting column mapping...')
      const columnMapping = detectColumnMapping(headers)
      console.log('📊 Column Mapping:', columnMapping)

      // Map all rows to standardized format
      const standardizedRows: StandardizedRow[] = []
      const mappingWarnings: string[] = []

      for (const rawRow of allRows) {
        const { standardizedRow, warnings } = mapCSVRow(rawRow, columnMapping)
        standardizedRows.push(standardizedRow)

        // Collect unique warnings
        warnings.forEach(w => {
          if (!mappingWarnings.includes(w)) {
            mappingWarnings.push(w)
          }
        })
      }

      // Validate the batch
      const validationStats = validateBatch(standardizedRows)

      // Generate and log mapping report
      const mappingReport = generateMappingReport(
        headers,
        columnMapping,
        standardizedRows,
        validationStats
      )
      console.log('\n' + mappingReport + '\n')

      // Check if we have enough valid data
      if (validationStats.validRows === 0) {
        console.error('❌ No valid rows found in CSV')

        // Check if this is due to unmapped columns
        const missingRequiredFields: string[] = []
        console.log(
          `🔍 Checking column mapping: date=${columnMapping.date}, price=${columnMapping.price}`
        )

        if (!columnMapping.date) missingRequiredFields.push('date')
        if (!columnMapping.price) missingRequiredFields.push('price')

        console.log(`📋 Missing required fields: ${missingRequiredFields.join(', ') || 'none'}`)

        // Always offer manual mapping when validation fails completely
        // This handles: unmapped columns, incorrectly mapped columns, or bad data format
        console.log('🔧 All rows failed validation - requesting manual column mapping...')
        console.log(`📊 Detected columns: ${headers.join(', ')}`)
        console.log(
          `📊 Current auto-mapping: date=${columnMapping.date}, price=${columnMapping.price}`
        )

        // Keep the file and property for manual mapping
        return res.status(200).json({
          success: true,
          requiresMapping: true,
          propertyId: property.id,
          fileName: req.file.filename,
          detectedColumns: headers,
          autoMapping: columnMapping,
          missingFields:
            missingRequiredFields.length > 0 ? missingRequiredFields : ['date', 'price'],
          message: 'Unable to process CSV data. Please verify column mappings.',
        })
      }

      if (validationStats.validRows < totalRows * 0.5) {
        console.warn(
          `⚠️  Only ${validationStats.validRows}/${totalRows} rows are valid (${((validationStats.validRows / totalRows) * 100).toFixed(1)}%)`
        )
      }

      console.log(`📥 Processing ${validationStats.validRows} valid rows...`)

      let totalInserted = 0
      let insertFailed = false

      for (let i = 0; i < standardizedRows.length; i += BATCH_SIZE) {
        const batchRows = standardizedRows.slice(i, i + BATCH_SIZE)
        const batchData: ParsedPricingData[] = []

        for (const standardRow of batchRows) {
          // Skip invalid rows
          if (!standardRow.date || !standardRow.price || standardRow.price <= 0) {
            continue
          }

          const dateString = standardRow.date.toISOString().split('T')[0]

          const pricingData = {
            id: randomUUID(),
            propertyId: property.id,
            date: dateString,
            price: standardRow.price,
            occupancy: standardRow.occupancy || null,
            bookings: standardRow.bookings || null,
            temperature: null, // Will be filled by enrichment
            weatherCondition: null, // Will be filled by enrichment
            extraData: standardRow, // Store all fields for flexibility (includes availability)
          }

          batchData.push(pricingData)
        }

        if (batchData.length > 0) {
          try {
            const { error: batchError } = await supabaseAdmin.from('pricing_data').insert(batchData)

            if (batchError) {
              console.error(
                `❌ Batch insert error at batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
                batchError
              )
              insertFailed = true
              break
            } else {
              totalInserted += batchData.length
              console.log(
                `✅ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batchData.length} rows, ${totalInserted}/${totalRows} total)`
              )
            }
          } catch (error: unknown) {
            console.error(
              `❌ Batch insert exception at batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
              error
            )
            insertFailed = true
            break
          }
        }
      }

      if (insertFailed) {
        console.error('⚠️  Batch insert failed - rolling back transaction...')
        await supabaseAdmin.from('pricing_data').delete().eq('propertyId', property.id)
        await supabaseAdmin.from('properties').delete().eq('id', property.id)

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }

        return res.status(500).json({
          error: 'Database insert failed',
          message: 'Failed to insert data. Please check your CSV format and try again.',
        })
      }

      const { error: updateError } = await supabaseAdmin
        .from('properties')
        .update({
          rows: totalRows,
          columns: columnCount,
          status: 'complete',
        })
        .eq('id', property.id)

      if (updateError) {
        console.error('Failed to update property:', updateError)
      }

      console.log(`✅ Processing complete: ${totalRows} rows, ${columnCount} columns`)
      fs.unlinkSync(filePath)

      // Background enrichment
      setImmediate(async () => {
        try {
          console.log(`\n🔍 Checking for enrichment settings...`)

          const { data: settings, error: settingsError } = await supabaseAdmin
            .from('business_settings')
            .select('latitude, longitude, country')
            .eq('userid', userId)
            .single()

          if (settingsError) {
            console.log(
              `ℹ️  No business settings found for user ${userId} - skipping auto-enrichment`
            )
            return
          }

          if (settings && settings.latitude && settings.longitude) {
            console.log(`\n🌤️  Starting automatic enrichment for property ${property.id}...`)
            console.log(`📍 Location: ${settings.latitude}, ${settings.longitude}`)

            const enrichmentResult = await enrichPropertyData(
              property.id,
              {
                location: {
                  latitude: settings.latitude,
                  longitude: settings.longitude,
                },
                countryCode: settings.country || 'FR',
                calendarificApiKey: process.env.CALENDARIFIC_API_KEY,
              },
              supabaseAdmin
            )

            if (enrichmentResult.success) {
              console.log(`✅ Auto-enrichment complete:`, enrichmentResult.results)

              const { error: enrichUpdateError } = await supabaseAdmin
                .from('properties')
                .update({
                  enrichmentstatus: 'completed',
                  enrichedat: new Date().toISOString(),
                })
                .eq('id', property.id)

              if (enrichUpdateError) {
                console.error('⚠️  Failed to update enrichment status:', enrichUpdateError)
              } else {
                console.log(`✅ Property marked as enriched`)
              }
            } else {
              console.warn(`⚠️  Auto-enrichment failed:`, enrichmentResult.error)

              await supabaseAdmin
                .from('properties')
                .update({
                  enrichmentstatus: 'failed',
                  enrichmenterror: enrichmentResult.error,
                })
                .eq('id', property.id)
            }
          } else {
            console.log(`ℹ️  No coordinates in business settings - skipping auto-enrichment`)
          }
        } catch (enrichError: unknown) {
          console.error('⚠️  Enrichment error (non-fatal):', getErrorMessage(enrichError))
          if (enrichError instanceof Error) {
            console.error(enrichError.stack)
          }
        }
      })

      res.json({
        success: true,
        file: {
          id: property.id,
          name: req.file.originalname,
          size: req.file.size,
          rows: totalRows,
          columns: columnCount,
          preview,
          uploaded_at: property.uploadedAt,
          status: 'complete',
        },
      })
    } catch (error: unknown) {
      console.error('File Upload Error:', error)

      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path)
          console.log('🧹 Cleaned up uploaded file after error')
        } catch (unlinkError) {
          console.error('Failed to clean up file:', unlinkError)
        }
      }

      res.status(500).json({
        error: 'Failed to upload file',
        message: getErrorMessage(error),
      })
    }
  }
)

/**
 * Submit manual column mapping and re-process CSV
 * POST /api/files/:propertyId/map-columns
 *
 * TODO: This feature needs to be reimplemented since CSV files are no longer stored on disk.
 * Need to either:
 * 1. Store original CSV file content in database
 * 2. Or remap existing pricing_data rows (if column headers are stored)
 *
 * Currently disabled to prevent errors.
 */
router.post(
  '/:propertyId/map-columns',
  authenticateUser,
  asyncHandler(async (_req, res) => {
    return sendError(
      res,
      'NOT_IMPLEMENTED',
      'Manual column mapping is temporarily disabled. Please re-upload your CSV with correctly named columns.'
    )
  })
)

/**
 * Get file data with pagination
 * GET /api/files/:fileId/data
 */
router.get(
  '/:fileId/data',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const fileId = req.params.fileId
    const userId = req.userId!
    const limit = parseInt(String(req.query.limit || '10000'))
    const offset = parseInt(String(req.query.offset || '0'))

    const actualLimit = Math.min(limit, 10000)

    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', fileId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'File not found')
    }

    const { data: pricingData, error: dataError } = await supabaseAdmin
      .from('pricing_data')
      .select('*')
      .eq('propertyId', fileId)
      .order('date', { ascending: true })
      .range(offset, offset + actualLimit - 1)

    if (dataError) {
      logError(dataError as Error, 'GET_FILE_DATA', { fileId, userId })
      throw dataError
    }

    const { count: totalCount } = await supabaseAdmin
      .from('pricing_data')
      .select('*', { count: 'exact', head: true })
      .eq('propertyId', fileId)

    res.json({
      success: true,
      data: pricingData || [],
      pagination: {
        offset,
        limit: actualLimit,
        total: totalCount || 0,
        hasMore: (totalCount || 0) > offset + actualLimit,
      },
    })
  })
)

/**
 * List all uploaded files
 * GET /api/files
 */
router.get(
  '/',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!

    const { data: properties, error } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('userId', userId)
      .order('uploadedAt', { ascending: false })

    if (error) {
      logError(error as Error, 'GET_FILES', { userId })
      throw error
    }

    const filesWithRowCounts = await Promise.all(
      (properties || []).map(async property => {
        const { count } = await supabaseAdmin
          .from('pricing_data')
          .select('*', { count: 'exact', head: true })
          .eq('propertyId', property.id)

        // Fetch first 5 rows as preview
        const { data: previewData } = await supabaseAdmin
          .from('pricing_data')
          .select('*')
          .eq('propertyId', property.id)
          .order('date', { ascending: true })
          .limit(5)

        return {
          ...property,
          enrichment_status: property.enrichmentstatus || 'none', // Map database field to API field
          actualRows: count || 0,
          preview: previewData || [],
        }
      })
    )

    res.json({
      success: true,
      files: filesWithRowCounts,
    })
  })
)

/**
 * Delete file
 * DELETE /api/files/:fileId
 */
router.delete(
  '/:fileId',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const fileId = req.params.fileId
    const userId = req.userId!

    console.log(`🗑️ Delete request for file ${fileId} by user ${userId}`)

    // Verify ownership and get property details
    const { data: property, error: findError } = await supabaseAdmin
      .from('properties')
      .select('id, fileName, filePath')
      .eq('id', fileId)
      .eq('userId', userId)
      .single()

    if (findError || !property) {
      console.warn(`⚠️ File ${fileId} not found or not owned by user ${userId}`)
      return sendError(res, 'NOT_FOUND', 'File not found')
    }

    // 1. Delete associated pricing data (includes all enriched data)
    console.log(`🗑️ Deleting pricing_data for property ${fileId}...`)
    const { error: pricingDataError, count: pricingDataCount } = await supabaseAdmin
      .from('pricing_data')
      .delete()
      .eq('propertyId', fileId)

    if (pricingDataError) {
      console.error(`❌ Failed to delete pricing_data:`, pricingDataError)
      logError(pricingDataError as Error, 'DELETE_PRICING_DATA', { fileId, userId })
      throw pricingDataError
    }

    console.log(`✅ Deleted ${pricingDataCount || 0} pricing_data rows (includes enriched data)`)

    // 2. Clean up enrichment jobs from BullMQ
    try {
      console.log(`🗑️ Cleaning up enrichment jobs for ${fileId}...`)
      const enrichmentJobs = await enrichmentQueue.getJobs(['active', 'waiting', 'delayed', 'completed', 'failed'])
      let removedJobs = 0
      for (const job of enrichmentJobs) {
        if (job.data.propertyId === fileId) {
          await job.remove()
          removedJobs++
        }
      }
      console.log(`✅ Removed ${removedJobs} enrichment jobs`)
    } catch (error) {
      console.warn(`⚠️ Failed to clean up enrichment jobs:`, error)
      // Non-critical, continue
    }

    // 3. Delete physical CSV file from uploads directory
    if (property.filePath) {
      try {
        console.log(`🗑️ Deleting physical file: ${property.filePath}`)
        const fs = await import('fs/promises')
        const path = await import('path')
        const fullPath = path.resolve(process.cwd(), 'uploads', property.filePath)
        await fs.unlink(fullPath)
        console.log(`✅ Deleted physical file: ${property.fileName}`)
      } catch (error) {
        console.warn(`⚠️ Failed to delete physical file:`, error)
        // Non-critical, file may already be deleted
      }
    }

    // 4. Delete the property record
    console.log(`🗑️ Deleting property ${fileId}...`)
    const { error: deleteError } = await supabaseAdmin.from('properties').delete().eq('id', fileId)

    if (deleteError) {
      console.error(`❌ Failed to delete property:`, deleteError)
      logError(deleteError as Error, 'DELETE_PROPERTY', { fileId, userId })
      throw deleteError
    }

    console.log(`✅ Successfully deleted file ${fileId} and all associated data`)

    res.json({
      success: true,
      message: 'File and all enrichment data deleted successfully',
      deleted: {
        pricingDataRows: pricingDataCount || 0,
        fileName: property.fileName,
      },
    })
  })
)

/**
 * Manual enrichment endpoint (async with job queue)
 * POST /api/files/:fileId/enrich
 */
router.post(
  '/:fileId/enrich',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const fileId = req.params.fileId
    const userId = req.userId!
    const { latitude, longitude, country } = req.body

    if (!latitude || !longitude) {
      return sendError(res, 'VALIDATION', 'Missing required fields: latitude, longitude')
    }

    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', fileId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'File not found')
    }

    console.log(`📥 Enrichment job requested for property ${fileId}...`)
    console.log(`📍 Location: ${latitude}, ${longitude}`)

    try {
      // Enqueue enrichment job (non-blocking)
      const jobId = await enqueueEnrichment({
        propertyId: fileId,
        userId,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        countryCode: country || 'FR',
        calendarificApiKey: process.env.CALENDARIFIC_API_KEY,
      })

      // Return immediately with job ID
      res.json({
        success: true,
        message: 'Enrichment job queued successfully',
        jobId,
        status: 'queued',
        statusUrl: `/api/jobs/${jobId}`,
      })
    } catch (error) {
      console.error('Failed to enqueue enrichment job:', error)
      return sendError(res, 'INTERNAL', 'Failed to queue enrichment job')
    }
  })
)

export default router
