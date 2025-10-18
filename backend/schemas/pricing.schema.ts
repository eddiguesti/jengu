import { z } from 'zod'

/**
 * Pricing quote request validation schema
 */
export const pricingQuoteSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  stayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  product: z.object({
    type: z.string().min(1),
    refundable: z.boolean(),
    los: z.number().int().positive(),
  }),
  toggles: z
    .object({
      strategy_fill_vs_rate: z.number().min(0).max(100).optional(),
      exploration_pct: z.number().min(0).max(20).optional(),
      risk_mode: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
      min_price: z.number().positive().optional(),
      max_price: z.number().positive().optional(),
      max_day_delta_pct: z.number().min(0).max(100).optional(),
    })
    .optional(),
  allowed_price_grid: z.array(z.number().positive()).optional(),
})

export type PricingQuoteRequest = z.infer<typeof pricingQuoteSchema>

/**
 * Pricing learning request validation schema
 * Accepts an array of outcome objects directly
 */
export const pricingLearnSchema = z.array(
  z.object({
    quote_id: z.string().uuid(),
    booked: z.boolean(),
    booking_time: z.string().optional(),
    cancelled: z.boolean().optional(),
    revenue_realized: z.number().optional(),
    no_show_bool: z.boolean().optional(),
  })
)

export type PricingLearnRequest = z.infer<typeof pricingLearnSchema>
