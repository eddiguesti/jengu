/**
 * Geocoding API Service
 * Uses Nominatim (free) + Mapbox fallback for geocoding
 *
 * Features:
 * - Forward geocoding (address → coordinates)
 * - Reverse geocoding (coordinates → address)
 * - Place search with autocomplete
 * - Location validation
 *
 * NOTE: All geocoding API calls now go through backend proxy to secure API keys
 */

// Backend proxy endpoint (no API key needed in frontend)
const BACKEND_API = 'http://localhost:3001/api'

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
 * Now uses backend proxy - no API key needed in frontend
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const response = await fetch(
      `${BACKEND_API}/geocoding/forward?address=${encodeURIComponent(address)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.warn('Failed to geocode address')
      return getMockLocation(address)
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      console.warn('No results found for address')
      return getMockLocation(address)
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
 * Now uses backend proxy - no API key needed in frontend
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<Location | null> {
  try {
    const response = await fetch(
      `${BACKEND_API}/geocoding/reverse?latitude=${latitude}&longitude=${longitude}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return null
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
 * Now uses backend proxy - no API key needed in frontend
 */
export async function searchPlaces(
  query: string,
  types: string[] = ['place', 'address'],
  limit: number = 5
): Promise<Location[]> {
  if (!query || query.length < 2) {
    return []
  }

  try {
    const typesParam = types.join(',')
    const response = await fetch(
      `${BACKEND_API}/geocoding/search?query=${encodeURIComponent(query)}&types=${typesParam}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    if (!data.features) {
      return []
    }

    return data.features
      .map((feature: any) => parseGeocodingResult(feature))
      .filter(Boolean) as Location[]
  } catch (error) {
    console.error('Failed to search places:', error)
    return []
  }
}

/**
 * Validate and enhance location data
 */
export async function validateLocation(location: Partial<Location>): Promise<Location | null> {
  // If we have coordinates but missing address, reverse geocode
  if (location.latitude && location.longitude && !location.address) {
    return await reverseGeocode(location.latitude, location.longitude)
  }

  // If we have address but missing coordinates, geocode
  if (location.address && (!location.latitude || !location.longitude)) {
    const result = await geocodeAddress(location.address)
    if (result) {
      return {
        ...result,
        ...location,
        latitude: result.latitude,
        longitude: result.longitude,
      }
    }
  }

  // If we have all required fields, return as is
  if (
    location.address &&
    location.city &&
    location.country &&
    location.latitude &&
    location.longitude
  ) {
    return location as Location
  }

  return null
}

/**
 * Calculate distance between two locations (in kilometers)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

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
 * Parse geocoding result into our Location format
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
  const mockLocations: Record<string, Location> = {
    'new york': {
      address: 'New York, NY, USA',
      city: 'New York',
      country: 'United States',
      latitude: 40.7128,
      longitude: -74.006,
    },
    london: {
      address: 'London, UK',
      city: 'London',
      country: 'United Kingdom',
      latitude: 51.5074,
      longitude: -0.1278,
    },
    paris: {
      address: 'Paris, France',
      city: 'Paris',
      country: 'France',
      latitude: 48.8566,
      longitude: 2.3522,
    },
  }

  const key = address.toLowerCase()
  for (const [loc, data] of Object.entries(mockLocations)) {
    if (key.includes(loc)) {
      return data
    }
  }

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
 * Test API connection
 */
export async function testMapboxConnection(): Promise<boolean> {
  try {
    const response = await fetch(
      `${BACKEND_API}/geocoding/forward?address=${encodeURIComponent('london')}`,
      {
        method: 'GET',
      }
    )
    return response.ok
  } catch (error) {
    console.error('Geocoding connection test failed:', error)
    return false
  }
}
