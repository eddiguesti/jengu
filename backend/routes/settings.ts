import { Router } from 'express'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { asyncHandler, logError } from '../utils/errorHandler.js'

const router = Router()

/**
 * Get user's business settings
 * GET /api/settings
 */
router.get(
  '/',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!

    const { data: settings, error } = await supabaseAdmin
      .from('business_settings')
      .select('*')
      .eq('userid', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      logError(error as Error, 'GET_SETTINGS', { userId })
      throw error
    }

    res.json({
      success: true,
      settings: settings || {},
    })
  })
)

/**
 * Save/update user's business settings
 * POST /api/settings
 */
router.post(
  '/',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { business_name, property_type, city, country, latitude, longitude, currency, timezone } =
      req.body

    console.log(`💾 Saving settings for user: ${userId}`)

    const { data: existingSettings } = await supabaseAdmin
      .from('business_settings')
      .select('id')
      .eq('userid', userId)
      .single()

    let result
    if (existingSettings) {
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
          updatedat: new Date().toISOString(),
        })
        .eq('userid', userId)
        .select()
        .single()

      if (error) {
        logError(error as Error, 'UPDATE_SETTINGS', { userId })
        throw error
      }
      result = data
      console.log('✅ Settings updated')
    } else {
      const { data, error } = await supabaseAdmin
        .from('business_settings')
        .insert({
          userid: userId,
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

export default router
