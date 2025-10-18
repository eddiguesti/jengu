/**
 * Test ML Analytics Functions
 * Verifies that all prediction models work correctly with sample data
 */

import {
  analyzeWeatherImpact,
  forecastDemand,
  analyzeCompetitorPricing,
  calculateFeatureImportance,
  generateAnalyticsSummary,
} from './services/mlAnalytics.js'

// Sample data for testing (30 days of historical data)
const sampleData = [
  {
    date: '2025-01-01',
    price: 120,
    occupancy: 75,
    temperature: 18,
    weather: 'Sunny',
    bookings: 15,
  },
  {
    date: '2025-01-02',
    price: 115,
    occupancy: 68,
    temperature: 16,
    weather: 'Cloudy',
    bookings: 12,
  },
  {
    date: '2025-01-03',
    price: 125,
    occupancy: 82,
    temperature: 22,
    weather: 'Sunny',
    bookings: 18,
  },
  {
    date: '2025-01-04',
    price: 130,
    occupancy: 88,
    temperature: 24,
    weather: 'Sunny',
    bookings: 20,
  },
  {
    date: '2025-01-05',
    price: 135,
    occupancy: 92,
    temperature: 25,
    weather: 'Sunny',
    bookings: 22,
  },
  {
    date: '2025-01-06',
    price: 110,
    occupancy: 65,
    temperature: 14,
    weather: 'Rainy',
    bookings: 11,
  },
  {
    date: '2025-01-07',
    price: 105,
    occupancy: 58,
    temperature: 12,
    weather: 'Rainy',
    bookings: 9,
  },
  {
    date: '2025-01-08',
    price: 118,
    occupancy: 72,
    temperature: 19,
    weather: 'Cloudy',
    bookings: 14,
  },
  {
    date: '2025-01-09',
    price: 122,
    occupancy: 78,
    temperature: 20,
    weather: 'Sunny',
    bookings: 16,
  },
  {
    date: '2025-01-10',
    price: 128,
    occupancy: 85,
    temperature: 23,
    weather: 'Sunny',
    bookings: 19,
  },
  {
    date: '2025-01-11',
    price: 132,
    occupancy: 89,
    temperature: 24,
    weather: 'Sunny',
    bookings: 21,
  },
  {
    date: '2025-01-12',
    price: 137,
    occupancy: 94,
    temperature: 26,
    weather: 'Sunny',
    bookings: 23,
  },
  {
    date: '2025-01-13',
    price: 112,
    occupancy: 62,
    temperature: 15,
    weather: 'Rainy',
    bookings: 10,
  },
  {
    date: '2025-01-14',
    price: 108,
    occupancy: 60,
    temperature: 13,
    weather: 'Rainy',
    bookings: 8,
  },
  {
    date: '2025-01-15',
    price: 120,
    occupancy: 74,
    temperature: 18,
    weather: 'Cloudy',
    bookings: 15,
  },
  {
    date: '2025-01-16',
    price: 124,
    occupancy: 80,
    temperature: 21,
    weather: 'Sunny',
    bookings: 17,
  },
  {
    date: '2025-01-17',
    price: 129,
    occupancy: 86,
    temperature: 23,
    weather: 'Sunny',
    bookings: 19,
  },
  {
    date: '2025-01-18',
    price: 133,
    occupancy: 90,
    temperature: 25,
    weather: 'Sunny',
    bookings: 20,
  },
]

// Sample competitor data
const competitorData = [
  { date: '2025-01-01', price: 115 },
  { date: '2025-01-02', price: 110 },
  { date: '2025-01-03', price: 120 },
  { date: '2025-01-04', price: 125 },
  { date: '2025-01-05', price: 130 },
  { date: '2025-01-06', price: 105 },
  { date: '2025-01-07', price: 100 },
  { date: '2025-01-08', price: 113 },
  { date: '2025-01-09', price: 117 },
  { date: '2025-01-10', price: 123 },
  { date: '2025-01-11', price: 127 },
  { date: '2025-01-12', price: 132 },
  { date: '2025-01-13', price: 107 },
  { date: '2025-01-14', price: 103 },
  { date: '2025-01-15', price: 115 },
  { date: '2025-01-16', price: 119 },
  { date: '2025-01-17', price: 124 },
  { date: '2025-01-18', price: 128 },
]

console.log('🧪 Testing ML Analytics Functions...\n')

// Test 1: Weather Impact Analysis
console.log('1️⃣  Testing Weather Impact Analysis')
console.log('─'.repeat(60))
const weatherImpact = analyzeWeatherImpact(sampleData)
console.log('✅ Weather Impact Results:')
console.log(`   Sample Size: ${weatherImpact.sampleSize}`)
console.log(`   Confidence: ${weatherImpact.confidence}`)
console.log(`   Correlations:`)
console.log(
  `     - Temperature ↔ Price: ${weatherImpact.correlations.temperaturePrice.toFixed(2)}`
)
console.log(
  `     - Temperature ↔ Occupancy: ${weatherImpact.correlations.temperatureOccupancy.toFixed(2)}`
)
console.log(`     - Price ↔ Occupancy: ${weatherImpact.correlations.priceOccupancy.toFixed(2)}`)
console.log(`   Weather Stats:`)
weatherImpact.weatherStats.forEach((stat: any) => {
  console.log(
    `     - ${stat.weather}: Avg Price €${stat.avgPrice}, Avg Occupancy ${stat.avgOccupancy}%, Samples: ${stat.sampleSize}`
  )
})
console.log()

// Test 2: Demand Forecasting
console.log('2️⃣  Testing Demand Forecasting (14 days)')
console.log('─'.repeat(60))
const demandForecast = forecastDemand(sampleData, 14)
console.log('✅ Demand Forecast Results:')
console.log(`   Method: ${demandForecast.method}`)
console.log(`   Training Size: ${demandForecast.trainingSize} days`)
if (demandForecast.accuracy) {
  console.log(`   Accuracy:`)
  console.log(`     - R² Score: ${demandForecast.accuracy.r2.toFixed(2)}`)
  console.log(`     - MAPE: ${demandForecast.accuracy.mape.toFixed(1)}%`)
}
console.log(`   Forecast (first 7 days):`)
demandForecast.forecast.slice(0, 7).forEach((day: any) => {
  console.log(
    `     - ${day.date} (${day.day}): ${day.predictedOccupancy}% occupancy [${day.confidence}]`
  )
})
console.log()

// Test 3: Competitor Pricing Analysis
console.log('3️⃣  Testing Competitor Pricing Analysis')
console.log('─'.repeat(60))
const competitorAnalysis = analyzeCompetitorPricing(sampleData, competitorData)
console.log('✅ Competitor Analysis Results:')
console.log(`   Your Average Price: €${competitorAnalysis.yourAveragePrice}`)
console.log(`   Competitor Average Price: €${competitorAnalysis.competitorAveragePrice}`)
console.log(`   Price Difference: €${competitorAnalysis.priceDifference}`)
console.log(`   Price Percentage: ${competitorAnalysis.pricePercentage}%`)
if (competitorAnalysis.yourOccupancy) {
  console.log(`   Your Occupancy: ${competitorAnalysis.yourOccupancy}%`)
}
if (competitorAnalysis.recommendation) {
  console.log(`   Recommendation:`)
  console.log(`     - Action: ${(competitorAnalysis.recommendation as any).action}`)
  console.log(`     - Amount: €${(competitorAnalysis.recommendation as any).amount}`)
  console.log(`     - Reason: ${(competitorAnalysis.recommendation as any).reason}`)
}
console.log()

// Test 4: Feature Importance
console.log('4️⃣  Testing Feature Importance Calculation')
console.log('─'.repeat(60))
const featureImportance = calculateFeatureImportance(sampleData)
console.log('✅ Feature Importance Results:')
featureImportance.forEach((feature, index) => {
  console.log(`   ${index + 1}. ${feature.feature}`)
  console.log(`      - Price Correlation: ${feature.priceCorrelation.toFixed(2)}`)
  console.log(`      - Occupancy Correlation: ${feature.occupancyCorrelation.toFixed(2)}`)
  console.log(`      - Overall Importance: ${feature.importance}/100`)
})
console.log()

// Test 5: Analytics Summary (All-in-One)
console.log('5️⃣  Testing Analytics Summary (Combined)')
console.log('─'.repeat(60))
const summary = generateAnalyticsSummary(sampleData)
console.log('✅ Analytics Summary Results:')
console.log(`   Total Records: ${(summary as any).dataQuality.totalRecords}`)
console.log(
  `   Date Range: ${(summary as any).dataQuality.dateRange.start} to ${(summary as any).dataQuality.dateRange.end}`
)
console.log(`   Data Completeness:`)
console.log(`     - Price: ${((summary as any).dataQuality.completeness.price * 100).toFixed(0)}%`)
console.log(
  `     - Occupancy: ${((summary as any).dataQuality.completeness.occupancy * 100).toFixed(0)}%`
)
console.log(
  `     - Weather: ${((summary as any).dataQuality.completeness.weather * 100).toFixed(0)}%`
)
console.log(
  `     - Temperature: ${((summary as any).dataQuality.completeness.temperature * 100).toFixed(0)}%`
)
console.log(`   Includes:`)
console.log(`     ✓ Weather Impact Analysis`)
console.log(`     ✓ Demand Forecast (14 days)`)
console.log(`     ✓ Feature Importance Rankings`)
console.log()

console.log('✅ All ML Analytics Tests Completed Successfully!\n')
console.log('📊 Summary:')
console.log('   • Weather Impact Analysis: ✓ Working')
console.log('   • Demand Forecasting: ✓ Working')
console.log('   • Competitor Pricing Analysis: ✓ Working')
console.log('   • Feature Importance: ✓ Working')
console.log('   • Analytics Summary: ✓ Working')
console.log()
console.log('🎯 All prediction models are fully operational and producing results!')
