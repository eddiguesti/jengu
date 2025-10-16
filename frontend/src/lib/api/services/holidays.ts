/**
 * Holidays API Service
 * Uses Calendarific API to fetch holidays and events data
 *
 * Features:
 * - Get holidays for any country
 * - Filter by holiday type (public, observance, etc.)
 * - Check if date is holiday
 * - Calculate holiday impact on pricing
 */

export interface Holiday {
  name: string
  description: string
  date: string
  type: string[] // ['national', 'public', 'observance', 'religious']
  country: string
  is_major: boolean
}

export interface HolidayImpact {
  is_holiday: boolean
  holiday_name?: string
  impact_score: number // 0-100, higher = more impact on demand
  price_multiplier: number // Suggested price adjustment (1.0 = no change, 1.2 = +20%)
}

/**
 * Get holidays for a specific country and year
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'FR')
 * @param year - Year to fetch holidays for
 */
export async function getHolidays(
  countryCode: string,
  year: number
): Promise<Holiday[]> {
  const apiKey = import.meta.env.VITE_CALENDARIFIC_API_KEY

  if (!apiKey) {
    console.warn('Calendarific API key not configured. Returning mock data.')
    return getMockHolidays(countryCode, year)
  }

  try {
    const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}`

    const response = await fetch(url)

    if (!response.ok) {
      const errorText = response.statusText || `HTTP ${response.status}`
      throw new Error(`Calendarific API error: ${errorText}. Using mock holiday data instead.`)
    }

    const data = await response.json()

    // Check for API error responses
    if (data.meta?.error_detail) {
      throw new Error(`Calendarific API error: ${data.meta.error_detail}. Using mock holiday data instead.`)
    }

    if (!data.response?.holidays) {
      throw new Error('Invalid response from Calendarific API. Using mock holiday data instead.')
    }

    // Transform API response to our format
    const holidays: Holiday[] = data.response.holidays.map((h: any) => ({
      name: h.name,
      description: h.description || '',
      date: h.date.iso,
      type: h.type || [],
      country: countryCode,
      is_major: h.type?.includes('National holiday') || h.type?.includes('Public holiday') || false,
    }))

    return holidays

  } catch (error) {
    console.error('Failed to fetch holidays:', error)
    return getMockHolidays(countryCode, year)
  }
}

/**
 * Check if a specific date is a holiday
 */
export function isHoliday(
  date: Date,
  holidays: Holiday[]
): HolidayImpact {
  const dateStr = date.toISOString().split('T')[0]

  const holiday = holidays.find(h => h.date === dateStr)

  if (!holiday) {
    return {
      is_holiday: false,
      impact_score: 0,
      price_multiplier: 1.0,
    }
  }

  // Calculate impact based on holiday type
  let impact_score = 50 // Base score
  let price_multiplier = 1.0

  if (holiday.is_major) {
    impact_score = 90
    price_multiplier = 1.25 // +25% for major holidays
  } else if (holiday.type.includes('Public holiday')) {
    impact_score = 80
    price_multiplier = 1.20 // +20% for public holidays
  } else if (holiday.type.includes('Observance')) {
    impact_score = 40
    price_multiplier = 1.05 // +5% for observances
  }

  return {
    is_holiday: true,
    holiday_name: holiday.name,
    impact_score,
    price_multiplier,
  }
}

/**
 * Get holiday periods (multi-day events like Christmas season, Spring Break)
 */
export function getHolidayPeriods(
  holidays: Holiday[],
  year: number
): Array<{ name: string; start: Date; end: Date; impact_score: number }> {
  const periods: Array<{ name: string; start: Date; end: Date; impact_score: number }> = []

  // Define major holiday periods
  const periodDefinitions = [
    {
      name: 'Christmas Season',
      startMonth: 11, // December
      startDay: 20,
      endDay: 26,
      impact: 95,
    },
    {
      name: 'New Year Period',
      startMonth: 11, // December
      startDay: 28,
      endMonth: 0, // January
      endDay: 2,
      impact: 90,
    },
    {
      name: 'Summer Holiday',
      startMonth: 6, // July
      startDay: 1,
      endDay: 31,
      impact: 85,
    },
    {
      name: 'Easter Period',
      // Easter is variable, find from holidays list
      keywords: ['Easter', 'Good Friday'],
      daysBefore: 3,
      daysAfter: 3,
      impact: 80,
    },
  ]

  // Add fixed periods
  periodDefinitions.forEach(def => {
    if ('startDay' in def && def.startDay !== undefined) {
      const start = new Date(year, def.startMonth ?? 0, def.startDay)
      const endMonth = def.endMonth !== undefined ? def.endMonth : (def.startMonth ?? 0)
      const endYear = def.endMonth === 0 ? year + 1 : year
      const end = new Date(endYear, endMonth, def.endDay ?? 1)

      periods.push({
        name: def.name,
        start,
        end,
        impact_score: def.impact,
      })
    }
  })

  // Add variable periods (like Easter)
  periodDefinitions.forEach(def => {
    if ('keywords' in def && def.keywords !== undefined) {
      const holiday = holidays.find(h =>
        def.keywords!.some(keyword => h.name.includes(keyword))
      )

      if (holiday) {
        const date = new Date(holiday.date)
        const start = new Date(date)
        start.setDate(start.getDate() - (def.daysBefore || 0))
        const end = new Date(date)
        end.setDate(end.getDate() + (def.daysAfter || 0))

        periods.push({
          name: def.name,
          start,
          end,
          impact_score: def.impact,
        })
      }
    }
  })

  return periods
}

/**
 * Check if date falls within a holiday period
 */
export function isInHolidayPeriod(
  date: Date,
  periods: Array<{ name: string; start: Date; end: Date; impact_score: number }>
): { in_period: boolean; period_name?: string; impact_score: number } {
  for (const period of periods) {
    if (date >= period.start && date <= period.end) {
      return {
        in_period: true,
        period_name: period.name,
        impact_score: period.impact_score,
      }
    }
  }

  return {
    in_period: false,
    impact_score: 0,
  }
}

/**
 * Get comprehensive holiday impact for a date
 * Combines individual holiday + holiday period analysis
 */
export function getHolidayImpactForDate(
  date: Date,
  holidays: Holiday[]
): HolidayImpact {
  // Check if it's a specific holiday
  const holidayCheck = isHoliday(date, holidays)

  if (holidayCheck.is_holiday) {
    return holidayCheck
  }

  // Check if it's in a holiday period
  const periods = getHolidayPeriods(holidays, date.getFullYear())
  const periodCheck = isInHolidayPeriod(date, periods)

  if (periodCheck.in_period) {
    return {
      is_holiday: true,
      holiday_name: periodCheck.period_name,
      impact_score: periodCheck.impact_score,
      price_multiplier: 1 + (periodCheck.impact_score / 500), // Scale to reasonable multiplier
    }
  }

  return {
    is_holiday: false,
    impact_score: 0,
    price_multiplier: 1.0,
  }
}

/**
 * Batch check holidays for multiple dates
 */
export async function getHolidaysForDates(
  dates: Date[],
  countryCode: string
): Promise<Map<string, HolidayImpact>> {
  const holidayMap = new Map<string, HolidayImpact>()

  // Get unique years
  const years = [...new Set(dates.map(d => d.getFullYear()))]

  // Fetch holidays for all years
  const allHolidays: Holiday[] = []
  for (const year of years) {
    const yearHolidays = await getHolidays(countryCode, year)
    allHolidays.push(...yearHolidays)
  }

  // Check each date
  dates.forEach(date => {
    const dateStr = date.toISOString().split('T')[0]
    const impact = getHolidayImpactForDate(date, allHolidays)
    holidayMap.set(dateStr, impact)
  })

  return holidayMap
}

/**
 * Get upcoming holidays (next 90 days)
 */
export async function getUpcomingHolidays(
  countryCode: string,
  daysAhead: number = 90
): Promise<Holiday[]> {
  const today = new Date()
  const currentYear = today.getFullYear()
  const nextYear = currentYear + 1

  // Fetch holidays for current and next year
  const [currentYearHolidays, nextYearHolidays] = await Promise.all([
    getHolidays(countryCode, currentYear),
    getHolidays(countryCode, nextYear),
  ])

  const allHolidays = [...currentYearHolidays, ...nextYearHolidays]

  // Filter to upcoming holidays
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + daysAhead)

  return allHolidays.filter(h => {
    const holidayDate = new Date(h.date)
    return holidayDate >= today && holidayDate <= endDate
  })
}

/**
 * Get mock holidays for testing
 */
function getMockHolidays(countryCode: string, year: number): Holiday[] {
  // Common holidays that exist in most countries
  return [
    {
      name: "New Year's Day",
      description: 'First day of the year',
      date: `${year}-01-01`,
      type: ['National holiday', 'Public holiday'],
      country: countryCode,
      is_major: true,
    },
    {
      name: "Valentine's Day",
      description: 'Day of love',
      date: `${year}-02-14`,
      type: ['Observance'],
      country: countryCode,
      is_major: false,
    },
    {
      name: 'Easter Sunday',
      description: 'Christian holiday',
      date: `${year}-04-09`,
      type: ['National holiday', 'Public holiday'],
      country: countryCode,
      is_major: true,
    },
    {
      name: 'Labor Day',
      description: 'Workers day',
      date: `${year}-05-01`,
      type: ['National holiday', 'Public holiday'],
      country: countryCode,
      is_major: true,
    },
    {
      name: 'Independence Day',
      description: 'National independence',
      date: `${year}-07-04`,
      type: ['National holiday', 'Public holiday'],
      country: countryCode,
      is_major: true,
    },
    {
      name: 'Halloween',
      description: 'Spooky celebration',
      date: `${year}-10-31`,
      type: ['Observance'],
      country: countryCode,
      is_major: false,
    },
    {
      name: 'Thanksgiving',
      description: 'Harvest celebration',
      date: `${year}-11-23`,
      type: ['National holiday', 'Public holiday'],
      country: countryCode,
      is_major: true,
    },
    {
      name: 'Christmas Day',
      description: 'Christian holiday',
      date: `${year}-12-25`,
      type: ['National holiday', 'Public holiday'],
      country: countryCode,
      is_major: true,
    },
  ]
}

/**
 * Get country code from country name
 */
export function getCountryCode(countryName: string): string {
  const countryMap: Record<string, string> = {
    'United States': 'US',
    'United Kingdom': 'GB',
    'France': 'FR',
    'Germany': 'DE',
    'Spain': 'ES',
    'Italy': 'IT',
    'Canada': 'CA',
    'Australia': 'AU',
    'Japan': 'JP',
    'Switzerland': 'CH',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'Austria': 'AT',
    'Portugal': 'PT',
    'Greece': 'GR',
    'UAE': 'AE',
  }

  return countryMap[countryName] || 'US'
}

/**
 * Test Calendarific API connection
 */
export async function testCalendarificConnection(): Promise<boolean> {
  const apiKey = import.meta.env.VITE_CALENDARIFIC_API_KEY

  if (!apiKey) {
    return false
  }

  try {
    const year = new Date().getFullYear()
    const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=US&year=${year}`

    const response = await fetch(url)
    return response.ok

  } catch (error) {
    console.error('Calendarific connection test failed:', error)
    return false
  }
}
