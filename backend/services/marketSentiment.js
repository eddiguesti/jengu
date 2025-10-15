/**
 * Market Sentiment Analysis Service
 * Combines multiple data sources to generate market sentiment score and Claude-powered insights
 */

import axios from 'axios'

/**
 * Calculate market sentiment score (0-100)
 * Combines weather, occupancy, competitor pricing, and historical trends
 */
export function calculateMarketSentiment(params) {
  const {
    weatherScore = 50,
    occupancyScore = 50,
    competitorScore = 50,
    demandTrend = 50,
    seasonalFactor = 50,
  } = params

  // Weighted average of all factors
  const weights = {
    weather: 0.20,      // 20% - Weather conditions
    occupancy: 0.30,    // 30% - Current occupancy levels
    competitor: 0.25,   // 25% - Competitor pricing position
    demand: 0.15,       // 15% - Demand trend
    seasonal: 0.10,     // 10% - Seasonal patterns
  }

  const sentiment = Math.round(
    weatherScore * weights.weather +
    occupancyScore * weights.occupancy +
    competitorScore * weights.competitor +
    demandTrend * weights.demand +
    seasonalFactor * weights.seasonal
  )

  return Math.max(0, Math.min(100, sentiment))
}

/**
 * Convert weather conditions to sentiment score
 */
export function weatherToSentiment(weatherData) {
  if (!weatherData || !weatherData.weather) {
    return 50 // Neutral if no data
  }

  const weather = weatherData.weather.toLowerCase()
  const temp = weatherData.temperature || weatherData.avgTemperature || 20

  // Base score from weather condition
  let score = 50

  if (weather.includes('sun') || weather.includes('clear')) {
    score = 85
  } else if (weather.includes('cloud') || weather.includes('partly')) {
    score = 65
  } else if (weather.includes('rain') || weather.includes('drizzle')) {
    score = 35
  } else if (weather.includes('storm') || weather.includes('thunder')) {
    score = 20
  } else if (weather.includes('snow')) {
    // Snow can be good or bad depending on business type
    score = 70 // Assuming winter tourism
  }

  // Adjust for temperature (assuming 15-25°C is optimal)
  if (temp >= 15 && temp <= 25) {
    score += 10
  } else if (temp < 10 || temp > 30) {
    score -= 15
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Convert occupancy level to sentiment score
 */
export function occupancyToSentiment(occupancy) {
  if (occupancy === null || occupancy === undefined) {
    return 50
  }

  // High occupancy = strong demand = positive sentiment
  if (occupancy >= 90) return 95
  if (occupancy >= 80) return 85
  if (occupancy >= 70) return 75
  if (occupancy >= 60) return 60
  if (occupancy >= 50) return 50
  if (occupancy >= 40) return 40
  return 25
}

/**
 * Convert competitor pricing position to sentiment score
 */
export function competitorPricingToSentiment(yourPrice, competitorAvg) {
  if (!yourPrice || !competitorAvg) {
    return 50
  }

  const diff = ((yourPrice - competitorAvg) / competitorAvg) * 100

  // If you're priced similarly to competitors = neutral
  // If you're cheaper = opportunity to increase = positive
  // If you're more expensive = risk = negative

  if (diff < -15) return 70 // Much cheaper - opportunity
  if (diff < -5) return 60  // Slightly cheaper - good position
  if (diff < 5) return 50   // Similar pricing - neutral
  if (diff < 15) return 40  // Slightly expensive - caution
  return 30                  // Much expensive - risk
}

/**
 * Calculate demand trend score from historical data
 */
export function calculateDemandTrend(historicalOccupancy) {
  if (!historicalOccupancy || historicalOccupancy.length < 3) {
    return 50
  }

  // Calculate trend (recent vs past)
  const recentSize = Math.min(7, Math.floor(historicalOccupancy.length / 3))
  const recent = historicalOccupancy.slice(-recentSize)
  const past = historicalOccupancy.slice(0, -recentSize)

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const pastAvg = past.reduce((a, b) => a + b, 0) / past.length

  const trendPercentage = ((recentAvg - pastAvg) / pastAvg) * 100

  // Convert trend to sentiment score
  let score = 50
  if (trendPercentage > 10) score = 80
  else if (trendPercentage > 5) score = 70
  else if (trendPercentage > 0) score = 60
  else if (trendPercentage > -5) score = 40
  else if (trendPercentage > -10) score = 30
  else score = 20

  return score
}

/**
 * Generate comprehensive market sentiment analysis
 */
export function analyzeMarketSentiment(data) {
  const {
    weatherData,
    occupancyData,
    competitorData,
    yourPricing,
    historicalTrends,
  } = data

  // Calculate individual scores
  const weatherScore = weatherToSentiment(weatherData || {})
  const occupancyScore = occupancyToSentiment(
    occupancyData?.current || occupancyData?.average || null
  )

  const competitorScore = competitorPricingToSentiment(
    yourPricing?.average,
    competitorData?.average
  )

  const demandTrend = calculateDemandTrend(
    historicalTrends?.occupancy || []
  )

  // Seasonal factor (simplified - could be enhanced with actual seasonal data)
  const currentMonth = new Date().getMonth()
  const seasonalFactor = [40, 45, 55, 60, 70, 80, 90, 85, 75, 65, 50, 45][currentMonth]

  // Calculate overall sentiment
  const overallSentiment = calculateMarketSentiment({
    weatherScore,
    occupancyScore,
    competitorScore,
    demandTrend,
    seasonalFactor,
  })

  // Determine sentiment category
  let category = 'neutral'
  let categoryLabel = 'Moderate Demand'
  if (overallSentiment >= 75) {
    category = 'very_positive'
    categoryLabel = 'Strong Demand'
  } else if (overallSentiment >= 60) {
    category = 'positive'
    categoryLabel = 'Good Demand'
  } else if (overallSentiment < 40) {
    category = 'negative'
    categoryLabel = 'Weak Demand'
  }

  return {
    overallScore: overallSentiment,
    category,
    categoryLabel,
    components: {
      weather: { score: weatherScore, weight: '20%' },
      occupancy: { score: occupancyScore, weight: '30%' },
      competitor: { score: competitorScore, weight: '25%' },
      demand: { score: demandTrend, weight: '15%' },
      seasonal: { score: seasonalFactor, weight: '10%' },
    },
  }
}

/**
 * Use Claude API to generate natural language insights
 */
export async function generateClaudeInsights(analyticsData, apiKey) {
  const {
    marketSentiment,
    weatherAnalysis,
    competitorAnalysis,
    demandForecast,
    featureImportance,
  } = analyticsData

  // Prepare context for Claude
  const context = `
Market Sentiment Score: ${marketSentiment?.overallScore}/100 (${marketSentiment?.categoryLabel})

Weather Impact:
- Temperature-Price Correlation: ${weatherAnalysis?.correlations?.temperaturePrice || 'N/A'}
- Temperature-Occupancy Correlation: ${weatherAnalysis?.correlations?.temperatureOccupancy || 'N/A'}
- Sample Size: ${weatherAnalysis?.sampleSize || 0} days

Competitor Analysis:
- Your Average Price: €${competitorAnalysis?.yourAveragePrice || 'N/A'}
- Competitor Average Price: €${competitorAnalysis?.competitorAveragePrice || 'N/A'}
- Price Difference: ${competitorAnalysis?.pricePercentage || 0}%
- Your Occupancy: ${competitorAnalysis?.yourOccupancy || 'N/A'}%

Demand Forecast:
- Forecast Method: ${demandForecast?.method || 'N/A'}
- Model Accuracy (R²): ${demandForecast?.accuracy?.r2 || 'N/A'}
- Model Error (MAPE): ${demandForecast?.accuracy?.mape || 'N/A'}%

Top Feature Importance:
${featureImportance?.slice(0, 3).map(f => `- ${f.feature}: ${f.importance}% importance`).join('\n') || 'N/A'}
`

  const prompt = `You are a pricing strategy expert analyzing hotel/accommodation pricing data.

Based on the following market data:
${context}

Please provide 3-5 clear, actionable insights in a concise, business-friendly format. Each insight should:
1. Be one sentence explaining WHAT you observed
2. Include WHY it matters
3. Suggest a specific action if applicable

Focus on insights that help the business make pricing decisions. Use plain language, avoid jargon.
Format each insight as a bullet point starting with a category emoji (📊 📈 📉 ⚡ 💡).`

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      }
    )

    const insights = response.data.content[0].text
      .split('\n')
      .filter(line => line.trim().length > 0 && (line.includes('📊') || line.includes('📈') || line.includes('📉') || line.includes('⚡') || line.includes('💡')))

    return {
      summary: response.data.content[0].text,
      insights: insights,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Claude API Error:', error.response?.data || error.message)
    return {
      summary: 'Unable to generate AI insights at this time.',
      insights: [
        '📊 Market sentiment analysis complete - check individual metrics for details',
        '📈 Review competitor pricing and occupancy trends for opportunities',
        '💡 Consider seasonal factors when adjusting your pricing strategy',
      ],
      error: error.message,
    }
  }
}

/**
 * Generate pricing recommendations based on market sentiment
 */
export function generatePricingRecommendations(sentimentAnalysis, currentPrice) {
  const { overallScore, components } = sentimentAnalysis

  const recommendations = []

  // Base recommendation on overall sentiment
  if (overallScore >= 75) {
    const increase = Math.round(currentPrice * 0.15)
    recommendations.push({
      action: 'increase',
      amount: increase,
      newPrice: currentPrice + increase,
      reason: 'Strong market demand detected - excellent opportunity for premium pricing',
      confidence: 'high',
    })
  } else if (overallScore >= 60) {
    const increase = Math.round(currentPrice * 0.08)
    recommendations.push({
      action: 'increase',
      amount: increase,
      newPrice: currentPrice + increase,
      reason: 'Good market conditions support moderate price increase',
      confidence: 'medium',
    })
  } else if (overallScore < 40) {
    const decrease = Math.round(currentPrice * 0.10)
    recommendations.push({
      action: 'decrease',
      amount: decrease,
      newPrice: currentPrice - decrease,
      reason: 'Weak demand suggests competitive pricing needed to maintain occupancy',
      confidence: 'medium',
    })
  } else {
    recommendations.push({
      action: 'maintain',
      amount: 0,
      newPrice: currentPrice,
      reason: 'Market conditions are neutral - maintain current pricing strategy',
      confidence: 'medium',
    })
  }

  // Add specific recommendations based on components
  if (components.occupancy.score >= 85) {
    recommendations.push({
      type: 'occupancy',
      message: 'High occupancy (>85%) detected - consider implementing dynamic surge pricing',
      action: 'increase',
    })
  }

  if (components.competitor.score <= 35) {
    recommendations.push({
      type: 'competitor',
      message: 'Your prices are significantly higher than competitors - monitor for occupancy impact',
      action: 'review',
    })
  }

  if (components.weather.score >= 80) {
    recommendations.push({
      type: 'weather',
      message: 'Excellent weather conditions expected - opportunity for premium weekend pricing',
      action: 'increase',
    })
  }

  return recommendations
}
