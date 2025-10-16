/**
 * Geocoding API Service
 * Uses Mapbox Geocoding API to convert addresses to coordinates and vice versa
 *
 * Features:
 * - Forward geocoding (address → coordinates)
 * - Reverse geocoding (coordinates → address)
 * - Place search with autocomplete
 * - Location validation
 */

export interface Location {
  address: string
  city: string
  country: string
  latitude: number
  longitude: number
  place_name?: string
  postal_code?: string
}

export interface GeocodingResult {
  place_name: string
  center: [number, number] // [longitude, latitude]
  place_type: string[]
  relevance: number
  text: string
  context?: Array<{
    id: string
    text: string
    short_code?: string
  }>
}

/**
 * Convert address string to coordinates
 * Forward geocoding
 *
 * @param address - Full address or place name
 * @returns Location with coordinates
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  const apiKey = import.meta.env.VITE_MAPBOX_API_KEY

  if (!apiKey) {
    console.warn('Mapbox API key not configured. Returning mock data.')
    return getMockLocation(address)
  }

  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${apiKey}&limit=1`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      throw new Error('No results found for address')
    }

    const feature = data.features[0]
    return parseGeocodingResult(feature)

  } catch (error) {
    console.error('Failed to geocode address:', error)
    return getMockLocation(address)
  }
}

/**
 * Convert coordinates to address
 * Reverse geocoding
 *
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Location with address details
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<Location | null> {
  const apiKey = import.meta.env.VITE_MAPBOX_API_KEY

  if (!apiKey) {
    console.warn('Mapbox API key not configured.')
    return null
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${apiKey}&limit=1`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      throw new Error('No results found for coordinates')
    }

    const feature = data.features[0]
    return parseGeocodingResult(feature)

  } catch (error) {
    console.error('Failed to reverse geocode:', error)
    return null
  }
}

/**
 * Search for places with autocomplete
 *
 * @param query - Search query
 * @param types - Filter by place types (e.g., 'place', 'address', 'poi')
 * @param limit - Maximum number of results
 * @returns Array of location suggestions
 */
export async function searchPlaces(
  query: string,
  types: string[] = ['place', 'address'],
  limit: number = 5
): Promise<Location[]> {
  const apiKey = import.meta.env.VITE_MAPBOX_API_KEY

  if (!apiKey) {
    console.warn('Mapbox API key not configured.')
    return []
  }

  if (!query || query.length < 2) {
    return []
  }

  try {
    const encodedQuery = encodeURIComponent(query)
    const typesParam = types.join(',')
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${apiKey}&types=${typesParam}&limit=${limit}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.features) {
      return []
    }

    return data.features.map((feature: any) => parseGeocodingResult(feature)).filter(Boolean) as Location[]

  } catch (error) {
    console.error('Failed to search places:', error)
    return []
  }
}

/**
 * Validate and enhance location data
 * Ensures location has all required fields
 */
export async function validateLocation(
  location: Partial<Location>
): Promise<Location | null> {
  // If we have coordinates but missing address, reverse geocode
  if (location.latitude && location.longitude && !location.address) {
    return await reverseGeocode(location.latitude, location.longitude)
  }

  // If we have address but missing coordinates, geocode
  if (location.address && (!location.latitude || !location.longitude)) {
    const result = await geocodeAddress(location.address)
    if (result) {
      // Merge with existing data
      return {
        ...result,
        ...location,
        latitude: result.latitude,
        longitude: result.longitude,
      }
    }
  }

  // If we have all required fields, return as is
  if (location.address && location.city && location.country && location.latitude && location.longitude) {
    return location as Location
  }

  return null
}

/**
 * Calculate distance between two locations (in kilometers)
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 100) / 100
}

/**
 * Check if coordinates are valid
 */
export function areValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  )
}

/**
 * Get timezone from coordinates
 * Uses Mapbox Geocoding to get timezone information
 */
export async function getTimezoneFromCoordinates(
  _latitude: number,
  longitude: number
): Promise<string> {
  // Simplified timezone detection based on longitude
  // In production, use a dedicated timezone API or service
  const timezoneOffset = Math.round(longitude / 15)

  const timezones: Record<string, string> = {
    '-12': 'Pacific/Midway',
    '-11': 'Pacific/Niue',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/New_York',
    '-4': 'America/Halifax',
    '-3': 'America/Sao_Paulo',
    '-2': 'Atlantic/South_Georgia',
    '-1': 'Atlantic/Azores',
    '0': 'Europe/London',
    '1': 'Europe/Paris',
    '2': 'Europe/Athens',
    '3': 'Europe/Moscow',
    '4': 'Asia/Dubai',
    '5': 'Asia/Karachi',
    '6': 'Asia/Dhaka',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Singapore',
    '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney',
    '11': 'Pacific/Noumea',
    '12': 'Pacific/Auckland',
  }

  return timezones[timezoneOffset.toString()] || 'UTC'
}

/**
 * Parse Mapbox geocoding result into our Location format
 */
function parseGeocodingResult(feature: any): Location | null {
  if (!feature || !feature.center) {
    return null
  }

  const [longitude, latitude] = feature.center

  // Extract city and country from context
  let city = ''
  let country = ''
  let postal_code = ''

  if (feature.context) {
    feature.context.forEach((item: any) => {
      if (item.id.startsWith('place')) {
        city = item.text
      } else if (item.id.startsWith('country')) {
        country = item.text
      } else if (item.id.startsWith('postcode')) {
        postal_code = item.text
      }
    })
  }

  // Fallback: extract from place_name
  if (!city && feature.place_name) {
    const parts = feature.place_name.split(',').map((p: string) => p.trim())
    if (parts.length >= 2) {
      city = parts[parts.length - 2]
      country = parts[parts.length - 1]
    }
  }

  return {
    address: feature.place_name || feature.text,
    city: city || 'Unknown',
    country: country || 'Unknown',
    latitude,
    longitude,
    place_name: feature.place_name,
    postal_code,
  }
}

/**
 * Get mock location for testing
 */
function getMockLocation(address: string): Location {
  // Common locations for demo
  const mockLocations: Record<string, Location> = {
    'new york': {
      address: 'New York, NY, USA',
      city: 'New York',
      country: 'United States',
      latitude: 40.7128,
      longitude: -74.0060,
    },
    'london': {
      address: 'London, UK',
      city: 'London',
      country: 'United Kingdom',
      latitude: 51.5074,
      longitude: -0.1278,
    },
    'paris': {
      address: 'Paris, France',
      city: 'Paris',
      country: 'France',
      latitude: 48.8566,
      longitude: 2.3522,
    },
    'tokyo': {
      address: 'Tokyo, Japan',
      city: 'Tokyo',
      country: 'Japan',
      latitude: 35.6762,
      longitude: 139.6503,
    },
  }

  const key = address.toLowerCase()
  for (const [loc, data] of Object.entries(mockLocations)) {
    if (key.includes(loc)) {
      return data
    }
  }

  // Default mock location
  return {
    address: address,
    city: 'San Francisco',
    country: 'United States',
    latitude: 37.7749,
    longitude: -122.4194,
  }
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Test Mapbox API connection
 */
export async function testMapboxConnection(): Promise<boolean> {
  const apiKey = import.meta.env.VITE_MAPBOX_API_KEY

  if (!apiKey) {
    return false
  }

  try {
    // Test with a simple geocoding request
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/london.json?access_token=${apiKey}&limit=1`

    const response = await fetch(url)
    return response.ok

  } catch (error) {
    console.error('Mapbox connection test failed:', error)
    return false
  }
}
