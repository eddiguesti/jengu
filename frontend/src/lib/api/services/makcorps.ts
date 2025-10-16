/**
 * Makcorps Hotel API Service
 * Real-time hotel pricing data with intelligent caching
 *
 * IMPORTANT: Only 30 API calls available for testing!
 * Every API call is automatically cached to localStorage to build historical database
 *
 * API Documentation: https://docs.makcorps.com/hotel-price-apis/hotel-api-search-by-city-id
 */

export interface HotelPrice {
  hotel_id: string
  hotel_name: string
  city_id: string
  city_name: string
  country: string
  price: number
  currency: string
  check_in: string
  check_out: string
  guests: number
  rooms: number
  rating?: number
  stars?: number
  amenities?: string[]
  image_url?: string
  availability: boolean
  fetched_at: string // ISO timestamp
}

export interface HotelSearchParams {
  city_id: string
  check_in: string // YYYY-MM-DD
  check_out: string // YYYY-MM-DD
  guests?: number
  rooms?: number
  currency?: string
}

export interface HotelPriceHistory {
  hotel_id: string
  hotel_name: string
  prices: Array<{
    price: number
    check_in: string
    check_out: string
    fetched_at: string
  }>
}

interface CachedResponse {
  data: HotelPrice[]
  timestamp: string
  params: HotelSearchParams
}

const API_KEY = '68ed86819d19968d101c2f43'
const BASE_URL = 'https://api.makcorps.com/v1'
const CACHE_KEY_PREFIX = 'makcorps_hotel_prices_'
const CALL_COUNTER_KEY = 'makcorps_api_calls_count'
const MAX_CALLS = 30

/**
 * Get remaining API calls
 */
export function getRemainingCalls(): number {
  const count = parseInt(localStorage.getItem(CALL_COUNTER_KEY) || '0', 10)
  return Math.max(0, MAX_CALLS - count)
}

/**
 * Increment API call counter
 */
function incrementCallCounter(): void {
  const count = parseInt(localStorage.getItem(CALL_COUNTER_KEY) || '0', 10)
  localStorage.setItem(CALL_COUNTER_KEY, (count + 1).toString())
  console.log(`🔔 Makcorps API call used. Remaining: ${MAX_CALLS - count - 1}/${MAX_CALLS}`)
}

/**
 * Reset call counter (use with caution!)
 */
export function resetCallCounter(): void {
  localStorage.setItem(CALL_COUNTER_KEY, '0')
  console.log('✅ API call counter reset')
}

/**
 * Search hotels by city with intelligent caching
 *
 * @param params - Search parameters
 * @param forceRefresh - Force new API call (use sparingly!)
 * @returns Array of hotel prices
 */
export async function searchHotelsByCity(
  params: HotelSearchParams,
  forceRefresh: boolean = false
): Promise<HotelPrice[]> {
  // Check cache first
  const cacheKey = generateCacheKey(params)
  const cached = getCachedData(cacheKey)

  if (cached && !forceRefresh) {
    console.log('✅ Using cached hotel prices (no API call used)')
    return cached.data
  }

  // Check if we have API calls remaining
  const remaining = getRemainingCalls()
  if (remaining === 0 && !forceRefresh) {
    console.warn('⚠️ No API calls remaining! Using cached data or returning empty.')
    return cached?.data || []
  }

  // Confirm before making API call
  if (remaining <= 5) {
    console.warn(`⚠️ WARNING: Only ${remaining} API calls remaining!`)
  }

  try {
    console.log(`🌐 Making API call to Makcorps... (${remaining} calls remaining)`)

    // Build API URL
    const url = buildSearchUrl(params)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    })

    if (!response.ok) {
      throw new Error(`Makcorps API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform API response to our format
    const hotels = transformApiResponse(data, params)

    // Save to cache immediately
    saveToCache(cacheKey, hotels, params)

    // Save to historical database
    saveToHistoricalDatabase(hotels)

    // Increment call counter
    incrementCallCounter()

    console.log(`✅ Fetched ${hotels.length} hotels from Makcorps API`)
    return hotels
  } catch (error) {
    console.error('❌ Failed to fetch from Makcorps API:', error)

    // Fall back to cache if available
    if (cached) {
      console.log('📦 Falling back to cached data')
      return cached.data
    }

    throw error
  }
}

/**
 * Get hotel price history from local database
 */
export function getHotelPriceHistory(hotel_id: string): HotelPriceHistory | null {
  const historyKey = `makcorps_history_${hotel_id}`
  const stored = localStorage.getItem(historyKey)

  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to parse hotel history:', error)
    return null
  }
}

/**
 * Get all hotels with historical data
 */
export function getAllHotelHistories(): HotelPriceHistory[] {
  const histories: HotelPriceHistory[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('makcorps_history_')) {
      const stored = localStorage.getItem(key)
      if (stored) {
        try {
          histories.push(JSON.parse(stored))
        } catch (error) {
          console.error(`Failed to parse history for ${key}:`, error)
        }
      }
    }
  }

  return histories
}

/**
 * Get price trend for a hotel
 */
export function getHotelPriceTrend(hotel_id: string): {
  current_price: number | null
  avg_price: number
  min_price: number
  max_price: number
  price_change_percent: number
  data_points: number
} {
  const history = getHotelPriceHistory(hotel_id)

  if (!history || history.prices.length === 0) {
    return {
      current_price: null,
      avg_price: 0,
      min_price: 0,
      max_price: 0,
      price_change_percent: 0,
      data_points: 0,
    }
  }

  const prices = history.prices.map(p => p.price)
  const current_price = prices[prices.length - 1]
  const avg_price = prices.reduce((a, b) => a + b, 0) / prices.length
  const min_price = Math.min(...prices)
  const max_price = Math.max(...prices)

  // Calculate price change (first vs last)
  const first_price = prices[0]
  const price_change_percent = ((current_price - first_price) / first_price) * 100

  return {
    current_price,
    avg_price: Math.round(avg_price * 100) / 100,
    min_price,
    max_price,
    price_change_percent: Math.round(price_change_percent * 10) / 10,
    data_points: prices.length,
  }
}

/**
 * Export all cached data (for backup/analysis)
 */
export function exportAllData(): {
  hotels: HotelPrice[]
  histories: HotelPriceHistory[]
  api_calls_used: number
} {
  const hotels: HotelPrice[] = []
  const histories: HotelPriceHistory[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue

    const stored = localStorage.getItem(key)
    if (!stored) continue

    try {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        const cached: CachedResponse = JSON.parse(stored)
        hotels.push(...cached.data)
      } else if (key.startsWith('makcorps_history_')) {
        histories.push(JSON.parse(stored))
      }
    } catch (error) {
      console.error(`Failed to parse ${key}:`, error)
    }
  }

  return {
    hotels,
    histories,
    api_calls_used: parseInt(localStorage.getItem(CALL_COUNTER_KEY) || '0', 10),
  }
}

/**
 * Clear all cached data (use with caution!)
 */
export function clearAllCache(): void {
  const keys: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith(CACHE_KEY_PREFIX) || key.startsWith('makcorps_history_'))) {
      keys.push(key)
    }
  }

  keys.forEach(key => localStorage.removeItem(key))
  console.log(`🗑️ Cleared ${keys.length} cached entries`)
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  total_cached_searches: number
  total_hotels_cached: number
  total_histories: number
  api_calls_used: number
  api_calls_remaining: number
  cache_size_kb: number
} {
  let total_cached_searches = 0
  let total_hotels_cached = 0
  let total_histories = 0
  let cache_size = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue

    const stored = localStorage.getItem(key)
    if (!stored) continue

    cache_size += stored.length

    if (key.startsWith(CACHE_KEY_PREFIX)) {
      total_cached_searches++
      try {
        const cached: CachedResponse = JSON.parse(stored)
        total_hotels_cached += cached.data.length
      } catch (error) {
        // Skip invalid entries
      }
    } else if (key.startsWith('makcorps_history_')) {
      total_histories++
    }
  }

  return {
    total_cached_searches,
    total_hotels_cached,
    total_histories,
    api_calls_used: parseInt(localStorage.getItem(CALL_COUNTER_KEY) || '0', 10),
    api_calls_remaining: getRemainingCalls(),
    cache_size_kb: Math.round((cache_size / 1024) * 100) / 100,
  }
}

// ============================================================================
// PRIVATE HELPER FUNCTIONS
// ============================================================================

/**
 * Build API URL from search parameters
 */
function buildSearchUrl(params: HotelSearchParams): string {
  const searchParams = new URLSearchParams({
    cityId: params.city_id,
    checkIn: params.check_in,
    checkOut: params.check_out,
    guests: (params.guests || 2).toString(),
    rooms: (params.rooms || 1).toString(),
    currency: params.currency || 'USD',
  })

  return `${BASE_URL}/hotels/search?${searchParams.toString()}`
}

/**
 * Generate cache key from search parameters
 */
function generateCacheKey(params: HotelSearchParams): string {
  return `${CACHE_KEY_PREFIX}${params.city_id}_${params.check_in}_${params.check_out}_${params.guests || 2}_${params.rooms || 1}`
}

/**
 * Get cached data if available and not expired
 */
function getCachedData(cacheKey: string): CachedResponse | null {
  const stored = localStorage.getItem(cacheKey)

  if (!stored) {
    return null
  }

  try {
    const cached: CachedResponse = JSON.parse(stored)

    // Cache expires after 24 hours
    const cacheAge = Date.now() - new Date(cached.timestamp).getTime()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    if (cacheAge > maxAge) {
      console.log('⏰ Cache expired (>24 hours old)')
      localStorage.removeItem(cacheKey)
      return null
    }

    return cached
  } catch (error) {
    console.error('Failed to parse cached data:', error)
    localStorage.removeItem(cacheKey)
    return null
  }
}

/**
 * Save API response to cache
 */
function saveToCache(cacheKey: string, hotels: HotelPrice[], params: HotelSearchParams): void {
  const cached: CachedResponse = {
    data: hotels,
    timestamp: new Date().toISOString(),
    params,
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cached))
    console.log('💾 Saved to cache:', cacheKey)
  } catch (error) {
    console.error('Failed to save to cache:', error)
    // If localStorage is full, clear old caches
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('💾 Storage full, clearing old caches...')
      clearOldestCaches()
      // Try again
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cached))
      } catch (retryError) {
        console.error('Failed to save even after clearing:', retryError)
      }
    }
  }
}

/**
 * Save hotel prices to historical database
 */
function saveToHistoricalDatabase(hotels: HotelPrice[]): void {
  hotels.forEach(hotel => {
    const historyKey = `makcorps_history_${hotel.hotel_id}`
    let history = getHotelPriceHistory(hotel.hotel_id)

    if (!history) {
      history = {
        hotel_id: hotel.hotel_id,
        hotel_name: hotel.hotel_name,
        prices: [],
      }
    }

    // Add new price point
    history.prices.push({
      price: hotel.price,
      check_in: hotel.check_in,
      check_out: hotel.check_out,
      fetched_at: hotel.fetched_at,
    })

    // Save updated history
    try {
      localStorage.setItem(historyKey, JSON.stringify(history))
    } catch (error) {
      console.error(`Failed to save history for ${hotel.hotel_id}:`, error)
    }
  })

  console.log(`📊 Updated historical database for ${hotels.length} hotels`)
}

/**
 * Transform Makcorps API response to our format
 */
function transformApiResponse(data: any, params: HotelSearchParams): HotelPrice[] {
  // Note: Adjust this based on actual Makcorps API response format
  // This is a best-guess based on common hotel API structures

  const hotels: HotelPrice[] = []
  const results = data.hotels || data.results || data.data || []

  results.forEach((item: any) => {
    hotels.push({
      hotel_id: item.id || item.hotel_id || item.hotelId || String(Math.random()),
      hotel_name: item.name || item.hotel_name || item.hotelName || 'Unknown Hotel',
      city_id: params.city_id,
      city_name: item.city || item.city_name || '',
      country: item.country || '',
      price: parseFloat(item.price || item.rate || item.total_price || 0),
      currency: params.currency || item.currency || 'USD',
      check_in: params.check_in,
      check_out: params.check_out,
      guests: params.guests || 2,
      rooms: params.rooms || 1,
      rating: parseFloat(item.rating || item.review_score || 0),
      stars: parseInt(item.stars || item.star_rating || 0, 10),
      amenities: item.amenities || [],
      image_url: item.image || item.image_url || item.photo || '',
      availability: item.available !== false,
      fetched_at: new Date().toISOString(),
    })
  })

  return hotels
}

/**
 * Clear oldest caches when storage is full
 */
function clearOldestCaches(): void {
  const caches: Array<{ key: string; timestamp: number }> = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      const stored = localStorage.getItem(key)
      if (stored) {
        try {
          const cached: CachedResponse = JSON.parse(stored)
          caches.push({
            key,
            timestamp: new Date(cached.timestamp).getTime(),
          })
        } catch (error) {
          // Remove invalid entries
          localStorage.removeItem(key)
        }
      }
    }
  }

  // Sort by timestamp (oldest first)
  caches.sort((a, b) => a.timestamp - b.timestamp)

  // Remove oldest 25%
  const toRemove = Math.ceil(caches.length * 0.25)
  for (let i = 0; i < toRemove; i++) {
    localStorage.removeItem(caches[i].key)
  }

  console.log(`🗑️ Cleared ${toRemove} oldest caches`)
}

/**
 * Test API connection (uses 1 API call!)
 */
export async function testConnection(): Promise<boolean> {
  const remaining = getRemainingCalls()

  if (remaining === 0) {
    console.warn('⚠️ No API calls remaining for testing!')
    return false
  }

  console.warn(`⚠️ Testing API connection will use 1 of ${remaining} remaining calls. Proceed?`)

  try {
    // Use a simple test search
    const testParams: HotelSearchParams = {
      city_id: '1', // Adjust based on Makcorps documentation
      check_in: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      check_out: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      guests: 2,
      rooms: 1,
    }

    const hotels = await searchHotelsByCity(testParams, true)
    return hotels.length > 0
  } catch (error) {
    console.error('Connection test failed:', error)
    return false
  }
}
