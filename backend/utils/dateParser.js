/**
 * Centralized Date Parsing Utility
 * Handles flexible date parsing from various CSV formats
 */

/**
 * Parse date string flexibly
 * Handles various date formats: ISO 8601, MM/DD/YYYY, DD-MM-YYYY, etc.
 * @param {string|Date} dateStr - Date string to parse
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    // If already a Date object, validate it
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? null : dateStr;
    }

    // Try standard Date parsing
    const date = new Date(dateStr);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`, error.message);
    return null;
  }
}

/**
 * Format date to ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string|null} - ISO date string or null if invalid
 */
export function formatDateISO(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split('T')[0];
}

/**
 * Get date range from array of dates
 * @param {Date[]} dates - Array of date objects
 * @returns {{min: Date, max: Date}|null} - Min and max dates
 */
export function getDateRange(dates) {
  if (!dates || dates.length === 0) {
    return null;
  }

  const validDates = dates.filter(d => d instanceof Date && !isNaN(d.getTime()));

  if (validDates.length === 0) {
    return null;
  }

  return {
    min: new Date(Math.min(...validDates.map(d => d.getTime()))),
    max: new Date(Math.max(...validDates.map(d => d.getTime())))
  };
}

/**
 * Check if date is within range
 * @param {Date} date - Date to check
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {boolean} - True if date is within range
 */
export function isDateInRange(date, start, end) {
  if (!date || !start || !end) return false;

  const timestamp = date.getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}
