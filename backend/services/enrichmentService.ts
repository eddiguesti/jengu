/**
 * Data Enrichment Service
 * Enriches pricing data with weather, holidays, and temporal features
 * Task3: Now with caching support for weather and holidays
 */

import { fetchWeatherWithCache } from './weatherCacheService.js'
import { fetchHolidaysWithCache, isHolidayEnrichmentEnabled } from './holidayService.js'

/**
 * Enrich property data with weather information (Supabase version)
 * @param {string} propertyId - Property UUID
 * @param {object} location - { latitude, longitude }
 * @param {object} supabaseClient - Supabase client instance
 */
export async function enrichWithWeather(
  propertyId: string,
  location: { latitude: number; longitude: number },
  supabaseClient: any
): Promise<any> {
  const startTime = Date.now()
  const { latitude, longitude } = location

  console.log(`🌤️  Starting weather enrichment for property ${propertyId}...`)

  // Get all dates from pricing data for this property
  const { data: pricingData, error } = await supabaseClient
    .from('pricing_data')
    .select('id, date, temperature') // Include temperature to check if already enriched
    .eq('propertyId', propertyId)
    .order('date', { ascending: true })

  if (error || !pricingData || pricingData.length === 0) {
    console.log('⚠️  No pricing data found for this property')
    return { enriched: 0, duration: Date.now() - startTime, cacheHitRate: 0 }
  }

  const dates = pricingData.map((d: any) => new Date(d.date))
  const minDate = dates[0]
  const maxDate = dates[dates.length - 1]

  console.log(
    `📅 Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`
  )

  // Fetch weather data with caching
  try {
    const weatherMap = await fetchWeatherWithCache(
      supabaseClient,
      latitude,
      longitude,
      minDate,
      maxDate
    )

    // Calculate cache hit rate for metrics
    const totalDates = pricingData.length
    const weatherDates = Object.keys(weatherMap).length
    const cacheHitRate = weatherDates / totalDates

    // Idempotent update: only update rows where temperature is null
    let enrichedCount = 0
    let skippedCount = 0
    const BATCH_SIZE = 100

    for (let i = 0; i < pricingData.length; i += BATCH_SIZE) {
      const batch = pricingData.slice(i, i + BATCH_SIZE)

      // Parallel batch updates for performance
      const updatePromises = batch
        .filter((row: any) => {
          // Skip if already enriched (idempotent)
          if (row.temperature !== null) {
            skippedCount++
            return false
          }
          return true
        })
        .map(async (row: any) => {
          const dateStr = new Date(row.date).toISOString().split('T')[0]
          const weather = weatherMap[dateStr]

          if (weather) {
            const { error: updateError } = await supabaseClient
              .from('pricing_data')
              .update({
                temperature: weather.temperature,
                precipitation: weather.precipitation,
                weatherCondition: weather.weatherDescription,
                sunshineHours: weather.sunshineHours,
              })
              .eq('id', row.id)
              .is('temperature', null) // Idempotent: only update if null

            if (updateError) {
              console.warn(`Failed to update row ${row.id}:`, updateError.message)
              return false
            }
            return true
          }
          return false
        })

      // Wait for all updates in batch to complete
      const results = await Promise.allSettled(updatePromises)
      enrichedCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length

      console.log(
        `📊 Enriched ${i + batch.length}/${pricingData.length} rows (${enrichedCount} updated, ${skippedCount} already enriched)...`
      )
    }

    const duration = Date.now() - startTime

    console.log(`✅ Weather enrichment complete:`)
    console.log(`   - Updated: ${enrichedCount} rows`)
    console.log(`   - Skipped (already enriched): ${skippedCount} rows`)
    console.log(`   - Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`)
    console.log(`   - Duration: ${(duration / 1000).toFixed(2)}s`)

    return {
      enriched: enrichedCount,
      skipped: skippedCount,
      total: pricingData.length,
      duration,
      cacheHitRate,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Weather enrichment error:', errorMessage)
    throw error
  }
}

/**
 * Enrich property data with temporal features (Supabase version)
 * @param {string} propertyId - Property UUID
 * @param {object} supabaseClient - Supabase client instance
 */
export async function enrichWithTemporalFeatures(
  propertyId: string,
  supabaseClient: any
): Promise<any> {
  const startTime = Date.now()
  console.log(`📆 Starting temporal enrichment for property ${propertyId}...`)

  const { data: pricingData, error } = await supabaseClient
    .from('pricing_data')
    .select('id, date, dayOfWeek') // Include dayOfWeek to check if already enriched
    .eq('propertyId', propertyId)

  if (error || !pricingData || pricingData.length === 0) {
    console.log('⚠️  No pricing data found for temporal enrichment')
    return { enriched: 0, skipped: 0, duration: Date.now() - startTime }
  }

  let enrichedCount = 0
  let skippedCount = 0
  const BATCH_SIZE = 100

  for (let i = 0; i < pricingData.length; i += BATCH_SIZE) {
    const batch = pricingData.slice(i, i + BATCH_SIZE)

    // Parallel batch updates for performance
    const updatePromises = batch
      .filter((row: any) => {
        // Skip if already enriched (idempotent)
        if (row.dayOfWeek !== null) {
          skippedCount++
          return false
        }
        return true
      })
      .map(async (row: any) => {
        const date = new Date(row.date)
        const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
        const month = date.getMonth() + 1 // 1-12
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

        // Determine season (Northern Hemisphere)
        let season
        if ([12, 1, 2].includes(month)) season = 'Winter'
        else if ([3, 4, 5].includes(month)) season = 'Spring'
        else if ([6, 7, 8].includes(month)) season = 'Summer'
        else season = 'Fall'

        const { error: updateError } = await supabaseClient
          .from('pricing_data')
          .update({
            dayOfWeek,
            month,
            season,
            isWeekend,
          })
          .eq('id', row.id)
          .is('dayOfWeek', null) // Idempotent: only update if null

        return !updateError
      })

    // Wait for all updates in batch to complete
    const results = await Promise.allSettled(updatePromises)
    enrichedCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length

    console.log(
      `📊 Enriched ${i + batch.length}/${pricingData.length} rows (${enrichedCount} updated, ${skippedCount} already enriched)...`
    )
  }

  const duration = Date.now() - startTime

  console.log(`✅ Temporal enrichment complete:`)
  console.log(`   - Updated: ${enrichedCount} rows`)
  console.log(`   - Skipped (already enriched): ${skippedCount} rows`)
  console.log(`   - Duration: ${(duration / 1000).toFixed(2)}s`)

  return { enriched: enrichedCount, skipped: skippedCount, total: pricingData.length, duration }
}

/**
 * Enrich property data with holiday information
 * @param {string} propertyId - Property UUID
 * @param {string} countryCode - ISO country code (e.g., 'FR', 'US')
 * @param {string} calendarificApiKey - Calendarific API key
 * @param {object} supabaseClient - Supabase client instance
 *
 * TODO: Migrate this function from Prisma to Supabase
 * This function currently uses Prisma but the rest of the app uses Supabase.
 * For production, this needs to be rewritten to use Supabase client.
 *
 * Migration steps:
 * 1. Replace prisma.pricingData.findMany with supabaseClient.from('pricing_data').select()
 * 2. Replace prisma.pricingData.update with supabaseClient.from('pricing_data').update()
 * 3. Handle date conversions properly (Supabase returns ISO strings, not Date objects)
 * 4. Add batch updates for performance (similar to enrichWithWeather)
 */
export async function enrichWithHolidays(
  propertyId: string,
  countryCode: string,
  _calendarificApiKey: string | undefined,
  supabaseClient: any
): Promise<any> {
  const startTime = Date.now()

  console.log(`🎉 Holiday enrichment requested for property ${propertyId} (${countryCode})...`)

  // Check if holiday enrichment is enabled
  if (!isHolidayEnrichmentEnabled()) {
    return {
      enriched: 0,
      skipped: true,
      reason: 'Holiday enrichment disabled (HOLIDAYS_ENABLED=false or no API key)',
      duration: Date.now() - startTime,
    }
  }

  // Get all dates from pricing data for this property
  const { data: pricingData, error } = await supabaseClient
    .from('pricing_data')
    .select('id, date, isHoliday') // Include isHoliday to check if already enriched
    .eq('propertyId', propertyId)
    .order('date', { ascending: true })

  if (error || !pricingData || pricingData.length === 0) {
    console.log('⚠️  No pricing data found for holiday enrichment')
    return { enriched: 0, total: 0, duration: Date.now() - startTime }
  }

  const dates = pricingData.map((d: any) => new Date(d.date))
  const minDate = dates[0]
  const maxDate = dates[dates.length - 1]

  console.log(
    `📅 Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`
  )

  // Fetch holidays with caching
  try {
    const holidayMap = await fetchHolidaysWithCache(supabaseClient, countryCode, minDate, maxDate)

    // Idempotent update: only update rows where isHoliday is null
    let enrichedCount = 0
    let skippedCount = 0
    const BATCH_SIZE = 100

    for (let i = 0; i < pricingData.length; i += BATCH_SIZE) {
      const batch = pricingData.slice(i, i + BATCH_SIZE)

      // Parallel batch updates for performance
      const updatePromises = batch
        .filter((row: any) => {
          // Skip if already enriched (idempotent)
          if (row.isHoliday !== null) {
            skippedCount++
            return false
          }
          return true
        })
        .map(async (row: any) => {
          const dateStr = new Date(row.date).toISOString().split('T')[0]
          const holidays = holidayMap[dateStr]

          if (holidays && holidays.length > 0) {
            const { error: updateError } = await supabaseClient
              .from('pricing_data')
              .update({
                isHoliday: true,
                holidayName: holidays.join(', '),
              })
              .eq('id', row.id)
              .is('isHoliday', null) // Idempotent: only update if null

            if (updateError) {
              console.warn(`Failed to update row ${row.id}:`, updateError.message)
              return false
            }
            return true
          } else {
            // Mark as non-holiday to avoid re-checking
            const { error: updateError } = await supabaseClient
              .from('pricing_data')
              .update({
                isHoliday: false,
                holidayName: null,
              })
              .eq('id', row.id)
              .is('isHoliday', null)

            return !updateError
          }
        })

      // Wait for all updates in batch to complete
      const results = await Promise.allSettled(updatePromises)
      enrichedCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length

      console.log(
        `📊 Enriched ${i + batch.length}/${pricingData.length} rows (${enrichedCount} holidays, ${skippedCount} already enriched)...`
      )
    }

    const duration = Date.now() - startTime

    console.log(`✅ Holiday enrichment complete:`)
    console.log(`   - Holidays found: ${enrichedCount} rows`)
    console.log(`   - Skipped (already enriched): ${skippedCount} rows`)
    console.log(`   - Duration: ${(duration / 1000).toFixed(2)}s`)

    return {
      enriched: enrichedCount,
      skipped: skippedCount,
      total: pricingData.length,
      duration,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Holiday enrichment error:', errorMessage)
    return {
      enriched: 0,
      error: errorMessage,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Complete enrichment pipeline (Supabase version)
 * Enriches property data with weather, holidays, and temporal features
 */
export async function enrichPropertyData(
  propertyId: string,
  options: any,
  supabaseClient: any
): Promise<any> {
  const totalStartTime = Date.now()
  const { location, countryCode, calendarificApiKey } = options

  const results: {
    temporal: any
    weather: any
    holidays: any
    summary: {
      totalDuration: number
      totalEnriched: number
      cacheHitRate: number
    }
  } = {
    temporal: null,
    weather: null,
    holidays: null,
    summary: {
      totalDuration: 0,
      totalEnriched: 0,
      cacheHitRate: 0,
    },
  }

  try {
    console.log(`\n🚀 Starting enrichment pipeline for property ${propertyId}...`)

    // Always enrich temporal features (no API needed, fast)
    results.temporal = await enrichWithTemporalFeatures(propertyId, supabaseClient)

    // Enrich with weather if location provided (with caching)
    if (location && location.latitude && location.longitude) {
      results.weather = await enrichWithWeather(propertyId, location, supabaseClient)
    } else {
      console.log('⚠️  Skipping weather enrichment - no location provided')
      results.weather = { skipped: true, reason: 'No location provided' }
    }

    // Enrich with holidays if country code provided (with caching and feature flag)
    if (countryCode) {
      results.holidays = await enrichWithHolidays(
        propertyId,
        countryCode,
        calendarificApiKey,
        supabaseClient
      )
    } else {
      console.log('⚠️  Skipping holiday enrichment - no country code provided')
      results.holidays = { skipped: true, reason: 'No country code provided' }
    }

    // Calculate summary metrics
    const totalDuration = Date.now() - totalStartTime
    const totalEnriched =
      (results.temporal?.enriched || 0) +
      (results.weather?.enriched || 0) +
      (results.holidays?.enriched || 0)

    const cacheHitRate = results.weather?.cacheHitRate || 0

    results.summary = {
      totalDuration,
      totalEnriched,
      cacheHitRate,
    }

    console.log(`\n✅ Enrichment pipeline complete!`)
    console.log(`   - Total enriched: ${totalEnriched} rows`)
    console.log(`   - Total duration: ${(totalDuration / 1000).toFixed(2)}s`)
    console.log(`   - Weather cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`)

    return {
      success: true,
      results,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Enrichment pipeline error:', error)

    results.summary.totalDuration = Date.now() - totalStartTime

    return {
      success: false,
      error: errorMessage,
      results,
    }
  }
}
