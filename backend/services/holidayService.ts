/**
 * Holiday Service with Caching
 * Task3: Fetch and cache holiday data from Calendarific API
 *
 * Features:
 * - Postgres-based holiday cache (holiday_cache table)
 * - Batch fetching by year to minimize API calls
 * - Configurable via HOLIDAYS_ENABLED feature flag
 * - Rate limit respect (Calendarific free tier: 1000 req/month)
 */

import axios from 'axios'
import type { SupabaseClient } from '@supabase/supabase-js'

const CALENDARIFIC_API_KEY = process.env.CALENDARIFIC_API_KEY
const HOLIDAYS_ENABLED = process.env.HOLIDAYS_ENABLED !== 'false' // Default: enabled

interface Holiday {
  date: string // YYYY-MM-DD
  name: string
  type?: string
}

interface HolidayCache {
  country_code: string
  date: string
  holiday_name: string
  holiday_type: string | null
}

/**
 * Check if holiday enrichment is enabled
 */
export function isHolidayEnrichmentEnabled(): boolean {
  if (!HOLIDAYS_ENABLED) {
    return false
  }

  if (!CALENDARIFIC_API_KEY) {
    console.warn('⚠️  CALENDARIFIC_API_KEY not set - holiday enrichment disabled')
    return false
  }

  return true
}

/**
 * Round latitude/longitude to 2 decimals for cache hits
 * 2 decimal precision ≈ 1.1km accuracy (good enough for weather)
 */
function roundCoordinate(coord: number): number {
  return Math.round(coord * 100) / 100
}

/**
 * Fetch holidays from cache for a given country and date range
 * Returns map of date -> holiday names
 */
export async function getHolidaysFromCache(
  supabase: SupabaseClient,
  countryCode: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, string[]>> {
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('holiday_cache')
    .select('date, holiday_name, holiday_type')
    .eq('country_code', countryCode.toUpperCase())
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  if (error) {
    console.error('Error fetching from holiday cache:', error.message)
    return {}
  }

  // Group by date
  const holidayMap: Record<string, string[]> = {}
  data.forEach((row: HolidayCache) => {
    const dateStr = new Date(row.date).toISOString().split('T')[0]
    if (!holidayMap[dateStr]) {
      holidayMap[dateStr] = []
    }
    holidayMap[dateStr].push(row.holiday_name)
  })

  return holidayMap
}

/**
 * Fetch holidays from Calendarific API for a given year
 */
async function fetchHolidaysFromAPI(countryCode: string, year: number): Promise<Holiday[]> {
  if (!CALENDARIFIC_API_KEY) {
    throw new Error('CALENDARIFIC_API_KEY not configured')
  }

  try {
    const response = await axios.get('https://calendarific.com/api/v2/holidays', {
      params: {
        api_key: CALENDARIFIC_API_KEY,
        country: countryCode.toUpperCase(),
        year: year,
        type: 'national,local', // Focus on national and local holidays
      },
      timeout: 10000,
    })

    if (response.data.meta.code !== 200) {
      throw new Error(
        `Calendarific API error: ${response.data.meta.error_detail || 'Unknown error'}`
      )
    }

    const holidays: Holiday[] = response.data.response.holidays.map((h: any) => ({
      date: h.date.iso.split('T')[0],
      name: h.name,
      type: h.type?.[0] || 'National',
    }))

    return holidays
  } catch (error) {
    const err = error as Error
    throw new Error(`Failed to fetch holidays for ${countryCode}/${year}: ${err.message}`)
  }
}

/**
 * Store holidays in cache
 */
async function cacheHolidays(
  supabase: SupabaseClient,
  countryCode: string,
  holidays: Holiday[]
): Promise<number> {
  if (holidays.length === 0) {
    return 0
  }

  const records = holidays.map(h => ({
    country_code: countryCode.toUpperCase(),
    date: h.date,
    holiday_name: h.name,
    holiday_type: h.type || null,
  }))

  // Use upsert to avoid duplicates
  const { error, count } = await supabase.from('holiday_cache').upsert(records, {
    onConflict: 'country_code,date',
    ignoreDuplicates: false, // Update existing
  })

  if (error) {
    console.error('Error caching holidays:', error.message)
    return 0
  }

  return count || records.length
}

/**
 * Fetch holidays for a country and date range with caching
 * 1. Check cache first
 * 2. If missing, fetch from API and cache
 * 3. Return holiday map
 */
export async function fetchHolidaysWithCache(
  supabase: SupabaseClient,
  countryCode: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, string[]>> {
  if (!isHolidayEnrichmentEnabled()) {
    console.log('ℹ️  Holiday enrichment disabled (HOLIDAYS_ENABLED=false or no API key)')
    return {}
  }

  console.log(
    `🎉 Fetching holidays for ${countryCode} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`
  )

  // Step 1: Check cache
  const cachedHolidays = await getHolidaysFromCache(supabase, countryCode, startDate, endDate)
  const cachedDates = Object.keys(cachedHolidays).length

  console.log(`📦 Cache hit: ${cachedDates} dates with holidays`)

  // Step 2: Determine which years need fetching
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)

  // Check if we have complete coverage in cache
  // For simplicity, fetch from API if cache is incomplete (< 50% of date range)
  const dateRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const cacheComplete = cachedDates > dateRange * 0.5

  if (cacheComplete) {
    console.log(`✅ Using cached holidays (${cachedDates} dates)`)
    return cachedHolidays
  }

  console.log(`⚠️  Cache incomplete (${cachedDates}/${dateRange} dates) - fetching from API...`)

  // Step 3: Fetch missing years from API
  const allHolidays: Holiday[] = []

  for (const year of years) {
    try {
      const yearHolidays = await fetchHolidaysFromAPI(countryCode, year)
      allHolidays.push(...yearHolidays)
      console.log(`📅 Fetched ${yearHolidays.length} holidays for ${year}`)

      // Cache immediately
      await cacheHolidays(supabase, countryCode, yearHolidays)
    } catch (error) {
      const err = error as Error
      console.error(`Failed to fetch holidays for ${year}:`, err.message)
      // Continue with other years
    }
  }

  // Step 4: Build holiday map from fetched data
  const holidayMap: Record<string, string[]> = {}

  allHolidays.forEach(h => {
    const date = new Date(h.date)
    if (date >= startDate && date <= endDate) {
      const dateStr = h.date
      if (!holidayMap[dateStr]) {
        holidayMap[dateStr] = []
      }
      holidayMap[dateStr].push(h.name)
    }
  })

  console.log(`✅ Holidays fetched and cached: ${Object.keys(holidayMap).length} holiday dates`)

  return holidayMap
}

/**
 * Get holiday cache statistics for a country
 */
export async function getHolidayCacheStats(
  supabase: SupabaseClient,
  countryCode: string
): Promise<{
  totalHolidays: number
  dateRange: { minDate: string | null; maxDate: string | null }
  cacheAge: string
}> {
  const { data, error } = await supabase
    .from('holiday_cache')
    .select('date, created_at')
    .eq('country_code', countryCode.toUpperCase())
    .order('date', { ascending: true })

  if (error || !data || data.length === 0) {
    return {
      totalHolidays: 0,
      dateRange: { minDate: null, maxDate: null },
      cacheAge: 'never',
    }
  }

  const minDate = data[0].date
  const maxDate = data[data.length - 1].date
  const oldestCache = new Date(data[0].created_at)
  const cacheAgeMs = Date.now() - oldestCache.getTime()
  const cacheAgeDays = Math.floor(cacheAgeMs / (1000 * 60 * 60 * 24))

  return {
    totalHolidays: data.length,
    dateRange: { minDate, maxDate },
    cacheAge: `${cacheAgeDays} days ago`,
  }
}

export default {
  isHolidayEnrichmentEnabled,
  fetchHolidaysWithCache,
  getHolidaysFromCache,
  getHolidayCacheStats,
}
