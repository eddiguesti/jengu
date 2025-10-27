import { Router } from 'express'
import axios from 'axios'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { SanaryCampingScraper } from '../scrapers/SanaryCampingScraper.js'
import { CampingAndCoScraper } from '../scrapers/CampingAndCoScraper.js'

const router = Router()

/**
 * Scrape competitor website
 * POST /api/competitor/scrape
 */
router.post(
  '/scrape',
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
      timeout: 30000,
    })

    res.json({ success: true, html: response.data })
  })
)

/**
 * Search hotels via Makcorps API
 * POST /api/hotels/search
 */
router.post(
  '/hotels/search',
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
        timeout: 20000,
      }
    )

    res.json(response.data)
  })
)

/**
 * Scrape Sanary-sur-Mer campsite competitors
 * GET /api/competitor/sanary-campsites
 *
 * Scrapes competitor pricing from:
 * - vacances-campings.fr
 * - camping.fr
 * - Local campsite websites
 *
 * Returns cached data if available (24h cache)
 */
router.get(
  '/sanary-campsites',
  asyncHandler(async (req, res) => {
    const scraper = new SanaryCampingScraper()

    try {
      const campsites = await scraper.scrapeAllCompetitors()

      // Group by location for better organization
      const byLocation = campsites.reduce((acc: any, camp: any) => {
        const location = camp.location || 'Unknown'
        if (!acc[location]) {
          acc[location] = []
        }
        acc[location].push(camp)
        return acc
      }, {})

      // Calculate price statistics
      const prices = campsites.filter((c: any) => c.price).map((c: any) => c.price)
      const stats =
        prices.length > 0
          ? {
              min: Math.min(...prices),
              max: Math.max(...prices),
              avg: prices.reduce((a: number, b: number) => a + b, 0) / prices.length,
            }
          : null

      res.json({
        success: true,
        data: {
          campsites,
          byLocation,
          stats,
          total: campsites.length,
          scrapedAt: new Date().toISOString(),
        },
      })
    } catch (error: any) {
      console.error('Error scraping Sanary campsites:', error)
      return sendError(res, 'SCRAPER_ERROR', error.message || 'Failed to scrape competitor data')
    }
  })
)

/**
 * Discover competitor campsites using camping-and-co.com
 * POST /api/competitor/discover
 *
 * Body: { location: string, radiusKm: number }
 * Returns: Array of nearby campsites with photos, pricing, distance
 */
router.post(
  '/discover',
  asyncHandler(async (req, res) => {
    const { location, radiusKm = 50 } = req.body

    if (!location) {
      return sendError(res, 'VALIDATION', 'Missing required field: location')
    }

    console.log(`🔍 Discovering competitors near: ${location} (${radiusKm}km radius)`)

    const scraper = new CampingAndCoScraper()

    try {
      const campsites = await scraper.searchByLocation(location, radiusKm)

      res.json({
        success: true,
        data: {
          campsites,
          total: campsites.length,
          location,
          radiusKm,
          scrapedAt: new Date().toISOString(),
        },
      })
    } catch (error: any) {
      console.error('❌ Error discovering campsites:', error)
      return sendError(
        res,
        'SCRAPER_ERROR',
        error.message || 'Failed to discover competitor campsites'
      )
    }
  })
)

/**
 * Get detailed information about a specific campsite
 * POST /api/competitor/details
 *
 * Body: { url: string }
 * Returns: Detailed campsite data including all photos, amenities, coordinates
 */
router.post(
  '/details',
  asyncHandler(async (req, res) => {
    const { url } = req.body

    if (!url) {
      return sendError(res, 'VALIDATION', 'Missing required field: url')
    }

    console.log(`🔍 Fetching details for: ${url}`)

    const scraper = new CampingAndCoScraper()

    try {
      const details = await scraper.getCampsiteDetails(url)

      res.json({
        success: true,
        data: details,
      })
    } catch (error: any) {
      console.error('❌ Error fetching campsite details:', error)
      return sendError(res, 'SCRAPER_ERROR', error.message || 'Failed to fetch campsite details')
    }
  })
)

/**
 * Get pricing data for a campsite
 * POST /api/competitor/pricing
 *
 * Body: { url: string, startDate: string, endDate: string, occupancy: number }
 * Returns: Array of pricing data points
 */
router.post(
  '/pricing',
  asyncHandler(async (req, res) => {
    const { url, startDate, endDate, occupancy = 4 } = req.body

    if (!url || !startDate || !endDate) {
      return sendError(res, 'VALIDATION', 'Missing required fields: url, startDate, endDate')
    }

    console.log(`💰 Fetching pricing for: ${url}`)

    const scraper = new CampingAndCoScraper()

    try {
      const pricing = await scraper.getPricing(
        url,
        new Date(startDate),
        new Date(endDate),
        occupancy
      )

      res.json({
        success: true,
        data: {
          pricing,
          total: pricing.length,
          url,
          dateRange: { startDate, endDate },
          occupancy,
        },
      })
    } catch (error: any) {
      console.error('❌ Error fetching pricing:', error)
      return sendError(res, 'SCRAPER_ERROR', error.message || 'Failed to fetch pricing data')
    }
  })
)

// ============================================
// Monitoring Endpoints
// ============================================

/**
 * Start monitoring a competitor
 * POST /api/competitor/monitor/start
 *
 * Body: { campsite: CampsiteResult }
 * Returns: { success: true, competitor: {...} }
 */
router.post(
  '/monitor/start',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { campsite } = req.body
    const userId = req.userId

    if (!campsite || !campsite.id || !campsite.name || !campsite.url) {
      return sendError(res, 'VALIDATION', 'Invalid campsite data')
    }

    console.log(`👁️  User ${userId} starting to monitor: ${campsite.name}`)

    try {
      // Check if already monitoring (using admin client to bypass RLS)
      const { data: existing } = await supabaseAdmin
        .from('competitors')
        .select('id, is_monitoring')
        .eq('user_id', userId)
        .eq('campsite_id', campsite.id)
        .single()

      if (existing) {
        // Update existing competitor to resume monitoring
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('competitors')
          .update({
            is_monitoring: true,
            monitoring_started_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) throw updateError

        return res.json({
          success: true,
          data: {
            competitor: updated,
            message: 'Resumed monitoring competitor',
          },
        })
      }

      // Insert new competitor (using admin client to bypass RLS)
      const { data: competitor, error: insertError } = await supabaseAdmin
        .from('competitors')
        .insert({
          user_id: userId,
          campsite_id: campsite.id,
          name: campsite.name,
          url: campsite.url,
          photo_url: campsite.photoUrl,
          photos: campsite.photos,
          address: campsite.address,
          town: campsite.town,
          region: campsite.region,
          latitude: campsite.coordinates?.latitude || null,
          longitude: campsite.coordinates?.longitude || null,
          distance: campsite.distance,
          distance_text: campsite.distanceText,
          rating: campsite.rating,
          review_count: campsite.reviewCount || 0,
          amenities: campsite.amenities,
          description: campsite.description || '',
          is_monitoring: true,
          monitoring_started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      console.log(`✅ Now monitoring: ${campsite.name} (ID: ${competitor.id})`)

      res.json({
        success: true,
        data: {
          competitor,
          message: 'Started monitoring competitor',
        },
      })
    } catch (error: any) {
      console.error('❌ Error starting monitoring:', error)
      return sendError(res, 'DATABASE_ERROR', error.message || 'Failed to start monitoring')
    }
  })
)

/**
 * Stop monitoring a competitor
 * POST /api/competitor/monitor/stop
 *
 * Body: { competitorId: string }
 * Returns: { success: true }
 */
router.post(
  '/monitor/stop',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { competitorId } = req.body
    const userId = req.userId

    if (!competitorId) {
      return sendError(res, 'VALIDATION', 'Missing competitorId')
    }

    console.log(`⏸️  User ${userId} stopping monitoring: ${competitorId}`)

    try {
      const { data, error } = await supabaseAdmin
        .from('competitors')
        .update({ is_monitoring: false })
        .eq('id', competitorId)
        .eq('user_id', userId) // Ensure user owns this competitor
        .select()
        .single()

      if (error) throw error

      if (!data) {
        return sendError(res, 'NOT_FOUND', 'Competitor not found or access denied')
      }

      res.json({
        success: true,
        data: {
          competitor: data,
          message: 'Stopped monitoring competitor',
        },
      })
    } catch (error: any) {
      console.error('❌ Error stopping monitoring:', error)
      return sendError(res, 'DATABASE_ERROR', error.message || 'Failed to stop monitoring')
    }
  })
)

/**
 * Get all monitored competitors for the user
 * GET /api/competitor/monitor/list
 *
 * Returns: { success: true, competitors: [...] }
 */
router.get(
  '/monitor/list',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId

    console.log(`📋 Fetching monitored competitors for user: ${userId}`)

    try {
      const { data: competitors, error } = await supabaseAdmin
        .from('competitors')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      res.json({
        success: true,
        data: {
          competitors: competitors || [],
          total: competitors?.length || 0,
          monitoring: competitors?.filter(c => c.is_monitoring).length || 0,
        },
      })
    } catch (error: any) {
      console.error('❌ Error fetching monitored competitors:', error)
      return sendError(res, 'DATABASE_ERROR', error.message || 'Failed to fetch competitors')
    }
  })
)

/**
 * Delete a competitor
 * DELETE /api/competitor/monitor/:competitorId
 *
 * Returns: { success: true }
 */
router.delete(
  '/monitor/:competitorId',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { competitorId } = req.params
    const userId = req.userId

    console.log(`🗑️  User ${userId} deleting competitor: ${competitorId}`)

    try {
      const { error } = await supabaseAdmin
        .from('competitors')
        .delete()
        .eq('id', competitorId)
        .eq('user_id', userId) // Ensure user owns this competitor

      if (error) throw error

      res.json({
        success: true,
        data: {
          message: 'Competitor deleted successfully',
        },
      })
    } catch (error: any) {
      console.error('❌ Error deleting competitor:', error)
      return sendError(res, 'DATABASE_ERROR', error.message || 'Failed to delete competitor')
    }
  })
)

export default router
