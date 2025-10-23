/**
 * Weather Cache Service
 * Task3: Fetch and cache weather data from Open-Meteo API
 *
 * Features:
 * - Postgres-based weather cache (weather_cache table)
 * - Coordinates rounded to 2 decimals (~1.1km precision)
 * - Batch fetching for date ranges
 * - Idempotent upserts
 */

import axios from 'axios'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mapWeatherCode } from '../utils/weatherCodes.js'

interface WeatherData {
  date: string // YYYY-MM-DD
  temperature: number | null
  tempMin: number | null
  tempMax: number | null
  precipitation: number | null
  weatherCode: number | null
  weatherDescription: string | null
  sunshineHours: number | null
}

interface WeatherCacheRow {
  latitude: number
  longitude: number
  date: string
  temperature: number | null
  temp_min: number | null
  temp_max: number | null
  precipitation: number | null
  weather_code: number | null
  weather_description: string | null
  sunshine_hours: number | null
}

/**
 * Round coordinate to 2 decimals for cache hits
 * 2 decimal precision ≈ 1.1km accuracy (sufficient for weather)
 */
export function roundCoordinate(coord: number): number {
  return Math.round(coord * 100) / 100
}

/**
 * Fetch weather from cache for a given location and date range
 * Returns map of date -> weather data
 */
export async function getWeatherFromCache(
  supabase: SupabaseClient,
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<Record<string, WeatherData>> {
  const roundedLat = roundCoordinate(latitude)
  const roundedLng = roundCoordinate(longitude)
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('latitude', roundedLat)
    .eq('longitude', roundedLng)
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  if (error) {
    console.error('Error fetching from weather cache:', error.message)
    return {}
  }

  // Convert to map
  const weatherMap: Record<string, WeatherData> = {}
  data.forEach((row: WeatherCacheRow) => {
    const dateStr = new Date(row.date).toISOString().split('T')[0]
    weatherMap[dateStr] = {
      date: dateStr,
      temperature: row.temperature,
      tempMin: row.temp_min,
      tempMax: row.temp_max,
      precipitation: row.precipitation,
      weatherCode: row.weather_code,
      weatherDescription: row.weather_description,
      sunshineHours: row.sunshine_hours,
    }
  })

  return weatherMap
}

/**
 * Fetch weather from Open-Meteo API
 */
async function fetchWeatherFromAPI(
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<WeatherData[]> {
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  try {
    const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
      params: {
        latitude,
        longitude,
        start_date: startDateStr,
        end_date: endDateStr,
        daily:
          'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weathercode,sunshine_duration',
        timezone: 'auto',
      },
      timeout: 15000,
    })

    const weatherData: WeatherData[] = []

    response.data.daily.time.forEach((date: string, index: number) => {
      const weathercode = response.data.daily.weathercode[index]
      const weatherDescription = mapWeatherCode(weathercode)
      const sunshineDuration = response.data.daily.sunshine_duration[index]

      weatherData.push({
        date,
        temperature: response.data.daily.temperature_2m_mean[index],
        tempMin: response.data.daily.temperature_2m_min[index],
        tempMax: response.data.daily.temperature_2m_max[index],
        precipitation: response.data.daily.precipitation_sum[index],
        weatherCode: weathercode,
        weatherDescription,
        sunshineHours: sunshineDuration ? sunshineDuration / 3600 : null, // seconds to hours
      })
    })

    return weatherData
  } catch (error) {
    const err = error as Error
    throw new Error(`Failed to fetch weather from API: ${err.message}`)
  }
}

/**
 * Cache weather data in database
 */
async function cacheWeatherData(
  supabase: SupabaseClient,
  latitude: number,
  longitude: number,
  weatherData: WeatherData[]
): Promise<number> {
  if (weatherData.length === 0) {
    return 0
  }

  const roundedLat = roundCoordinate(latitude)
  const roundedLng = roundCoordinate(longitude)

  const records = weatherData.map(w => ({
    latitude: roundedLat,
    longitude: roundedLng,
    date: w.date,
    temperature: w.temperature,
    temp_min: w.tempMin,
    temp_max: w.tempMax,
    precipitation: w.precipitation,
    weather_code: w.weatherCode,
    weather_description: w.weatherDescription,
    sunshine_hours: w.sunshineHours,
    api_source: 'open-meteo',
  }))

  // Upsert to avoid duplicates
  const { error, count } = await supabase.from('weather_cache').upsert(records, {
    onConflict: 'latitude,longitude,date',
    ignoreDuplicates: false, // Update existing
  })

  if (error) {
    console.error('Error caching weather data:', error.message)
    return 0
  }

  return count || records.length
}

/**
 * Fetch weather for a location and date range with caching
 * 1. Check cache first
 * 2. If cache hit rate < 80%, fetch from API
 * 3. Cache results
 * 4. Return combined data
 */
export async function fetchWeatherWithCache(
  supabase: SupabaseClient,
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<Record<string, WeatherData>> {
  const roundedLat = roundCoordinate(latitude)
  const roundedLng = roundCoordinate(longitude)

  console.log(
    `🌤️  Fetching weather for (${roundedLat}, ${roundedLng}) from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
  )

  // Step 1: Check cache
  const cachedWeather = await getWeatherFromCache(supabase, latitude, longitude, startDate, endDate)
  const cachedDates = Object.keys(cachedWeather).length

  // Calculate total days needed
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const cacheHitRate = cachedDates / totalDays

  console.log(
    `📦 Cache hit: ${cachedDates}/${totalDays} days (${(cacheHitRate * 100).toFixed(1)}%)`
  )

  // Step 2: If cache hit rate >= 80%, use cache only
  if (cacheHitRate >= 0.8) {
    console.log(`✅ Using cached weather data (${(cacheHitRate * 100).toFixed(1)}% hit rate)`)
    return cachedWeather
  }

  // Step 3: Fetch from API (cache incomplete)
  console.log(`⚠️  Cache incomplete - fetching from Open-Meteo API...`)

  try {
    const apiWeather = await fetchWeatherFromAPI(latitude, longitude, startDate, endDate)
    console.log(`📅 Fetched ${apiWeather.length} days from API`)

    // Step 4: Cache the API results
    const cached = await cacheWeatherData(supabase, latitude, longitude, apiWeather)
    console.log(`💾 Cached ${cached} weather records`)

    // Step 5: Build weather map from API data
    const weatherMap: Record<string, WeatherData> = {}
    apiWeather.forEach(w => {
      weatherMap[w.date] = w
    })

    console.log(`✅ Weather data complete: ${Object.keys(weatherMap).length} days`)

    return weatherMap
  } catch (error) {
    const err = error as Error
    console.error(`❌ Error fetching weather from API:`, err.message)

    // Fallback to cached data even if incomplete
    if (cachedDates > 0) {
      console.log(`⚠️  Using partial cache (${cachedDates} days) due to API error`)
      return cachedWeather
    }

    throw error
  }
}

/**
 * Get weather cache statistics for a location
 */
export async function getWeatherCacheStats(
  supabase: SupabaseClient,
  latitude: number,
  longitude: number
): Promise<{
  totalRecords: number
  dateRange: { minDate: string | null; maxDate: string | null }
  cacheAge: string
  location: { latitude: number; longitude: number }
}> {
  const roundedLat = roundCoordinate(latitude)
  const roundedLng = roundCoordinate(longitude)

  const { data, error } = await supabase
    .from('weather_cache')
    .select('date, created_at')
    .eq('latitude', roundedLat)
    .eq('longitude', roundedLng)
    .order('date', { ascending: true })

  if (error || !data || data.length === 0) {
    return {
      totalRecords: 0,
      dateRange: { minDate: null, maxDate: null },
      cacheAge: 'never',
      location: { latitude: roundedLat, longitude: roundedLng },
    }
  }

  const minDate = data[0].date
  const maxDate = data[data.length - 1].date
  const oldestCache = new Date(data[0].created_at)
  const cacheAgeMs = Date.now() - oldestCache.getTime()
  const cacheAgeDays = Math.floor(cacheAgeMs / (1000 * 60 * 60 * 24))

  return {
    totalRecords: data.length,
    dateRange: { minDate, maxDate },
    cacheAge: `${cacheAgeDays} days ago`,
    location: { latitude: roundedLat, longitude: roundedLng },
  }
}

export default {
  roundCoordinate,
  fetchWeatherWithCache,
  getWeatherFromCache,
  getWeatherCacheStats,
}
