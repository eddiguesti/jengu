/**
 * E2E Test Data Generator
 * Generates realistic CSV data for manual testing scenarios
 */

interface TestDataRow {
  date: string
  price: number
  occupied: boolean
  revenue: number
  day_of_week: string
  lead_time: number
  weather?: string
  temperature?: number
}

/**
 * Generate test CSV data with specified parameters
 */
export function generateTestCSV(config: {
  rows: number
  startDate?: Date
  includeWeather?: boolean
  propertyName?: string
}): string {
  const { rows, startDate = new Date('2024-01-01'), includeWeather = true } = config

  const headers = includeWeather
    ? ['date', 'price', 'occupied', 'revenue', 'day_of_week', 'lead_time', 'weather', 'temperature']
    : ['date', 'price', 'occupied', 'revenue', 'day_of_week', 'lead_time']

  const csvRows: string[] = [headers.join(',')]

  const weatherConditions = ['Clear', 'Cloudy', 'Rain', 'Snow', 'Partly Cloudy']
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  for (let i = 0; i < rows; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + i)

    const dateStr = currentDate.toISOString().split('T')[0]
    const dayOfWeek = daysOfWeek[currentDate.getDay()]
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6

    // Generate realistic pricing
    const basePrice = 100
    const weekendPremium = isWeekend ? 30 : 0
    const seasonalVariation = Math.sin((i / 365) * Math.PI * 2) * 20 // Seasonal variation
    const randomVariation = Math.random() * 20 - 10
    const price = Math.round(basePrice + weekendPremium + seasonalVariation + randomVariation)

    // Generate occupancy (weekends have higher occupancy)
    const occupancyRate = isWeekend ? 0.8 : 0.6
    const occupied = Math.random() < occupancyRate

    // Calculate revenue
    const revenue = occupied ? price : 0

    // Lead time (days booked in advance)
    const leadTime = Math.floor(Math.random() * 60)

    const row: TestDataRow = {
      date: dateStr,
      price,
      occupied,
      revenue,
      day_of_week: dayOfWeek,
      lead_time: leadTime,
    }

    if (includeWeather) {
      row.weather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)]
      row.temperature = Math.round(15 + Math.random() * 20) // 15-35°C
    }

    const rowValues = includeWeather
      ? [
          row.date,
          row.price,
          row.occupied,
          row.revenue,
          row.day_of_week,
          row.lead_time,
          row.weather,
          row.temperature,
        ]
      : [row.date, row.price, row.occupied, row.revenue, row.day_of_week, row.lead_time]

    csvRows.push(rowValues.join(','))
  }

  return csvRows.join('\n')
}

/**
 * Generate test scenarios for manual E2E testing
 */
export const testScenarios = {
  /**
   * Scenario 1: Standard dataset (30 days)
   */
  standard: () => generateTestCSV({ rows: 30, includeWeather: true }),

  /**
   * Scenario 2: Insufficient data (5 rows)
   */
  insufficient: () => generateTestCSV({ rows: 5, includeWeather: true }),

  /**
   * Scenario 3: Missing weather data
   */
  noWeather: () => generateTestCSV({ rows: 30, includeWeather: false }),

  /**
   * Scenario 4: Large dataset (10,000+ rows)
   */
  large: () => generateTestCSV({ rows: 10000, includeWeather: true }),

  /**
   * Scenario 5: One year of data
   */
  oneYear: () => generateTestCSV({ rows: 365, includeWeather: true }),
}

/**
 * CLI script to generate test files
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs')
  const path = await import('path')

  const outputDir = path.join(process.cwd(), 'test-data')

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log('🧪 Generating E2E test data files...\n')

  Object.entries(testScenarios).forEach(([name, generator]) => {
    const csv = generator()
    const filename = `test-${name}.csv`
    const filepath = path.join(outputDir, filename)

    fs.writeFileSync(filepath, csv)
    const rows = csv.split('\n').length - 1 // Subtract header row
    console.log(`✅ Generated ${filename} (${rows} rows)`)
  })

  console.log(`\n📁 Test files saved to: ${outputDir}`)
  console.log('\n📋 Next steps:')
  console.log('1. Start backend: cd backend && pnpm run dev')
  console.log('2. Start frontend: cd frontend && pnpm run dev')
  console.log('3. Upload test CSV files from test-data/ folder')
  console.log('4. Follow manual testing checklist in docs/tasks-todo/TASK-8-END-TO-END-TESTING.md')
}
