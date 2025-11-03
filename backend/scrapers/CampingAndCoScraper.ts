/**
 * Camping-and-co.com Scraper
 *
 * Scrapes competitor campsite data from camping-and-co.com including:
 * - Campsite listings by location
 * - Photos, pricing, amenities
 * - Distance calculations
 * - Daily price tracking
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

export interface CampsiteResult {
  id: string
  name: string
  url: string
  photoUrl: string
  photos: string[] // All photos
  distance: number // km
  distanceText: string
  address: string
  town: string
  region: string
  coordinates: {
    latitude: number
    longitude: number
  }
  rating: number
  reviewCount: number
  amenities: string[]
  description: string
  pricePreview?: {
    amount: number
    period: string // e.g., "7 nuits"
  }
}

export interface PricingData {
  date: string // YYYY-MM-DD
  occupancy: number // number of people
  price: number
  originalPrice?: number
  availability: 'available' | 'limited' | 'unavailable'
}

export class CampingAndCoScraper {
  private baseUrl = 'https://fr.camping-and-co.com'

  /**
   * Search for campsites near a location
   */
  async searchByLocation(location: string, radiusKm: number = 50): Promise<CampsiteResult[]> {
    try {
      // Extract postal code if provided (e.g., "Sanary-sur-Mer 83110")
      const postalMatch = location.match(/\b(\d{5})\b/)
      const postalCode = postalMatch ? postalMatch[1] : ''
      const cityName = location.replace(/\b\d{5}\b/, '').trim()

      // Convert location to URL-friendly format
      // e.g., "Sanary-sur-Mer" -> "sanary-sur-mer"
      const locationSlug = cityName
        .toLowerCase()
        .replace(/[àâä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[îï]/g, 'i')
        .replace(/[ôö]/g, 'o')
        .replace(/[ùûü]/g, 'u')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Try different URL patterns
      // Most French cities: /location-camping-{city}-{postal}
      const searchUrls = []

      if (postalCode) {
        // If postal code provided, try exact match first
        searchUrls.push(`${this.baseUrl}/location-camping-${locationSlug}-${postalCode}`)
        searchUrls.push(`${this.baseUrl}/location-mobil-home-${locationSlug}-${postalCode}`)
      }

      // Try without postal code
      searchUrls.push(`${this.baseUrl}/location-camping-${locationSlug}`)
      searchUrls.push(`${this.baseUrl}/camping/${locationSlug}`)

      console.log(`🔍 Searching camping-and-co.com for: ${location}`)

      let response
      let successUrl = ''

      for (const url of searchUrls) {
        try {
          console.log(`   Trying: ${url}`)
          response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            },
            timeout: 15000,
          })

          if (response.status === 200) {
            successUrl = url
            break
          }
        } catch (err) {
          // Try next URL
          continue
        }
      }

      if (!response || response.status !== 200) {
        throw new Error(`Could not find results for location: ${location}`)
      }

      console.log(`✅ Found results at: ${successUrl}`)

      const $ = cheerio.load(response.data)
      const campsites: CampsiteResult[] = []

      // Find all campsite listings
      // camping-and-co.com uses various selectors for listings
      const listingSelectors = [
        '.campsite-card',
        '.listing-item',
        'article[data-campsite]',
        '[class*="campsite"]',
      ]

      let listings = $('body')
      for (const selector of listingSelectors) {
        const found = $(selector)
        if (found.length > 0) {
          listings = found
          console.log(`   Found ${found.length} listings with selector: ${selector}`)
          break
        }
      }

      // Parse each listing
      listings.each((index, element) => {
        try {
          const $listing = $(element)

          // Extract campsite name (clean version without distance)
          const nameElement = $listing
            .find('.campsite-card__campsite-name, h2, h3, [class*="name"]')
            .first()
          let name = nameElement.text().trim()

          // Remove distance from name (e.g., "Camping Name\n3.2 Km" -> "Camping Name")
          name = name.split('\n')[0].trim()

          // Extract URL
          const url = $listing.find('a').first().attr('href') || ''
          const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`

          // Extract photo - look for real photos, not placeholders
          // Try data-src first (lazy-loaded images), then src
          let photoUrl = ''
          const imgElement = $listing.find('img').first()

          if (imgElement.length > 0) {
            // Check data-src first (lazy loading)
            photoUrl = imgElement.attr('data-src') || imgElement.attr('src') || ''
          }

          // Fallback to any img with image.camping-and-co.com URL
          if (!photoUrl || photoUrl.includes('blank.svg')) {
            const campsiteImg = $listing
              .find('img[data-src*="image.camping"], img[src*="image.camping"]')
              .first()
            photoUrl = campsiteImg.attr('data-src') || campsiteImg.attr('src') || ''
          }

          const fullPhotoUrl = photoUrl.startsWith('http') ? photoUrl : `${this.baseUrl}${photoUrl}`

          // Extract distance
          const distanceElement = $listing.find(
            '.campsite-card__campsite-name__wrapper-distance, [class*="distance"]'
          )
          const distanceText = distanceElement.text().trim()
          const distanceMatch = distanceText.match(/([\d,.]+)\s*km/i)
          const distance = distanceMatch ? parseFloat(distanceMatch[1].replace(',', '.')) : 0

          // Extract rating from class (e.g., "rating-4" means 4 stars)
          const ratingElement = $listing
            .find('.campsite-card__campsite-rating, [class*="rating-"]')
            .first()
          const ratingClass = ratingElement.attr('class') || ''
          const ratingMatch = ratingClass.match(/rating-(\d+)/)
          const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0

          // Extract location from nearby elements
          const location = $listing
            .find('[class*="location"], .location, .town, .address')
            .text()
            .trim()

          // Extract price preview
          const priceText = $listing.find('[class*="price"], .price').first().text().trim()
          const priceMatch = priceText.match(/€?\s*([\d,]+)/i)
          const priceAmount = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : undefined

          // Only add if we have minimum required data
          if (name && url) {
            campsites.push({
              id: this.extractCampsiteId(fullUrl),
              name,
              url: fullUrl,
              photoUrl: fullPhotoUrl,
              photos: [fullPhotoUrl],
              distance,
              distanceText,
              address: location,
              town: location.split(',')[0]?.trim() || location || 'Unknown',
              region: location.split(',')[1]?.trim() || "Provence-Alpes-Côte d'Azur",
              coordinates: { latitude: 0, longitude: 0 }, // Will fetch from detail page
              rating,
              reviewCount: 0,
              amenities: [],
              description: '',
              pricePreview: priceAmount
                ? {
                    amount: priceAmount,
                    period: '7 nuits',
                  }
                : undefined,
            })
          }
        } catch (err) {
          console.warn(`   ⚠️  Error parsing listing ${index}:`, err)
        }
      })

      // Filter by radius
      const filtered = campsites.filter(c => c.distance <= radiusKm || c.distance === 0)

      console.log(`✅ Found ${filtered.length} campsites within ${radiusKm}km`)

      return filtered
    } catch (error: any) {
      console.error('❌ Error scraping camping-and-co.com:', error.message)
      throw error
    }
  }

  /**
   * Get detailed information about a specific campsite
   */
  async getCampsiteDetails(campsiteUrl: string): Promise<CampsiteResult> {
    try {
      console.log(`🔍 Fetching details for: ${campsiteUrl}`)

      const response = await axios.get(campsiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        timeout: 15000,
      })

      const $ = cheerio.load(response.data)
      const html = response.data

      // Extract structured data from JSON-LD or JavaScript objects
      let campsiteData: any = {}

      // Try to find embedded JSON data
      const scripts = $('script').toArray()
      for (const script of scripts) {
        const scriptContent = $(script).html() || ''

        // Look for campsite object
        if (scriptContent.includes('var campsite =') || scriptContent.includes('campsite:')) {
          const campsiteMatch = scriptContent.match(/(?:var\s+)?campsite\s*[:=]\s*({[\s\S]*?});/)
          if (campsiteMatch) {
            try {
              // Clean up and parse JSON
              const jsonStr = campsiteMatch[1]
                .replace(/\/\/.*/g, '') // Remove comments
                .replace(/\n/g, ' ')
                .trim()

              // Try to eval it safely (it's usually valid JSON)
              campsiteData = JSON.parse(jsonStr)
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        // Look for fullPhotosData
        if (scriptContent.includes('fullPhotosData')) {
          const photosMatch = scriptContent.match(/fullPhotosData\s*=\s*(\[[\s\S]*?\]);/)
          if (photosMatch) {
            try {
              campsiteData.fullPhotosData = JSON.parse(photosMatch[1])
            } catch (e) {
              // Ignore
            }
          }
        }
      }

      // Extract data from HTML if JSON not found
      const name = campsiteData.name || $('h1').first().text().trim()
      const description =
        campsiteData.description || $('.description, [class*="description"]').first().text().trim()
      const address =
        campsiteData.address || $('[class*="address"], .address').first().text().trim()

      // Extract coordinates
      const latitude = parseFloat(campsiteData.latitude || campsiteData.lat || 0)
      const longitude = parseFloat(campsiteData.longitude || campsiteData.lng || 0)

      // Extract photos
      let photos: string[] = []
      if (campsiteData.fullPhotosData && Array.isArray(campsiteData.fullPhotosData)) {
        photos = campsiteData.fullPhotosData
          .map((photo: any) => {
            if (typeof photo === 'string') return photo
            return photo.url || photo.src || ''
          })
          .filter((url: string) => url)
      }

      // Fallback to img tags
      if (photos.length === 0) {
        $('img[src*="camping-and-co"], img[data-src*="camping-and-co"]').each((i, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src') || ''
          if (src && !src.includes('placeholder')) {
            photos.push(src.startsWith('http') ? src : `${this.baseUrl}${src}`)
          }
        })
      }

      // Extract rating
      const ratingText = $('.rating, [class*="rating"]').text()
      const ratingMatch = ratingText.match(/([\d.]+)/)
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0

      // Extract amenities
      const amenities: string[] = []
      $('.amenity, [class*="amenity"], .service').each((i, el) => {
        const amenity = $(el).text().trim()
        if (amenity) amenities.push(amenity)
      })

      console.log(`✅ Extracted details: ${name} (${photos.length} photos)`)

      return {
        id: this.extractCampsiteId(campsiteUrl),
        name,
        url: campsiteUrl,
        photoUrl: photos[0] || '',
        photos,
        distance: 0, // Will be calculated separately
        distanceText: '',
        address,
        town: address.split(',')[0]?.trim() || '',
        region: address.split(',')[1]?.trim() || '',
        coordinates: {
          latitude,
          longitude,
        },
        rating,
        reviewCount: 0,
        amenities,
        description,
      }
    } catch (error: any) {
      console.error('❌ Error fetching campsite details:', error.message)
      throw error
    }
  }

  /**
   * Get pricing data for a campsite
   */
  async getPricing(
    campsiteUrl: string,
    startDate: Date,
    endDate: Date,
    occupancy: number = 4
  ): Promise<PricingData[]> {
    try {
      console.log(`💰 Fetching pricing for: ${campsiteUrl}`)

      const response = await axios.get(campsiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
      })

      const html = response.data
      const pricingData: PricingData[] = []

      // Extract availabilityForecast array from JavaScript
      const forecastMatch = html.match(/availabilityForecast\s*=\s*(\[[\s\S]*?\]);/)
      if (forecastMatch) {
        try {
          const forecast = JSON.parse(forecastMatch[1])

          // Process forecast data
          for (const entry of forecast) {
            if (entry.date && entry.price_final) {
              pricingData.push({
                date: entry.date,
                occupancy: entry.occupancy || occupancy,
                price: parseFloat(entry.price_final) / 100, // Convert cents to euros
                originalPrice: entry.price_final_premium
                  ? parseFloat(entry.price_final_premium) / 100
                  : undefined,
                availability: entry.available ? 'available' : 'unavailable',
              })
            }
          }
        } catch (e) {
          console.warn('⚠️  Could not parse pricing forecast')
        }
      }

      console.log(`✅ Found ${pricingData.length} pricing data points`)

      return pricingData
    } catch (error: any) {
      console.error('❌ Error fetching pricing:', error.message)
      throw error
    }
  }

  /**
   * Extract campsite ID from URL
   */
  private extractCampsiteId(url: string): string {
    // Extract from URL like: /camping-les-playes -> "camping-les-playes"
    const match = url.match(/\/([^\/]+)$/)
    return match ? match[1] : url
  }
}
