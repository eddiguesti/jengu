/**
 * Competitor Scraping Service (Playwright)
 * Scrapes competitor hotel pricing data with proxy rotation and robots.txt awareness
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { logger } from '../middleware/logger.js'

// Scraper configuration
export interface ScraperConfig {
  headless: boolean
  proxy?: {
    server: string
    username?: string
    password?: string
  }
  timeout: number
  userAgent?: string
  respectRobotsTxt: boolean
}

// Search parameters
export interface SearchParams {
  location: {
    latitude: number
    longitude: number
    city?: string
    country?: string
  }
  checkIn: string // YYYY-MM-DD
  checkOut: string // YYYY-MM-DD
  guests: number
  roomType?: string
  searchRadiusKm?: number
}

// Scraped competitor result
export interface CompetitorResult {
  name: string
  price: number
  currency: string
  url: string
  rating?: number
  distance?: number
  roomType?: string
  availability: boolean
}

// Scraping result
export interface ScrapeResult {
  success: boolean
  competitors: CompetitorResult[]
  error?: string
  duration: number
  source: string
}

/**
 * Main Competitor Scraper Class
 */
export class CompetitorScraper {
  private config: ScraperConfig
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      respectRobotsTxt: true,
      ...config,
    }
  }

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🌐 Initializing Playwright browser...')

      this.browser = await chromium.launch({
        headless: this.config.headless,
        proxy: this.config.proxy,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      })

      this.context = await this.browser.newContext({
        userAgent:
          this.config.userAgent ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      })

      logger.info('✅ Browser initialized successfully')
    } catch (error) {
      logger.error({ err: error }, '❌ Failed to initialize browser')
      throw error
    }
  }

  /**
   * Check robots.txt before scraping
   */
  private async checkRobotsTxt(domain: string, path: string): Promise<boolean> {
    if (!this.config.respectRobotsTxt) {
      return true // Skip check if disabled
    }

    try {
      const robotsUrl = `https://${domain}/robots.txt`
      const page = await this.context!.newPage()

      const response = await page.goto(robotsUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 5000,
      })

      if (!response || response.status() !== 200) {
        await page.close()
        return true // No robots.txt = allowed
      }

      const robotsTxt = await page.content()
      await page.close()

      // Simple robots.txt parser (check for Disallow)
      const userAgentSection = robotsTxt.match(/User-agent: \*/i)
      if (!userAgentSection) {
        return true
      }

      const disallowedPaths = robotsTxt.match(/Disallow: (.+)/gi)
      if (!disallowedPaths) {
        return true
      }

      for (const disallow of disallowedPaths) {
        const disallowPath = disallow.replace(/Disallow:\s*/i, '').trim()
        if (path.startsWith(disallowPath)) {
          logger.warn(`🚫 robots.txt disallows scraping: ${domain}${path}`)
          return false
        }
      }

      return true
    } catch (error) {
      logger.warn({ err: error }, '⚠️  Failed to check robots.txt, proceeding anyway')
      return true
    }
  }

  /**
   * Scrape Booking.com for competitor prices
   */
  async scrapeBookingCom(params: SearchParams): Promise<ScrapeResult> {
    const startTime = Date.now()

    try {
      if (!this.context) {
        throw new Error('Browser not initialized. Call initialize() first.')
      }

      // Check robots.txt
      const allowed = await this.checkRobotsTxt('booking.com', '/searchresults')
      if (!allowed) {
        return {
          success: false,
          competitors: [],
          error: 'Scraping disallowed by robots.txt',
          duration: Date.now() - startTime,
          source: 'booking.com',
        }
      }

      const page = await this.context.newPage()

      // Construct search URL
      const searchUrl = this.buildBookingComUrl(params)
      logger.info(`🔍 Scraping Booking.com: ${searchUrl}`)

      await page.goto(searchUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      })

      // Wait for search results
      await page.waitForSelector('[data-testid="property-card"]', {
        timeout: this.config.timeout,
      })

      // Extract competitor data
      const competitors = await page.$$eval('[data-testid="property-card"]', cards => {
        return cards.slice(0, 20).map(card => {
          try {
            const nameEl = card.querySelector('[data-testid="title"]')
            const priceEl = card.querySelector('[data-testid="price-and-discounted-price"]')
            const ratingEl = card.querySelector('[data-testid="review-score"]')
            const distanceEl = card.querySelector('[data-testid="distance"]')
            const linkEl = card.querySelector('a')

            const priceText = priceEl?.textContent?.trim() || ''
            const priceMatch = priceText.match(/[\d,]+/)
            const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0

            return {
              name: nameEl?.textContent?.trim() || 'Unknown',
              price,
              currency: 'USD', // TODO: Detect from page
              url: linkEl?.href || '',
              rating: ratingEl ? parseFloat(ratingEl.textContent || '0') : undefined,
              distance: distanceEl
                ? parseFloat(distanceEl.textContent?.match(/[\d.]+/)?.[0] || '0')
                : undefined,
              roomType: 'standard',
              availability: price > 0,
            }
          } catch (err) {
            return null
          }
        }).filter((item): item is NonNullable<typeof item> => item !== null && item.price > 0)
      })

      await page.close()

      const duration = Date.now() - startTime
      logger.info(`✅ Scraped ${competitors.length} competitors from Booking.com in ${duration}ms`)

      return {
        success: true,
        competitors,
        duration,
        source: 'booking.com',
      }
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error({ err: error }, '❌ Booking.com scraping failed')

      return {
        success: false,
        competitors: [],
        error: error instanceof Error ? error.message : String(error),
        duration,
        source: 'booking.com',
      }
    }
  }

  /**
   * Build Booking.com search URL
   */
  private buildBookingComUrl(params: SearchParams): string {
    const { location, checkIn, checkOut, guests } = params

    // Use latitude/longitude for search
    const lat = location.latitude
    const lon = location.longitude

    // Booking.com uses different URL params
    const url = new URL('https://www.booking.com/searchresults.html')
    url.searchParams.set('ss', location.city || `${lat},${lon}`)
    url.searchParams.set('checkin', checkIn)
    url.searchParams.set('checkout', checkOut)
    url.searchParams.set('group_adults', String(guests))
    url.searchParams.set('group_children', '0')
    url.searchParams.set('no_rooms', '1')
    url.searchParams.set('order', 'distance_from_search') // Sort by distance

    if (params.searchRadiusKm) {
      url.searchParams.set('distance', String(params.searchRadiusKm))
    }

    return url.toString()
  }

  /**
   * Scrape Hotels.com (placeholder)
   */
  async scrapeHotelsCom(params: SearchParams): Promise<ScrapeResult> {
    // Similar implementation to Booking.com
    // TODO: Implement Hotels.com scraper
    logger.warn('Hotels.com scraper not yet implemented')
    return {
      success: false,
      competitors: [],
      error: 'Not implemented',
      duration: 0,
      source: 'hotels.com',
    }
  }

  /**
   * Scrape multiple sources and aggregate
   */
  async scrapeAll(params: SearchParams): Promise<ScrapeResult> {
    const startTime = Date.now()
    const allCompetitors: CompetitorResult[] = []
    const errors: string[] = []

    // Scrape Booking.com
    try {
      const bookingResult = await this.scrapeBookingCom(params)
      if (bookingResult.success) {
        allCompetitors.push(...bookingResult.competitors)
      } else if (bookingResult.error) {
        errors.push(`Booking.com: ${bookingResult.error}`)
      }
    } catch (error) {
      errors.push(`Booking.com exception: ${error}`)
    }

    // TODO: Add more sources (Hotels.com, Expedia, etc.)

    const duration = Date.now() - startTime

    return {
      success: allCompetitors.length > 0,
      competitors: allCompetitors,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      duration,
      source: 'aggregate',
    }
  }

  /**
   * Calculate price percentiles from competitors
   */
  calculatePricePercentiles(competitors: CompetitorResult[]): {
    p10: number
    p50: number
    p90: number
    count: number
  } {
    if (competitors.length === 0) {
      throw new Error('No competitors to calculate percentiles')
    }

    const prices = competitors
      .map(c => c.price)
      .filter(p => p > 0)
      .sort((a, b) => a - b)

    const count = prices.length

    const percentile = (arr: number[], p: number): number => {
      const index = Math.ceil((p / 100) * arr.length) - 1
      return arr[Math.max(0, index)]
    }

    return {
      p10: percentile(prices, 10),
      p50: percentile(prices, 50), // Median
      p90: percentile(prices, 90),
      count,
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close()
      this.context = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
    logger.info('✅ Browser closed')
  }
}

/**
 * Proxy pool manager (simple rotation)
 */
export class ProxyPool {
  private proxies: Array<{ server: string; username?: string; password?: string }>
  private currentIndex: number = 0

  constructor(proxies: Array<{ server: string; username?: string; password?: string }>) {
    this.proxies = proxies
  }

  getNext(): { server: string; username?: string; password?: string } | undefined {
    if (this.proxies.length === 0) {
      return undefined
    }

    const proxy = this.proxies[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length
    return proxy
  }

  static fromEnv(): ProxyPool {
    const proxyList = process.env.PROXY_LIST || ''
    const proxies = proxyList
      .split(',')
      .filter(p => p.trim())
      .map(p => ({ server: p.trim() }))

    return new ProxyPool(proxies)
  }
}
