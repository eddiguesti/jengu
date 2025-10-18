import { z } from 'zod'

/**
 * Analytics request validation schemas
 */

export const analyticsPropertySchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  dateRange: z
    .object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
  leadBucket: z.string().optional(),
  strategy: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  productType: z.string().optional(),
})

export type AnalyticsPropertyRequest = z.infer<typeof analyticsPropertySchema>

export const analyticsSummarySchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
})

export type AnalyticsSummaryRequest = z.infer<typeof analyticsSummarySchema>
