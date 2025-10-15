/**
 * Data Enrichment Service
 * Enriches pricing data with weather, holidays, and temporal features
 */

import axios from 'axios';

/**
 * Enrich property data with weather information (Supabase version)
 * @param {string} propertyId - Property UUID
 * @param {object} location - { latitude, longitude }
 * @param {object} supabaseClient - Supabase client instance
 */
export async function enrichWithWeather(propertyId, location, supabaseClient) {
  const { latitude, longitude } = location;

  console.log(`🌤️  Starting weather enrichment for property ${propertyId}...`);

  // Get all dates from pricing data for this property
  const { data: pricingData, error } = await supabaseClient
    .from('pricing_data')
    .select('id, date')
    .eq('propertyId', propertyId)
    .order('date', { ascending: true });

  if (error || !pricingData || pricingData.length === 0) {
    console.log('⚠️  No pricing data found for this property');
    return { enriched: 0 };
  }

  const dates = pricingData.map(d => new Date(d.date));
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  console.log(`📅 Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);

  // Call Open-Meteo Historical Weather API (FREE)
  try {
    const response = await axios.get(
      'https://archive-api.open-meteo.com/v1/archive',
      {
        params: {
          latitude,
          longitude,
          start_date: minDate.toISOString().split('T')[0],
          end_date: maxDate.toISOString().split('T')[0],
          daily: 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weathercode,sunshine_duration',
          timezone: 'auto'
        }
      }
    );

    // Create a map of date -> weather data
    const weatherMap = {};
    response.data.daily.time.forEach((date, index) => {
      const weathercode = response.data.daily.weathercode[index];

      // Map weathercode to weather description
      let weatherDescription = 'Clear';
      if (weathercode === 0) weatherDescription = 'Clear';
      else if ([1, 2, 3].includes(weathercode)) weatherDescription = 'Partly Cloudy';
      else if ([45, 48].includes(weathercode)) weatherDescription = 'Foggy';
      else if ([51, 53, 55, 56, 57].includes(weathercode)) weatherDescription = 'Drizzle';
      else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weathercode)) weatherDescription = 'Rainy';
      else if ([71, 73, 75, 77, 85, 86].includes(weathercode)) weatherDescription = 'Snowy';
      else if ([95, 96, 99].includes(weathercode)) weatherDescription = 'Thunderstorm';
      else if ([1, 2, 3].includes(weathercode)) weatherDescription = 'Cloudy';

      weatherMap[date] = {
        temperature: response.data.daily.temperature_2m_mean[index],
        precipitation: response.data.daily.precipitation_sum[index],
        weatherCondition: weatherDescription,
        sunshineHours: response.data.daily.sunshine_duration[index] ?
          response.data.daily.sunshine_duration[index] / 3600 : null // Convert seconds to hours
      };
    });

    // Update pricing data with weather information (batch updates using Supabase)
    let enrichedCount = 0;
    const BATCH_SIZE = 100; // Update in batches for better performance

    for (let i = 0; i < pricingData.length; i += BATCH_SIZE) {
      const batch = pricingData.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        const weather = weatherMap[dateStr];

        if (weather) {
          const { error: updateError } = await supabaseClient
            .from('pricing_data')
            .update({
              temperature: weather.temperature,
              precipitation: weather.precipitation,
              weatherCondition: weather.weatherCondition,
              sunshineHours: weather.sunshineHours
            })
            .eq('id', row.id);

          if (!updateError) {
            enrichedCount++;
          } else {
            console.warn(`Failed to update row ${row.id}:`, updateError.message);
          }
        }
      }

      console.log(`📊 Enriched ${i + batch.length}/${pricingData.length} rows...`);
    }

    console.log(`✅ Weather enrichment complete: ${enrichedCount}/${pricingData.length} rows enriched`);
    return { enriched: enrichedCount, total: pricingData.length };

  } catch (error) {
    console.error('Weather API Error:', error.message);
    throw error;
  }
}

/**
 * Enrich property data with temporal features (Supabase version)
 * @param {string} propertyId - Property UUID
 * @param {object} supabaseClient - Supabase client instance
 */
export async function enrichWithTemporalFeatures(propertyId, supabaseClient) {
  console.log(`📆 Starting temporal enrichment for property ${propertyId}...`);

  const { data: pricingData, error } = await supabaseClient
    .from('pricing_data')
    .select('id, date')
    .eq('propertyId', propertyId);

  if (error || !pricingData || pricingData.length === 0) {
    console.log('⚠️  No pricing data found for temporal enrichment');
    return { enriched: 0 };
  }

  let enrichedCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < pricingData.length; i += BATCH_SIZE) {
    const batch = pricingData.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const date = new Date(row.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const month = date.getMonth() + 1; // 1-12
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Determine season (Northern Hemisphere)
      let season;
      if ([12, 1, 2].includes(month)) season = 'Winter';
      else if ([3, 4, 5].includes(month)) season = 'Spring';
      else if ([6, 7, 8].includes(month)) season = 'Summer';
      else season = 'Fall';

      const { error: updateError } = await supabaseClient
        .from('pricing_data')
        .update({
          dayOfWeek,
          month,
          season,
          isWeekend
        })
        .eq('id', row.id);

      if (!updateError) {
        enrichedCount++;
      }
    }

    console.log(`📊 Enriched ${i + batch.length}/${pricingData.length} rows with temporal data...`);
  }

  console.log(`✅ Temporal enrichment complete: ${enrichedCount} rows enriched`);
  return { enriched: enrichedCount };
}

/**
 * Enrich property data with holiday information
 * @param {string} propertyId - Property UUID
 * @param {string} countryCode - ISO country code (e.g., 'FR', 'US')
 * @param {string} calendarificApiKey - Calendarific API key
 * @param {object} prisma - Prisma client instance
 */
export async function enrichWithHolidays(propertyId, countryCode, calendarificApiKey, prisma) {
  console.log(`🎉 Starting holiday enrichment for property ${propertyId} (${countryCode})...`);

  const pricingData = await prisma.pricingData.findMany({
    where: { propertyId },
    select: { id: true, date: true },
    orderBy: { date: 'asc' }
  });

  if (pricingData.length === 0) {
    return { enriched: 0 };
  }

  const dates = pricingData.map(d => d.date);
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
        }
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

  // Update pricing data with holiday information
  let enrichedCount = 0;
  for (const row of pricingData) {
    const dateStr = row.date.toISOString().split('T')[0];
    const holidays = holidayMap[dateStr];

    if (holidays && holidays.length > 0) {
      await prisma.pricingData.update({
        where: { id: row.id },
        data: {
          isHoliday: true,
          holidayName: holidays.join(', ')
        }
      });
      enrichedCount++;
    }
  }

  console.log(`✅ Holiday enrichment complete: ${enrichedCount} rows marked as holidays`);
  return { enriched: enrichedCount, total: pricingData.length };
}

/**
 * Complete enrichment pipeline (Supabase version)
 * Enriches property data with weather, holidays, and temporal features
 */
export async function enrichPropertyData(propertyId, options, supabaseClient) {
  const { location, countryCode, calendarificApiKey } = options;

  const results = {
    temporal: null,
    weather: null,
    holidays: null
  };

  try {
    console.log(`\n🚀 Starting enrichment pipeline for property ${propertyId}...`);

    // Always enrich temporal features (no API needed, fast)
    results.temporal = await enrichWithTemporalFeatures(propertyId, supabaseClient);

    // Enrich with weather if location provided (requires API call)
    if (location && location.latitude && location.longitude) {
      results.weather = await enrichWithWeather(propertyId, location, supabaseClient);
    } else {
      console.log('⚠️  Skipping weather enrichment - no location provided');
    }

    // Enrich with holidays if country code and API key provided
    if (countryCode && calendarificApiKey) {
      // Note: Holiday enrichment still uses Prisma - skipping for now
      console.log('⚠️  Holiday enrichment not yet migrated to Supabase');
    }

    console.log(`\n✅ Enrichment pipeline complete!`);
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('❌ Enrichment pipeline error:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
}
