/**
 * Data Transformation Service
 * Handles different CSV formats and normalizes data for analytics
 */

interface RawDataRow {
  [key: string]: unknown
}

interface TransformedDataRow {
  date: string
  price: number
  occupancy: number
  weather?: string
  temperature?: number | null
  bookings?: number
  availability?: number
  unit_type?: string
  channel?: string
  [key: string]: unknown
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  stats: ValidationStats
}

interface ValidationStats {
  totalRows: number
  dateRange: {
    start?: string
    end?: string
  }
  priceRange: {
    min: number
    max: number
    avg: number
  }
  occupancyRange: {
    min: number
    max: number
    avg: number
  } | null
  hasWeather: boolean
  hasTemperature: boolean
}

/**
 * Smart column mapping - handles various CSV column naming conventions
 */
const COLUMN_MAPPINGS: Record<string, string[]> = {
  // Date columns
  date: ['date', 'check_in', 'checkin', 'booking_date', 'reservation_date', 'arrival_date'],

  // Price columns
  price: ['price', 'rate', 'nightly_rate', 'daily_rate', 'amount', 'revenue', 'total_price'],

  // Occupancy columns
  occupancy: ['occupancy', 'occupancy_rate', 'utilization', 'fill_rate'],

  // Bookings columns
  bookings: ['bookings', 'reservations', 'booking_count', 'number_of_bookings'],

  // Availability columns
  availability: ['availability', 'available_units', 'capacity', 'total_units', 'rooms_available'],

  // Weather columns (optional)
  weather: ['weather', 'weather_condition', 'condition', 'sky'],
  temperature: ['temperature', 'temp', 'avg_temp', 'temperature_c'],

  // Unit type columns (optional)
  unit_type: ['unit_type', 'room_type', 'accommodation_type', 'type'],

  // Channel columns (optional)
  channel: ['channel', 'booking_channel', 'source', 'platform'],
}

/**
 * Find actual column name in data that matches expected column
 */
function findColumnName(data: RawDataRow[], expectedColumn: string): string | null {
  if (!data || data.length === 0) return null

  const firstRow = data[0]
  if (!firstRow) return null
  const columnNames = Object.keys(firstRow)

  // Check if exact match exists
  if (columnNames.includes(expectedColumn)) {
    return expectedColumn
  }

  // Check mappings
  const mappings = COLUMN_MAPPINGS[expectedColumn] || []
  for (const mapping of mappings) {
    const found = columnNames.find(col => col.toLowerCase().trim() === mapping.toLowerCase())
    if (found) return found
  }

  return null
}

/**
 * Calculate occupancy from bookings and availability
 */
function calculateOccupancy(bookings: unknown, availability: unknown): number {
  const b = parseFloat(String(bookings)) || 0
  const a = parseFloat(String(availability)) || 0

  if (a === 0) return 0

  // Occupancy = bookings / availability
  const occupancy = b / a

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, occupancy))
}

/**
 * Parse and validate date
 */
function parseDate(dateStr: unknown): string | null {
  if (!dateStr) return null

  try {
    const date = new Date(String(dateStr))
    if (isNaN(date.getTime())) return null
    const isoDate = date.toISOString().split('T')[0]
    return isoDate || null
  } catch {
    return null
  }
}

/**
 * Transform raw CSV data into analytics-ready format
 */
export function transformDataForAnalytics(rawData: RawDataRow[]): TransformedDataRow[] {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    console.warn('⚠️ No data to transform')
    return []
  }

  console.log(`🔄 Transforming ${rawData.length} rows...`)

  // Find actual column names
  const dateCol = findColumnName(rawData, 'date')
  const priceCol = findColumnName(rawData, 'price')
  const occupancyCol = findColumnName(rawData, 'occupancy')
  const bookingsCol = findColumnName(rawData, 'bookings')
  const availabilityCol = findColumnName(rawData, 'availability')
  const weatherCol = findColumnName(rawData, 'weather')
  const temperatureCol = findColumnName(rawData, 'temperature')
  const unitTypeCol = findColumnName(rawData, 'unit_type')
  const channelCol = findColumnName(rawData, 'channel')

  console.log('📊 Column mapping detected:')
  console.log(`  - Date: ${dateCol || 'NOT FOUND'}`)
  console.log(`  - Price: ${priceCol || 'NOT FOUND'}`)
  console.log(`  - Occupancy: ${occupancyCol || 'WILL CALCULATE'}`)
  console.log(`  - Bookings: ${bookingsCol || 'NOT FOUND'}`)
  console.log(`  - Availability: ${availabilityCol || 'NOT FOUND'}`)
  console.log(`  - Weather: ${weatherCol || 'OPTIONAL - NOT FOUND'}`)
  console.log(`  - Temperature: ${temperatureCol || 'OPTIONAL - NOT FOUND'}`)

  // Validate required columns
  if (!dateCol) {
    console.error('❌ Required column "date" not found in CSV')
    throw new Error('CSV must contain a date column')
  }

  if (!priceCol) {
    console.error('❌ Required column "price" not found in CSV')
    throw new Error('CSV must contain a price column')
  }

  // Transform data
  const transformed: TransformedDataRow[] = []
  let validRows = 0
  let skippedRows = 0

  rawData.forEach((row, index) => {
    try {
      // Parse date
      const date = parseDate(row[dateCol])
      if (!date) {
        skippedRows++
        return
      }

      // Parse price
      const price = parseFloat(String(row[priceCol])) || 0
      if (price <= 0) {
        skippedRows++
        return
      }

      // Get or calculate occupancy
      let occupancy = 0
      if (occupancyCol && row[occupancyCol]) {
        occupancy = parseFloat(String(row[occupancyCol])) || 0
        // If occupancy is percentage (>1), convert to decimal
        if (occupancy > 1) {
          occupancy = occupancy / 100
        }
      } else if (bookingsCol && availabilityCol) {
        occupancy = calculateOccupancy(row[bookingsCol], row[availabilityCol])
      }

      // Clamp occupancy between 0 and 1
      occupancy = Math.max(0, Math.min(1, occupancy))

      // Build transformed row
      const transformedRow: TransformedDataRow = {
        date,
        price,
        occupancy,
      }

      // Add optional fields
      if (weatherCol && row[weatherCol]) {
        transformedRow.weather = String(row[weatherCol])
      }

      if (temperatureCol && row[temperatureCol]) {
        transformedRow.temperature = parseFloat(String(row[temperatureCol])) || null
      }

      if (bookingsCol && row[bookingsCol]) {
        transformedRow.bookings = parseFloat(String(row[bookingsCol])) || 0
      }

      if (availabilityCol && row[availabilityCol]) {
        transformedRow.availability = parseFloat(String(row[availabilityCol])) || 0
      }

      if (unitTypeCol && row[unitTypeCol]) {
        transformedRow.unit_type = String(row[unitTypeCol])
      }

      if (channelCol && row[channelCol]) {
        transformedRow.channel = String(row[channelCol])
      }

      transformed.push(transformedRow)
      validRows++
    } catch (error) {
      const err = error as Error
      console.warn(`⚠️ Error transforming row ${index + 1}:`, err.message)
      skippedRows++
    }
  })

  console.log(`✅ Transformation complete:`)
  console.log(`  - Valid rows: ${validRows}`)
  console.log(`  - Skipped rows: ${skippedRows}`)
  console.log(`  - Success rate: ${((validRows / rawData.length) * 100).toFixed(1)}%`)

  return transformed
}

/**
 * Validate transformed data quality
 */
export function validateDataQuality(data: TransformedDataRow[]): ValidationResult {
  if (!data || data.length === 0) {
    return {
      isValid: false,
      errors: ['No data provided'],
      warnings: [],
      stats: {} as ValidationStats,
    }
  }

  const errors: string[] = []
  const warnings: string[] = []

  // Check minimum data size
  if (data.length < 30) {
    warnings.push(
      `Dataset is small (${data.length} rows). Recommend at least 30 rows for reliable analytics.`
    )
  }

  // Check for required fields
  const hasDate = data.every(row => row.date)
  const hasPrice = data.every(row => row.price && row.price > 0)
  const hasOccupancy = data.some(row => row.occupancy && row.occupancy > 0)

  if (!hasDate) {
    errors.push('Some rows are missing date values')
  }

  if (!hasPrice) {
    errors.push('Some rows are missing valid price values')
  }

  if (!hasOccupancy) {
    warnings.push('No occupancy data found. Occupancy-based analytics will be limited.')
  }

  // Check for optional enrichment data
  const hasWeather = data.some(row => row.weather)
  const hasTemperature = data.some(row => row.temperature)

  if (!hasWeather && !hasTemperature) {
    warnings.push('No weather data found. Weather-based insights will not be available.')
  }

  // Calculate stats
  const stats: ValidationStats = {
    totalRows: data.length,
    dateRange: {
      start: data[0]?.date,
      end: data[data.length - 1]?.date,
    },
    priceRange: {
      min: Math.min(...data.map(r => r.price)),
      max: Math.max(...data.map(r => r.price)),
      avg: data.reduce((sum, r) => sum + r.price, 0) / data.length,
    },
    occupancyRange: hasOccupancy
      ? {
          min: Math.min(...data.filter(r => r.occupancy > 0).map(r => r.occupancy)),
          max: Math.max(...data.filter(r => r.occupancy > 0).map(r => r.occupancy)),
          avg:
            data.filter(r => r.occupancy > 0).reduce((sum, r) => sum + r.occupancy, 0) /
            data.filter(r => r.occupancy > 0).length,
        }
      : null,
    hasWeather,
    hasTemperature,
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats,
  }
}
