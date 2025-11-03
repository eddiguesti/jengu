/**
 * Universal CSV Column Mapper
 * Automatically detects and maps CSV columns to database schema
 * Supports ANY campsite's CSV format with intelligent pattern matching
 */

export interface ColumnMapping {
  // Core fields (required)
  date: string | null
  accommodation: string | null
  price: string | null

  // Common fields (optional)
  bookings?: string | null
  occupancy?: string | null
  availability?: string | null
  revenue?: string | null

  // Metadata
  unmapped: string[] // Columns that will be stored in custom_data
  confidence: number // 0.0 to 1.0 (how confident we are)
  suggestions: Record<string, string[]> // Alternative mappings
}

export interface MappedRow {
  // Core fields
  date: Date
  accommodation_type: string
  price: number

  // Optional fields
  bookings_count?: number
  occupancy_rate?: number
  availability_status?: string
  revenue?: number

  // Custom data (unmapped columns)
  custom_data: Record<string, any>
}

/**
 * Column pattern definitions
 * Add more patterns to support more CSV formats!
 */
const COLUMN_PATTERNS = {
  // Date patterns (most important!)
  date: [
    'date',
    'check_in',
    'checkin',
    'check-in',
    'arrival',
    'arrival_date',
    'arrivaldate',
    'stay_date',
    'staydate',
    'night_date',
    'nightdate',
    'booking_date',
    'checkout',
    'check_out',
    'check-out',
    'datum', // German
    'fecha', // Spanish
    'data', // Italian/Portuguese
    'arrivée', // French
    'arrivee',
  ],

  // Accommodation type patterns
  accommodation: [
    'accommodation',
    'accommodation_type',
    'accommodationType',
    'unit_type',
    'unittype',
    'unit',
    'room_type',
    'roomtype',
    'room',
    'campsite_type',
    'campsitetype',
    'type',
    'category',
    'hébergement', // French
    'hebergement',
    'unterkunft', // German
    'alojamiento', // Spanish
    'alloggio', // Italian
  ],

  // Price patterns
  price: [
    'price',
    'rate',
    'nightly_rate',
    'nightlyrate',
    'daily_rate',
    'dailyrate',
    'room_rate',
    'roomrate',
    'adr',
    'average_daily_rate',
    'tariff',
    'cost',
    'amount',
    'prix', // French
    'preis', // German
    'precio', // Spanish
    'prezzo', // Italian
    'weekly_rate',
    'weeklyrate',
    'per_night',
    'pernight',
  ],

  // Bookings patterns
  bookings: [
    'bookings',
    'reservations',
    'rooms_sold',
    'roomssold',
    'units_sold',
    'unitssold',
    'occupied_rooms',
    'occupiedrooms',
    'sold_rooms',
    'soldrooms',
    'number_of_bookings',
    'numberofbookings',
    'booking_count',
    'bookingcount',
    'réservations', // French
    'reservierungen', // German
    'reservas', // Spanish
    'prenotazioni', // Italian
  ],

  // Occupancy patterns
  occupancy: [
    'occupancy',
    'occupancy_rate',
    'occupancyrate',
    'occupancy_%',
    'occupancy_pct',
    'occupancy_percent',
    'utilization',
    'taux_occupation', // French
    'auslastung', // German
    'ocupación', // Spanish
    'ocupacion',
    'occupazione', // Italian
  ],

  // Availability patterns
  availability: [
    'availability',
    'available',
    'status',
    'booking_status',
    'bookingstatus',
    'disponibilité', // French
    'disponibilite',
    'verfügbarkeit', // German
    'disponibilidad', // Spanish
    'disponibilità', // Italian
    'disponibilita',
  ],

  // Revenue patterns
  revenue: [
    'revenue',
    'total_revenue',
    'totalrevenue',
    'income',
    'sales',
    'turnover',
    'revenu', // French
    'umsatz', // German
    'ingresos', // Spanish
    'ricavi', // Italian
  ],
}

/**
 * Normalize column name for matching
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Remove duplicate underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
}

/**
 * Find best matching column for a given field
 */
function findBestMatch(
  headers: string[],
  patterns: string[],
  alreadyMapped: Set<string>
): { column: string | null; confidence: number } {
  let bestMatch: string | null = null
  let bestScore = 0

  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalizeColumnName(h),
  }))

  for (const pattern of patterns) {
    for (const header of normalizedHeaders) {
      // Skip if already mapped to another field
      if (alreadyMapped.has(header.original)) continue

      // Exact match (highest confidence)
      if (header.normalized === pattern) {
        return { column: header.original, confidence: 1.0 }
      }

      // Contains pattern (medium confidence)
      if (header.normalized.includes(pattern)) {
        const score = pattern.length / header.normalized.length // Longer pattern = higher confidence
        if (score > bestScore) {
          bestMatch = header.original
          bestScore = score
        }
      }

      // Pattern contains column name (lower confidence)
      if (pattern.includes(header.normalized) && header.normalized.length > 2) {
        const score = header.normalized.length / pattern.length
        if (score > bestScore * 0.8) {
          // Slightly lower weight
          bestMatch = header.original
          bestScore = score * 0.8
        }
      }
    }
  }

  return { column: bestMatch, confidence: bestScore }
}

/**
 * Detect column mapping from CSV headers
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const alreadyMapped = new Set<string>()

  // Required fields
  const dateMatch = findBestMatch(headers, COLUMN_PATTERNS.date, alreadyMapped)
  if (dateMatch.column) alreadyMapped.add(dateMatch.column)

  const accommodationMatch = findBestMatch(
    headers,
    COLUMN_PATTERNS.accommodation,
    alreadyMapped
  )
  if (accommodationMatch.column) alreadyMapped.add(accommodationMatch.column)

  const priceMatch = findBestMatch(headers, COLUMN_PATTERNS.price, alreadyMapped)
  if (priceMatch.column) alreadyMapped.add(priceMatch.column)

  // Optional fields
  const bookingsMatch = findBestMatch(headers, COLUMN_PATTERNS.bookings, alreadyMapped)
  if (bookingsMatch.column) alreadyMapped.add(bookingsMatch.column)

  const occupancyMatch = findBestMatch(headers, COLUMN_PATTERNS.occupancy, alreadyMapped)
  if (occupancyMatch.column) alreadyMapped.add(occupancyMatch.column)

  const availabilityMatch = findBestMatch(headers, COLUMN_PATTERNS.availability, alreadyMapped)
  if (availabilityMatch.column) alreadyMapped.add(availabilityMatch.column)

  const revenueMatch = findBestMatch(headers, COLUMN_PATTERNS.revenue, alreadyMapped)
  if (revenueMatch.column) alreadyMapped.add(revenueMatch.column)

  // Unmapped columns (will be stored in custom_data)
  const unmapped = headers.filter((h) => !alreadyMapped.has(h))

  // Calculate overall confidence
  const requiredFields = [dateMatch, accommodationMatch, priceMatch]
  const avgConfidence =
    requiredFields.reduce((sum, match) => sum + match.confidence, 0) / requiredFields.length

  // Generate suggestions for low-confidence mappings
  const suggestions: Record<string, string[]> = {}
  if (dateMatch.confidence < 0.8) {
    suggestions.date = headers.filter((h) => !alreadyMapped.has(h)).slice(0, 3)
  }
  if (accommodationMatch.confidence < 0.8) {
    suggestions.accommodation = headers.filter((h) => !alreadyMapped.has(h)).slice(0, 3)
  }
  if (priceMatch.confidence < 0.8) {
    suggestions.price = headers.filter((h) => !alreadyMapped.has(h)).slice(0, 3)
  }

  return {
    date: dateMatch.column,
    accommodation: accommodationMatch.column,
    price: priceMatch.column,
    bookings: bookingsMatch.column,
    occupancy: occupancyMatch.column,
    availability: availabilityMatch.column,
    revenue: revenueMatch.column,
    unmapped,
    confidence: avgConfidence,
    suggestions,
  }
}

/**
 * Parse date from various formats
 */
function parseDate(dateString: string): Date {
  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return new Date(dateString)
  }

  // Try European format (DD/MM/YYYY or DD-MM-YYYY)
  const euroMatch = dateString.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (euroMatch) {
    const [_, day, month, year] = euroMatch
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  }

  // Try US format (MM/DD/YYYY)
  const usMatch = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) {
    return new Date(dateString)
  }

  // Fallback: Try native Date parsing
  const parsed = new Date(dateString)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  throw new Error(`Unable to parse date: ${dateString}`)
}

/**
 * Parse price (handles currency symbols, commas, etc.)
 */
function parsePrice(priceString: string): number {
  // Remove currency symbols, spaces, and convert comma to decimal point
  const cleaned = priceString
    .replace(/[€$£¥₹\s]/g, '')
    .replace(',', '.')
    .trim()

  const price = parseFloat(cleaned)
  if (isNaN(price)) {
    throw new Error(`Unable to parse price: ${priceString}`)
  }

  return price
}

/**
 * Map a CSV row to standardized format
 */
export function mapRow(row: Record<string, string>, mapping: ColumnMapping): MappedRow {
  // Validate required fields
  if (!mapping.date || !mapping.accommodation || !mapping.price) {
    throw new Error('Missing required field mappings (date, accommodation, price)')
  }

  if (!row[mapping.date] || !row[mapping.accommodation] || !row[mapping.price]) {
    throw new Error(`Missing required field values in row: ${JSON.stringify(row)}`)
  }

  // Parse core fields
  const date = parseDate(row[mapping.date])
  const accommodation_type = row[mapping.accommodation].trim()
  const price = parsePrice(row[mapping.price])

  // Parse optional fields
  const bookings_count = mapping.bookings ? parseInt(row[mapping.bookings]) : undefined
  const occupancy_rate = mapping.occupancy ? parseFloat(row[mapping.occupancy]) : undefined
  const availability_status = mapping.availability ? row[mapping.availability] : undefined
  const revenue = mapping.revenue ? parseFloat(row[mapping.revenue]) : undefined

  // Collect unmapped columns into custom_data
  const custom_data: Record<string, any> = {}
  for (const column of mapping.unmapped) {
    custom_data[column] = row[column]
  }

  return {
    date,
    accommodation_type,
    price,
    bookings_count,
    occupancy_rate,
    availability_status,
    revenue,
    custom_data,
  }
}

/**
 * Validate entire batch of rows
 */
export function validateBatch(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): {
  valid: MappedRow[]
  errors: Array<{ row: number; error: string }>
} {
  const valid: MappedRow[] = []
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < rows.length; i++) {
    try {
      const mapped = mapRow(rows[i], mapping)
      valid.push(mapped)
    } catch (error) {
      errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { valid, errors }
}

/**
 * Generate user-friendly mapping report
 */
export function generateMappingReport(mapping: ColumnMapping): string {
  const lines: string[] = []

  lines.push('📊 CSV Column Mapping Report')
  lines.push('═'.repeat(50))
  lines.push('')

  // Core mappings
  lines.push('✅ Core Fields:')
  lines.push(`   Date Column:          ${mapping.date || '❌ NOT DETECTED'}`)
  lines.push(`   Accommodation Column: ${mapping.accommodation || '❌ NOT DETECTED'}`)
  lines.push(`   Price Column:         ${mapping.price || '❌ NOT DETECTED'}`)
  lines.push('')

  // Optional mappings
  if (mapping.bookings || mapping.occupancy || mapping.availability || mapping.revenue) {
    lines.push('📝 Optional Fields:')
    if (mapping.bookings) lines.push(`   Bookings Column:      ${mapping.bookings}`)
    if (mapping.occupancy) lines.push(`   Occupancy Column:     ${mapping.occupancy}`)
    if (mapping.availability) lines.push(`   Availability Column:  ${mapping.availability}`)
    if (mapping.revenue) lines.push(`   Revenue Column:       ${mapping.revenue}`)
    lines.push('')
  }

  // Unmapped columns
  if (mapping.unmapped.length > 0) {
    lines.push('⚠️  Unmapped Columns (will be stored as custom data):')
    for (const col of mapping.unmapped) {
      lines.push(`   • ${col}`)
    }
    lines.push('')
  }

  // Confidence
  const confidencePercent = Math.round(mapping.confidence * 100)
  const confidenceEmoji = confidencePercent >= 90 ? '✨' : confidencePercent >= 70 ? '👍' : '⚠️'
  lines.push(`${confidenceEmoji} Confidence: ${confidencePercent}%`)

  // Suggestions
  if (Object.keys(mapping.suggestions).length > 0) {
    lines.push('')
    lines.push('💡 Suggestions for low-confidence mappings:')
    for (const [field, suggestions] of Object.entries(mapping.suggestions)) {
      lines.push(`   ${field}: ${suggestions.join(', ')}`)
    }
  }

  return lines.join('\n')
}
