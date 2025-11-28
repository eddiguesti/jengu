import { Router } from 'express'
import { authenticateUser, supabaseAdmin } from '../lib/supabase.js'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import {
  generateAdvancedPricingRecommendations,
  calculatePricingAnalytics,
} from '../services/advancedPricingEngine.js'

const router = Router()

/**
 * GET /api/pricing/advanced/recommendations
 * Generate revenue-optimized pricing recommendations using ALL enriched data
 *
 * Query params:
 * - propertyId: Property UUID
 * - days: Number of days to forecast (default: 30)
 * - strategy: conservative | balanced | aggressive (default: balanced)
 */
router.get(
  '/advanced/recommendations',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const {
      propertyId,
      days = '30',
      strategy = 'balanced',
      minPrice,
      maxPrice,
      targetOccupancy,
    } = req.query

    if (!propertyId || typeof propertyId !== 'string') {
      return sendError(res, 'MISSING_PARAMETER', 'Property ID is required')
    }

    const forecastDays = parseInt(days as string)
    if (isNaN(forecastDays) || forecastDays < 1 || forecastDays > 90) {
      return sendError(res, 'INVALID_PARAMETER', 'Days must be between 1 and 90')
    }

    const validStrategies = ['conservative', 'balanced', 'aggressive']
    if (!validStrategies.includes(strategy as string)) {
      return sendError(
        res,
        'INVALID_PARAMETER',
        'Strategy must be conservative, balanced, or aggressive'
      )
    }

    console.log(`\n🎯 Generating advanced pricing recommendations for property ${propertyId}...`)
    console.log(`   Strategy: ${strategy}`)
    console.log(`   Forecast days: ${forecastDays}`)

    // Verify property ownership
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, name')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found or access denied')
    }

    // Fetch ALL enriched historical data
    const { data: historicalData, error: dataError } = await supabaseAdmin
      .from('pricing_data')
      .select(
        `
        date,
        price,
        occupancy,
        bookings,
        dayOfWeek,
        month,
        season,
        isWeekend,
        temperature,
        precipitation,
        weatherCondition,
        sunshineHours,
        isHoliday,
        holidayName
      `
      )
      .eq('propertyId', propertyId)
      .order('date', { ascending: true })

    if (dataError) {
      console.error('Failed to fetch pricing data:', dataError)
      return sendError(res, 'DATABASE_ERROR', 'Failed to fetch pricing data')
    }

    if (!historicalData || historicalData.length < 14) {
      return sendError(
        res,
        'INSUFFICIENT_DATA',
        'At least 14 days of historical data required for accurate pricing recommendations'
      )
    }

    console.log(`✅ Loaded ${historicalData.length} days of enriched data`)

    // Calculate current average price
    const prices = historicalData.map(d => d.price).filter((p): p is number => p != null && p > 0)
    const currentAveragePrice =
      prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

    console.log(`💰 Current average price: €${currentAveragePrice.toFixed(2)}`)

    // ✅ CRITICAL FIX: Fetch future weather forecast from Open-Meteo API (FREE, no API key)
    let futureWeather: Array<{
      date: string
      temperature?: number
      weatherCondition?: string
      precipitation?: number
    }> = []

    try {
      // Get property location for weather forecast
      const { data: propertyDetails } = (await supabaseAdmin
        .from('properties')
        .select('latitude, longitude')
        .eq('id', propertyId)
        .single()) as { data: { latitude?: number; longitude?: number } | null }

      if (propertyDetails?.latitude && propertyDetails?.longitude) {
        console.log(
          `🌤️  Fetching weather forecast for (${propertyDetails.latitude}, ${propertyDetails.longitude})...`
        )

        // Open-Meteo Free API - 16 day forecast (no API key needed)
        const maxForecastDays = Math.min(forecastDays, 16) // API limit
        const weatherUrl =
          `https://api.open-meteo.com/v1/forecast?` +
          `latitude=${propertyDetails.latitude}&` +
          `longitude=${propertyDetails.longitude}&` +
          `daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&` +
          `forecast_days=${maxForecastDays}&` +
          `timezone=auto`

        const weatherResponse = await fetch(weatherUrl)

        if (weatherResponse.ok) {
          const weatherData = (await weatherResponse.json()) as {
            daily: {
              time: string[]
              temperature_2m_max: number[]
              temperature_2m_min: number[]
              precipitation_sum: number[]
              weathercode: number[]
            }
          }

          futureWeather = weatherData.daily.time.map((date: string, i: number) => {
            const tempMax = weatherData.daily.temperature_2m_max[i]
            const tempMin = weatherData.daily.temperature_2m_min[i]
            const avgTemp = (tempMax + tempMin) / 2
            const precipitation = weatherData.daily.precipitation_sum[i]
            const weatherCode = weatherData.daily.weathercode[i]

            // Map WMO weather codes to conditions
            let condition = 'Clear'
            if (weatherCode === 0) condition = 'Clear'
            else if (weatherCode <= 3) condition = 'Partly Cloudy'
            else if (weatherCode <= 49) condition = 'Foggy'
            else if (weatherCode <= 69) condition = 'Rainy'
            else if (weatherCode <= 79) condition = 'Snowy'
            else if (weatherCode <= 99) condition = 'Stormy'

            return {
              date,
              temperature: Math.round(avgTemp * 10) / 10,
              weatherCondition: condition,
              precipitation: Math.round(precipitation * 10) / 10,
            }
          })

          console.log(`✅ Fetched weather forecast for ${futureWeather.length} days`)
        } else {
          console.warn(
            `⚠️  Weather API returned ${weatherResponse.status}, using historical patterns`
          )
        }
      } else {
        console.warn('⚠️  No location data for property, skipping weather forecast')
      }
    } catch (error) {
      console.error('❌ Failed to fetch weather forecast:', error)
      // Continue without weather forecast - model will use historical patterns
    }

    // Fetch future holidays from cache (if table exists)
    let holidaysList: { date: string; holidayName: string }[] = []
    try {
      const { data: futureHolidays } = await (supabaseAdmin as any)
        .from('holiday_cache')
        .select('date, holiday_name')
        .gte('date', new Date().toISOString().split('T')[0])
        .lte(
          'date',
          new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        )

      holidaysList =
        futureHolidays?.map((h: any) => ({
          date: h.date,
          holidayName: h.holiday_name,
        })) || []
    } catch {
      // Table may not exist
    }

    console.log(`🎉 Found ${holidaysList.length} upcoming holidays in forecast period`)

    // Generate advanced recommendations
    const constraints = {
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      targetOccupancy: targetOccupancy ? parseFloat(targetOccupancy as string) : undefined,
      strategy: strategy as 'conservative' | 'balanced' | 'aggressive',
    }

    const recommendations = generateAdvancedPricingRecommendations(
      historicalData as any,
      forecastDays,
      currentAveragePrice,
      futureWeather,
      holidaysList,
      constraints
    )

    // Calculate analytics
    const analytics = calculatePricingAnalytics(historicalData as any)

    console.log(`\n✅ Generated ${recommendations.length} pricing recommendations`)
    console.log(`📊 Price elasticity: ${analytics.priceElasticity.toFixed(2)}`)
    console.log(`🏖️  Peak days: ${analytics.peakDays.join(', ')}`)
    console.log(`📉 Low days: ${analytics.lowDays.join(', ')}`)
    console.log(`🌡️  Weather sensitivity: ${analytics.weatherSensitivity.toFixed(2)}`)
    console.log(`🎉 Holiday premium: ${(analytics.holidayPremium * 100).toFixed(1)}%`)
    console.log(`📅 Weekend premium: ${(analytics.weekendPremium * 100).toFixed(1)}%`)

    // Calculate summary metrics
    const avgRecommendedPrice =
      recommendations.reduce((sum, r) => sum + r.recommendedPrice, 0) / recommendations.length
    const avgPriceChange =
      recommendations.reduce((sum, r) => sum + r.priceChange, 0) / recommendations.length
    const avgRevenueImpact =
      recommendations.reduce((sum, r) => sum + r.revenueImpact, 0) / recommendations.length
    const highConfidenceCount = recommendations.filter(r => r.confidence === 'very_high').length

    res.json({
      success: true,
      property: {
        id: property.id,
        name: property.name,
      },
      summary: {
        forecastDays: recommendations.length,
        currentAveragePrice: Math.round(currentAveragePrice),
        recommendedAveragePrice: Math.round(avgRecommendedPrice),
        averagePriceChange: Math.round(avgPriceChange),
        averageRevenueImpact: Math.round(avgRevenueImpact * 10) / 10,
        highConfidenceCount,
        dataQuality: {
          historicalDays: historicalData.length,
          enrichmentComplete:
            historicalData.filter(d => d.temperature !== null).length / historicalData.length,
          holidayDataAvailable: holidaysList.length,
        },
      },
      analytics,
      recommendations,
      metadata: {
        generatedAt: new Date().toISOString(),
        strategy,
        model: 'advanced-revenue-optimization-v1',
        features: [
          'price-elasticity',
          'weather-aware',
          'holiday-surge',
          'seasonal-patterns',
          'weekend-pricing',
          'revenue-optimization',
        ],
      },
    })
  })
)

/**
 * GET /api/pricing/advanced/analytics
 * Get comprehensive pricing analytics
 */
router.get(
  '/advanced/analytics',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { propertyId } = req.query

    if (!propertyId || typeof propertyId !== 'string') {
      return sendError(res, 'MISSING_PARAMETER', 'Property ID is required')
    }

    // Verify property ownership
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, name')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (propertyError || !property) {
      return sendError(res, 'NOT_FOUND', 'Property not found or access denied')
    }

    // Fetch enriched historical data
    const { data: historicalData, error: dataError } = await supabaseAdmin
      .from('pricing_data')
      .select(
        `
        date,
        price,
        occupancy,
        dayOfWeek,
        month,
        season,
        isWeekend,
        temperature,
        isHoliday
      `
      )
      .eq('propertyId', propertyId)
      .order('date', { ascending: true })

    if (dataError) {
      return sendError(res, 'DATABASE_ERROR', 'Failed to fetch pricing data')
    }

    if (!historicalData || historicalData.length < 14) {
      return sendError(res, 'INSUFFICIENT_DATA', 'At least 14 days of data required')
    }

    const analytics = calculatePricingAnalytics(historicalData as any)

    res.json({
      success: true,
      property: {
        id: property.id,
        name: property.name,
      },
      analytics,
      dataQuality: {
        totalDays: historicalData.length,
        enrichedDays: historicalData.filter(d => d.temperature !== null).length,
        enrichmentRate:
          historicalData.filter(d => d.temperature !== null).length / historicalData.length,
      },
    })
  })
)

export default router
