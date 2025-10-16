/**
 * Machine Learning Analytics Service
 * Provides correlation analysis, forecasting, and statistical insights
 */

interface DataRow {
  date?: string | Date
  check_in?: string | Date
  price?: number | string
  occupancy?: number | string
  temperature?: number | string
  weather?: string
  weather_condition?: string
  bookings?: number | string
  [key: string]: unknown
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0
  }

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * (y[i] ?? 0), 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0

  return numerator / denominator
}

/**
 * Calculate R² (coefficient of determination)
 */
function calculateR2(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    return 0
  }

  const mean = actual.reduce((a, b) => a + b, 0) / actual.length
  const totalSS = actual.reduce((sum, yi) => sum + Math.pow(yi - mean, 2), 0)
  const residualSS = actual.reduce((sum, yi, i) => sum + Math.pow(yi - (predicted[i] ?? 0), 2), 0)

  if (totalSS === 0) return 0

  return 1 - (residualSS / totalSS)
}

/**
 * Calculate Mean Absolute Percentage Error (MAPE)
 */
function calculateMAPE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    return 0
  }

  const ape = actual.reduce((sum, yi, i) => {
    if (yi === 0) return sum
    return sum + Math.abs((yi - (predicted[i] ?? 0)) / yi)
  }, 0)

  return (ape / actual.length) * 100
}

/**
 * Simple linear regression
 * @deprecated Not currently used but kept for potential future use
 */
// @ts-ignore - Function kept for potential future use
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  if (x.length !== y.length || x.length < 2) {
    return { slope: 0, intercept: 0, r2: 0 }
  }

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * (y[i] ?? 0), 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const predicted = x.map(xi => slope * xi + intercept)
  const r2 = calculateR2(y, predicted)

  return { slope, intercept, r2 }
}

/**
 * Analyze weather impact on pricing and occupancy
 */
export function analyzeWeatherImpact(data: DataRow[]): {
  correlations: Record<string, number>
  weatherStats: unknown[]
  confidence: string
  sampleSize: number
} {
  if (!data || data.length === 0) {
    return {
      correlations: {},
      weatherStats: [],
      confidence: 'low',
      sampleSize: 0,
    }
  }

  const weatherGroups: Record<string, { prices: number[]; occupancies: number[]; temperatures: number[]; count: number }> = {}

  data.forEach(row => {
    const weather = row.weather || row.weather_condition || 'Unknown'
    const price = parseFloat(String(row.price || 0))
    const occupancy = parseFloat(String(row.occupancy || 0))
    const temperature = parseFloat(String(row.temperature || 0))

    if (!weatherGroups[weather]) {
      weatherGroups[weather] = {
        prices: [],
        occupancies: [],
        temperatures: [],
        count: 0,
      }
    }

    if (price > 0) weatherGroups[weather].prices.push(price)
    if (occupancy > 0) weatherGroups[weather].occupancies.push(occupancy)
    if (temperature > 0) weatherGroups[weather].temperatures.push(temperature)
    weatherGroups[weather].count++
  })

  // Calculate correlations
  const prices = data.map(r => parseFloat(String(r.price || 0))).filter(p => p > 0)
  const temperatures = data.map(r => parseFloat(String(r.temperature || 0))).filter(t => t > 0)
  const occupancies = data.map(r => parseFloat(String(r.occupancy || 0))).filter(o => o > 0)

  const tempPriceCorr = pearsonCorrelation(temperatures, prices.slice(0, temperatures.length))
  const tempOccupancyCorr = pearsonCorrelation(temperatures, occupancies.slice(0, temperatures.length))
  const priceOccupancyCorr = pearsonCorrelation(prices, occupancies.slice(0, prices.length))

  // Generate insights
  const insights: Array<{
    weather: string
    avgPrice: number
    avgOccupancy: number
    avgTemperature: number | null
    sampleSize: number
  }> = []

  Object.entries(weatherGroups).forEach(([weather, stats]) => {
    if (stats.count < 3) return // Skip if not enough data

    const avgPrice = stats.prices.reduce((a: number, b: number) => a + b, 0) / stats.prices.length
    const avgOccupancy = stats.occupancies.reduce((a: number, b: number) => a + b, 0) / stats.occupancies.length
    const avgTemp = stats.temperatures.length > 0
      ? stats.temperatures.reduce((a: number, b: number) => a + b, 0) / stats.temperatures.length
      : null

    insights.push({
      weather,
      avgPrice: Math.round(avgPrice),
      avgOccupancy: Math.round(avgOccupancy),
      avgTemperature: avgTemp ? Math.round(avgTemp * 10) / 10 : null,
      sampleSize: stats.count,
    })
  })

  // Determine confidence based on sample size and correlation strength
  let confidence = 'low'
  if (data.length > 100 && Math.abs(tempPriceCorr) > 0.5) {
    confidence = 'high'
  } else if (data.length > 30 && Math.abs(tempPriceCorr) > 0.3) {
    confidence = 'medium'
  }

  return {
    correlations: {
      temperaturePrice: Math.round(tempPriceCorr * 100) / 100,
      temperatureOccupancy: Math.round(tempOccupancyCorr * 100) / 100,
      priceOccupancy: Math.round(priceOccupancyCorr * 100) / 100,
    },
    weatherStats: insights,
    confidence,
    sampleSize: data.length,
  }
}

/**
 * Forecast demand using historical patterns
 * Simple time series forecasting with seasonal adjustment
 */
export function forecastDemand(historicalData: DataRow[], daysAhead = 14): {
  forecast: unknown[]
  accuracy: { r2: number; mape: number } | null
  method: string
  trainingSize?: number
} {
  if (!historicalData || historicalData.length < 7) {
    return {
      forecast: [],
      accuracy: null,
      method: 'insufficient_data',
    }
  }

  // Extract occupancy time series
  const timeSeries = historicalData
    .map(row => ({
      date: new Date(row.date || row.check_in || ''),
      occupancy: parseFloat(String(row.occupancy || 0)),
    }))
    .filter(d => d.occupancy > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (timeSeries.length < 7) {
    return {
      forecast: [],
      accuracy: null,
      method: 'insufficient_data',
    }
  }

  // Calculate day-of-week averages (seasonality)
  const dayAverages = Array(7).fill(0).map(() => ({ sum: 0, count: 0 }))

  timeSeries.forEach(({ date, occupancy }) => {
    const dayOfWeek = date.getDay()
    const dayAvg = dayAverages[dayOfWeek]
    if (dayAvg) {
      dayAvg.sum += occupancy
      dayAvg.count++
    }
  })

  const dayFactors = dayAverages.map(day =>
    day.count > 0 ? day.sum / day.count : 70 // Default to 70% if no data
  )

  // Calculate trend (simple moving average)
  const windowSize = Math.min(7, Math.floor(timeSeries.length / 2))
  const recentData = timeSeries.slice(-windowSize)
  const recentAvg = recentData.reduce((sum, d) => sum + d.occupancy, 0) / recentData.length

  // Generate forecast
  const lastDate = timeSeries[timeSeries.length - 1]?.date
  if (!lastDate) {
    return {
      forecast: [],
      accuracy: null,
      method: 'insufficient_data',
    }
  }

  const forecast = []

  for (let i = 1; i <= daysAhead; i++) {
    const forecastDate = new Date(lastDate)
    forecastDate.setDate(lastDate.getDate() + i)
    const dayOfWeek = forecastDate.getDay()

    // Combine trend and seasonality
    const seasonalFactor = (dayFactors[dayOfWeek] ?? 70) / (recentAvg || 1)
    const predicted = Math.round(Math.max(0, Math.min(100, recentAvg * seasonalFactor)))

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      predictedOccupancy: predicted,
      confidence: timeSeries.length > 30 ? 'high' : timeSeries.length > 14 ? 'medium' : 'low',
    })
  }

  // Calculate accuracy metrics (using last 7 days as validation)
  const validationSize = Math.min(7, Math.floor(timeSeries.length * 0.2))
  const trainData = timeSeries.slice(0, -validationSize)
  const validationData = timeSeries.slice(-validationSize)

  const predictions = validationData.map(({ date }) => {
    const dayOfWeek = date.getDay()
    return recentAvg * ((dayFactors[dayOfWeek] ?? 70) / recentAvg)
  })

  const actual = validationData.map(d => d.occupancy)
  const mape = calculateMAPE(actual, predictions)
  const r2 = calculateR2(actual, predictions)

  return {
    forecast,
    accuracy: {
      r2: Math.round(r2 * 100) / 100,
      mape: Math.round(mape * 10) / 10,
    },
    method: 'seasonal_moving_average',
    trainingSize: trainData.length,
  }
}

/**
 * Analyze competitor pricing patterns
 */
export function analyzeCompetitorPricing(yourData: DataRow[], competitorData: DataRow[]): {
  yourAveragePrice?: number
  competitorAveragePrice?: number
  priceDifference?: number
  pricePercentage?: number
  yourOccupancy?: number | null
  recommendation?: unknown | null
  sampleSize?: { yours: number; competitors: number }
} {
  if (!yourData || !competitorData || yourData.length === 0 || competitorData.length === 0) {
    return {
      recommendation: null,
    }
  }

  // Calculate price statistics
  const yourPrices = yourData.map(r => parseFloat(String(r.price || 0))).filter(p => p > 0)
  const competitorPrices = competitorData.map(r => parseFloat(String(r.price || 0))).filter(p => p > 0)

  const yourAvg = yourPrices.reduce((a, b) => a + b, 0) / yourPrices.length
  const competitorAvg = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
  const priceDiff = yourAvg - competitorAvg
  const pricePercentage = (priceDiff / competitorAvg) * 100

  // Calculate occupancy if available
  const yourOccupancies = yourData.map(r => parseFloat(String(r.occupancy || 0))).filter(o => o > 0)
  const yourAvgOccupancy = yourOccupancies.length > 0
    ? yourOccupancies.reduce((a, b) => a + b, 0) / yourOccupancies.length
    : null

  // Generate recommendation
  let recommendation = null
  if (pricePercentage > 10 && yourAvgOccupancy && yourAvgOccupancy < 70) {
    recommendation = {
      action: 'decrease',
      amount: Math.abs(Math.round(priceDiff * 0.5)),
      reason: 'Your prices are significantly higher than competitors while occupancy is low',
    }
  } else if (pricePercentage < -10 && yourAvgOccupancy && yourAvgOccupancy > 85) {
    recommendation = {
      action: 'increase',
      amount: Math.abs(Math.round(priceDiff * 0.3)),
      reason: 'High occupancy suggests room to increase prices closer to market rates',
    }
  } else if (Math.abs(pricePercentage) < 5) {
    recommendation = {
      action: 'maintain',
      amount: 0,
      reason: 'Your pricing is well-aligned with the market',
    }
  }

  return {
    yourAveragePrice: Math.round(yourAvg),
    competitorAveragePrice: Math.round(competitorAvg),
    priceDifference: Math.round(priceDiff),
    pricePercentage: Math.round(pricePercentage * 10) / 10,
    yourOccupancy: yourAvgOccupancy ? Math.round(yourAvgOccupancy) : null,
    recommendation,
    sampleSize: {
      yours: yourPrices.length,
      competitors: competitorPrices.length,
    },
  }
}

/**
 * Calculate feature importance using correlation analysis
 */
export function calculateFeatureImportance(data: DataRow[]): Array<{
  feature: string
  priceCorrelation: number
  occupancyCorrelation: number
  importance: number
}> {
  if (!data || data.length < 10) {
    return []
  }

  // Extract features
  const features = {
    temperature: data.map(r => parseFloat(String(r.temperature || 0))).filter(v => v > 0),
    day_of_week: data.map(r => new Date(r.date || r.check_in || '').getDay()),
    is_weekend: data.map(r => {
      const day = new Date(r.date || r.check_in || '').getDay()
      return day === 0 || day === 6 ? 1 : 0
    }),
    weather_sunny: data.map(r => {
      const weather = (r.weather || '').toLowerCase()
      return weather.includes('sun') || weather.includes('clear') ? 1 : 0
    }),
  }

  // Target variables
  const prices = data.map(r => parseFloat(String(r.price || 0))).filter(p => p > 0)
  const occupancies = data.map(r => parseFloat(String(r.occupancy || 0))).filter(o => o > 0)

  // Calculate correlations with price
  const importance = Object.entries(features).map(([feature, values]) => {
    const priceCorr = pearsonCorrelation(values.slice(0, prices.length), prices)
    const occupancyCorr = pearsonCorrelation(values.slice(0, occupancies.length), occupancies)

    return {
      feature,
      priceCorrelation: Math.round(Math.abs(priceCorr) * 100) / 100,
      occupancyCorrelation: Math.round(Math.abs(occupancyCorr) * 100) / 100,
      importance: Math.round((Math.abs(priceCorr) + Math.abs(occupancyCorr)) * 50),
    }
  })

  return importance.sort((a, b) => b.importance - a.importance)
}

/**
 * Generate advanced analytics summary
 */
export function generateAnalyticsSummary(data: DataRow[]): unknown {
  const weatherAnalysis = analyzeWeatherImpact(data)
  const demandForecast = forecastDemand(data)
  const featureImportance = calculateFeatureImportance(data)

  return {
    weatherImpact: weatherAnalysis,
    demandForecast: demandForecast,
    featureImportance: featureImportance,
    dataQuality: {
      totalRecords: data.length,
      dateRange: {
        start: data.length > 0 ? new Date(Math.min(...data.map(r => new Date(r.date || r.check_in || '').getTime()))).toISOString().split('T')[0] : null,
        end: data.length > 0 ? new Date(Math.max(...data.map(r => new Date(r.date || r.check_in || '').getTime()))).toISOString().split('T')[0] : null,
      },
      completeness: {
        price: data.filter(r => typeof r.price === 'number' ? r.price > 0 : parseFloat(String(r.price || 0)) > 0).length / data.length,
        occupancy: data.filter(r => typeof r.occupancy === 'number' ? r.occupancy > 0 : parseFloat(String(r.occupancy || 0)) > 0).length / data.length,
        weather: data.filter(r => r.weather).length / data.length,
        temperature: data.filter(r => typeof r.temperature === 'number' ? r.temperature > 0 : parseFloat(String(r.temperature || 0)) > 0).length / data.length,
      },
    },
  }
}
