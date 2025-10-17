import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import fs from 'fs'
import { randomUUID } from 'crypto'
import csv from 'csv-parser'
import { authenticateUser, supabaseAdmin } from './lib/supabase.js'
import {
  analyzeWeatherImpact,
  forecastDemand,
  analyzeCompetitorPricing,
  calculateFeatureImportance,
  generateAnalyticsSummary,
} from './services/mlAnalytics.js'
import {
  analyzeMarketSentiment,
  generateClaudeInsights,
  generatePricingRecommendations,
} from './services/marketSentiment.js'
import { transformDataForAnalytics, validateDataQuality } from './services/dataTransform.js'
import { enrichPropertyData } from './services/enrichmentService.js'
import { mapWeatherCode } from './utils/weatherCodes.js'
import { CSVRow, ParsedPricingData, DailyForecast, ForecastItem } from './types/api.types.js'
import { asyncHandler, sendError, logError } from './utils/errorHandler.js'
import { rateLimit, RATE_LIMIT } from './middleware/rateLimit.js'
import { upload } from './middleware/upload.js'

// Load environment variables
dotenv.config()

// Helper to get error message from unknown error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', process.env.FRONTEND_URL].filter(
      (url): url is string => Boolean(url)
    ),
    credentials: true,
  })
)
app.use(express.json({ limit: '10mb' }))

// Apply rate limiting middleware
app.use(rateLimit)

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

// ========================================
// FILE UPLOAD & MANAGEMENT
// ========================================

// Upload CSV file with streaming and batch inserts
app.post(
  '/api/files/upload',
  authenticateUser,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const userId = req.userId! // From authentication middleware (guaranteed by authenticateUser)
      const filePath = req.file.path
      console.log(
        `📥 Processing CSV file: ${req.file.originalname} (${req.file.size} bytes) for user: ${userId}`
      )

      // Create property record in database using Supabase
      console.log('⏳ Creating property record...')
      const propertyId = randomUUID()
      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .insert({
          id: propertyId,
          name: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          rows: 0, // Will update after processing
          columns: 0,
          status: 'processing',
          userId: userId, // Link to authenticated user
        })
        .select()
        .single()

      if (propertyError) {
        console.error('Failed to create property:', propertyError)
        throw new Error(`Database error: ${propertyError.message}`)
      }

      console.log(`✅ Created property record: ${property.id}`)

      // Stream CSV and batch insert rows
      const BATCH_SIZE = 1000
      let totalRows = 0
      let columnCount = 0
      const preview: CSVRow[] = []

      // Helper function to parse date flexibly
      const parseDate = (dateStr: unknown): Date | null => {
        if (!dateStr) return null
        try {
          const date = new Date(String(dateStr))
          return isNaN(date.getTime()) ? null : date
        } catch {
          return null
        }
      }

      // Helper function to parse float safely
      const parseFloatSafe = (val: unknown): number | null => {
        if (val === null || val === undefined || val === '') return null
        const num = Number(val)
        return isNaN(num) ? null : num
      }

      // Helper function to parse int safely
      const parseIntSafe = (val: unknown): number | null => {
        if (val === null || val === undefined || val === '') return null
        const num = Number(val)
        return isNaN(num) ? null : Math.floor(num)
      }

      // Process CSV stream - collect all rows first
      const allRows: CSVRow[] = []
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('headers', headers => {
            columnCount = headers.length
            console.log(`📊 CSV Columns (${columnCount}):`, headers)
          })
          .on('data', (row: CSVRow) => {
            totalRows++
            allRows.push(row)

            // Store preview (first 5 rows)
            if (preview.length < 5) {
              preview.push(row)
            }
          })
          .on('end', () => resolve())
          .on('error', reject)
      })

      console.log(`📥 Parsed ${totalRows} rows, now inserting to database...`)

      // Track successful inserts for rollback if needed
      let totalInserted = 0
      let insertFailed = false

      // Insert rows in batches
      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batchRows = allRows.slice(i, i + BATCH_SIZE)
        const batchData: ParsedPricingData[] = []

        for (const row of batchRows) {
          // Normalize column names (handle different CSV formats)
          const normalizedRow: CSVRow = {}
          Object.keys(row).forEach(key => {
            normalizedRow[key.trim().toLowerCase()] = row[key]
          })

          // Map CSV columns to database fields (flexible mapping)
          const dateField =
            normalizedRow.date ||
            normalizedRow.booking_date ||
            normalizedRow.check_in ||
            normalizedRow.checkin
          const priceField = normalizedRow.price || normalizedRow.rate || normalizedRow.amount
          const occupancyField = normalizedRow.occupancy || normalizedRow.occupancy_rate
          const bookingsField = normalizedRow.bookings || normalizedRow.reservations
          const temperatureField = normalizedRow.temperature || normalizedRow.temp
          const weatherField = normalizedRow.weather || normalizedRow.weather_condition

          // Parse date to check validity
          const parsedDate = parseDate(dateField)

          // Only insert if we have a valid date
          if (parsedDate) {
            // Convert Date to YYYY-MM-DD string
            const dateString = parsedDate.toISOString().split('T')[0]

            // Helper to convert weather field to string | null
            const weatherString =
              weatherField !== null && weatherField !== undefined ? String(weatherField) : null

            // Create pricing data record with date as ISO string
            const pricingData = {
              id: randomUUID(), // Generate UUID for each row
              propertyId: property.id,
              date: dateString,
              price: parseFloatSafe(priceField),
              occupancy: parseFloatSafe(occupancyField),
              bookings: parseIntSafe(bookingsField),
              temperature: parseFloatSafe(temperatureField),
              weatherCondition: weatherString,
              extraData: normalizedRow, // Store all fields as JSON for flexibility
            }

            batchData.push(pricingData)
          }
        }

        // Batch insert using Supabase
        if (batchData.length > 0) {
          try {
            const { error: batchError } = await supabaseAdmin.from('pricing_data').insert(batchData)

            if (batchError) {
              console.error(
                `❌ Batch insert error at batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
                batchError
              )
              insertFailed = true
              break // Stop processing if a batch fails
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
            break // Stop processing if a batch fails
          }
        }
      }

      // If any batch failed, rollback by deleting property and all inserted data
      if (insertFailed) {
        console.error('⚠️  Batch insert failed - rolling back transaction...')

        // Delete all pricing data for this property
        await supabaseAdmin.from('pricing_data').delete().eq('propertyId', property.id)

        // Delete property record
        await supabaseAdmin.from('properties').delete().eq('id', property.id)

        // Clean up uploaded file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }

        return res.status(500).json({
          error: 'Database insert failed',
          message: 'Failed to insert data. Please check your CSV format and try again.',
        })
      }

      // Update property with final counts using Supabase
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

      // Delete uploaded file (data is now in DB)
      fs.unlinkSync(filePath)

      // ENRICHMENT PIPELINE - Run AFTER response (but with setImmediate to ensure it runs)
      setImmediate(async () => {
        try {
          console.log(`\n🔍 Checking for enrichment settings...`)

          // Get user's business settings for coordinates
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

              // Mark property as enriched in database
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

              // Mark enrichment as failed
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
            console.log(
              `   To enable automatic enrichment, update your business settings with latitude/longitude`
            )
          }
        } catch (enrichError: unknown) {
          // Don't fail the upload if enrichment fails
          console.error('⚠️  Enrichment error (non-fatal):', getErrorMessage(enrichError))
          if (enrichError instanceof Error) {
            console.error(enrichError.stack)
          }
        }
      })

      // Return metadata
      res.json({
        success: true,
        file: {
          id: property.id,
          name: req.file.originalname,
          size: req.file.size,
          rows: totalRows,
          columns: columnCount,
          preview,
          uploaded_at: property.uploadedAt, // Already a string from Supabase
          status: 'complete',
        },
      })
    } catch (error: unknown) {
      console.error('File Upload Error:', error)

      // Clean up uploaded file on error
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

// Get file data (with pagination for large files)
app.get(
  '/api/files/:fileId/data',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const fileId = req.params.fileId // Guaranteed by route match
    const userId = req.userId! // Guaranteed by authenticateUser middleware
    const limit = parseInt(String(req.query.limit || '10000'))
    const offset = parseInt(String(req.query.offset || '0'))

    // Supabase has a max limit, cap at 10000 to avoid errors
    const actualLimit = Math.min(limit, 10000)

    // Check if property exists and belongs to user using Supabase
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', fileId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'File not found')
    }

    // Get total count first
    const { count: total } = await supabaseAdmin
      .from('pricing_data')
      .select('*', { count: 'exact', head: true })
      .eq('propertyId', fileId)

    // Fetch ALL data in batches (Supabase has 1000 row limit per query)
    const SUPABASE_LIMIT = 1000
    const allData = []
    const totalToFetch = Math.min(actualLimit, total ?? 0)

    for (let i = offset; i < offset + totalToFetch; i += SUPABASE_LIMIT) {
      const batchLimit = Math.min(SUPABASE_LIMIT, offset + totalToFetch - i)

      const { data: batchData } = await supabaseAdmin
        .from('pricing_data')
        .select(
          'date, price, occupancy, bookings, temperature, precipitation, weatherCondition, sunshineHours, dayOfWeek, month, season, isWeekend, isHoliday, holidayName, extraData'
        )
        .eq('propertyId', fileId)
        .order('date', { ascending: true })
        .range(i, i + batchLimit - 1)

      if (batchData && batchData.length > 0) {
        allData.push(...batchData)
      }
    }

    const data = allData

    // Transform data to match expected format (flatten extraData)
    const transformedData = data.map(row => {
      const { extraData, ...coreFields } = row

      // Format date as string for frontend
      const formattedRow = {
        ...coreFields,
        date: new Date(row.date).toISOString().split('T')[0],
        weather: row.weatherCondition,
      }

      // Merge extraData if present
      if (extraData && typeof extraData === 'object') {
        Object.assign(formattedRow, extraData)
      }

      return formattedRow
    })

    res.json({
      success: true,
      data: transformedData,
      total,
      offset,
      limit: transformedData.length,
      hasMore: offset + transformedData.length < (total ?? 0),
    })
  })
)

// List all uploaded files
app.get(
  '/api/files',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId! // Guaranteed by authenticateUser middleware

    const { data: properties, error } = await supabaseAdmin
      .from('properties')
      .select(
        'id, originalName, size, rows, columns, uploadedAt, status, enrichmentstatus, enrichedat'
      )
      .eq('userId', userId)
      .order('uploadedAt', { ascending: false })

    if (error) {
      logError(error as Error, 'LIST_FILES', { userId })
      throw error
    }

    const files = (properties || []).map(prop => ({
      id: prop.id,
      name: prop.originalName,
      size: prop.size,
      rows: prop.rows,
      columns: prop.columns,
      uploaded_at: prop.uploadedAt,
      status: prop.status,
      enrichment_status: prop.enrichmentstatus || 'none',
      enriched_at: prop.enrichedat,
    }))

    res.json({ success: true, files })
  })
)

// Delete file
app.delete(
  '/api/files/:fileId',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const fileId = req.params.fileId // Guaranteed by route match
    const userId = req.userId! // Guaranteed by authenticateUser middleware

    // Check if property exists and belongs to user using Supabase
    const { data: property, error: findError } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', fileId)
      .eq('userId', userId)
      .single()

    if (findError || !property) {
      return sendError(res, 'NOT_FOUND', 'File not found')
    }

    // Delete property using Supabase (cascade will delete all pricing data via database ON DELETE CASCADE)
    const { error: deleteError } = await supabaseAdmin.from('properties').delete().eq('id', fileId)

    if (deleteError) {
      logError(deleteError as Error, 'DELETE_FILE', { fileId, userId })
      throw deleteError
    }

    res.json({
      success: true,
      message: 'File deleted successfully',
    })
  })
)

// ========================================
// ANTHROPIC CLAUDE API (AI Assistant)
// ========================================
app.post(
  '/api/assistant/message',
  asyncHandler(async (req, res) => {
    const { message, conversationHistory, context } = req.body

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [...conversationHistory, { role: 'user', content: message }],
        system: `You are a helpful AI assistant for a dynamic pricing platform for hospitality businesses. ${context ? JSON.stringify(context) : ''}`,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000, // 30 second timeout
      }
    )

    res.json(response.data)
  })
)

// Quick pricing suggestion (non-streaming)
app.post(
  '/api/assistant/quick-suggestion',
  asyncHandler(async (req, res) => {
    const { context } = req.body

    if (!context) {
      return sendError(res, 'VALIDATION', 'Missing required field: context')
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context)
    const userPrompt =
      'Based on current conditions, provide one specific pricing recommendation in 2-3 sentences.'

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      }
    )

    res.json({
      success: true,
      suggestion: response.data.content[0]?.text || 'No suggestion available',
    })
  })
)

// Analyze pricing data
app.post(
  '/api/assistant/analyze-pricing',
  asyncHandler(async (req, res) => {
    const { data } = req.body

    if (!data || !data.dates || !data.prices || !data.occupancy) {
      return sendError(
        res,
        'VALIDATION',
        'Missing required fields: data.dates, data.prices, data.occupancy'
      )
    }

    const dataDescription = `
Date Range: ${data.dates[0]} to ${data.dates[data.dates.length - 1]}
Price Range: ${Math.min(...data.prices).toFixed(2)} - ${Math.max(...data.prices).toFixed(2)}
Average Occupancy: ${(data.occupancy.reduce((a: number, b: number) => a + b, 0) / data.occupancy.length).toFixed(1)}%
Total Data Points: ${data.dates.length}
`

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system:
          'You are a pricing analyst. Analyze the data and provide insights about patterns, trends, and optimization opportunities.',
        messages: [
          {
            role: 'user',
            content: `Analyze this pricing data and provide 3-5 key insights:\n\n${dataDescription}`,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      }
    )

    res.json({
      success: true,
      analysis: response.data.content[0]?.text || 'Analysis failed',
    })
  })
)

// Generate pricing recommendations for specific dates
app.post(
  '/api/assistant/pricing-recommendations',
  asyncHandler(async (req, res) => {
    const { dates, context } = req.body

    if (!dates || !Array.isArray(dates)) {
      return sendError(res, 'VALIDATION', 'Missing or invalid field: dates (array)')
    }

    const systemPrompt = buildSystemPrompt(context || {})
    const dateStrings = dates.map((d: string | Date) =>
      typeof d === 'string' ? d : new Date(d).toISOString().split('T')[0]
    )

    const userPrompt = `Generate pricing recommendations for these dates: ${dateStrings.join(', ')}

For each date, provide:
1. Recommended price
2. Brief reasoning (weather, demand, competition)

Format as JSON:
{
  "2024-01-15": {
    "price": 150.00,
    "reasoning": "Good weather, high demand period"
  }
}
`

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      }
    )

    const content = response.data.content[0]?.text || '{}'

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    res.json({
      success: true,
      recommendations,
    })
  })
)

// Helper function to build system prompt with context
function buildSystemPrompt(context: {
  businessName?: string
  location?: string
  currency?: string
  currentData?: {
    avgPrice?: number
    occupancyRate?: number
    totalBookings?: number
    revenue?: number
  }
  weatherConditions?: {
    current?: string
    forecast?: string[]
  }
  competitorPrices?: Array<{
    competitor: string
    price: number
  }>
}): string {
  const parts = [
    'You are Jengu AI, an expert dynamic pricing assistant for the hospitality industry.',
    'You provide actionable pricing recommendations based on data analysis, weather patterns, competitor pricing, and market conditions.',
    '',
    'Your expertise includes:',
    '- Revenue optimization strategies',
    '- Demand forecasting and seasonality analysis',
    '- Weather impact on booking behavior',
    '- Competitive pricing analysis',
    '- Occupancy rate optimization',
    '',
  ]

  // Add business context if available
  if (context.businessName) {
    parts.push(`Business: ${context.businessName}`)
  }

  if (context.location) {
    parts.push(`Location: ${context.location}`)
  }

  if (context.currency) {
    parts.push(`Currency: ${context.currency}`)
  }

  if (context.currentData) {
    parts.push('')
    parts.push('Current Performance:')
    if (context.currentData.avgPrice) {
      parts.push(`- Average Price: ${context.currentData.avgPrice.toFixed(2)}`)
    }
    if (context.currentData.occupancyRate) {
      parts.push(`- Occupancy Rate: ${context.currentData.occupancyRate.toFixed(1)}%`)
    }
    if (context.currentData.totalBookings) {
      parts.push(`- Total Bookings: ${context.currentData.totalBookings}`)
    }
    if (context.currentData.revenue) {
      parts.push(`- Revenue: ${context.currentData.revenue.toFixed(2)}`)
    }
  }

  if (context.weatherConditions?.current) {
    parts.push('')
    parts.push(`Current Weather: ${context.weatherConditions.current}`)
  }

  if (context.weatherConditions?.forecast && context.weatherConditions.forecast.length > 0) {
    parts.push('Forecast: ' + context.weatherConditions.forecast.join(', '))
  }

  if (context.competitorPrices && context.competitorPrices.length > 0) {
    parts.push('')
    parts.push('Competitor Prices:')
    context.competitorPrices.forEach(comp => {
      parts.push(`- ${comp.competitor}: ${comp.price.toFixed(2)}`)
    })
  }

  parts.push('')
  parts.push('Guidelines:')
  parts.push('- Provide specific, actionable recommendations')
  parts.push('- Use data to support your suggestions')
  parts.push('- Consider seasonal patterns and weather impacts')
  parts.push('- Balance revenue optimization with occupancy rates')
  parts.push('- Be concise but thorough')

  return parts.join('\n')
}

// ========================================
// OPEN-METEO API (Weather Data - FREE, No API Key!)
// ========================================
app.post(
  '/api/weather/historical',
  asyncHandler(async (req, res) => {
    const { latitude, longitude, dates } = req.body

    if (!latitude || !longitude || !dates || !Array.isArray(dates)) {
      return sendError(res, 'VALIDATION', 'Missing required fields: latitude, longitude, dates')
    }

    // Convert Unix timestamps to YYYY-MM-DD format
    const formattedDates = dates.map(timestamp => {
      const date = new Date(timestamp * 1000)
      return date.toISOString().split('T')[0]
    })

    // Get unique dates and determine date range
    const uniqueDates = [...new Set(formattedDates)].sort()
    const startDate = uniqueDates[0]
    const endDate = uniqueDates[uniqueDates.length - 1]

    // Call Open-Meteo Historical Weather API (FREE - No API key needed!)
    const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
      params: {
        latitude: latitude,
        longitude: longitude,
        start_date: startDate,
        end_date: endDate,
        daily:
          'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weathercode',
        timezone: 'auto',
      },
      timeout: 15000, // 15 second timeout
    })

    // Transform Open-Meteo response to match expected format
    const weatherData = response.data.daily.time.map((date: string, index: number) => {
      const weathercode = response.data.daily.weathercode[index]

      // Use centralized weather code mapping
      const weatherDescription = mapWeatherCode(weathercode)

      return {
        date: date,
        temperature: {
          max: response.data.daily.temperature_2m_max[index],
          min: response.data.daily.temperature_2m_min[index],
          mean: response.data.daily.temperature_2m_mean[index],
        },
        precipitation: response.data.daily.precipitation_sum[index],
        weather: weatherDescription,
        weathercode: weathercode,
      }
    })

    res.json({
      success: true,
      data: weatherData,
      source: 'Open-Meteo (Free)',
      message: 'Historical weather data from Open-Meteo - No API key required!',
    })
  })
)

// ========================================
// OPENWEATHER API (Current & Forecast Weather - FREE)
// ========================================

// Current weather endpoint (FREE - for live pricing decisions)
app.get(
  '/api/weather/current',
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query

    if (!latitude || !longitude) {
      return sendError(res, 'VALIDATION', 'Missing required parameters: latitude, longitude')
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: latitude,
        lon: longitude,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 10000, // 10 second timeout
    })

    // Transform to consistent format
    const weatherData = {
      location: response.data.name,
      temperature: {
        current: response.data.main.temp,
        feels_like: response.data.main.feels_like,
        min: response.data.main.temp_min,
        max: response.data.main.temp_max,
      },
      weather: response.data.weather[0].main,
      description: response.data.weather[0].description,
      humidity: response.data.main.humidity,
      wind_speed: response.data.wind.speed,
      timestamp: new Date(response.data.dt * 1000).toISOString(),
      source: 'OpenWeather (Free)',
    }

    res.json({
      success: true,
      data: weatherData,
      message: 'Current weather data - perfect for live pricing optimization!',
    })
  })
)

// 5-day weather forecast endpoint (FREE - for pricing optimization)
app.get(
  '/api/weather/forecast',
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query

    if (!latitude || !longitude) {
      return sendError(res, 'VALIDATION', 'Missing required parameters: latitude, longitude')
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat: latitude,
        lon: longitude,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 10000, // 10 second timeout
    })

    // Transform forecast data - group by day
    const dailyForecasts: Record<string, DailyForecast> = {}

    response.data.list.forEach((item: ForecastItem) => {
      const date = item.dt_txt.split(' ')[0]

      if (!dailyForecasts[date]) {
        dailyForecasts[date] = {
          date: date,
          temperatures: [],
          weather: [],
          humidity: [],
          precipitation: item.rain ? item.rain['3h'] || 0 : 0,
        }
      }

      dailyForecasts[date].temperatures.push(item.main.temp)
      dailyForecasts[date].weather.push(item.weather[0].main)
      dailyForecasts[date].humidity.push(item.main.humidity)
    })

    // Calculate daily summaries
    const forecastData = Object.values(dailyForecasts).map((day: DailyForecast) => {
      const temps = day.temperatures
      const mostCommonWeather = day.weather
        .sort(
          (a: string, b: string) =>
            day.weather.filter((v: string) => v === a).length -
            day.weather.filter((v: string) => v === b).length
        )
        .pop()

      return {
        date: day.date,
        temperature: {
          min: Math.min(...temps),
          max: Math.max(...temps),
          avg: temps.reduce((a: number, b: number) => a + b, 0) / temps.length,
        },
        weather: mostCommonWeather,
        humidity_avg: day.humidity.reduce((a: number, b: number) => a + b, 0) / day.humidity.length,
        precipitation: day.precipitation,
      }
    })

    res.json({
      success: true,
      data: forecastData,
      location: response.data.city.name,
      source: 'OpenWeather (Free)',
      message: '5-day forecast - use this for dynamic pricing recommendations!',
    })
  })
)

// ========================================
// CALENDARIFIC API (Holidays)
// ========================================
app.get(
  '/api/holidays',
  asyncHandler(async (req, res) => {
    const { country, year } = req.query

    if (!country || !year) {
      return sendError(res, 'VALIDATION', 'Missing required parameters: country, year')
    }

    const response = await axios.get('https://calendarific.com/api/v2/holidays', {
      params: {
        api_key: process.env.CALENDARIFIC_API_KEY,
        country,
        year,
      },
      timeout: 10000, // 10 second timeout
    })

    res.json(response.data)
  })
)

// ========================================
// GEOCODING API (OpenStreetMap Nominatim + Mapbox fallback)
// ========================================
app.get(
  '/api/geocoding/forward',
  asyncHandler(async (req, res) => {
    const { address } = req.query

    if (!address) {
      return sendError(res, 'VALIDATION', 'Missing required parameter: address')
    }

    // Try OpenStreetMap Nominatim first (free, no API key needed)
    try {
      const nominatimResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'TravelPricingApp/1.0', // Required by Nominatim
        },
        timeout: 10000, // 10 second timeout
      })

      if (nominatimResponse.data && nominatimResponse.data.length > 0) {
        const result = nominatimResponse.data[0]

        // Convert Nominatim format to Mapbox-compatible format
        const mapboxFormat = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
              },
              properties: {
                name: result.display_name,
                place_type: [result.type],
                address: result.address,
              },
              center: [parseFloat(result.lon), parseFloat(result.lat)],
            },
          ],
          attribution: 'OpenStreetMap Nominatim',
        }

        return res.json(mapboxFormat)
      }
    } catch (nominatimError: unknown) {
      console.warn(
        'Nominatim geocoding failed, trying Mapbox fallback:',
        getErrorMessage(nominatimError)
      )
    }

    // Fallback to Mapbox if Nominatim fails or returns no results
    if (process.env.MAPBOX_TOKEN && process.env.MAPBOX_TOKEN !== 'your_mapbox_token_here') {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(String(address))}.json`,
        {
          params: {
            access_token: process.env.MAPBOX_TOKEN,
            limit: 1,
          },
          timeout: 10000, // 10 second timeout
        }
      )

      return res.json(response.data)
    }

    // If both failed or no Mapbox token
    return sendError(
      res,
      'NOT_FOUND',
      'Could not geocode the provided address. Please try a more specific location (e.g., "City, Country")'
    )
  })
)

app.get(
  '/api/geocoding/reverse',
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query

    if (!latitude || !longitude) {
      return sendError(res, 'VALIDATION', 'Missing required parameters: latitude, longitude')
    }

    // Try OpenStreetMap Nominatim first (free, no API key needed)
    try {
      const nominatimResponse = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'TravelPricingApp/1.0',
        },
        timeout: 10000, // 10 second timeout
      })

      if (nominatimResponse.data) {
        const result = nominatimResponse.data

        // Convert to Mapbox-compatible format
        const mapboxFormat = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
              },
              properties: {
                name: result.display_name,
                place_type: [result.type],
                address: result.address,
              },
              center: [parseFloat(result.lon), parseFloat(result.lat)],
              place_name: result.display_name,
            },
          ],
          attribution: 'OpenStreetMap Nominatim',
        }

        return res.json(mapboxFormat)
      }
    } catch (nominatimError: unknown) {
      console.warn(
        'Nominatim reverse geocoding failed, trying Mapbox fallback:',
        getErrorMessage(nominatimError)
      )
    }

    // Fallback to Mapbox if configured
    if (process.env.MAPBOX_TOKEN && process.env.MAPBOX_TOKEN !== 'your_mapbox_token_here') {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
        {
          params: {
            access_token: process.env.MAPBOX_TOKEN,
          },
          timeout: 10000, // 10 second timeout
        }
      )

      return res.json(response.data)
    }

    return sendError(res, 'NOT_FOUND', 'Could not reverse geocode the coordinates')
  })
)

// Search for places with autocomplete
app.get(
  '/api/geocoding/search',
  asyncHandler(async (req, res) => {
    const { query, types, limit } = req.query

    if (!query || (query as string).length < 2) {
      return res.json({
        type: 'FeatureCollection',
        features: [],
        attribution: 'OpenStreetMap Nominatim',
      })
    }

    const searchLimit = limit ? parseInt(limit as string) : 5
    const searchTypes = types ? (types as string).split(',') : ['place', 'address']

    // Try OpenStreetMap Nominatim first (free, no API key needed)
    try {
      const nominatimResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: searchLimit,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'TravelPricingApp/1.0',
        },
        timeout: 10000,
      })

      if (nominatimResponse.data && nominatimResponse.data.length > 0) {
        // Convert to Mapbox-compatible format
        const features = nominatimResponse.data.map((result: any) => {
          // Extract city and country from address
          let city = ''
          let country = ''

          if (result.address) {
            city =
              result.address.city ||
              result.address.town ||
              result.address.village ||
              result.address.municipality ||
              ''
            country = result.address.country || ''
          }

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
            },
            properties: {
              name: result.display_name,
              place_type: [result.type],
              address: result.address,
            },
            center: [parseFloat(result.lon), parseFloat(result.lat)],
            place_name: result.display_name,
            text: result.display_name.split(',')[0], // First part of display name
            context: [
              {
                id: 'place',
                text: city,
              },
              {
                id: 'country',
                text: country,
              },
            ],
          }
        })

        return res.json({
          type: 'FeatureCollection',
          features,
          attribution: 'OpenStreetMap Nominatim',
        })
      }
    } catch (nominatimError: unknown) {
      console.warn(
        'Nominatim search failed, trying Mapbox fallback:',
        getErrorMessage(nominatimError)
      )
    }

    // Fallback to Mapbox if configured
    if (process.env.MAPBOX_TOKEN && process.env.MAPBOX_TOKEN !== 'your_mapbox_token_here') {
      const typesParam = searchTypes.join(',')
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(String(query))}.json`,
        {
          params: {
            access_token: process.env.MAPBOX_TOKEN,
            types: typesParam,
            limit: searchLimit,
          },
          timeout: 10000,
        }
      )

      return res.json(response.data)
    }

    // Return empty results if both failed
    return res.json({
      type: 'FeatureCollection',
      features: [],
      attribution: 'OpenStreetMap Nominatim',
    })
  })
)

// ========================================
// SCRAPERAPI (Competitor Pricing)
// ========================================
app.post(
  '/api/competitor/scrape',
  asyncHandler(async (req, res) => {
    const { url } = req.body

    if (!url) {
      return sendError(res, 'VALIDATION', 'Missing required field: url')
    }

    const response = await axios.get('https://api.scraperapi.com/', {
      params: {
        api_key: process.env.SCRAPERAPI_KEY,
        url,
        render: 'true',
      },
      timeout: 30000, // 30 second timeout (scraping can be slower)
    })

    res.json({ success: true, html: response.data })
  })
)

// ========================================
// MAKCORPS API (Hotel Pricing)
// ========================================
app.post(
  '/api/hotels/search',
  asyncHandler(async (req, res) => {
    const { cityId, checkIn, checkOut, adults, rooms, currency } = req.body

    if (!cityId || !checkIn || !checkOut) {
      return sendError(res, 'VALIDATION', 'Missing required fields: cityId, checkIn, checkOut')
    }

    const response = await axios.post(
      'https://api.makcorps.com/v1/hotels/search',
      {
        cityId,
        checkIn,
        checkOut,
        adults: adults || 2,
        rooms: rooms || 1,
        currency: currency || 'USD',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.MAKCORPS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000, // 20 second timeout
      }
    )

    res.json(response.data)
  })
)

// ========================================
// ML ANALYTICS & INSIGHTS (Enhanced Intelligence)
// ========================================

// Comprehensive analytics summary
app.post(
  '/api/analytics/summary',
  asyncHandler(async (req, res) => {
    const { data } = req.body

    if (!data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    console.log(`📊 Analytics Summary Request: Received ${data.length} rows`)

    // Transform data to handle different CSV formats
    const transformedData = transformDataForAnalytics(data)

    if (transformedData.length === 0) {
      return sendError(
        res,
        'VALIDATION',
        'No valid data after transformation. Please check your CSV format. Required columns: date, price'
      )
    }

    // Validate data quality
    const validation = validateDataQuality(transformedData)
    console.log(`✅ Data quality check:`, validation)

    // Generate analytics summary
    const summary = generateAnalyticsSummary(transformedData) as Record<string, unknown>

    // Add validation info to response
    summary.dataQuality = {
      ...((summary.dataQuality as object) || {}),
      validation: {
        isValid: validation.isValid,
        warnings: validation.warnings,
        errors: validation.errors,
      },
    }

    res.json({ success: true, data: summary })
  })
)

// Weather impact analysis
app.post(
  '/api/analytics/weather-impact',
  asyncHandler(async (req, res) => {
    const { data } = req.body

    if (!data || !Array.isArray(data)) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const analysis = analyzeWeatherImpact(data)
    res.json({ success: true, data: analysis })
  })
)

// Demand forecasting
app.post(
  '/api/analytics/demand-forecast',
  asyncHandler(async (req, res) => {
    const { data, daysAhead } = req.body

    if (!data || !Array.isArray(data)) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const forecast = forecastDemand(data, daysAhead || 14)
    res.json({ success: true, data: forecast })
  })
)

// Competitor pricing analysis
app.post(
  '/api/analytics/competitor-analysis',
  asyncHandler(async (req, res) => {
    const { yourData, competitorData } = req.body

    if (!yourData || !competitorData) {
      return sendError(res, 'VALIDATION', 'Missing yourData or competitorData')
    }

    const analysis = analyzeCompetitorPricing(yourData, competitorData)
    res.json({ success: true, data: analysis })
  })
)

// Feature importance calculation
app.post(
  '/api/analytics/feature-importance',
  asyncHandler(async (req, res) => {
    const { data } = req.body

    if (!data || !Array.isArray(data)) {
      return sendError(res, 'VALIDATION', 'Missing or invalid data array')
    }

    const importance = calculateFeatureImportance(data)
    res.json({ success: true, data: importance })
  })
)

// Market sentiment analysis
app.post(
  '/api/analytics/market-sentiment',
  asyncHandler(async (req, res) => {
    const { weatherData, occupancyData, competitorData, yourPricing, historicalTrends } = req.body

    const sentiment = analyzeMarketSentiment({
      weatherData,
      occupancyData,
      competitorData,
      yourPricing,
      historicalTrends,
    })

    res.json({ success: true, data: sentiment })
  })
)

// Claude-powered insights generation
app.post(
  '/api/analytics/ai-insights',
  asyncHandler(async (req, res) => {
    const { analyticsData } = req.body

    if (!analyticsData) {
      return sendError(res, 'VALIDATION', 'Missing analyticsData object')
    }

    const insights = await generateClaudeInsights(analyticsData, process.env.ANTHROPIC_API_KEY!)
    res.json({ success: true, data: insights })
  })
)

// Pricing recommendations
app.post(
  '/api/analytics/pricing-recommendations',
  asyncHandler(async (req, res) => {
    const { sentimentAnalysis, currentPrice } = req.body

    if (!sentimentAnalysis || !currentPrice) {
      return sendError(res, 'VALIDATION', 'Missing sentimentAnalysis or currentPrice')
    }

    const recommendations = generatePricingRecommendations(sentimentAnalysis, currentPrice)
    res.json({ success: true, data: recommendations })
  })
)

// Manual enrichment endpoint
app.post(
  '/api/files/:fileId/enrich',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const fileId = req.params.fileId // Guaranteed by route match
    const userId = req.userId! // Guaranteed by authenticateUser middleware
    const { latitude, longitude, country } = req.body

    // Validate inputs
    if (!latitude || !longitude) {
      return sendError(res, 'VALIDATION', 'Missing required fields: latitude, longitude')
    }

    // Check if property exists and belongs to user
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', fileId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'File not found')
    }

    console.log(`🌤️  Manual enrichment requested for property ${fileId}...`)
    console.log(`📍 Location: ${latitude}, ${longitude}`)

    // Run enrichment pipeline
    const enrichmentResult = await enrichPropertyData(
      fileId,
      {
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        countryCode: country || 'FR',
        calendarificApiKey: process.env.CALENDARIFIC_API_KEY,
      },
      supabaseAdmin
    )

    if (enrichmentResult.success) {
      // Mark property as enriched
      await supabaseAdmin
        .from('properties')
        .update({
          enrichmentstatus: 'completed',
          enrichedat: new Date().toISOString(),
        })
        .eq('id', fileId)

      res.json({
        success: true,
        message: 'Enrichment completed successfully',
        results: enrichmentResult.results,
      })
    } else {
      // Mark enrichment as failed
      await supabaseAdmin
        .from('properties')
        .update({
          enrichmentstatus: 'failed',
          enrichmenterror: enrichmentResult.error,
        })
        .eq('id', fileId)

      return sendError(res, 'INTERNAL', enrichmentResult.error || 'Enrichment failed')
    }
  })
)

// ========================================
// BUSINESS SETTINGS
// ========================================

// Get user's business settings
app.get(
  '/api/settings',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId! // Guaranteed by authenticateUser middleware

    const { data: settings, error } = await supabaseAdmin
      .from('business_settings')
      .select('*')
      .eq('userid', userId) // PostgreSQL column is lowercase
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (not an error)
      logError(error as Error, 'GET_SETTINGS', { userId })
      throw error
    }

    // Return settings or empty object if not found
    res.json({
      success: true,
      settings: settings || {},
    })
  })
)

// Save/update user's business settings
app.post(
  '/api/settings',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId! // Guaranteed by authenticateUser middleware
    const { business_name, property_type, city, country, latitude, longitude, currency, timezone } =
      req.body

    console.log(`💾 Saving settings for user: ${userId}`)

    // Check if settings already exist
    const { data: existingSettings } = await supabaseAdmin
      .from('business_settings')
      .select('id')
      .eq('userid', userId) // PostgreSQL column is lowercase
      .single()

    let result
    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabaseAdmin
        .from('business_settings')
        .update({
          business_name,
          property_type,
          city,
          country,
          latitude,
          longitude,
          currency,
          timezone,
          updatedat: new Date().toISOString(), // PostgreSQL column is lowercase
        })
        .eq('userid', userId) // PostgreSQL column is lowercase
        .select()
        .single()

      if (error) {
        logError(error as Error, 'UPDATE_SETTINGS', { userId })
        throw error
      }
      result = data
      console.log('✅ Settings updated')
    } else {
      // Insert new settings
      const { data, error } = await supabaseAdmin
        .from('business_settings')
        .insert({
          userid: userId, // PostgreSQL column is lowercase
          business_name,
          property_type,
          city,
          country,
          latitude,
          longitude,
          currency,
          timezone,
        })
        .select()
        .single()

      if (error) {
        logError(error as Error, 'CREATE_SETTINGS', { userId })
        throw error
      }
      result = data
      console.log('✅ Settings created')
    }

    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings: result,
    })
  })
)

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server Error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  })
})

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...')
  process.exit(0)
})

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Jengu Backend API Server (Supabase + PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Database: Supabase PostgreSQL (REST API)
✅ Frontend URL: ${process.env.FRONTEND_URL}
✅ Rate limit: ${RATE_LIMIT} requests/minute
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Available endpoints:
   - GET  /health

   📁 File Management (Supabase):
   - POST   /api/files/upload (streaming + batch inserts)
   - GET    /api/files
   - GET    /api/files/:fileId/data (paginated)
   - DELETE /api/files/:fileId

   🤖 AI Assistant:
   - POST /api/assistant/message

   🌤️  Weather & Location:
   - POST /api/weather/historical (Open-Meteo - FREE)
   - GET  /api/weather/current (OpenWeather - FREE)
   - GET  /api/weather/forecast (OpenWeather - FREE)
   - GET  /api/holidays
   - GET  /api/geocoding/forward
   - GET  /api/geocoding/reverse

   🏨 Competitor Data:
   - POST /api/competitor/scrape
   - POST /api/hotels/search

   📊 ML Analytics & AI Insights:
   - POST /api/analytics/summary
   - POST /api/analytics/weather-impact
   - POST /api/analytics/demand-forecast
   - POST /api/analytics/competitor-analysis
   - POST /api/analytics/feature-importance
   - POST /api/analytics/market-sentiment
   - POST /api/analytics/ai-insights (Claude-powered)
   - POST /api/analytics/pricing-recommendations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
})
