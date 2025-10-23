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

  // Check if exact match exists at top level
  if (columnNames.includes(expectedColumn)) {
    return expectedColumn
  }

  // Check mappings at top level
  const mappings = COLUMN_MAPPINGS[expectedColumn] || []
  for (const mapping of mappings) {
    const found = columnNames.find(col => col.toLowerCase().trim() === mapping.toLowerCase())
    if (found) return found
  }

  // Check inside extraData if it exists
  if (firstRow.extraData && typeof firstRow.extraData === 'object') {
    const extraData = firstRow.extraData as Record<string, unknown>
    const extraDataKeys = Object.keys(extraData)

    // Check exact match in extraData
    if (extraDataKeys.includes(expectedColumn)) {
      console.log(`   ✓ Found ${expectedColumn} in extraData`)
      return `extraData.${expectedColumn}`
    }

    // Check mappings in extraData
    for (const mapping of mappings) {
      const found = extraDataKeys.find(col => col.toLowerCase().trim() === mapping.toLowerCase())
      if (found) {
        console.log(`   ✓ Found ${expectedColumn} → extraData.${found}`)
        return `extraData.${found}`
      }
    }
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
 * Get value from row, handling both direct fields and nested extraData fields
 */
function getRowValue(row: RawDataRow, columnPath: string | null): unknown {
  if (!columnPath) return null

  // Handle nested extraData fields (e.g., "extraData.availability")
  if (columnPath.startsWith('extraData.')) {
    const field = columnPath.replace('extraData.', '')
    const extraData = row.extraData as Record<string, unknown> | undefined
    return extraData?.[field]
  }

  // Handle direct fields
  return row[columnPath]
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

  // Debug: Log the first row structure
  if (rawData[0]) {
    console.log('🔍 First row structure:', {
      topLevelKeys: Object.keys(rawData[0]),
      hasExtraData: !!rawData[0].extraData,
      extraDataType: typeof rawData[0].extraData,
      extraDataKeys: rawData[0].extraData
        ? Object.keys(rawData[0].extraData as Record<string, unknown>)
        : [],
    })
  }

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
      const date = parseDate(getRowValue(row, dateCol))
      if (!date) {
        skippedRows++
        return
      }

      // Parse price
      const price = parseFloat(String(getRowValue(row, priceCol))) || 0
      if (price <= 0) {
        skippedRows++
        return
      }

      // Get or calculate occupancy
      let occupancy = 0
      const occupancyValue = getRowValue(row, occupancyCol)
      if (occupancyCol && occupancyValue) {
        occupancy = parseFloat(String(occupancyValue)) || 0
        // If occupancy is percentage (>1), convert to decimal
        if (occupancy > 1) {
          occupancy = occupancy / 100
        }
      } else if (bookingsCol && availabilityCol) {
        occupancy = calculateOccupancy(
          getRowValue(row, bookingsCol),
          getRowValue(row, availabilityCol)
        )
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
      const weatherValue = getRowValue(row, weatherCol)
      if (weatherCol && weatherValue) {
        transformedRow.weather = String(weatherValue)
      }

      const temperatureValue = getRowValue(row, temperatureCol)
      if (temperatureCol && temperatureValue) {
        transformedRow.temperature = parseFloat(String(temperatureValue)) || null
      }

      const bookingsValue = getRowValue(row, bookingsCol)
      if (bookingsCol && bookingsValue) {
        transformedRow.bookings = parseFloat(String(bookingsValue)) || 0
      }

      const availabilityValue = getRowValue(row, availabilityCol)
      if (availabilityCol && availabilityValue) {
        transformedRow.availability = parseFloat(String(availabilityValue)) || 0
      }

      const unitTypeValue = getRowValue(row, unitTypeCol)
      if (unitTypeCol && unitTypeValue) {
        transformedRow.unit_type = String(unitTypeValue)
      }

      const channelValue = getRowValue(row, channelCol)
      if (channelCol && channelValue) {
        transformedRow.channel = String(channelValue)
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
