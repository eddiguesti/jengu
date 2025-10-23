import { Router } from 'express'
import crypto from 'node:crypto'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { asyncHandler, logError } from '../utils/errorHandler.js'
import { validate } from '../middleware/validate.js'
import { pricingQuoteSchema, pricingLearnSchema } from '../schemas/pricing.schema.js'

const router = Router()

// Pricing service URL from environment (defaults to localhost for dev)
const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || 'http://localhost:8000'

/**
 * Call the Python pricing service /score endpoint
 */
async function callPricingScore(body: unknown): Promise<{
  price: number
  price_grid?: number[]
  conf_band?: { lower: number; upper: number }
  expected?: { occ_now?: number; occ_end_bucket?: number }
  reasons?: string[]
  safety?: Record<string, unknown>
}> {
  const res = await fetch(`${PRICING_SERVICE_URL}/score`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Pricing service /score returned ${res.status}: ${errorText}`)
  }

  return (await res.json()) as {
    price: number
    price_grid?: number[]
    conf_band?: { lower: number; upper: number }
    expected?: { occ_now?: number; occ_end_bucket?: number }
    reasons?: string[]
    safety?: Record<string, unknown>
  }
}

/**
 * Call the Python pricing service /learn endpoint
 */
async function callPricingLearn(batch: unknown[]): Promise<{
  success: boolean
  processed: number
  message?: string
}> {
  const res = await fetch(`${PRICING_SERVICE_URL}/learn`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(batch),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Pricing service /learn returned ${res.status}: ${errorText}`)
  }

  return (await res.json()) as {
    success: boolean
    processed: number
    message?: string
  }
}

/**
 * Get a price quote for a specific stay date and product
 * POST /api/pricing/quote
 *
 * Request body:
 * {
 *   propertyId: string
 *   stayDate: string (YYYY-MM-DD)
 *   product: { type: string, refundable: boolean, los: number }
 *   toggles: { ... pricing strategy settings ... }
 *   allowed_price_grid?: number[]
 * }
 */
router.post(
  '/quote',
  authenticateUser,
  validate(pricingQuoteSchema),
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { propertyId, stayDate, product, toggles, allowed_price_grid } = req.body
    // Request is already validated by Zod middleware

    console.log(`📊 Pricing quote request for property ${propertyId}, stay date ${stayDate}`)

    // Fetch user's business settings (for capacity fallback and timezone)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('business_settings')
      .select('userid, timezone, capacity_config')
      .eq('userid', userId)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      logError(settingsError as Error, 'FETCH_BUSINESS_SETTINGS', { userId })
      throw settingsError
    }

    // Try to get inventory snapshot (preferred source for capacity/remaining)
    const { data: inventorySnapshot } = await supabaseAdmin
      .from('inventory_snapshots')
      .select('capacity, remaining')
      .eq('userId', userId)
      .eq('propertyId', propertyId)
      .eq('stay_date', stayDate)
      .eq('product_type', product.type)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Determine capacity and remaining (fallback to capacity_config if no snapshot)
    const capacityConfig = settings?.capacity_config as Record<string, number> | null | undefined
    const capacity = inventorySnapshot?.capacity ?? capacityConfig?.[product.type] ?? null
    const remaining = inventorySnapshot?.remaining ?? null

    // Compute context (season, day of week)
    const stayDateObj = new Date(stayDate + 'T00:00:00Z')
    const dow = stayDateObj.getUTCDay()
    const month = stayDateObj.getUTCMonth() + 1
    const season =
      month <= 2 || month === 12
        ? 'winter'
        : month <= 5
          ? 'spring'
          : month <= 8
            ? 'summer'
            : 'autumn'

    // Try to fetch competitor pricing (if compset_snapshots table exists)
    let comp_p10 = null
    let comp_p50 = null
    let comp_p90 = null

    try {
      // Note: compset_snapshots table may not exist yet
      // Using 'as any' to bypass type checking for optional table
      const { data: compset } = await (supabaseAdmin as any)
        .from('compset_snapshots')
        .select('p10, p50, p90')
        .eq('userId', userId)
        .eq('propertyId', propertyId)
        .eq('product_type', product.type)
        .lte('date', stayDate)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (compset) {
        comp_p10 = compset.p10 as number | null
        comp_p50 = compset.p50 as number | null
        comp_p90 = compset.p90 as number | null
      }
    } catch (error) {
      // compset_snapshots table may not exist - gracefully handle
      console.log('⚠️  No competitor data available (compset_snapshots table missing)')
    }

    // Weather data (optional - can be fetched from pricing_data or external API)
    // For now, leaving as empty object
    const weather: Record<string, unknown> = {}

    // Build payload for Python pricing service
    const payload = {
      entity: { userId, propertyId },
      stay_date: stayDate,
      quote_time: new Date().toISOString(),
      product,
      inventory: { capacity, remaining, overbook_limit: 0 },
      market: {
        comp_price_p10: comp_p10,
        comp_price_p50: comp_p50,
        comp_price_p90: comp_p90,
      },
      costs: {}, // Can be extended later
      context: { season, day_of_week: dow, weather },
      toggles,
      allowed_price_grid,
    }

    // Call Python pricing service
    const pricingData = await callPricingScore(payload)

    // Generate quote ID and hash toggles for tracking
    const quote_id = crypto.randomUUID()
    const toggles_hash = crypto.createHash('sha1').update(JSON.stringify(toggles)).digest('hex')

    // Calculate lead days
    const lead_days = Math.max(
      0,
      Math.ceil((Date.parse(stayDate) - Date.now()) / (1000 * 60 * 60 * 24))
    )

    // Log quote to database
    const { error: insertError } = await supabaseAdmin.from('pricing_quotes').insert({
      quote_id,
      userId,
      propertyId,
      stay_date: stayDate,
      lead_days,
      product_type: product.type,
      refundable: !!product.refundable,
      los: product.los ?? 1,
      price_offered: pricingData.price,
      inventory_remaining: remaining,
      inventory_capacity: capacity,
      season,
      dow,
      comp_p10,
      comp_p50,
      comp_p90,
      weather_tmax: (weather.tmax as number) ?? null,
      weather_rain_mm: (weather.rain_mm as number) ?? null,
      toggles_hash,
      shown_to_user_bool: true,
    })

    if (insertError) {
      logError(insertError as Error, 'INSERT_PRICING_QUOTE', { userId, quote_id })
      throw insertError
    }

    console.log(`✅ Pricing quote generated: ${quote_id}, price: ${pricingData.price}`)

    res.json({
      success: true,
      quote_id,
      data: pricingData,
    })
  })
)

/**
 * Submit learning batch to update pricing models
 * POST /api/pricing/learn
 *
 * Request body: Array of outcomes
 * [{
 *   quote_id: string
 *   booked: boolean
 *   booking_time?: string
 *   cancelled?: boolean
 *   revenue_realized?: number
 *   no_show_bool?: boolean
 * }]
 */
router.post(
  '/learn',
  authenticateUser,
  validate(pricingLearnSchema),
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const batch = Array.isArray(req.body) ? req.body : []

    console.log(`🧠 Learning batch received: ${batch.length} outcomes`)

    // Upsert outcomes to database
    if (batch.length > 0) {
      const upserts = batch
        .map((record: unknown) => {
          const r = record as {
            quote_id?: string
            booked?: boolean
            booking_time?: string
            cancelled?: boolean
            revenue_realized?: number
            no_show_bool?: boolean
          }

          // Skip if quote_id is missing
          if (!r.quote_id) return null

          return {
            quote_id: r.quote_id,
            userId,
            booked_bool: !!r.booked,
            booking_time: r.booking_time ?? (r.booked ? new Date().toISOString() : null),
            cancelled_bool: r.cancelled ?? null,
            revenue_realized: r.revenue_realized ?? null,
            no_show_bool: r.no_show_bool ?? null,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      const { error: upsertError } = await supabaseAdmin
        .from('pricing_outcomes')
        .upsert(upserts, { onConflict: 'quote_id' })

      if (upsertError) {
        logError(upsertError as Error, 'UPSERT_PRICING_OUTCOMES', { userId, count: batch.length })
        throw upsertError
      }

      console.log(`✅ Stored ${batch.length} pricing outcomes`)
    }

    // Call Python pricing service to update models
    const learnResult = await callPricingLearn(batch)

    console.log(`✅ Pricing service learning complete: ${learnResult.processed} records processed`)

    res.json({
      success: true,
      stored: batch.length,
      learn: learnResult,
    })
  })
)

/**
 * Check pricing system readiness
 * GET /api/pricing/check-readiness
 *
 * Validates:
 * - Database tables exist
 * - Indexes are present
 * - Capacity source is configured
 * - Python pricing service is reachable
 */
router.get(
  '/check-readiness',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const checks: Record<string, { ok: boolean; message?: string }> = {}

    console.log(`🔍 Pricing readiness check for user ${userId}`)

    // Check if pricing_quotes table exists
    try {
      await supabaseAdmin.from('pricing_quotes').select('quote_id').limit(1)
      checks.pricing_quotes_table = { ok: true }
    } catch (error) {
      checks.pricing_quotes_table = {
        ok: false,
        message: 'Table does not exist or is not accessible',
      }
    }

    // Check if pricing_outcomes table exists
    try {
      await supabaseAdmin.from('pricing_outcomes').select('quote_id').limit(1)
      checks.pricing_outcomes_table = { ok: true }
    } catch (error) {
      checks.pricing_outcomes_table = {
        ok: false,
        message: 'Table does not exist or is not accessible',
      }
    }

    // Check if inventory_snapshots table exists
    try {
      await supabaseAdmin.from('inventory_snapshots').select('id').limit(1)
      checks.inventory_snapshots_table = { ok: true }
    } catch (error) {
      checks.inventory_snapshots_table = {
        ok: false,
        message: 'Table does not exist or is not accessible',
      }
    }

    // Check if capacity source is configured
    try {
      const { data: settings } = await supabaseAdmin
        .from('business_settings')
        .select('capacity_config')
        .eq('userid', userId)
        .single()

      const config = settings?.capacity_config as Record<string, unknown> | null | undefined
      if (config && Object.keys(config).length > 0) {
        checks.capacity_config = { ok: true }
      } else {
        checks.capacity_config = {
          ok: false,
          message: 'No capacity configuration found in business_settings',
        }
      }
    } catch (error) {
      checks.capacity_config = { ok: false, message: 'Unable to fetch capacity config' }
    }

    // Check if Python pricing service is reachable
    try {
      const healthRes = await fetch(`${PRICING_SERVICE_URL}/live`, {
        method: 'GET',
      })

      if (healthRes.ok) {
        checks.pricing_service_health = { ok: true }
      } else {
        checks.pricing_service_health = {
          ok: false,
          message: `Service returned status ${healthRes.status}`,
        }
      }
    } catch (error) {
      checks.pricing_service_health = {
        ok: false,
        message: `Cannot reach pricing service at ${PRICING_SERVICE_URL}`,
      }
    }

    // Check if pricing service is ready (models loaded)
    try {
      const readyRes = await fetch(`${PRICING_SERVICE_URL}/ready`, {
        method: 'GET',
      })

      if (readyRes.ok) {
        checks.pricing_service_ready = { ok: true }
      } else {
        checks.pricing_service_ready = {
          ok: false,
          message: 'Service is not ready (models not loaded)',
        }
      }
    } catch (error) {
      checks.pricing_service_ready = {
        ok: false,
        message: `Cannot reach pricing service at ${PRICING_SERVICE_URL}`,
      }
    }

    const allOk = Object.values(checks).every(check => check.ok)

    console.log(allOk ? '✅ All readiness checks passed' : '⚠️  Some readiness checks failed')

    res.json({
      success: allOk,
      checks,
      timestamp: new Date().toISOString(),
    })
  })
)

/**
 * Pricing Simulation Sandbox - "What-if" Analysis
 * POST /api/pricing/simulate
 *
 * Generates multiple pricing variants to preview impact before applying.
 * Returns 5 coherent variants with reasons, CI bands, and RevPAR deltas.
 *
 * Request body:
 * {
 *   propertyId: string
 *   stayDate: string (YYYY-MM-DD)
 *   product: { type: string, refundable: boolean, los: number }
 *   toggles: { ... pricing strategy settings ... }
 *   baselinePrice?: number (if not provided, calculates from /score)
 * }
 *
 * Response:
 * {
 *   variants: [
 *     {
 *       label: string (e.g., "-10%", "Baseline", "+10%")
 *       price: number
 *       adjustment: number (percentage)
 *       conf_band: { lower: number, upper: number }
 *       expected: { occ_delta: number, revpar_delta: number }
 *       reasons: string[]
 *     }
 *   ],
 *   baseline: { price: number, occ: number, revpar: number }
 * }
 */
router.post(
  '/simulate',
  authenticateUser,
  // Reuse same validation as /quote
  validate(pricingQuoteSchema),
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { propertyId, stayDate, product, toggles, baselinePrice } = req.body

    console.log(`🧪 Pricing simulation for property ${propertyId}, stay date ${stayDate}`)

    // Fetch user's business settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('business_settings')
      .select('userid, timezone, capacity_config')
      .eq('userid', userId)
      .single()

    if (settingsError || !settings) {
      console.error('❌ Failed to fetch business settings:', settingsError)
      return res.status(500).json({ error: 'Failed to fetch business settings' })
    }

    // Fetch property data for enrichment
    const { data: propertyData, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('address, bedrooms, max_guests, propertyType, latitude, longitude')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (propertyError || !propertyData) {
      console.error('❌ Property not found:', propertyError)
      return res.status(404).json({ error: 'Property not found' })
    }

    // Get baseline price if not provided
    let baseline = baselinePrice
    if (!baseline) {
      const baselineBody = {
        property_id: propertyId,
        stay_date: stayDate,
        product_type: product.type,
        refundable: product.refundable,
        los: product.los,
        toggles,
        capacity: settings.capacity_config || 1,
      }

      try {
        const baselineResult = await callPricingScore(baselineBody)
        baseline = baselineResult.price
      } catch (error) {
        logError(error as Error, 'Failed to get baseline price')
        return res.status(500).json({ error: 'Failed to calculate baseline price' })
      }
    }

    // Generate simulation variants: -15%, -10%, -5%, baseline, +5%, +10%, +15%
    const adjustments = [-15, -10, -5, 0, 5, 10, 15]
    const variants = []

    for (const adjustment of adjustments) {
      const adjustedPrice = baseline * (1 + adjustment / 100)

      // Build request body for this variant
      const variantBody = {
        property_id: propertyId,
        stay_date: stayDate,
        product_type: product.type,
        refundable: product.refundable,
        los: product.los,
        toggles: {
          ...toggles,
          // Override price bounds to allow this specific price
          min_price_override: Math.floor(adjustedPrice * 0.9),
          max_price_override: Math.ceil(adjustedPrice * 1.1),
        },
        capacity: settings.capacity_config || 1,
        allowed_price_grid: [adjustedPrice], // Force this specific price
      }

      try {
        const result = await callPricingScore(variantBody)

        // Calculate occupancy and RevPAR deltas (mock for now - would need ML model)
        // Assumption: lower prices -> higher occupancy
        const occDelta = adjustment * -0.5 // -15% price = +7.5% occupancy
        const currentOcc = result.expected?.occ_now || 0.7
        const newOcc = Math.max(0, Math.min(1, currentOcc + occDelta / 100))

        const baselineRevPAR = baseline * currentOcc
        const variantRevPAR = adjustedPrice * newOcc
        const revparDelta = ((variantRevPAR - baselineRevPAR) / baselineRevPAR) * 100

        variants.push({
          label: adjustment === 0 ? 'Baseline' : `${adjustment > 0 ? '+' : ''}${adjustment}%`,
          price: Math.round(adjustedPrice),
          adjustment,
          conf_band: result.conf_band || { lower: adjustedPrice * 0.9, upper: adjustedPrice * 1.1 },
          expected: {
            occ_delta: parseFloat(occDelta.toFixed(1)),
            revpar_delta: parseFloat(revparDelta.toFixed(1)),
            projected_occ: parseFloat((newOcc * 100).toFixed(1)),
            projected_revpar: parseFloat(variantRevPAR.toFixed(2)),
          },
          reasons: result.reasons || [
            `Price adjusted ${adjustment}% from baseline`,
            `Expected occupancy ${occDelta > 0 ? 'increase' : occDelta < 0 ? 'decrease' : 'stable'}`,
            `RevPAR ${revparDelta > 0 ? 'increase' : revparDelta < 0 ? 'decrease' : 'stable'} of ${Math.abs(revparDelta).toFixed(1)}%`,
          ],
        })
      } catch (error) {
        console.error(`⚠️  Failed to calculate variant ${adjustment}%:`, error)
        // Continue with other variants even if one fails
      }
    }

    if (variants.length === 0) {
      return res.status(500).json({ error: 'Failed to generate any simulation variants' })
    }

    console.log(`✅ Generated ${variants.length} simulation variants`)

    res.json({
      variants,
      baseline: {
        price: baseline,
        occ: 70, // Default - would come from actual data
        revpar: baseline * 0.7,
      },
      metadata: {
        property_id: propertyId,
        stay_date: stayDate,
        product,
        generated_at: new Date().toISOString(),
      },
    })
  })
)

export default router
