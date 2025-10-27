// backend/scrapers/SanaryCampingScraper.ts

import { chromium, Browser, Page } from 'playwright'
import { Redis } from 'ioredis'

interface CampsiteData {
  name: string
  location: string
  url?: string
  price?: number | null
  availability?: string
  rating?: number
  stars?: number
  amenities?: string[]
  coordinates?: { lat: number; lng: number }
  capacity?: number
  propertyType?: string
  source: string
  scrapedAt: Date
}

export class SanaryCampingScraper {
  private redis: Redis
  private browser: Browser | null = null

  // Sanary-sur-Mer and coastal neighbors
  private readonly COASTAL_REGION = {
    center: { lat: 43.1175, lng: 5.8006 },
    locations: [
      { name: 'Sanary-sur-Mer', lat: 43.1175, lng: 5.8006, zip: '83110' },
      { name: 'Bandol', lat: 43.1363, lng: 5.7485, zip: '83150' },
      { name: 'Six-Fours-les-Plages', lat: 43.0737, lng: 5.8095, zip: '83140' },
      { name: 'Saint-Cyr-sur-Mer', lat: 43.1804, lng: 5.7074, zip: '83270' },
    ],
    radiusKm: 30,
  }

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  }

  async scrapeAllCompetitors(): Promise<CampsiteData[]> {
    console.log('🏖️ Starting Sanary coastal region scraping...')

    try {
      this.browser = await this.initBrowser()

      const results = await Promise.all([
        this.scrapeVacancesCampings(),
        this.scrapeCampingFr(),
        this.scrapeLocalSites(),
      ])

      const allCampsites = results.flat()
      const uniqueCampsites = this.deduplicateCampsites(allCampsites)

      await this.cacheResults(uniqueCampsites)

      console.log(`✅ Found ${uniqueCampsites.length} unique campsites`)

      return uniqueCampsites
    } finally {
      if (this.browser) {
        await this.browser.close()
      }
    }
  }

  private async scrapeVacancesCampings(): Promise<CampsiteData[]> {
    console.log('Scraping vacances-campings.fr...')
    const page = await this.browser!.newPage()
    const campsites: CampsiteData[] = []

    try {
      const searchUrl =
        'https://www.vacances-campings.fr/camping-provence-alpes-cote-d-azur/camping-var/camping-bord-de-mer'

      await page.goto(searchUrl, { waitUntil: 'networkidle' })

      // Wait for results with timeout
      try {
        await page.waitForSelector('.etablissement-item', { timeout: 10000 })
      } catch {
        console.log('No results found or timeout on vacances-campings')
        return []
      }

      const results = await page.evaluate(() => {
        const items: any[] = []

        document.querySelectorAll('.etablissement-item').forEach(item => {
          const name = item.querySelector('.etablissement-title')?.textContent?.trim()
          const location = item.querySelector('.etablissement-localisation')?.textContent?.trim()
          const priceElement = item.querySelector('.price-value, .tarif-from, [class*="price"]')
          const priceText = priceElement?.textContent?.trim()
          const stars = item.querySelectorAll('.icon-star-full, .star-full, [class*="star"]').length
          const link = item.querySelector('a')?.getAttribute('href')

          if (name && location) {
            const coastalKeywords = ['Sanary', 'Bandol', 'Six-Fours', 'Saint-Cyr']
            const isCoastal = coastalKeywords.some(keyword =>
              location.toLowerCase().includes(keyword.toLowerCase())
            )

            if (isCoastal) {
              let price = null
              if (priceText) {
                const priceMatch = priceText.match(/(\d+(?:[.,]\d+)?)/)
                if (priceMatch) {
                  price = parseFloat(priceMatch[1].replace(',', '.'))
                }
              }

              items.push({
                name,
                location,
                price,
                stars: stars || 0,
                url: link ? `https://www.vacances-campings.fr${link}` : null,
                source: 'vacances-campings',
              })
            }
          }
        })

        return items
      })

      campsites.push(...results.map(r => ({ ...r, scrapedAt: new Date() })))
    } catch (error) {
      console.error('Error scraping vacances-campings:', error)
    } finally {
      await page.close()
    }

    return campsites
  }

  private async scrapeCampingFr(): Promise<CampsiteData[]> {
    console.log('Scraping camping.fr...')
    const page = await this.browser!.newPage()
    const campsites: CampsiteData[] = []

    try {
      const searchUrl = `https://www.camping.fr/recherche/?where=Sanary-sur-Mer&radius=30`

      await page.goto(searchUrl, { waitUntil: 'networkidle' })

      // Handle cookies
      try {
        const cookieButton = await page.$(
          '#didomi-notice-agree-button, .cookie-accept, [class*="accept"]'
        )
        if (cookieButton) await cookieButton.click()
      } catch {}

      // Wait for results
      try {
        await page.waitForSelector('.search-result-item, .campsite-card, .result-item', {
          timeout: 10000,
        })
      } catch {
        console.log('No results found on camping.fr')
        return []
      }

      const results = await page.evaluate(() => {
        const items: any[] = []

        const resultSelectors = ['.search-result-item', '.campsite-card', '.result-item']
        let resultElements: Element[] = []

        for (const selector of resultSelectors) {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            resultElements = Array.from(elements)
            break
          }
        }

        resultElements.forEach(item => {
          const nameElement = item.querySelector('.campsite-name, .title, h3, h4')
          const name = nameElement?.textContent?.trim()

          const addressElement = item.querySelector('.campsite-address, .address, .location')
          const address = addressElement?.textContent?.trim()

          const priceElement = item.querySelector('.price-from, .price, [class*="tarif"]')
          const priceText = priceElement?.textContent?.trim()

          if (name) {
            let price = null
            if (priceText) {
              const priceMatch = priceText.match(/(\d+(?:[.,]\d+)?)/)
              if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(',', '.'))
              }
            }

            items.push({
              name,
              location: address || 'Var',
              price,
              source: 'camping.fr',
            })
          }
        })

        return items
      })

      campsites.push(...results.map(r => ({ ...r, scrapedAt: new Date() })))
    } catch (error) {
      console.error('Error scraping camping.fr:', error)
    } finally {
      await page.close()
    }

    return campsites
  }

  private async scrapeLocalSites(): Promise<CampsiteData[]> {
    console.log('Scraping known local campsites...')

    const localCampsites = [
      {
        name: 'Camping de Portissol',
        url: 'https://www.campingdeportissol.com',
        location: 'Sanary-sur-Mer',
      },
      {
        name: 'Camping Les Girelles',
        url: 'https://www.lesgirelles.com',
        location: 'Sanary-sur-Mer',
      },
      {
        name: 'Camping Parc Mogador',
        url: 'https://www.parcmogador.com',
        location: 'Sanary-sur-Mer',
      },
    ]

    const campsites: CampsiteData[] = []

    for (const campsite of localCampsites) {
      try {
        const page = await this.browser!.newPage()

        // Set timeout for navigation
        await page
          .goto(campsite.url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
          })
          .catch(() => {
            console.log(`Could not reach ${campsite.url}`)
          })

        // Try to find pricing
        const priceInfo = await page.evaluate(() => {
          const bodyText = document.body.textContent || ''

          // Look for price patterns
          const pricePatterns = [
            /(\d+)\s*€/,
            /€\s*(\d+)/,
            /tarif[s]?\s*:?\s*(\d+)/i,
            /à partir de\s*(\d+)/i,
          ]

          let price = null
          for (const pattern of pricePatterns) {
            const match = bodyText.match(pattern)
            if (match && match[1]) {
              const parsedPrice = parseFloat(match[1])
              if (parsedPrice > 10 && parsedPrice < 200) {
                // Reasonable price range
                price = parsedPrice
                break
              }
            }
          }

          return { price }
        })

        campsites.push({
          name: campsite.name,
          location: campsite.location,
          url: campsite.url,
          price: priceInfo.price,
          source: 'direct_website',
          scrapedAt: new Date(),
        })

        await page.close()
        await this.delay(2000)
      } catch (error) {
        console.error(`Error scraping ${campsite.name}:`, error)
      }
    }

    return campsites
  }

  private async initBrowser(): Promise<Browser> {
    return await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    })
  }

  private deduplicateCampsites(campsites: CampsiteData[]): CampsiteData[] {
    const seen = new Set<string>()
    const unique: CampsiteData[] = []

    for (const campsite of campsites) {
      const key = `${campsite.name?.toLowerCase()}_${campsite.location?.toLowerCase()}`

      if (!seen.has(key)) {
        seen.add(key)
        unique.push(campsite)
      }
    }

    return unique
  }

  private async cacheResults(campsites: CampsiteData[]): Promise<void> {
    const key = `campsites:sanary:${new Date().toISOString().split('T')[0]}`

    await this.redis.setex(
      key,
      3600 * 24, // Cache for 24 hours
      JSON.stringify(campsites)
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
