/**
 * Common Zod Schemas for OpenAPI
 * Reusable schemas for request/response validation
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z)

// ===== Common Schemas =====

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'VALIDATION_ERROR' }),
    message: z.string().openapi({ example: 'Invalid input parameters' }),
  })
  .openapi('ErrorResponse')

export const SuccessResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().optional().openapi({ example: 'Operation completed successfully' }),
  })
  .openapi('SuccessResponse')

// ===== File Schemas =====

export const FileMetadataSchema = z
  .object({
    id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    name: z.string().openapi({ example: 'hotel-bookings-2024.csv' }),
    originalName: z.string().openapi({ example: 'bookings.csv' }),
    size: z.number().openapi({ example: 1048576 }),
    rows: z.number().openapi({ example: 5000 }),
    columns: z.number().openapi({ example: 8 }),
    uploaded_at: z.string().datetime().openapi({ example: '2024-01-15T10:30:00Z' }),
    status: z.enum(['complete', 'processing', 'error']).openapi({ example: 'complete' }),
    enrichment_status: z
      .enum(['none', 'pending', 'completed', 'failed'])
      .optional()
      .openapi({ example: 'completed' }),
    enriched_at: z.string().datetime().optional().openapi({ example: '2024-01-15T10:35:00Z' }),
  })
  .openapi('FileMetadata')

export const PricingDataSchema = z
  .object({
    id: z.string().uuid(),
    date: z.string().date(),
    price: z.number(),
    // Enriched fields
    temperature: z.number().nullable(),
    precipitation: z.number().nullable(),
    weatherCondition: z.string().nullable(),
    sunshineHours: z.number().nullable(),
    dayOfWeek: z.number().int().min(0).max(6).nullable(),
    month: z.number().int().min(1).max(12).nullable(),
    season: z.enum(['Winter', 'Spring', 'Summer', 'Fall']).nullable(),
    isWeekend: z.boolean().nullable(),
    isHoliday: z.boolean().nullable(),
    holidayName: z.string().nullable(),
  })
  .openapi('PricingData')

// ===== Analytics Schemas =====

export const AnalyticsSummarySchema = z
  .object({
    totalRows: z.number(),
    avgPrice: z.number(),
    medianPrice: z.number(),
    priceStdDev: z.number(),
    minPrice: z.number(),
    maxPrice: z.number(),
    priceRange: z.number(),
    dateRange: z.object({
      start: z.string().date(),
      end: z.string().date(),
      days: z.number(),
    }),
  })
  .openapi('AnalyticsSummary')

export const DemandForecastSchema = z
  .object({
    forecasts: z.array(
      z.object({
        date: z.string().date(),
        predictedPrice: z.number(),
        confidence: z.number().min(0).max(1),
      })
    ),
    accuracy: z.number(),
    model: z.string(),
  })
  .openapi('DemandForecast')

// ===== Pricing Engine Schemas =====

export const PricingQuoteRequestSchema = z
  .object({
    propertyId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    stayDate: z.string().date().openapi({ example: '2024-06-15' }),
    bookingDate: z.string().date().optional().openapi({ example: '2024-05-01' }),
    features: z
      .object({
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        isWeekend: z.boolean().optional(),
        isHoliday: z.boolean().optional(),
        temperature: z.number().optional(),
        lead_days: z.number().int().optional(),
      })
      .optional(),
  })
  .openapi('PricingQuoteRequest')

export const PricingQuoteResponseSchema = z
  .object({
    success: z.boolean(),
    quote: z.object({
      propertyId: z.string().uuid(),
      stayDate: z.string().date(),
      suggestedPrice: z.number(),
      confidence: z.number().min(0).max(1),
      factors: z.record(z.string(), z.number()),
      model: z.string(),
    }),
  })
  .openapi('PricingQuoteResponse')

// ===== Weather Schemas =====

export const WeatherDataSchema = z
  .object({
    date: z.string().date(),
    temperature: z.number(),
    precipitation: z.number(),
    weatherCode: z.number().optional(),
    weatherDescription: z.string(),
    sunshineHours: z.number().optional(),
  })
  .openapi('WeatherData')

// ===== Location Schemas =====

export const LocationSchema = z
  .object({
    latitude: z.number().min(-90).max(90).openapi({ example: 48.8566 }),
    longitude: z.number().min(-180).max(180).openapi({ example: 2.3522 }),
    city: z.string().optional().openapi({ example: 'Paris' }),
    country: z.string().optional().openapi({ example: 'France' }),
    countryCode: z.string().length(2).optional().openapi({ example: 'FR' }),
  })
  .openapi('Location')

// ===== Auth Schemas =====

export const LoginRequestSchema = z
  .object({
    email: z.string().email().openapi({ example: 'user@example.com' }),
    password: z.string().min(6).openapi({ example: 'secure-password-123' }),
  })
  .openapi('LoginRequest')

export const SignupRequestSchema = z
  .object({
    email: z.string().email().openapi({ example: 'user@example.com' }),
    password: z.string().min(6).openapi({ example: 'secure-password-123' }),
    name: z.string().optional().openapi({ example: 'John Doe' }),
  })
  .openapi('SignupRequest')

export const AuthResponseSchema = z
  .object({
    success: z.boolean(),
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().optional(),
    }),
    session: z.object({
      access_token: z.string(),
      refresh_token: z.string(),
      expires_at: z.number(),
    }),
  })
  .openapi('AuthResponse')

// ===== Request/Response Schemas =====

export const FileDataResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.array(PricingDataSchema),
    pagination: z.object({
      offset: z.number(),
      limit: z.number(),
      total: z.number(),
      hasMore: z.boolean(),
    }),
  })
  .openapi('FileDataResponse')

export const FilesListResponseSchema = z
  .object({
    success: z.literal(true),
    files: z.array(FileMetadataSchema),
  })
  .openapi('FilesListResponse')

export const EnrichmentRequestSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    country: z.string().length(2).optional(),
  })
  .openapi('EnrichmentRequest')

export const EnrichmentResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    results: z.object({
      weatherEnriched: z.number(),
      holidaysEnriched: z.number(),
      temporalFeaturesAdded: z.number(),
    }),
  })
  .openapi('EnrichmentResponse')

// Analytics request/response schemas
export const AnalyticsSummaryRequestSchema = z
  .object({
    data: z.array(z.unknown()).openapi({ description: 'Array of pricing data' }),
  })
  .openapi('AnalyticsSummaryRequest')

export const AnalyticsSummaryResponseSchema = z
  .object({
    success: z.literal(true),
    data: AnalyticsSummarySchema,
  })
  .openapi('AnalyticsSummaryResponse')

export const WeatherImpactRequestSchema = z
  .object({
    data: z.array(z.unknown()).openapi({ description: 'Array of pricing data with weather' }),
  })
  .openapi('WeatherImpactRequest')

export const WeatherImpactResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      correlation: z.number(),
      impactScore: z.number(),
      insights: z.string(),
    }),
  })
  .openapi('WeatherImpactResponse')

export const DemandForecastRequestSchema = z
  .object({
    data: z.array(z.unknown()).openapi({ description: 'Historical pricing data' }),
    daysAhead: z
      .number()
      .int()
      .positive()
      .optional()
      .openapi({ example: 14, description: 'Number of days to forecast' }),
  })
  .openapi('DemandForecastRequest')

export const DemandForecastResponseSchema = z
  .object({
    success: z.literal(true),
    data: DemandForecastSchema,
  })
  .openapi('DemandForecastResponse')
