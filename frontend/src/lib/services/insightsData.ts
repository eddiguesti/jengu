/**
 * Insights Data Integration Service
 * Combines uploaded CSV data, competitor pricing, and enrichment data
 */

import { exportAllData } from '../api/services/makcorps'

export interface InsightData {
  // Price by weather
  priceByWeather: Array<{
    weather: string
    avgPrice: number
    bookings: number
    occupancy: number
  }>

  // Occupancy by day of week
  occupancyByDay: Array<{
    day: string
    occupancy: number
    price: number
  }>

  // Price correlation data
  priceCorrelation: Array<{
    temperature: number
    price: number
    occupancy: number
  }>

  // Competitor pricing
  competitorPricing: Array<{
    date: string
    yourPrice: number
    competitor1: number | null
    competitor2: number | null
    occupancy: number
  }>

  // Key metrics
  metrics: {
    weatherImpact: number
    peakOccupancyDay: string
    competitorPosition: number
  }
}

/**
 * Process uploaded CSV data to extract insights
 */
function processUploadedData(data: any[]): Partial<InsightData> {
  if (!data || data.length === 0) {
    return {}
  }

  const insights: Partial<InsightData> = {
    occupancyByDay: [],
    priceCorrelation: [],
  }

  // Group by day of week
  const dayGroups: Record<string, { prices: number[]; occupancies: number[] }> = {
    Mon: { prices: [], occupancies: [] },
    Tue: { prices: [], occupancies: [] },
    Wed: { prices: [], occupancies: [] },
    Thu: { prices: [], occupancies: [] },
    Fri: { prices: [], occupancies: [] },
    Sat: { prices: [], occupancies: [] },
    Sun: { prices: [], occupancies: [] },
  }

  data.forEach(row => {
    // Extract date and calculate day of week
    const date = new Date(row.date || row.check_in || row.booking_date)
    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]

    // Extract price (try various column names)
    const price = parseFloat(row.price || row.rate || row.daily_rate || row.room_price || 0)

    // Extract occupancy (try various formats)
    let occupancy = parseFloat(row.occupancy || row.occupancy_rate || 0)
    if (occupancy > 1 && occupancy <= 100) {
      // Already in percentage
    } else if (occupancy > 0 && occupancy <= 1) {
      // Convert decimal to percentage
      occupancy = occupancy * 100
    }

    if (price > 0 && dayOfWeek in dayGroups) {
      dayGroups[dayOfWeek].prices.push(price)
      if (occupancy > 0) {
        dayGroups[dayOfWeek].occupancies.push(occupancy)
      }
    }

    // Add to correlation data (if temperature available)
    const temperature = parseFloat(row.temperature || row.temp || 0)
    if (price > 0 && temperature > 0 && occupancy > 0) {
      insights.priceCorrelation = insights.priceCorrelation || []
      insights.priceCorrelation.push({
        temperature,
        price,
        occupancy,
      })
    }
  })

  // Calculate averages for each day
  insights.occupancyByDay = Object.entries(dayGroups).map(([day, data]) => ({
    day,
    price:
      data.prices.length > 0
        ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
        : 0,
    occupancy:
      data.occupancies.length > 0
        ? Math.round(data.occupancies.reduce((a, b) => a + b, 0) / data.occupancies.length)
        : 0,
  }))

  return insights
}

/**
 * Process competitor pricing data from Makcorps
 */
function processCompetitorData(): Partial<InsightData> {
  const makcorpsData = exportAllData()

  if (makcorpsData.hotels.length === 0) {
    return {}
  }

  const insights: Partial<InsightData> = {
    competitorPricing: [],
  }

  // Group by check-in date
  const dateGroups: Record<string, number[]> = {}

  makcorpsData.hotels.forEach(hotel => {
    const date = hotel.check_in
    if (!dateGroups[date]) {
      dateGroups[date] = []
    }
    dateGroups[date].push(hotel.price)
  })

  // Calculate competitor pricing trends
  const sortedDates = Object.keys(dateGroups).sort()

  sortedDates.forEach(date => {
    const prices = dateGroups[date]

    // Get competitor prices (lowest, highest, or specific hotels)
    const sortedPrices = [...prices].sort((a, b) => a - b)

    insights.competitorPricing!.push({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short' }),
      yourPrice: 0, // Will be filled from uploaded data
      competitor1: sortedPrices[0] || null,
      competitor2: sortedPrices[1] || null,
      occupancy: 0, // Will be filled from uploaded data
    })
  })

  return insights
}

/**
 * Process weather-related pricing data
 */
function processWeatherData(data: any[]): Partial<InsightData> {
  if (!data || data.length === 0) {
    return {}
  }

  const insights: Partial<InsightData> = {
    priceByWeather: [],
  }

  const weatherGroups: Record<
    string,
    { prices: number[]; bookings: number; occupancies: number[] }
  > = {
    Sunny: { prices: [], bookings: 0, occupancies: [] },
    Cloudy: { prices: [], bookings: 0, occupancies: [] },
    Rainy: { prices: [], bookings: 0, occupancies: [] },
    Snowy: { prices: [], bookings: 0, occupancies: [] },
  }

  data.forEach(row => {
    const weather = row.weather || row.weather_condition || ''
    const price = parseFloat(row.price || row.rate || 0)
    let occupancy = parseFloat(row.occupancy || row.occupancy_rate || 0)

    if (occupancy > 1 && occupancy <= 100) {
      // Already in percentage
    } else if (occupancy > 0 && occupancy <= 1) {
      occupancy = occupancy * 100
    }

    // Categorize weather
    let category = ''
    if (weather.toLowerCase().includes('sun') || weather.toLowerCase().includes('clear')) {
      category = 'Sunny'
    } else if (
      weather.toLowerCase().includes('cloud') ||
      weather.toLowerCase().includes('overcast')
    ) {
      category = 'Cloudy'
    } else if (
      weather.toLowerCase().includes('rain') ||
      weather.toLowerCase().includes('drizzle')
    ) {
      category = 'Rainy'
    } else if (weather.toLowerCase().includes('snow') || weather.toLowerCase().includes('ice')) {
      category = 'Snowy'
    }

    if (category && price > 0) {
      weatherGroups[category].prices.push(price)
      weatherGroups[category].bookings++
      if (occupancy > 0) {
        weatherGroups[category].occupancies.push(occupancy)
      }
    }
  })

  // Calculate averages
  insights.priceByWeather = Object.entries(weatherGroups)
    .filter(([_, data]) => data.prices.length > 0)
    .map(([weather, data]) => ({
      weather,
      avgPrice: Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length),
      bookings: data.bookings,
      occupancy:
        data.occupancies.length > 0
          ? Math.round(data.occupancies.reduce((a, b) => a + b, 0) / data.occupancies.length)
          : 0,
    }))

  return insights
}

/**
 * Calculate key metrics
 */
function calculateMetrics(data: Partial<InsightData>): InsightData['metrics'] {
  const metrics: InsightData['metrics'] = {
    weatherImpact: 0,
    peakOccupancyDay: 'Saturday',
    competitorPosition: 0,
  }

  // Weather impact
  if (data.priceByWeather && data.priceByWeather.length >= 2) {
    const sunny = data.priceByWeather.find(d => d.weather === 'Sunny')
    const rainy = data.priceByWeather.find(d => d.weather === 'Rainy')

    if (sunny && rainy && rainy.avgPrice > 0) {
      metrics.weatherImpact = ((sunny.avgPrice - rainy.avgPrice) / rainy.avgPrice) * 100
    }
  }

  // Peak occupancy day
  if (data.occupancyByDay && data.occupancyByDay.length > 0) {
    const peak = data.occupancyByDay.reduce((max, day) =>
      day.occupancy > max.occupancy ? day : max
    )
    metrics.peakOccupancyDay = peak.day
  }

  // Competitor position
  if (data.competitorPricing && data.competitorPricing.length > 0) {
    const validPrices = data.competitorPricing.filter(
      d => d.yourPrice > 0 && (d.competitor1 || d.competitor2)
    )

    if (validPrices.length > 0) {
      const diffs = validPrices.map(d => {
        const competitors = [d.competitor1, d.competitor2].filter(p => p !== null)
        const avgCompetitor = competitors.reduce((a, b) => a + b, 0) / competitors.length
        return ((d.yourPrice - avgCompetitor) / avgCompetitor) * 100
      })

      metrics.competitorPosition = diffs.reduce((a, b) => a + b, 0) / diffs.length
    }
  }

  return metrics
}

/**
 * Get combined insights from all data sources
 */
export function getCombinedInsights(uploadedData?: any[]): InsightData {
  // Start with empty data structure
  let insights: Partial<InsightData> = {
    priceByWeather: [],
    occupancyByDay: [],
    priceCorrelation: [],
    competitorPricing: [],
  }

  // Process uploaded CSV data
  if (uploadedData && uploadedData.length > 0) {
    const uploadedInsights = processUploadedData(uploadedData)
    const weatherInsights = processWeatherData(uploadedData)

    insights = {
      ...insights,
      ...uploadedInsights,
      ...weatherInsights,
    }
  }

  // Process competitor data
  const competitorInsights = processCompetitorData()
  insights = {
    ...insights,
    ...competitorInsights,
  }

  // Calculate metrics
  const metrics = calculateMetrics(insights)

  return {
    priceByWeather: insights.priceByWeather || [],
    occupancyByDay: insights.occupancyByDay || [],
    priceCorrelation: insights.priceCorrelation || [],
    competitorPricing: insights.competitorPricing || [],
    metrics,
  }
}

/**
 * Check if we have any real data available
 */
export function hasRealData(): boolean {
  // Check if we have competitor data
  const makcorpsData = exportAllData()
  if (makcorpsData.hotels.length > 0) {
    return true
  }

  // Note: Uploaded CSV data check will be done in the component
  return false
}
