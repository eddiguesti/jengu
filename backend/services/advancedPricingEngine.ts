/**
 * Advanced ML-Powered Pricing Engine
 * Industry-leading pricing optimization using enriched data
 *
 * Features:
 * - Multi-factor demand forecasting
 * - Weather-aware pricing optimization
 * - Holiday surge pricing
 * - Competitor-aware dynamic pricing
 * - Price elasticity modeling
 * - Revenue optimization (not just occupancy)
 */

interface EnrichedDataRow {
  date: string | Date
  price: number
  occupancy?: number
  bookings?: number
  // Temporal features (from enrichment)
  dayOfWeek?: number
  month?: number
  season?: string
  isWeekend?: boolean
  // Weather features (from enrichment)
  temperature?: number
  precipitation?: number
  weatherCondition?: string
  sunshineHours?: number
  // Holiday features (from enrichment)
  isHoliday?: boolean
  holidayName?: string
  // Competitor data (optional)
  competitorPrice?: number
}

interface PricingRecommendation {
  date: string
  currentPrice: number
  recommendedPrice: number
  predictedOccupancy: number
  predictedRevenue: number
  confidence: 'very_high' | 'high' | 'medium' | 'low'
  factors: {
    demandScore: number
    weatherScore: number
    holidayScore: number
    competitorScore: number
    seasonalScore: number
  }
  explanation: string
  priceChange: number
  priceChangePercent: number
  revenueImpact: number
}

/**
 * Calculate price elasticity of demand
 * Measures how demand changes with price changes
 */
function calculatePriceElasticity(data: EnrichedDataRow[]): number {
  if (data.length < 10) return -1.2 // Default elasticity for hospitality

  const validData = data.filter(d => d.price > 0 && (d.occupancy ?? 0) > 0)
  if (validData.length < 10) return -1.2

  // Calculate correlation between price and occupancy
  const prices = validData.map(d => d.price)
  const occupancies = validData.map(d => d.occupancy ?? 0)

  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
  const avgOcc = occupancies.reduce((a, b) => a + b, 0) / occupancies.length

  // Calculate covariance and variances
  let covariance = 0
  let priceVariance = 0

  for (let i = 0; i < prices.length; i++) {
    const priceDiff = prices[i]! - avgPrice
    const occDiff = occupancies[i]! - avgOcc
    covariance += priceDiff * occDiff
    priceVariance += priceDiff * priceDiff
  }

  if (priceVariance === 0) return -1.2

  // Elasticity = (% change in occupancy) / (% change in price)
  // Formula: ε = β × (P/Q) where β is the regression coefficient
  const beta = covariance / priceVariance
  const elasticity = beta * (avgPrice / avgOcc) // ✅ FIXED: Correct formula

  // Validation: elasticity should be NEGATIVE for normal goods (demand decreases when price increases)
  if (elasticity > 0) {
    console.warn(
      `⚠️  Positive price elasticity detected (${elasticity.toFixed(2)}). This suggests demand INCREASES with price, which is unusual. Using default -1.2`
    )
    return -1.2
  }

  // Clamp to realistic range for hospitality industry (-3 to -0.5)
  // Campgrounds/campsites typically: -1.2 to -1.8
  // Reference: Cornell Hotel School research, STR data
  const clampedElasticity = Math.max(-3, Math.min(-0.5, elasticity))

  console.log(
    `📊 Price elasticity: ${clampedElasticity.toFixed(2)} (raw: ${elasticity.toFixed(2)})`
  )

  return clampedElasticity
}

/**
 * COMPETITOR PRICE ANALYSIS
 * Analyzes competitive positioning and calculates optimal pricing strategy
 * Based on: Talluri & van Ryzin (2004) "The Theory and Practice of Revenue Management"
 */
function analyzeCompetitorPricing(data: EnrichedDataRow[]): {
  competitorElasticity: number
  marketPosition: 'premium' | 'competitive' | 'value'
  optimalPriceGap: number
  competitorCorrelation: number
  recommendation: string
} {
  // Filter data with both your price and competitor price
  const competitorData = data.filter(
    d => d.price > 0 && d.competitorPrice && d.competitorPrice > 0 && (d.occupancy ?? 0) > 0
  )

  if (competitorData.length < 10) {
    return {
      competitorElasticity: 0,
      marketPosition: 'competitive',
      optimalPriceGap: 0,
      competitorCorrelation: 0,
      recommendation: 'Insufficient competitor data for analysis (need 10+ observations)',
    }
  }

  // Calculate average prices
  const yourAvgPrice =
    competitorData.reduce((sum, d) => sum + d.price, 0) / competitorData.length
  const competitorAvgPrice =
    competitorData.reduce((sum, d) => sum + (d.competitorPrice || 0), 0) / competitorData.length
  const avgOccupancy =
    competitorData.reduce((sum, d) => sum + (d.occupancy ?? 0), 0) / competitorData.length

  // Calculate price gap (your price - competitor price)
  const priceGaps = competitorData.map(d => d.price - (d.competitorPrice || 0))
  const occupancies = competitorData.map(d => d.occupancy ?? 0)

  // Pearson correlation: How does price gap affect occupancy?
  const avgGap = priceGaps.reduce((a, b) => a + b, 0) / priceGaps.length

  let covariance = 0
  let gapVariance = 0

  for (let i = 0; i < priceGaps.length; i++) {
    const gapDiff = priceGaps[i]! - avgGap
    const occDiff = occupancies[i]! - avgOccupancy
    covariance += gapDiff * occDiff
    gapVariance += gapDiff * gapDiff
  }

  const correlation = gapVariance > 0 ? covariance / Math.sqrt(gapVariance * gapVariance) : 0

  // Competitive elasticity: How sensitive is demand to competitor pricing?
  // Formula: For every €1 you price above competitor, occupancy changes by X%
  const competitorElasticity = gapVariance > 0 ? covariance / gapVariance : 0

  // Determine market position
  const priceRatio = yourAvgPrice / competitorAvgPrice
  let marketPosition: 'premium' | 'competitive' | 'value'
  if (priceRatio > 1.1) marketPosition = 'premium'
  else if (priceRatio < 0.9) marketPosition = 'value'
  else marketPosition = 'competitive'

  // Calculate optimal price gap based on elasticity and current performance
  // Optimal gap = (Target Occupancy - Current Occupancy) / Competitor Elasticity
  const targetOccupancy = 75 // Industry standard for campgrounds
  const occupancyGap = targetOccupancy - avgOccupancy
  const optimalPriceGap =
    Math.abs(competitorElasticity) > 0.1
      ? occupancyGap / competitorElasticity
      : yourAvgPrice - competitorAvgPrice

  // Generate recommendation
  let recommendation = ''
  if (avgOccupancy < 60 && priceRatio > 1.05) {
    recommendation = `Lower prices towards competitor levels. You're ${((priceRatio - 1) * 100).toFixed(0)}% more expensive with low occupancy (${avgOccupancy.toFixed(0)}%)`
  } else if (avgOccupancy > 85 && priceRatio < 0.95) {
    recommendation = `Raise prices - you have ${avgOccupancy.toFixed(0)}% occupancy while being ${((1 - priceRatio) * 100).toFixed(0)}% cheaper than competitors`
  } else if (Math.abs(correlation) > 0.5) {
    recommendation = `Strong competitor price correlation detected (${correlation.toFixed(2)}). Optimal gap: €${optimalPriceGap.toFixed(0)}`
  } else {
    recommendation = `Maintain current positioning. Market position: ${marketPosition}`
  }

  console.log(`🏆 Competitor Analysis:`)
  console.log(`   Your avg: €${yourAvgPrice.toFixed(0)} | Competitor avg: €${competitorAvgPrice.toFixed(0)}`)
  console.log(`   Market position: ${marketPosition}`)
  console.log(`   Correlation: ${correlation.toFixed(2)} | Elasticity: ${competitorElasticity.toFixed(3)}`)

  return {
    competitorElasticity,
    marketPosition,
    optimalPriceGap: Math.round(optimalPriceGap),
    competitorCorrelation: Math.round(correlation * 100) / 100,
    recommendation,
  }
}

/**
 * MULTI-VARIATE CORRELATION ANALYSIS
 * Finds which factors most strongly correlate with high revenue
 * Based on: Weatherford & Bodily (1992) "A Taxonomy and Research Overview of Perishable-Asset RM"
 */
function calculateMultiVariateCorrelations(data: EnrichedDataRow[]): {
  factors: Array<{
    name: string
    revenueCorrelation: number
    occupancyCorrelation: number
    importance: number
    actionableInsight: string
  }>
  topDrivers: string[]
} {
  const validData = data.filter(d => d.price > 0 && (d.occupancy ?? 0) > 0)

  if (validData.length < 20) {
    return {
      factors: [],
      topDrivers: ['Need 20+ data points for correlation analysis'],
    }
  }

  // Calculate revenue for each observation
  const revenues = validData.map(d => (d.price * (d.occupancy ?? 0)) / 100)
  const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length

  const occupancies = validData.map(d => d.occupancy ?? 0)
  const avgOccupancy = occupancies.reduce((a, b) => a + b, 0) / occupancies.length

  // Helper function to calculate Pearson correlation
  function pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length
    if (n !== y.length || n === 0) return 0

    const avgX = x.reduce((a, b) => a + b, 0) / n
    const avgY = y.reduce((a, b) => a + b, 0) / n

    let numerator = 0
    let denomX = 0
    let denomY = 0

    for (let i = 0; i < n; i++) {
      const diffX = x[i]! - avgX
      const diffY = y[i]! - avgY
      numerator += diffX * diffY
      denomX += diffX * diffX
      denomY += diffY * diffY
    }

    const denominator = Math.sqrt(denomX * denomY)
    return denominator > 0 ? numerator / denominator : 0
  }

  const factors: Array<{
    name: string
    revenueCorrelation: number
    occupancyCorrelation: number
    importance: number
    actionableInsight: string
  }> = []

  // 1. WEEKEND EFFECT
  const weekendValues = validData.map(d => (d.isWeekend ? 1 : 0))
  const weekendRevCorr = pearsonCorrelation(weekendValues, revenues)
  const weekendOccCorr = pearsonCorrelation(weekendValues, occupancies)
  factors.push({
    name: 'Weekend',
    revenueCorrelation: Math.round(weekendRevCorr * 100) / 100,
    occupancyCorrelation: Math.round(weekendOccCorr * 100) / 100,
    importance: Math.abs(weekendRevCorr) + Math.abs(weekendOccCorr),
    actionableInsight:
      weekendRevCorr > 0.3
        ? `Strong weekend premium detected (+${(weekendRevCorr * 100).toFixed(0)}% revenue). Increase weekend prices.`
        : 'Weekend effect minimal. Consider flat pricing.',
  })

  // 2. TEMPERATURE EFFECT
  const temperatures = validData
    .filter(d => d.temperature && d.temperature > 0)
    .map(d => d.temperature!)
  if (temperatures.length >= 10) {
    const tempRevenues = validData
      .filter(d => d.temperature && d.temperature > 0)
      .map(d => (d.price * (d.occupancy ?? 0)) / 100)
    const tempCorr = pearsonCorrelation(temperatures, tempRevenues)
    factors.push({
      name: 'Temperature',
      revenueCorrelation: Math.round(tempCorr * 100) / 100,
      occupancyCorrelation: 0,
      importance: Math.abs(tempCorr),
      actionableInsight:
        tempCorr > 0.3
          ? `Warm weather boosts revenue (+${(tempCorr * 100).toFixed(0)}%). Price higher on sunny forecasts.`
          : tempCorr < -0.3
            ? `Cold weather hurts revenue (${(tempCorr * 100).toFixed(0)}%). Offer discounts in bad weather.`
            : 'Temperature has minimal impact on pricing.',
    })
  }

  // 3. HOLIDAY EFFECT
  const holidayValues = validData.map(d => (d.isHoliday ? 1 : 0))
  const holidayRevCorr = pearsonCorrelation(holidayValues, revenues)
  const holidayOccCorr = pearsonCorrelation(holidayValues, occupancies)
  factors.push({
    name: 'Holiday',
    revenueCorrelation: Math.round(holidayRevCorr * 100) / 100,
    occupancyCorrelation: Math.round(holidayOccCorr * 100) / 100,
    importance: Math.abs(holidayRevCorr) + Math.abs(holidayOccCorr),
    actionableInsight:
      holidayRevCorr > 0.2
        ? `Holidays drive ${(holidayRevCorr * 100).toFixed(0)}% higher revenue. Implement surge pricing.`
        : 'Holiday premium opportunity exists but underutilized.',
  })

  // 4. COMPETITOR PRICE GAP
  const competitorGaps = validData
    .filter(d => d.competitorPrice && d.competitorPrice > 0)
    .map(d => d.price - (d.competitorPrice || 0))
  if (competitorGaps.length >= 10) {
    const gapRevenues = validData
      .filter(d => d.competitorPrice && d.competitorPrice > 0)
      .map(d => (d.price * (d.occupancy ?? 0)) / 100)
    const gapCorr = pearsonCorrelation(competitorGaps, gapRevenues)
    factors.push({
      name: 'Competitor Price Gap',
      revenueCorrelation: Math.round(gapCorr * 100) / 100,
      occupancyCorrelation: 0,
      importance: Math.abs(gapCorr),
      actionableInsight:
        gapCorr < -0.3
          ? `Pricing too far above competitors hurts revenue. Tighten price gap.`
          : gapCorr > 0.3
            ? `You can price above competitors without losing revenue. Increase margin.`
            : 'Competitor pricing has moderate impact. Monitor but don\'t overreact.',
    })
  }

  // 5. DAY OF WEEK SEASONALITY
  const dayOfWeekValues = validData.map(d => d.dayOfWeek ?? 0)
  const dowRevCorr = pearsonCorrelation(dayOfWeekValues, revenues)
  factors.push({
    name: 'Day of Week',
    revenueCorrelation: Math.round(dowRevCorr * 100) / 100,
    occupancyCorrelation: 0,
    importance: Math.abs(dowRevCorr),
    actionableInsight:
      Math.abs(dowRevCorr) > 0.3
        ? 'Strong weekly patterns detected. Use day-specific pricing.'
        : 'Weekly patterns are weak. Broader time-based pricing recommended.',
  })

  // Sort by importance
  factors.sort((a, b) => b.importance - a.importance)

  // Extract top 3 drivers
  const topDrivers = factors.slice(0, 3).map(f => f.name)

  console.log(`📊 Multi-Variate Correlation Analysis:`)
  factors.forEach(f => {
    console.log(`   ${f.name}: Revenue ${f.revenueCorrelation >= 0 ? '+' : ''}${(f.revenueCorrelation * 100).toFixed(0)}%`)
  })

  return {
    factors,
    topDrivers,
  }
}

/**
 * Advanced demand forecasting using ALL enriched features
 */
export function forecastDemandAdvanced(
  historicalData: EnrichedDataRow[],
  forecastDate: Date,
  forecastWeather?: { temperature?: number; weatherCondition?: string; precipitation?: number }
): {
  predictedOccupancy: number
  confidence: 'very_high' | 'high' | 'medium' | 'low'
  factors: {
    seasonality: number
    weatherImpact: number
    holidayImpact: number
    trendImpact: number
  }
} {
  if (historicalData.length < 14) {
    return {
      predictedOccupancy: 70,
      confidence: 'low',
      factors: { seasonality: 70, weatherImpact: 0, holidayImpact: 0, trendImpact: 0 },
    }
  }

  const forecastDayOfWeek = forecastDate.getDay()
  const forecastMonth = forecastDate.getMonth()
  const forecastIsWeekend = forecastDayOfWeek === 0 || forecastDayOfWeek === 6

  // 1. SEASONALITY ANALYSIS (Day of Week + Month)
  const dayOfWeekData: { [key: number]: number[] } = {}
  const monthData: { [key: number]: number[] } = {}

  historicalData.forEach(row => {
    const occ = row.occupancy ?? 0
    if (occ <= 0) return

    if (row.dayOfWeek !== undefined) {
      if (!dayOfWeekData[row.dayOfWeek]) dayOfWeekData[row.dayOfWeek] = []
      dayOfWeekData[row.dayOfWeek]!.push(occ)
    }

    if (row.month !== undefined) {
      if (!monthData[row.month]) monthData[row.month] = []
      monthData[row.month]!.push(occ)
    }
  })

  // Calculate day-of-week baseline
  const dayOccupancies = dayOfWeekData[forecastDayOfWeek] || []
  const dayAvg =
    dayOccupancies.length > 0
      ? dayOccupancies.reduce((a, b) => a + b, 0) / dayOccupancies.length
      : 70

  // Calculate month baseline
  const monthOccupancies = monthData[forecastMonth] || []
  const monthAvg =
    monthOccupancies.length > 0
      ? monthOccupancies.reduce((a, b) => a + b, 0) / monthOccupancies.length
      : 70

  // Overall baseline
  const allOccupancies = historicalData
    .map(d => d.occupancy ?? 0)
    .filter(o => o > 0)
  const overallAvg = allOccupancies.reduce((a, b) => a + b, 0) / allOccupancies.length

  // Combine day and month effects
  const seasonalityFactor = ((dayAvg / overallAvg + monthAvg / overallAvg) / 2) * overallAvg

  // 2. WEATHER IMPACT ANALYSIS
  let weatherImpact = 0

  if (forecastWeather && forecastWeather.temperature !== undefined) {
    // Analyze historical weather-occupancy correlation
    const weatherData = historicalData.filter(
      d => d.temperature !== undefined && d.temperature > 0 && (d.occupancy ?? 0) > 0
    )

    if (weatherData.length >= 10) {
      // Group by temperature ranges
      const tempGroups: { [key: string]: number[] } = {
        cold: [], // < 15°C
        mild: [], // 15-25°C
        warm: [], // > 25°C
      }

      weatherData.forEach(d => {
        const temp = d.temperature!
        const occ = d.occupancy ?? 0
        if (temp < 15) tempGroups.cold!.push(occ)
        else if (temp <= 25) tempGroups.mild!.push(occ)
        else tempGroups.warm!.push(occ)
      })

      // Determine forecast temperature category
      const forecastTemp = forecastWeather.temperature
      let tempCategory: 'cold' | 'mild' | 'warm' = 'mild'
      if (forecastTemp < 15) tempCategory = 'cold'
      else if (forecastTemp > 25) tempCategory = 'warm'

      const tempCategoryOccs = tempGroups[tempCategory]!
      if (tempCategoryOccs.length > 0) {
        const tempAvg = tempCategoryOccs.reduce((a, b) => a + b, 0) / tempCategoryOccs.length
        weatherImpact = tempAvg - overallAvg
      }

      // Adjust for weather condition
      const condition = forecastWeather.weatherCondition?.toLowerCase() || ''
      if (condition.includes('sun') || condition.includes('clear')) {
        weatherImpact += 5 // Sunny boosts demand
      } else if (condition.includes('rain')) {
        weatherImpact -= 10 // Rain reduces demand
      } else if (condition.includes('storm')) {
        weatherImpact -= 15 // Storms significantly reduce demand
      }

      // Precipitation impact
      if (forecastWeather.precipitation && forecastWeather.precipitation > 10) {
        weatherImpact -= 5 // Heavy rain reduces demand
      }
    }
  }

  // 3. HOLIDAY IMPACT ANALYSIS
  let holidayImpact = 0

  // Analyze historical holiday performance
  const holidayData = historicalData.filter(d => d.isHoliday && (d.occupancy ?? 0) > 0)
  const nonHolidayData = historicalData.filter(d => !d.isHoliday && (d.occupancy ?? 0) > 0)

  if (holidayData.length >= 3 && nonHolidayData.length >= 10) {
    const holidayAvg =
      holidayData.reduce((sum, d) => sum + (d.occupancy ?? 0), 0) / holidayData.length
    const nonHolidayAvg =
      nonHolidayData.reduce((sum, d) => sum + (d.occupancy ?? 0), 0) / nonHolidayData.length

    const holidayLift = holidayAvg - nonHolidayAvg
    holidayImpact = holidayLift
  } else {
    // Default holiday boost (industry standard for camping/hospitality)
    holidayImpact = 15 // Holidays typically increase demand by ~15%
  }

  // 4. TREND ANALYSIS (Recent momentum)
  const recentSize = Math.min(14, Math.floor(historicalData.length / 3))
  const recentData = historicalData.slice(-recentSize)
  const olderData = historicalData.slice(0, -recentSize)

  const recentOccupancies = recentData.map(d => d.occupancy ?? 0).filter(o => o > 0)
  const olderOccupancies = olderData.map(d => d.occupancy ?? 0).filter(o => o > 0)

  let trendImpact = 0
  if (recentOccupancies.length >= 3 && olderOccupancies.length >= 3) {
    const recentAvg = recentOccupancies.reduce((a, b) => a + b, 0) / recentOccupancies.length
    const olderAvg = olderOccupancies.reduce((a, b) => a + b, 0) / olderOccupancies.length
    trendImpact = recentAvg - olderAvg
  }

  // 5. WEEKEND BOOST
  const weekendData = historicalData.filter(d => d.isWeekend && (d.occupancy ?? 0) > 0)
  const weekdayData = historicalData.filter(d => !d.isWeekend && (d.occupancy ?? 0) > 0)

  let weekendBoost = 0
  if (forecastIsWeekend && weekendData.length >= 5 && weekdayData.length >= 10) {
    const weekendAvg =
      weekendData.reduce((sum, d) => sum + (d.occupancy ?? 0), 0) / weekendData.length
    const weekdayAvg =
      weekdayData.reduce((sum, d) => sum + (d.occupancy ?? 0), 0) / weekdayData.length
    weekendBoost = weekendAvg - weekdayAvg
  }

  // 6. COMBINE ALL FACTORS
  let predictedOccupancy =
    seasonalityFactor + weatherImpact + (forecastIsWeekend ? weekendBoost : 0) + trendImpact

  // Clamp to realistic range
  predictedOccupancy = Math.max(0, Math.min(100, predictedOccupancy))

  // 7. CALCULATE CONFIDENCE
  let confidence: 'very_high' | 'high' | 'medium' | 'low' = 'medium'
  const dataPoints = historicalData.length

  if (dataPoints >= 90 && forecastWeather) {
    confidence = 'very_high' // 3+ months of data with weather
  } else if (dataPoints >= 60) {
    confidence = 'high' // 2+ months of data
  } else if (dataPoints >= 30) {
    confidence = 'medium' // 1+ month of data
  } else {
    confidence = 'low' // < 1 month of data
  }

  return {
    predictedOccupancy: Math.round(predictedOccupancy),
    confidence,
    factors: {
      seasonality: Math.round(seasonalityFactor),
      weatherImpact: Math.round(weatherImpact * 10) / 10,
      holidayImpact: Math.round(holidayImpact * 10) / 10,
      trendImpact: Math.round(trendImpact * 10) / 10,
    },
  }
}

/**
 * Revenue-optimized pricing (not just occupancy optimization!)
 * This is the KEY differentiator from competitors
 */
export function calculateOptimalPrice(
  historicalData: EnrichedDataRow[],
  predictedOccupancy: number,
  basePrice: number,
  constraints?: {
    minPrice?: number
    maxPrice?: number
    targetOccupancy?: number
    strategy?: 'conservative' | 'balanced' | 'aggressive'
  }
): {
  optimalPrice: number
  expectedRevenue: number
  expectedOccupancy: number
  reasoning: string
} {
  const { minPrice = basePrice * 0.7, maxPrice = basePrice * 1.5, targetOccupancy = 75, strategy = 'balanced' } = constraints || {}

  // Calculate price elasticity
  const elasticity = calculatePriceElasticity(historicalData)

  // Strategy multipliers - ENHANCED FOR CAMPSITES
  // Campsites need HIGH occupancy to be profitable (capacity is the #1 metric)
  const strategyConfig = {
    conservative: { priceAggression: 0.3, occTarget: 90, occWeight: 0.7 }, // Prioritize filling capacity (70% weight on occupancy)
    balanced: { priceAggression: 0.7, occTarget: 80, occWeight: 0.6 }, // Balance revenue and occupancy (60% weight on occupancy)
    aggressive: { priceAggression: 1.2, occTarget: 70, occWeight: 0.5 }, // Maximize revenue per unit (50% weight on occupancy)
  }

  const config = strategyConfig[strategy]

  // Revenue optimization formula:
  // Revenue = Price × Occupancy
  // Occupancy changes with price based on elasticity: Occ_new = Occ_base × (Price_new / Price_base)^elasticity

  const testPrices: Array<{ price: number; occupancy: number; revenue: number }> = []

  // Test price points from min to max
  for (let price = minPrice; price <= maxPrice; price += 5) {
    // Calculate expected occupancy at this price using elasticity
    const priceRatio = price / basePrice
    const elasticityFactor = Math.pow(priceRatio, elasticity)
    const expectedOcc = Math.max(0, Math.min(100, predictedOccupancy * elasticityFactor))

    // Calculate expected revenue (assuming capacity of 100 units)
    const expectedRev = (price * expectedOcc) / 100

    testPrices.push({
      price,
      occupancy: expectedOcc,
      revenue: expectedRev,
    })
  }

  // Filter by minimum occupancy target (campsites need high occupancy)
  const minOccupancy = config.occTarget - 10 // Tighter tolerance for campsites (was 15)
  const viablePrices = testPrices.filter(p => p.occupancy >= minOccupancy)

  if (viablePrices.length === 0) {
    // No viable prices - return conservative pricing
    return {
      optimalPrice: minPrice,
      expectedRevenue: (minPrice * predictedOccupancy) / 100,
      expectedOccupancy: predictedOccupancy,
      reasoning: `Market conditions weak - using minimum price to maintain ${predictedOccupancy.toFixed(0)}% occupancy`,
    }
  }

  // ✅ CAMPSITE-OPTIMIZED: Weight occupancy + revenue using strategy-specific weights
  // Calculate composite score: (Occupancy Weight × Occupancy) + (Revenue Weight × Normalized Revenue)
  const maxRevenue = Math.max(...viablePrices.map(p => p.revenue))
  const revenueWeight = 1 - config.occWeight // If occupancy is 60%, revenue is 40%

  const scoredPrices = viablePrices.map(p => ({
    ...p,
    compositeScore: (config.occWeight * p.occupancy) + (revenueWeight * 100 * (p.revenue / maxRevenue))
  }))

  // Find price that maximizes composite score (weighted by strategy)
  const sorted = scoredPrices.sort((a, b) => b.compositeScore - a.compositeScore)
  let selectedOption = sorted[0]!

  // Apply additional strategy-specific logic
  if (strategy === 'conservative') {
    // Prefer options that hit target occupancy even if score is slightly lower
    const targetOccOptions = scoredPrices.filter(
      p => p.occupancy >= config.occTarget
    )
    if (targetOccOptions.length > 0) {
      selectedOption = targetOccOptions.sort((a, b) => b.compositeScore - a.compositeScore)[0]!
    }
  }

  const reasoning = `Campsite-optimized: ${selectedOption.price.toFixed(0)}€ balances revenue (${selectedOption.revenue.toFixed(0)}€) and occupancy (${selectedOption.occupancy.toFixed(0)}%) with ${(config.occWeight * 100).toFixed(0)}% weight on capacity utilization`

  return {
    optimalPrice: Math.round(selectedOption.price),
    expectedRevenue: Math.round(selectedOption.revenue),
    expectedOccupancy: Math.round(selectedOption.occupancy),
    reasoning,
  }
}

/**
 * MAIN FUNCTION: Generate comprehensive pricing recommendations
 * This uses ALL enriched data for maximum accuracy
 */
export function generateAdvancedPricingRecommendations(
  historicalData: EnrichedDataRow[],
  forecastDays: number = 30,
  currentAveragePrice: number,
  futureWeather?: Array<{
    date: string
    temperature?: number
    weatherCondition?: string
    precipitation?: number
  }>,
  futureHolidays?: Array<{ date: string; holidayName: string }>,
  constraints?: {
    minPrice?: number
    maxPrice?: number
    targetOccupancy?: number
    strategy?: 'conservative' | 'balanced' | 'aggressive'
  }
): PricingRecommendation[] {
  const recommendations: PricingRecommendation[] = []

  // ✅ RUN ADVANCED ANALYSES ONCE (not per-day)
  console.log('\n🎓 Running Advanced ML Analysis...')

  // Competitor pricing analysis
  const competitorAnalysis = analyzeCompetitorPricing(historicalData)

  // Multi-variate correlation analysis
  const correlationAnalysis = calculateMultiVariateCorrelations(historicalData)

  console.log(`\n💡 Top Revenue Drivers: ${correlationAnalysis.topDrivers.join(', ')}`)
  console.log(`🏆 Competitor Strategy: ${competitorAnalysis.recommendation}\n`)

  const today = new Date()

  for (let i = 1; i <= forecastDays; i++) {
    const forecastDate = new Date(today)
    forecastDate.setDate(today.getDate() + i)
    const dateStr = forecastDate.toISOString().split('T')[0]

    // Get forecast weather for this date
    const forecastWeather = futureWeather?.find(w => w.date === dateStr)

    // Check if this date is a holiday
    const isHoliday = futureHolidays?.some(h => h.date === dateStr) || false

    // 1. FORECAST DEMAND using all enriched features
    const demandForecast = forecastDemandAdvanced(
      historicalData,
      forecastDate,
      forecastWeather
    )

    // Apply holiday boost if applicable
    let adjustedOccupancy = demandForecast.predictedOccupancy
    if (isHoliday) {
      adjustedOccupancy = Math.min(100, adjustedOccupancy + demandForecast.factors.holidayImpact)
    }

    // 2. CALCULATE DATE-SPECIFIC BASELINE PRICE
    // Instead of using flat average, calculate expected price for this specific date
    // based on day of week, month, weekend status, and holiday status
    const dayOfWeek = forecastDate.getDay()
    const month = forecastDate.getMonth()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Get historical prices for similar conditions
    const similarDayPrices = historicalData
      .filter(d => d.dayOfWeek === dayOfWeek && d.price > 0)
      .map(d => d.price)

    const similarMonthPrices = historicalData
      .filter(d => d.month === month && d.price > 0)
      .map(d => d.price)

    const weekendPrices = historicalData
      .filter(d => d.isWeekend === isWeekend && d.price > 0)
      .map(d => d.price)

    const holidayPrices = historicalData
      .filter(d => d.isHoliday && d.price > 0)
      .map(d => d.price)

    // Calculate date-specific baseline (weighted average of similar dates)
    let dateSpecificBaseline = currentAveragePrice

    if (isHoliday && holidayPrices.length > 0) {
      // Holidays get special pricing
      dateSpecificBaseline = holidayPrices.reduce((a, b) => a + b, 0) / holidayPrices.length
    } else if (similarDayPrices.length >= 3 && weekendPrices.length >= 3) {
      // Combine day-of-week and weekend patterns
      const dayAvg = similarDayPrices.reduce((a, b) => a + b, 0) / similarDayPrices.length
      const weekendAvg = weekendPrices.reduce((a, b) => a + b, 0) / weekendPrices.length
      const monthAvg = similarMonthPrices.length > 0
        ? similarMonthPrices.reduce((a, b) => a + b, 0) / similarMonthPrices.length
        : currentAveragePrice

      // Weighted average: 40% day of week, 40% weekend status, 20% month
      dateSpecificBaseline = dayAvg * 0.4 + weekendAvg * 0.4 + monthAvg * 0.2
    } else {
      // Fallback to overall average
      dateSpecificBaseline = currentAveragePrice
    }

    // 3. CALCULATE OPTIMAL PRICE using revenue optimization WITH date-specific baseline
    const pricingResult = calculateOptimalPrice(
      historicalData,
      adjustedOccupancy,
      dateSpecificBaseline,  // ✅ Now uses date-specific baseline instead of flat average!
      constraints
    )

    // Debug: Log price variation for first few days
    if (i <= 3) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      console.log(`   Day ${i} (${dayNames[dayOfWeek]}, ${isHoliday ? 'HOLIDAY' : isWeekend ? 'Weekend' : 'Weekday'}):`)
      console.log(`      Baseline: €${Math.round(dateSpecificBaseline)} (vs avg €${Math.round(currentAveragePrice)})`)
      console.log(`      Recommended: €${pricingResult.optimalPrice}`)
      console.log(`      Occupancy: ${pricingResult.expectedOccupancy}%`)
    }

    // 4. CALCULATE FACTOR SCORES (for transparency)
    const demandScore = adjustedOccupancy // 0-100
    const weatherScore = forecastWeather
      ? 50 + demandForecast.factors.weatherImpact * 2
      : 50
    const holidayScore = isHoliday ? 90 : 40
    const seasonalScore = demandForecast.factors.seasonality

    // ✅ COMPETITOR SCORE - Now uses real competitive analysis
    let competitorScore = 50 // Default neutral
    if (competitorAnalysis.competitorCorrelation !== 0) {
      // Calculate competitive positioning score
      // If market position is "value" (cheaper) and correlation is negative = good (score 70+)
      // If market position is "premium" (expensive) and correlation is positive = good (score 70+)
      const positionBonus =
        competitorAnalysis.marketPosition === 'premium'
          ? 20 // Premium positioning gets bonus
          : competitorAnalysis.marketPosition === 'value'
            ? -10 // Value positioning gets penalty
            : 0

      // Correlation impact: Strong correlation means competitor prices matter more
      const correlationImpact = Math.abs(competitorAnalysis.competitorCorrelation) * 30

      competitorScore = Math.max(0, Math.min(100, 50 + positionBonus + correlationImpact))
    }

    // 5. GENERATE EXPLANATION using correlation insights
    const factors = []
    if (isHoliday) factors.push('holiday surge pricing')
    if (forecastWeather?.weatherCondition?.toLowerCase().includes('sun'))
      factors.push('excellent weather')
    if (demandForecast.factors.trendImpact > 5) factors.push('strong upward trend')
    if (forecastDate.getDay() === 0 || forecastDate.getDay() === 6)
      factors.push('weekend demand')

    // Add top correlation insight
    if (correlationAnalysis.factors.length > 0) {
      const topFactor = correlationAnalysis.factors[0]
      if (topFactor && Math.abs(topFactor.revenueCorrelation) > 0.3) {
        // Only mention if strong correlation
        factors.push(topFactor.name.toLowerCase() + ' effect')
      }
    }

    // Add competitor positioning if significant
    if (competitorAnalysis.marketPosition === 'premium' && competitorScore > 70) {
      factors.push('premium market position')
    } else if (competitorAnalysis.competitorCorrelation < -0.4) {
      factors.push('competitive pressure detected')
    }

    const explanation =
      factors.length > 0
        ? `Recommended due to ${factors.join(', ')}`
        : pricingResult.reasoning

    // 5. CALCULATE REVENUE IMPACT
    const currentRevenue = (currentAveragePrice * adjustedOccupancy) / 100
    const revenueImpact =
      ((pricingResult.expectedRevenue - currentRevenue) / currentRevenue) * 100

    recommendations.push({
      date: dateStr,
      currentPrice: Math.round(currentAveragePrice),
      recommendedPrice: pricingResult.optimalPrice,
      predictedOccupancy: pricingResult.expectedOccupancy,
      predictedRevenue: pricingResult.expectedRevenue,
      confidence: demandForecast.confidence,
      factors: {
        demandScore: Math.round(demandScore),
        weatherScore: Math.round(weatherScore),
        holidayScore,
        competitorScore,
        seasonalScore,
      },
      explanation,
      priceChange: pricingResult.optimalPrice - currentAveragePrice,
      priceChangePercent:
        ((pricingResult.optimalPrice - currentAveragePrice) / currentAveragePrice) * 100,
      revenueImpact: Math.round(revenueImpact * 10) / 10,
    })
  }

  return recommendations
}

/**
 * Calculate pricing analytics summary
 */
export function calculatePricingAnalytics(
  historicalData: EnrichedDataRow[]
): {
  priceElasticity: number
  averageRevenue: number
  peakDays: string[]
  lowDays: string[]
  weatherSensitivity: number
  holidayPremium: number
  weekendPremium: number
} {
  const elasticity = calculatePriceElasticity(historicalData)

  // Average revenue per available unit
  const revenues = historicalData
    .filter(d => d.price > 0 && (d.occupancy ?? 0) > 0)
    .map(d => (d.price * (d.occupancy ?? 0)) / 100)
  const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length

  // Identify peak days (day of week)
  const dayOccupancies: { [key: number]: number[] } = {}
  historicalData.forEach(d => {
    if (d.dayOfWeek !== undefined && (d.occupancy ?? 0) > 0) {
      if (!dayOccupancies[d.dayOfWeek]) dayOccupancies[d.dayOfWeek] = []
      dayOccupancies[d.dayOfWeek]!.push(d.occupancy ?? 0)
    }
  })

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayAverages = Object.entries(dayOccupancies).map(([day, occs]) => ({
    day: parseInt(day),
    avg: occs.reduce((a, b) => a + b, 0) / occs.length,
  }))

  const sorted = dayAverages.sort((a, b) => b.avg - a.avg)
  const peakDays = sorted.slice(0, 2).map(d => dayNames[d.day]!)
  const lowDays = sorted.slice(-2).map(d => dayNames[d.day]!)

  // Weather sensitivity
  const weatherData = historicalData.filter(
    d => d.temperature !== undefined && d.temperature > 0 && (d.occupancy ?? 0) > 0
  )
  const temps = weatherData.map(d => d.temperature!)
  const occs = weatherData.map(d => d.occupancy ?? 0)

  let weatherSensitivity = 0
  if (temps.length >= 10) {
    // Calculate correlation
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length
    const avgOcc = occs.reduce((a, b) => a + b, 0) / occs.length

    let covariance = 0
    let tempVariance = 0

    for (let i = 0; i < temps.length; i++) {
      covariance += (temps[i]! - avgTemp) * (occs[i]! - avgOcc)
      tempVariance += (temps[i]! - avgTemp) ** 2
    }

    weatherSensitivity = tempVariance > 0 ? covariance / Math.sqrt(tempVariance) : 0
  }

  // Holiday premium
  const holidayOccs = historicalData
    .filter(d => d.isHoliday && (d.occupancy ?? 0) > 0)
    .map(d => d.occupancy ?? 0)
  const nonHolidayOccs = historicalData
    .filter(d => !d.isHoliday && (d.occupancy ?? 0) > 0)
    .map(d => d.occupancy ?? 0)

  const holidayPremium =
    holidayOccs.length > 0 && nonHolidayOccs.length > 0
      ? (holidayOccs.reduce((a, b) => a + b, 0) / holidayOccs.length -
          nonHolidayOccs.reduce((a, b) => a + b, 0) / nonHolidayOccs.length) /
        (nonHolidayOccs.reduce((a, b) => a + b, 0) / nonHolidayOccs.length)
      : 0.15 // Default 15% holiday premium

  // Weekend premium
  const weekendOccs = historicalData
    .filter(d => d.isWeekend && (d.occupancy ?? 0) > 0)
    .map(d => d.occupancy ?? 0)
  const weekdayOccs = historicalData
    .filter(d => !d.isWeekend && (d.occupancy ?? 0) > 0)
    .map(d => d.occupancy ?? 0)

  const weekendPremium =
    weekendOccs.length > 0 && weekdayOccs.length > 0
      ? (weekendOccs.reduce((a, b) => a + b, 0) / weekendOccs.length -
          weekdayOccs.reduce((a, b) => a + b, 0) / weekdayOccs.length) /
        (weekdayOccs.reduce((a, b) => a + b, 0) / weekdayOccs.length)
      : 0.12 // Default 12% weekend premium

  return {
    priceElasticity: Math.round(elasticity * 100) / 100,
    averageRevenue: Math.round(avgRevenue),
    peakDays,
    lowDays,
    weatherSensitivity: Math.round(weatherSensitivity * 100) / 100,
    holidayPremium: Math.round(holidayPremium * 100) / 100,
    weekendPremium: Math.round(weekendPremium * 100) / 100,
  }
}
