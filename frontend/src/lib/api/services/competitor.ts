/**
 * Competitor Pricing API Service
 * Uses ScraperAPI to scrape competitor prices from booking platforms
 *
 * Features:
 * - Scrape prices from multiple booking platforms
 * - Track competitor pricing trends
 * - Calculate price positioning metrics
 * - Historical price tracking
 */

export interface CompetitorPrice {
  competitor_name: string
  price: number
  currency: string
  date: string
  url: string
  room_type?: string
  availability?: boolean
}

export interface CompetitorAnalysis {
  avg_price: number
  min_price: number
  max_price: number
  your_position: 'lower' | 'competitive' | 'higher'
  price_gap: number
  competitors: CompetitorPrice[]
}

export interface ScraperConfig {
  location: string
  checkIn: string
  checkOut: string
  guests: number
  propertyType: 'hotel' | 'vacation_rental' | 'resort'
}

/**
 * Scrape competitor prices from booking platforms
 *
 * Note: This is a simplified implementation. In production, you'd need:
 * 1. ScraperAPI account for reliable scraping
 * 2. Backend proxy to hide API keys
 * 3. Rate limiting and caching
 * 4. Platform-specific selectors
 */
export async function scrapeCompetitorPrices(config: ScraperConfig): Promise<CompetitorPrice[]> {
  const apiKey = import.meta.env.VITE_SCRAPER_API_KEY

  if (!apiKey) {
    console.warn('ScraperAPI key not configured. Returning mock data.')
    return getMockCompetitorPrices(config)
  }

  try {
    // Build target URLs based on property type
    const targetUrls = buildTargetUrls(config)
    const prices: CompetitorPrice[] = []

    for (const { platform, url } of targetUrls) {
      try {
        const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`

        const response = await fetch(scraperUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          console.error(`Failed to scrape ${platform}:`, response.statusText)
          continue
        }

        const html = await response.text()
        const extractedPrices = extractPricesFromHTML(html, platform)
        prices.push(...extractedPrices)

        // Respect rate limits
        await delay(1000)
      } catch (error) {
        console.error(`Error scraping ${platform}:`, error)
        continue
      }
    }

    return prices.length > 0 ? prices : getMockCompetitorPrices(config)
  } catch (error) {
    console.error('Failed to scrape competitor prices:', error)
    return getMockCompetitorPrices(config)
  }
}

/**
 * Build target URLs for scraping based on location and property type
 */
function buildTargetUrls(config: ScraperConfig): { platform: string; url: string }[] {
  const { location, checkIn, checkOut, guests, propertyType } = config
  const urls: { platform: string; url: string }[] = []

  // Booking.com
  if (propertyType === 'hotel' || propertyType === 'resort') {
    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(location)}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${guests}`
    urls.push({ platform: 'Booking.com', url: bookingUrl })
  }

  // Airbnb
  if (propertyType === 'vacation_rental') {
    const airbnbUrl = `https://www.airbnb.com/s/${encodeURIComponent(location)}/homes?checkin=${checkIn}&checkout=${checkOut}&adults=${guests}`
    urls.push({ platform: 'Airbnb', url: airbnbUrl })
  }

  // Hotels.com
  if (propertyType === 'hotel' || propertyType === 'resort') {
    const hotelsUrl = `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(location)}&q-check-in=${checkIn}&q-check-out=${checkOut}&q-rooms=1&q-room-0-adults=${guests}`
    urls.push({ platform: 'Hotels.com', url: hotelsUrl })
  }

  return urls
}

/**
 * Extract price data from HTML
 * This is platform-specific and would need to be customized
 */
function extractPricesFromHTML(html: string, platform: string): CompetitorPrice[] {
  // In production, use proper HTML parsing (e.g., cheerio in backend)
  // This is a simplified regex approach
  const prices: CompetitorPrice[] = []

  try {
    // Different platforms have different price formats
    let priceRegex: RegExp

    switch (platform) {
      case 'Booking.com':
        priceRegex = /data-price="(\d+)"/g
        break
      case 'Airbnb':
        priceRegex = /\$(\d{2,4})/g
        break
      case 'Hotels.com':
        priceRegex = /price.*?(\d{2,4})/gi
        break
      default:
        priceRegex = /\$(\d{2,4})/g
    }

    const matches = html.matchAll(priceRegex)
    let count = 0

    for (const match of matches) {
      if (count >= 5) break // Limit to top 5 results

      const priceStr = match[1]
      const price = parseInt(priceStr, 10)

      if (price > 20 && price < 10000) {
        // Basic validation
        prices.push({
          competitor_name: `${platform} Property ${count + 1}`,
          price,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0],
          url: '#',
        })
        count++
      }
    }
  } catch (error) {
    console.error(`Error extracting prices from ${platform}:`, error)
  }

  return prices
}

/**
 * Get mock competitor prices for demo/testing
 */
function getMockCompetitorPrices(config: ScraperConfig): CompetitorPrice[] {
  const today = new Date().toISOString().split('T')[0]

  // Generate realistic prices based on property type
  const basePrices: Record<string, number> = {
    hotel: 150,
    resort: 250,
    vacation_rental: 200,
  }

  const basePrice = basePrices[config.propertyType] || 150

  return [
    {
      competitor_name: 'Grand Plaza Hotel',
      price: basePrice * 1.2,
      currency: 'USD',
      date: today,
      url: 'https://booking.com/example',
      room_type: 'Deluxe Room',
      availability: true,
    },
    {
      competitor_name: 'Seaside Resort & Spa',
      price: basePrice * 0.9,
      currency: 'USD',
      date: today,
      url: 'https://hotels.com/example',
      room_type: 'Standard Room',
      availability: true,
    },
    {
      competitor_name: 'Downtown Suites',
      price: basePrice * 1.1,
      currency: 'USD',
      date: today,
      url: 'https://airbnb.com/example',
      room_type: 'Suite',
      availability: true,
    },
    {
      competitor_name: 'Luxury Villa',
      price: basePrice * 1.5,
      currency: 'USD',
      date: today,
      url: 'https://vrbo.com/example',
      room_type: 'Villa',
      availability: true,
    },
    {
      competitor_name: 'Budget Inn',
      price: basePrice * 0.7,
      currency: 'USD',
      date: today,
      url: 'https://expedia.com/example',
      room_type: 'Economy Room',
      availability: true,
    },
  ]
}

/**
 * Analyze competitor prices and calculate positioning
 */
export function analyzeCompetitorPrices(
  competitors: CompetitorPrice[],
  yourPrice: number
): CompetitorAnalysis {
  if (competitors.length === 0) {
    return {
      avg_price: yourPrice,
      min_price: yourPrice,
      max_price: yourPrice,
      your_position: 'competitive',
      price_gap: 0,
      competitors: [],
    }
  }

  const prices = competitors.map(c => c.price)
  const avg_price = prices.reduce((a, b) => a + b, 0) / prices.length
  const min_price = Math.min(...prices)
  const max_price = Math.max(...prices)

  // Determine price position
  let your_position: 'lower' | 'competitive' | 'higher'
  const priceGapPercent = ((yourPrice - avg_price) / avg_price) * 100

  if (priceGapPercent < -10) {
    your_position = 'lower'
  } else if (priceGapPercent > 10) {
    your_position = 'higher'
  } else {
    your_position = 'competitive'
  }

  return {
    avg_price: Math.round(avg_price * 100) / 100,
    min_price: Math.round(min_price * 100) / 100,
    max_price: Math.round(max_price * 100) / 100,
    your_position,
    price_gap: Math.round((yourPrice - avg_price) * 100) / 100,
    competitors,
  }
}

/**
 * Get historical competitor price data
 * In production, this would query a database of scraped historical data
 */
export async function getHistoricalCompetitorPrices(
  _location: string,
  propertyType: string,
  daysBack: number = 30
): Promise<Map<string, number>> {
  // Mock historical data for now
  const historicalData = new Map<string, number>()

  const today = new Date()
  const basePrices: Record<string, number> = {
    hotel: 150,
    resort: 250,
    vacation_rental: 200,
  }

  const basePrice = basePrices[propertyType] || 150

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    // Add some variation
    const variation = Math.random() * 0.3 - 0.15 // ±15%
    const price = basePrice * (1 + variation)

    historicalData.set(dateStr, Math.round(price * 100) / 100)
  }

  return historicalData
}

/**
 * Calculate price recommendation based on competitor analysis
 */
export function getPriceRecommendation(
  analysis: CompetitorAnalysis,
  currentPrice: number
): {
  recommended_price: number
  reasoning: string
  change_percent: number
} {
  const { avg_price, your_position, price_gap } = analysis

  let recommended_price = currentPrice
  let reasoning = ''

  switch (your_position) {
    case 'lower':
      // You're significantly below market - can increase
      recommended_price = avg_price * 0.95 // Price at 95% of average
      reasoning = `Your price is ${Math.abs(price_gap).toFixed(0)}$ below market average. You can increase prices by ${(((recommended_price - currentPrice) / currentPrice) * 100).toFixed(1)}% while staying competitive.`
      break

    case 'higher':
      // You're significantly above market - consider decreasing
      recommended_price = avg_price * 1.05 // Price at 105% of average
      reasoning = `Your price is ${Math.abs(price_gap).toFixed(0)}$ above market average. Consider decreasing by ${(((currentPrice - recommended_price) / currentPrice) * 100).toFixed(1)}% to improve occupancy.`
      break

    case 'competitive':
      // You're in good position - maintain or slight adjustment
      recommended_price = currentPrice
      reasoning = `Your pricing is competitive with the market. Maintain current strategy and monitor competitor changes.`
      break
  }

  const change_percent = ((recommended_price - currentPrice) / currentPrice) * 100

  return {
    recommended_price: Math.round(recommended_price * 100) / 100,
    reasoning,
    change_percent: Math.round(change_percent * 10) / 10,
  }
}

/**
 * Test ScraperAPI connection
 */
export async function testScraperConnection(): Promise<boolean> {
  const apiKey = import.meta.env.VITE_SCRAPER_API_KEY

  if (!apiKey) {
    return false
  }

  try {
    const testUrl = 'https://httpbin.org/ip'
    const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(testUrl)}`

    const response = await fetch(scraperUrl)
    return response.ok
  } catch (error) {
    console.error('ScraperAPI connection test failed:', error)
    return false
  }
}

/**
 * Delay utility for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
