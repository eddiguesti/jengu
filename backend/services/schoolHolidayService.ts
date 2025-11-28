/**
 * French School Holiday Service
 *
 * Provides school holiday data for French academic calendar zones A, B, and C.
 * Hardcoded data based on official French Ministry of Education calendars.
 *
 * Zone Coverage:
 * - Zone A: Besançon, Bordeaux, Clermont-Ferrand, Dijon, Grenoble, Limoges, Lyon, Poitiers
 * - Zone B: Aix-Marseille, Amiens, Caen, Lille, Nancy-Metz, Nantes, Nice, Orléans-Tours, Reims, Rennes, Rouen, Strasbourg
 * - Zone C: Créteil, Montpellier, Paris, Toulouse, Versailles
 *
 * Note: Corsica follows Zone C, overseas territories have different calendars.
 */

export type SchoolHolidayZone = 'A' | 'B' | 'C' | 'ALL'

export interface SchoolHolidayPeriod {
  name: string
  nameEn: string
  zones: SchoolHolidayZone[]
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD (inclusive)
}

export interface SchoolHolidayInfo {
  isHoliday: boolean
  zones: SchoolHolidayZone[]
  holidayName: string | null
  holidayNameEn: string | null
}

/**
 * French School Holidays 2024-2025
 * Source: https://www.education.gouv.fr/calendrier-scolaire
 */
const HOLIDAYS_2024_2025: SchoolHolidayPeriod[] = [
  // Toussaint (All Saints) - Same for all zones
  {
    name: 'Vacances de la Toussaint',
    nameEn: 'All Saints Holiday',
    zones: ['ALL'],
    start: '2024-10-19',
    end: '2024-11-04',
  },

  // Noël (Christmas) - Same for all zones
  {
    name: 'Vacances de Noël',
    nameEn: 'Christmas Holiday',
    zones: ['ALL'],
    start: '2024-12-21',
    end: '2025-01-06',
  },

  // Hiver (Winter) - Varies by zone
  {
    name: "Vacances d'Hiver",
    nameEn: 'Winter Holiday',
    zones: ['A'],
    start: '2025-02-22',
    end: '2025-03-10',
  },
  {
    name: "Vacances d'Hiver",
    nameEn: 'Winter Holiday',
    zones: ['B'],
    start: '2025-02-08',
    end: '2025-02-24',
  },
  {
    name: "Vacances d'Hiver",
    nameEn: 'Winter Holiday',
    zones: ['C'],
    start: '2025-02-15',
    end: '2025-03-03',
  },

  // Printemps (Spring) - Varies by zone
  {
    name: 'Vacances de Printemps',
    nameEn: 'Spring Holiday',
    zones: ['A'],
    start: '2025-04-19',
    end: '2025-05-05',
  },
  {
    name: 'Vacances de Printemps',
    nameEn: 'Spring Holiday',
    zones: ['B'],
    start: '2025-04-05',
    end: '2025-04-22',
  },
  {
    name: 'Vacances de Printemps',
    nameEn: 'Spring Holiday',
    zones: ['C'],
    start: '2025-04-12',
    end: '2025-04-28',
  },

  // Été (Summer) - Same for all zones
  {
    name: "Vacances d'Été",
    nameEn: 'Summer Holiday',
    zones: ['ALL'],
    start: '2025-07-05',
    end: '2025-09-01',
  },
]

/**
 * French School Holidays 2025-2026
 * Source: https://www.education.gouv.fr/calendrier-scolaire
 */
const HOLIDAYS_2025_2026: SchoolHolidayPeriod[] = [
  // Toussaint (All Saints) - Same for all zones
  {
    name: 'Vacances de la Toussaint',
    nameEn: 'All Saints Holiday',
    zones: ['ALL'],
    start: '2025-10-18',
    end: '2025-11-03',
  },

  // Noël (Christmas) - Same for all zones
  {
    name: 'Vacances de Noël',
    nameEn: 'Christmas Holiday',
    zones: ['ALL'],
    start: '2025-12-20',
    end: '2026-01-05',
  },

  // Hiver (Winter) - Varies by zone
  {
    name: "Vacances d'Hiver",
    nameEn: 'Winter Holiday',
    zones: ['A'],
    start: '2026-02-07',
    end: '2026-02-23',
  },
  {
    name: "Vacances d'Hiver",
    nameEn: 'Winter Holiday',
    zones: ['B'],
    start: '2026-02-21',
    end: '2026-03-09',
  },
  {
    name: "Vacances d'Hiver",
    nameEn: 'Winter Holiday',
    zones: ['C'],
    start: '2026-02-14',
    end: '2026-03-02',
  },

  // Printemps (Spring) - Varies by zone
  {
    name: 'Vacances de Printemps',
    nameEn: 'Spring Holiday',
    zones: ['A'],
    start: '2026-04-04',
    end: '2026-04-20',
  },
  {
    name: 'Vacances de Printemps',
    nameEn: 'Spring Holiday',
    zones: ['B'],
    start: '2026-04-18',
    end: '2026-05-04',
  },
  {
    name: 'Vacances de Printemps',
    nameEn: 'Spring Holiday',
    zones: ['C'],
    start: '2026-04-11',
    end: '2026-04-27',
  },

  // Été (Summer) - Same for all zones
  {
    name: "Vacances d'Été",
    nameEn: 'Summer Holiday',
    zones: ['ALL'],
    start: '2026-07-04',
    end: '2026-09-01',
  },
]

/**
 * All school holidays combined
 */
const ALL_SCHOOL_HOLIDAYS: SchoolHolidayPeriod[] = [...HOLIDAYS_2024_2025, ...HOLIDAYS_2025_2026]

/**
 * Parse date string to Date object (midnight UTC)
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * Normalize a Date to midnight UTC for comparison
 */
function normalizeDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

/**
 * Check if a date is within a holiday period
 */
function isDateInPeriod(date: Date, period: SchoolHolidayPeriod): boolean {
  const normalizedDate = normalizeDate(date)
  const start = parseDate(period.start)
  const end = parseDate(period.end)

  return normalizedDate >= start && normalizedDate <= end
}

/**
 * Check if a specific zone is on holiday for a given date
 *
 * @param date - Date to check
 * @param zone - Optional zone ('A', 'B', or 'C'). If not provided, returns true if ANY zone is on holiday.
 * @returns true if the zone (or any zone) is on school holiday
 */
export function isSchoolHoliday(date: Date, zone?: 'A' | 'B' | 'C'): boolean {
  for (const period of ALL_SCHOOL_HOLIDAYS) {
    if (!isDateInPeriod(date, period)) continue

    // If zone is ALL, it applies to all zones
    if (period.zones.includes('ALL')) {
      return true
    }

    // If no specific zone requested, return true if any zone matches
    if (!zone) {
      return true
    }

    // Check if the specific zone is on holiday
    if (period.zones.includes(zone)) {
      return true
    }
  }

  return false
}

/**
 * Get detailed school holiday information for a date
 *
 * @param date - Date to check
 * @returns Object with holiday status, zones on holiday, and holiday name
 */
export function getSchoolHolidayInfo(date: Date): SchoolHolidayInfo {
  const activeZones: SchoolHolidayZone[] = []
  let holidayName: string | null = null
  let holidayNameEn: string | null = null

  for (const period of ALL_SCHOOL_HOLIDAYS) {
    if (!isDateInPeriod(date, period)) continue

    // Collect zones for this period
    if (period.zones.includes('ALL')) {
      // ALL means all three zones
      if (!activeZones.includes('A')) activeZones.push('A')
      if (!activeZones.includes('B')) activeZones.push('B')
      if (!activeZones.includes('C')) activeZones.push('C')
    } else {
      for (const z of period.zones) {
        if (!activeZones.includes(z)) {
          activeZones.push(z)
        }
      }
    }

    // Use the first matching holiday name
    if (!holidayName) {
      holidayName = period.name
      holidayNameEn = period.nameEn
    }
  }

  return {
    isHoliday: activeZones.length > 0,
    zones: activeZones,
    holidayName,
    holidayNameEn,
  }
}

/**
 * Get the zone string for database storage
 * Returns 'ALL' if all zones, comma-separated zones otherwise, or null if not a holiday
 */
export function getSchoolHolidayZoneString(date: Date): string | null {
  const info = getSchoolHolidayInfo(date)

  if (!info.isHoliday) {
    return null
  }

  // Check if all zones are on holiday
  if (
    info.zones.length === 3 &&
    info.zones.includes('A') &&
    info.zones.includes('B') &&
    info.zones.includes('C')
  ) {
    return 'ALL'
  }

  // Return comma-separated zones
  return info.zones.sort().join(',')
}

/**
 * Get all school holiday periods
 * Useful for debugging or displaying calendar
 */
export function getAllSchoolHolidays(): SchoolHolidayPeriod[] {
  return ALL_SCHOOL_HOLIDAYS
}

/**
 * Get school holidays for a specific year range
 */
export function getSchoolHolidaysForDateRange(
  startDate: Date,
  endDate: Date
): SchoolHolidayPeriod[] {
  return ALL_SCHOOL_HOLIDAYS.filter(period => {
    const periodStart = parseDate(period.start)
    const periodEnd = parseDate(period.end)
    const rangeStart = normalizeDate(startDate)
    const rangeEnd = normalizeDate(endDate)

    // Check if periods overlap
    return periodStart <= rangeEnd && periodEnd >= rangeStart
  })
}

export default {
  isSchoolHoliday,
  getSchoolHolidayInfo,
  getSchoolHolidayZoneString,
  getAllSchoolHolidays,
  getSchoolHolidaysForDateRange,
}
