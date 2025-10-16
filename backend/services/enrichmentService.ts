/**
 * Data Enrichment Service
 * Enriches pricing data with weather, holidays, and temporal features
 */

import axios from 'axios'
import { mapWeatherCode } from '../utils/weatherCodes.js'

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
  const { latitude, longitude } = location

  console.log(`🌤️  Starting weather enrichment for property ${propertyId}...`)

  // Get all dates from pricing data for this property
  const { data: pricingData, error } = await supabaseClient
    .from('pricing_data')
    .select('id, date')
    .eq('propertyId', propertyId)
    .order('date', { ascending: true })

  if (error || !pricingData || pricingData.length === 0) {
    console.log('⚠️  No pricing data found for this property')
    return { enriched: 0 }
  }

  const dates = pricingData.map((d: any) => new Date(d.date))
  const minDate = dates[0]
  const maxDate = dates[dates.length - 1]

  console.log(
    `📅 Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`
  )

  // Call Open-Meteo Historical Weather API (FREE)
  try {
    const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
      params: {
        latitude,
        longitude,
        start_date: minDate.toISOString().split('T')[0],
        end_date: maxDate.toISOString().split('T')[0],
        daily:
          'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weathercode,sunshine_duration',
        timezone: 'auto',
      },
      timeout: 15000, // 15 second timeout
    })

    // Create a map of date -> weather data
    const weatherMap: Record<string, any> = {}
    response.data.daily.time.forEach((date: string, index: number) => {
      const weathercode = response.data.daily.weathercode[index]

      // Use centralized weather code mapping
      const weatherDescription = mapWeatherCode(weathercode)

      weatherMap[date] = {
        temperature: response.data.daily.temperature_2m_mean[index],
        precipitation: response.data.daily.precipitation_sum[index],
        weatherCondition: weatherDescription,
        sunshineHours: response.data.daily.sunshine_duration[index]
          ? response.data.daily.sunshine_duration[index] / 3600
          : null, // Convert seconds to hours
      }
    })

    // Update pricing data with weather information (batch updates using Supabase)
    let enrichedCount = 0
    const BATCH_SIZE = 100 // Update in batches for better performance

    for (let i = 0; i < pricingData.length; i += BATCH_SIZE) {
      const batch = pricingData.slice(i, i + BATCH_SIZE)

      for (const row of batch) {
        const dateStr = new Date(row.date).toISOString().split('T')[0]
        const weather = weatherMap[dateStr as string]

        if (weather) {
          const { error: updateError } = await supabaseClient
            .from('pricing_data')
            .update({
              temperature: weather.temperature,
              precipitation: weather.precipitation,
              weatherCondition: weather.weatherCondition,
              sunshineHours: weather.sunshineHours,
            })
            .eq('id', row.id)

          if (!updateError) {
            enrichedCount++
          } else {
            console.warn(`Failed to update row ${row.id}:`, updateError.message)
          }
        }
      }

      console.log(`📊 Enriched ${i + batch.length}/${pricingData.length} rows...`)
    }

    console.log(
      `✅ Weather enrichment complete: ${enrichedCount}/${pricingData.length} rows enriched`
    )
    return { enriched: enrichedCount, total: pricingData.length }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Weather API Error:', errorMessage)
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
  console.log(`📆 Starting temporal enrichment for property ${propertyId}...`)

  const { data: pricingData, error } = await supabaseClient
    .from('pricing_data')
    .select('id, date')
    .eq('propertyId', propertyId)

  if (error || !pricingData || pricingData.length === 0) {
    console.log('⚠️  No pricing data found for temporal enrichment')
    return { enriched: 0 }
  }

  let enrichedCount = 0
  const BATCH_SIZE = 100

  for (let i = 0; i < pricingData.length; i += BATCH_SIZE) {
    const batch = pricingData.slice(i, i + BATCH_SIZE)

    for (const row of batch) {
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

      if (!updateError) {
        enrichedCount++
      }
    }

    console.log(`📊 Enriched ${i + batch.length}/${pricingData.length} rows with temporal data...`)
  }

  console.log(`✅ Temporal enrichment complete: ${enrichedCount} rows enriched`)
  return { enriched: enrichedCount }
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
  _supabaseClient: any
): Promise<any> {
  console.log(`🎉 Holiday enrichment requested for property ${propertyId} (${countryCode})...`)
  console.warn('⚠️  Holiday enrichment is not yet migrated to Supabase - skipping')

  // Temporary implementation - return early until migration is complete
  return {
    enriched: 0,
    total: 0,
    skipped: true,
    reason: 'Holiday enrichment not yet migrated to Supabase',
  }

  /*
  // TODO: Uncomment and test this implementation after migration

  console.log(`🎉 Starting holiday enrichment for property ${propertyId} (${countryCode})...`);

  const { data: pricingData, error } = await supabaseClient
    .from('pricing_data')
    .select('id, date')
    .eq('propertyId', propertyId)
    .order('date', { ascending: true });

  if (error || !pricingData || pricingData.length === 0) {
    console.log('⚠️  No pricing data found for holiday enrichment');
    return { enriched: 0, total: 0 };
  }

  const dates = pricingData.map(d => new Date(d.date));
  const minYear = dates[0].getFullYear();
  const maxYear = dates[dates.length - 1].getFullYear();
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // Fetch holidays for each year
  const holidayMap = {};
  for (const year of years) {
    try {
      const response = await axios.get('https://calendarific.com/api/v2/holidays', {
        params: {
          api_key: calendarificApiKey,
          country: countryCode,
          year
        },
        timeout: 10000 // 10 second timeout
      });

      response.data.response.holidays.forEach(holiday => {
        const date = holiday.date.iso.split('T')[0]; // YYYY-MM-DD
        if (!holidayMap[date]) {
          holidayMap[date] = [];
        }
        holidayMap[date].push(holiday.name);
      });
    } catch (error) {
      console.warn(`Failed to fetch holidays for ${year}:`, error.message);
    }
  }

  // Update pricing data with holiday information (batch updates)
  let enrichedCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < pricingData.length; i += BATCH_SIZE) {
    const batch = pricingData.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      const holidays = holidayMap[dateStr];

      if (holidays && holidays.length > 0) {
        const { error: updateError } = await supabaseClient
          .from('pricing_data')
          .update({
            isHoliday: true,
            holidayName: holidays.join(', ')
          })
          .eq('id', row.id);

        if (!updateError) {
          enrichedCount++;
        } else {
          console.warn(`Failed to update row ${row.id}:`, updateError.message);
        }
      }
    }

    console.log(`📊 Enriched ${i + batch.length}/${pricingData.length} rows with holiday data...`);
  }

  console.log(`✅ Holiday enrichment complete: ${enrichedCount} rows marked as holidays`);
  return { enriched: enrichedCount, total: pricingData.length };
  */
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
  const { location, countryCode, calendarificApiKey } = options

  const results = {
    temporal: null,
    weather: null,
    holidays: null,
  }

  try {
    console.log(`\n🚀 Starting enrichment pipeline for property ${propertyId}...`)

    // Always enrich temporal features (no API needed, fast)
    results.temporal = await enrichWithTemporalFeatures(propertyId, supabaseClient)

    // Enrich with weather if location provided (requires API call)
    if (location && location.latitude && location.longitude) {
      results.weather = await enrichWithWeather(propertyId, location, supabaseClient)
    } else {
      console.log('⚠️  Skipping weather enrichment - no location provided')
    }

    // Enrich with holidays if country code and API key provided
    if (countryCode && calendarificApiKey) {
      results.holidays = await enrichWithHolidays(
        propertyId,
        countryCode,
        calendarificApiKey,
        supabaseClient
      )
    } else {
      console.log('⚠️  Skipping holiday enrichment - no country code or API key provided')
    }

    console.log(`\n✅ Enrichment pipeline complete!`)
    return {
      success: true,
      results,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Enrichment pipeline error:', error)
    return {
      success: false,
      error: errorMessage,
      results,
    }
  }
}
