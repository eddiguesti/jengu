/**
 * Intelligent CSV Column Mapping Service
 * Automatically detects and maps various CSV column formats to standardized fields
 */

export interface StandardizedRow {
  // Core fields (always required)
  date: Date
  price: number

  // Common fields (optional but recommended)
  unit_type?: string
  bookings?: number
  availability?: number
  channel?: string
  occupancy?: number

  // Alternative names
  revenue?: number
  adr?: number // Average Daily Rate
  nights?: number
  guests?: number

  // Metadata
  property_id?: string
  property_name?: string
  room_type?: string
  rate_plan?: string

  // Any other fields from the CSV (for flexibility)
  [key: string]: any
}

export interface MappingResult {
  standardizedRow: StandardizedRow
  warnings: string[]
  originalColumns: string[]
}

/**
 * Column mapping patterns for common field names
 * Maps various column name variations to standardized field names
 */
const COLUMN_PATTERNS = {
  // Date fields
  date: [
    'date',
    'check_in',
    'checkin',
    'check-in',
    'arrival',
    'arrival_date',
    'booking_date',
    'stay_date',
    'night_date',
    'checkout',
    'check_out',
    'check-out',
  ],

  // Price/Rate fields
  price: [
    'price',
    'rate',
    'nightly_rate',
    'daily_rate',
    'room_rate',
    'adr',
    'average_daily_rate',
    'tariff',
    'cost',
    'amount',
  ],

  // Revenue fields
  revenue: ['revenue', 'total_revenue', 'income', 'sales', 'turnover'],

  // Bookings/Reservations
  bookings: [
    'bookings',
    'reservations',
    'rooms_sold',
    'units_sold',
    'occupied_rooms',
    'sold_rooms',
    'number_of_bookings',
    'booking_count',
  ],

  // Availability
  availability: [
    'availability',
    'available_rooms',
    'total_rooms',
    'inventory',
    'capacity',
    'rooms_available',
    'units_available',
  ],

  // Occupancy
  occupancy: [
    'occupancy',
    'occupancy_rate',
    'occ',
    'occ_rate',
    'occupancy_pct',
    'occupancy_percent',
  ],

  // Unit/Room Type
  unit_type: [
    'unit_type',
    'room_type',
    'accommodation_type',
    'property_type',
    'unit',
    'room',
    'type',
    'category',
  ],

  // Channel/Source
  channel: [
    'channel',
    'source',
    'booking_source',
    'distribution_channel',
    'ota',
    'platform',
    'marketplace',
  ],

  // Property identification
  property_id: ['property_id', 'property', 'id', 'listing_id', 'unit_id'],
  property_name: ['property_name', 'name', 'listing_name', 'title'],

  // Guests
  guests: ['guests', 'pax', 'number_of_guests', 'guest_count', 'people'],

  // Nights
  nights: ['nights', 'length_of_stay', 'los', 'stay_length', 'duration'],

  // Rate plan
  rate_plan: ['rate_plan', 'plan', 'package', 'offer', 'promotion'],
}

/**
 * Detect which column in the CSV maps to which standard field
 */
export function detectColumnMapping(csvHeaders: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {}

  // Normalize headers (lowercase, trim, remove special chars)
  const normalizedHeaders = csvHeaders.map(h =>
    h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
  )

  // For each standard field, find matching CSV column
  Object.entries(COLUMN_PATTERNS).forEach(([standardField, patterns]) => {
    const matchIndex = normalizedHeaders.findIndex(header =>
      patterns.some(pattern => header.includes(pattern) || pattern.includes(header))
    )

    if (matchIndex !== -1) {
      mapping[standardField] = csvHeaders[matchIndex]
    } else {
      mapping[standardField] = null
    }
  })

  return mapping
}

/**
 * Parse and clean a date value from various formats
 */
function parseDate(value: any): Date | null {
  if (!value) return null

  try {
    // Try direct date parsing
    const date = new Date(String(value))
    if (!isNaN(date.getTime())) return date

    // Try common formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
    const str = String(value).trim()

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const date = new Date(str)
      if (!isNaN(date.getTime())) return date
    }

    // DD/MM/YYYY or MM/DD/YYYY
    const parts = str.split(/[/-]/)
    if (parts.length === 3) {
      const [a, b, c] = parts.map(Number)

      // If year is first: YYYY-MM-DD
      if (a > 1000) {
        const date = new Date(a, b - 1, c)
        if (!isNaN(date.getTime())) return date
      }

      // Try DD/MM/YYYY
      if (c > 1000) {
        const date = new Date(c, b - 1, a)
        if (!isNaN(date.getTime())) return date
      }

      // Try MM/DD/YYYY
      if (c > 1000) {
        const date = new Date(c, a - 1, b)
        if (!isNaN(date.getTime())) return date
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse and clean a numeric value
 */
function parseNumber(value: any, allowNegative = false): number | null {
  if (value === null || value === undefined || value === '') return null

  // Remove common formatting: $, €, £, commas, spaces
  const cleaned = String(value)
    .replace(/[$€£,\s]/g, '')
    .trim()

  const num = parseFloat(cleaned)

  if (isNaN(num)) return null
  if (!allowNegative && num < 0) return null

  return num
}

/**
 * Clean and validate a text value
 */
function cleanText(value: any): string | null {
  if (!value) return null
  return String(value).trim() || null
}

/**
 * Map a raw CSV row to standardized format
 */
export function mapCSVRow(
  rawRow: Record<string, any>,
  columnMapping: Record<string, string | null>
): MappingResult {
  const warnings: string[] = []
  const originalColumns = Object.keys(rawRow)

  // Helper to get value from raw row using mapping
  const getValue = (standardField: string): any => {
    const csvColumn = columnMapping[standardField]
    return csvColumn ? rawRow[csvColumn] : null
  }

  // Parse required fields
  const date = parseDate(getValue('date'))
  if (!date) {
    warnings.push('Invalid or missing date')
  }

  const price = parseNumber(getValue('price'))
  if (price === null || price <= 0) {
    warnings.push('Invalid or missing price')
  }

  // Parse optional fields
  const bookings = parseNumber(getValue('bookings'))
  const availability = parseNumber(getValue('availability'))
  const occupancy = parseNumber(getValue('occupancy'))

  // Calculate occupancy from bookings/availability if not provided
  let finalOccupancy = occupancy
  if (!finalOccupancy && bookings !== null && availability !== null && availability > 0) {
    finalOccupancy = (bookings / availability) * 100
  }

  // Build standardized row
  const standardizedRow: StandardizedRow = {
    date: date || new Date(), // Fallback to today if invalid
    price: price || 0,
  }

  // Add optional fields if they exist
  const optionalFields = {
    unit_type: cleanText(getValue('unit_type')),
    bookings: bookings,
    availability: availability,
    channel: cleanText(getValue('channel')),
    occupancy: finalOccupancy,
    revenue: parseNumber(getValue('revenue')),
    adr: parseNumber(getValue('price')), // ADR is same as price
    nights: parseNumber(getValue('nights')),
    guests: parseNumber(getValue('guests')),
    property_id: cleanText(getValue('property_id')),
    property_name: cleanText(getValue('property_name')),
    room_type: cleanText(getValue('unit_type')),
    rate_plan: cleanText(getValue('rate_plan')),
  }

  Object.entries(optionalFields).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      standardizedRow[key] = value
    }
  })

  // Add any unmapped columns as-is (for flexibility)
  originalColumns.forEach(col => {
    const normalizedCol = col.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
    // Only add if not already mapped to a standard field
    const isMapped = Object.values(columnMapping).includes(col)
    if (!isMapped && rawRow[col] !== null && rawRow[col] !== undefined) {
      standardizedRow[normalizedCol] = rawRow[col]
    }
  })

  return {
    standardizedRow,
    warnings,
    originalColumns,
  }
}

/**
 * Validate a batch of rows and return stats
 */
export interface ValidationStats {
  totalRows: number
  validRows: number
  invalidRows: number
  warnings: string[]
  dateRange: { min: Date; max: Date } | null
  priceRange: { min: number; max: number; avg: number } | null
}

export function validateBatch(rows: StandardizedRow[]): ValidationStats {
  const stats: ValidationStats = {
    totalRows: rows.length,
    validRows: 0,
    invalidRows: 0,
    warnings: [],
    dateRange: null,
    priceRange: null,
  }

  if (rows.length === 0) return stats

  const validRows = rows.filter(r => r.date && r.price > 0)
  stats.validRows = validRows.length
  stats.invalidRows = rows.length - validRows.length

  if (validRows.length === 0) {
    stats.warnings.push('No valid rows found')
    return stats
  }

  // Calculate date range
  const dates = validRows.map(r => r.date).filter(Boolean)
  if (dates.length > 0) {
    stats.dateRange = {
      min: new Date(Math.min(...dates.map(d => d.getTime()))),
      max: new Date(Math.max(...dates.map(d => d.getTime()))),
    }
  }

  // Calculate price range
  const prices = validRows.map(r => r.price).filter(p => p > 0)
  if (prices.length > 0) {
    stats.priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    }
  }

  // Add warnings
  if (stats.invalidRows > 0) {
    stats.warnings.push(`${stats.invalidRows} rows have invalid data`)
  }

  const withoutOccupancy = validRows.filter(r => !r.occupancy && !r.bookings).length
  if (withoutOccupancy > 0) {
    stats.warnings.push(
      `${withoutOccupancy} rows missing occupancy data (will be calculated if possible)`
    )
  }

  return stats
}

/**
 * Generate a mapping report for user review
 */
export function generateMappingReport(
  _csvHeaders: string[],
  columnMapping: Record<string, string | null>,
  sampleRows: StandardizedRow[],
  stats: ValidationStats
): string {
  const lines: string[] = []

  lines.push('📊 CSV Mapping Report')
  lines.push('='.repeat(50))
  lines.push('')

  // Column mapping
  lines.push('🔗 Column Mapping:')
  Object.entries(columnMapping).forEach(([standardField, csvColumn]) => {
    if (csvColumn) {
      lines.push(`   ✓ ${standardField.padEnd(20)} ← "${csvColumn}"`)
    }
  })

  const unmappedCount = Object.values(columnMapping).filter(v => v === null).length
  if (unmappedCount > 0) {
    lines.push(`   ⚠️  ${unmappedCount} standard fields not found in CSV`)
  }

  lines.push('')

  // Validation stats
  lines.push('📈 Validation Stats:')
  lines.push(`   Total Rows: ${stats.totalRows}`)
  lines.push(`   Valid Rows: ${stats.validRows} (${((stats.validRows / stats.totalRows) * 100).toFixed(1)}%)`)
  if (stats.invalidRows > 0) {
    lines.push(`   Invalid Rows: ${stats.invalidRows}`)
  }

  if (stats.dateRange) {
    lines.push(
      `   Date Range: ${stats.dateRange.min.toISOString().split('T')[0]} to ${stats.dateRange.max.toISOString().split('T')[0]}`
    )
  }

  if (stats.priceRange) {
    lines.push(
      `   Price Range: €${stats.priceRange.min.toFixed(2)} - €${stats.priceRange.max.toFixed(2)} (avg: €${stats.priceRange.avg.toFixed(2)})`
    )
  }

  lines.push('')

  // Warnings
  if (stats.warnings.length > 0) {
    lines.push('⚠️  Warnings:')
    stats.warnings.forEach(w => lines.push(`   - ${w}`))
    lines.push('')
  }

  // Sample data
  if (sampleRows.length > 0) {
    lines.push('📝 Sample Standardized Data (first 3 rows):')
    sampleRows.slice(0, 3).forEach((row, i) => {
      lines.push(`   Row ${i + 1}:`)
      lines.push(`      Date: ${row.date.toISOString().split('T')[0]}`)
      lines.push(`      Price: €${row.price.toFixed(2)}`)
      if (row.unit_type) lines.push(`      Unit Type: ${row.unit_type}`)
      if (row.bookings !== undefined) lines.push(`      Bookings: ${row.bookings}`)
      if (row.availability !== undefined) lines.push(`      Availability: ${row.availability}`)
      if (row.occupancy !== undefined)
        lines.push(`      Occupancy: ${row.occupancy.toFixed(1)}%`)
      if (row.channel) lines.push(`      Channel: ${row.channel}`)
    })
  }

  return lines.join('\n')
}
