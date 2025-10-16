/**
 * Centralized Date Parsing Utility
 * Handles flexible date parsing from various CSV formats
 */

/**
 * Parse date string flexibly
 * Handles various date formats: ISO 8601, MM/DD/YYYY, DD-MM-YYYY, etc.
 */
export function parseDate(dateStr: string | Date | null | undefined): Date | null {
  if (!dateStr) return null

  try {
    // If already a Date object, validate it
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? null : dateStr
    }

    // Try standard Date parsing
    const date = new Date(dateStr)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null
    }

    return date
  } catch (error) {
    const err = error as Error
    console.warn(`Failed to parse date: ${dateStr}`, err.message)
    return null
  }
}

/**
 * Format date to ISO date string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date | null | undefined): string | null {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().split('T')[0] || null
}

/**
 * Get date range from array of dates
 */
export function getDateRange(dates: Date[]): { min: Date; max: Date } | null {
  if (!dates || dates.length === 0) {
    return null
  }

  const validDates = dates.filter(d => d instanceof Date && !isNaN(d.getTime()))

  if (validDates.length === 0) {
    return null
  }

  return {
    min: new Date(Math.min(...validDates.map(d => d.getTime()))),
    max: new Date(Math.max(...validDates.map(d => d.getTime())))
  }
}

/**
 * Check if date is within range
 */
export function isDateInRange(date: Date | null, start: Date | null, end: Date | null): boolean {
  if (!date || !start || !end) return false

  const timestamp = date.getTime()
  return timestamp >= start.getTime() && timestamp <= end.getTime()
}
