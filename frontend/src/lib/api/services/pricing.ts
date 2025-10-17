import apiClient from '../client'

/**
 * Pricing API Service
 * Handles communication with the pricing engine backend
 */

// ========================================
// Types
// ========================================

export interface PricingEntity {
  userId: string
  propertyId: string
}

export interface PricingProduct {
  type: string // 'standard', 'premium', etc.
  refundable: boolean
  los: number // length of stay
}

export interface PricingInventory {
  capacity: number | null
  remaining: number | null
  overbook_limit?: number
}

export interface PricingMarket {
  comp_price_p10?: number | null
  comp_price_p50?: number | null
  comp_price_p90?: number | null
}

export interface PricingContext {
  season?: string // 'winter', 'spring', 'summer', 'autumn'
  day_of_week?: number // 0-6
  weather?: Record<string, unknown>
}

export interface PricingToggles {
  strategy_fill_vs_rate?: number // 0-100 (0=fill, 100=rate)
  exploration_pct?: number // 0-20
  risk_mode?: 'conservative' | 'balanced' | 'aggressive'
  min_price?: number
  max_price?: number
  max_day_delta_pct?: number
  target_occ_by_lead?: Record<string, number>
}

export interface PricingQuoteRequest {
  propertyId: string
  stayDate: string // YYYY-MM-DD
  product: PricingProduct
  toggles?: PricingToggles
  allowed_price_grid?: number[]
}

export interface PricingQuoteResponse {
  success: boolean
  quote_id: string
  data: {
    price: number
    price_grid?: number[]
    conf_band?: {
      lower: number
      upper: number
    }
    expected?: {
      occ_now?: number
      occ_end_bucket?: number
    }
    reasons?: string[]
    safety?: Record<string, unknown>
  }
}

export interface PricingOutcome {
  quote_id: string
  booked: boolean
  booking_time?: string
  cancelled?: boolean
  revenue_realized?: number
  no_show_bool?: boolean
}

export interface PricingLearnRequest {
  outcomes: PricingOutcome[]
}

export interface PricingLearnResponse {
  success: boolean
  stored: number
  learn: {
    success: boolean
    processed: number
    message?: string
  }
}

export interface PricingReadinessCheck {
  success: boolean
  checks: Record<
    string,
    {
      ok: boolean
      message?: string
    }
  >
  timestamp: string
}

// ========================================
// API Functions
// ========================================

/**
 * Get a price quote for a specific stay date and product
 *
 * @param request - Pricing quote request parameters
 * @returns Price quote with recommendations and confidence bands
 *
 * @example
 * const quote = await getPricingQuote({
 *   propertyId: 'property-uuid',
 *   stayDate: '2025-08-20',
 *   product: { type: 'standard', refundable: false, los: 1 },
 *   toggles: {
 *     strategy_fill_vs_rate: 50,
 *     risk_mode: 'balanced',
 *     min_price: 60,
 *     max_price: 220
 *   }
 * })
 */
export const getPricingQuote = async (
  request: PricingQuoteRequest
): Promise<PricingQuoteResponse> => {
  const response = await apiClient.post<PricingQuoteResponse>('/pricing/quote', request)
  return response.data
}

/**
 * Submit booking outcomes for machine learning
 *
 * @param request - Learning request with booking outcomes
 * @returns Learning result with processing stats
 *
 * @example
 * const result = await submitPricingLearning({
 *   outcomes: [
 *     {
 *       quote_id: 'quote-uuid',
 *       booked: true,
 *       revenue_realized: 139.99
 *     }
 *   ]
 * })
 */
export const submitPricingLearning = async (
  request: PricingLearnRequest
): Promise<PricingLearnResponse> => {
  const response = await apiClient.post<PricingLearnResponse>('/pricing/learn', request.outcomes)
  return response.data
}

/**
 * Check pricing system readiness
 *
 * Validates that all required components are operational:
 * - Database tables exist
 * - Python pricing service is reachable
 * - Capacity configuration is set
 *
 * @returns Readiness check results
 *
 * @example
 * const readiness = await checkPricingReadiness()
 * if (readiness.success) {
 *   console.log('Pricing system is ready!')
 * }
 */
export const checkPricingReadiness = async (): Promise<PricingReadinessCheck> => {
  const response = await apiClient.get<PricingReadinessCheck>('/pricing/check-readiness')
  return response.data
}

/**
 * Get price quote for multiple dates
 *
 * Convenience function to get quotes for a date range
 *
 * @param propertyId - Property ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param days - Number of days to quote
 * @param product - Product configuration
 * @param toggles - Pricing strategy toggles
 * @returns Array of price quotes
 */
export const getPricingQuotesForRange = async (
  propertyId: string,
  startDate: string,
  days: number,
  product: PricingProduct,
  toggles?: PricingToggles
): Promise<PricingQuoteResponse[]> => {
  const quotes: PricingQuoteResponse[] = []
  const start = new Date(startDate)

  for (let i = 0; i < days; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    const stayDate = date.toISOString().split('T')[0]

    const quote = await getPricingQuote({
      propertyId,
      stayDate,
      product,
      toggles,
    })

    quotes.push(quote)
  }

  return quotes
}

// Re-export types for convenience
export type {
  PricingEntity as Entity,
  PricingProduct as Product,
  PricingInventory as Inventory,
  PricingMarket as Market,
  PricingContext as Context,
  PricingToggles as Toggles,
}
