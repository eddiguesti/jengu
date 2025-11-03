/**
 * Holiday Service with date-holidays (Offline)
 *
 * Replaced Calendarific API with free, offline date-holidays NPM package
 * No API key required, no rate limits, works offline
 *
 * Features:
 * - Postgres-based holiday cache (holiday_cache table)
 * - Offline holiday calculation using date-holidays
 * - Support for 100+ countries
 * - No API calls, no costs, no rate limits
 *
 * Installation:
 *   pnpm add date-holidays
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// Import will work after running: pnpm add date-holidays
// @ts-ignore - Package will be installed
import Holidays from 'date-holidays'

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

  // No API key needed anymore!
  return true
}

/**
 * Map common country codes to date-holidays format
 * date-holidays uses ISO 3166-1 alpha-2 codes (e.g., 'US', 'GB', 'FR')
 */
function normalizeCountryCode(countryCode: string): string {
  return countryCode.toUpperCase()
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
 * Fetch holidays using date-holidays library (offline)
 * No API calls required!
 */
function fetchHolidaysOffline(countryCode: string, year: number): Holiday[] {
  try {
    const hd = new Holidays(normalizeCountryCode(countryCode))

    // Get all holidays for the year
    const holidays = hd.getHolidays(year)

    if (!holidays || holidays.length === 0) {
      console.warn(`⚠️  No holidays found for ${countryCode}/${year}`)
      return []
    }

    // Convert to our Holiday format
    return holidays.map((h: any) => ({
      date: h.date.split(' ')[0], // Extract YYYY-MM-DD from "YYYY-MM-DD HH:MM:SS"
      name: h.name,
      type: h.type || 'public',
    }))
  } catch (error) {
    console.error(`Failed to fetch holidays for ${countryCode}/${year}:`, (error as Error).message)
    return []
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
 * 2. If missing, fetch from date-holidays library (offline)
 * 3. Return holiday map
 *
 * No API calls, no rate limits, no costs!
 */
export async function fetchHolidaysWithCache(
  supabase: SupabaseClient,
  countryCode: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, string[]>> {
  if (!isHolidayEnrichmentEnabled()) {
    console.log('ℹ️  Holiday enrichment disabled (HOLIDAYS_ENABLED=false)')
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
  const dateRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const cacheComplete = cachedDates > dateRange * 0.1 // More lenient - holidays are sparse

  if (cacheComplete && cachedDates > 0) {
    console.log(`✅ Using cached holidays (${cachedDates} dates)`)
    return cachedHolidays
  }

  console.log(
    `⚠️  Cache incomplete (${cachedDates}/${dateRange} dates) - generating from date-holidays...`
  )

  // Step 3: Fetch missing years offline
  const allHolidays: Holiday[] = []

  for (const year of years) {
    const yearHolidays = fetchHolidaysOffline(countryCode, year)
    allHolidays.push(...yearHolidays)
    console.log(`📅 Generated ${yearHolidays.length} holidays for ${year} (offline)`)

    // Cache immediately
    if (yearHolidays.length > 0) {
      await cacheHolidays(supabase, countryCode, yearHolidays)
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

  console.log(`✅ Holidays generated and cached: ${Object.keys(holidayMap).length} holiday dates`)

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
