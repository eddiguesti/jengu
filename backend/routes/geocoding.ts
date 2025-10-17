import { Router } from 'express'
import axios from 'axios'
import { asyncHandler, sendError } from '../utils/errorHandler.js'

const router = Router()

// Helper to get error message from unknown error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Forward geocoding (address to coordinates)
 * GET /api/geocoding/forward
 */
router.get(
  '/forward',
  asyncHandler(async (req, res) => {
    const { address } = req.query

    if (!address) {
      return sendError(res, 'VALIDATION', 'Missing required parameter: address')
    }

    // Try OpenStreetMap Nominatim first (free, no API key needed)
    try {
      const nominatimResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'TravelPricingApp/1.0',
        },
        timeout: 10000,
      })

      if (nominatimResponse.data && nominatimResponse.data.length > 0) {
        const result = nominatimResponse.data[0]

        const mapboxFormat = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
              },
              properties: {
                name: result.display_name,
                place_type: [result.type],
                address: result.address,
              },
              center: [parseFloat(result.lon), parseFloat(result.lat)],
            },
          ],
          attribution: 'OpenStreetMap Nominatim',
        }

        return res.json(mapboxFormat)
      }
    } catch (nominatimError: unknown) {
      console.warn(
        'Nominatim geocoding failed, trying Mapbox fallback:',
        getErrorMessage(nominatimError)
      )
    }

    // Fallback to Mapbox if configured
    if (process.env.MAPBOX_TOKEN && process.env.MAPBOX_TOKEN !== 'your_mapbox_token_here') {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(String(address))}.json`,
        {
          params: {
            access_token: process.env.MAPBOX_TOKEN,
            limit: 1,
          },
          timeout: 10000,
        }
      )

      return res.json(response.data)
    }

    return sendError(
      res,
      'NOT_FOUND',
      'Could not geocode the provided address. Please try a more specific location (e.g., "City, Country")'
    )
  })
)

/**
 * Reverse geocoding (coordinates to address)
 * GET /api/geocoding/reverse
 */
router.get(
  '/reverse',
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query

    if (!latitude || !longitude) {
      return sendError(res, 'VALIDATION', 'Missing required parameters: latitude, longitude')
    }

    // Try OpenStreetMap Nominatim first
    try {
      const nominatimResponse = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'TravelPricingApp/1.0',
        },
        timeout: 10000,
      })

      if (nominatimResponse.data) {
        const result = nominatimResponse.data

        const mapboxFormat = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
              },
              properties: {
                name: result.display_name,
                place_type: [result.type],
                address: result.address,
              },
              center: [parseFloat(result.lon), parseFloat(result.lat)],
              place_name: result.display_name,
            },
          ],
          attribution: 'OpenStreetMap Nominatim',
        }

        return res.json(mapboxFormat)
      }
    } catch (nominatimError: unknown) {
      console.warn(
        'Nominatim reverse geocoding failed, trying Mapbox fallback:',
        getErrorMessage(nominatimError)
      )
    }

    // Fallback to Mapbox if configured
    if (process.env.MAPBOX_TOKEN && process.env.MAPBOX_TOKEN !== 'your_mapbox_token_here') {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
        {
          params: {
            access_token: process.env.MAPBOX_TOKEN,
          },
          timeout: 10000,
        }
      )

      return res.json(response.data)
    }

    return sendError(res, 'NOT_FOUND', 'Could not reverse geocode the coordinates')
  })
)

/**
 * Search for places with autocomplete
 * GET /api/geocoding/search
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { query, types, limit } = req.query

    if (!query || (query as string).length < 2) {
      return res.json({
        type: 'FeatureCollection',
        features: [],
        attribution: 'OpenStreetMap Nominatim',
      })
    }

    const searchLimit = limit ? parseInt(limit as string) : 5
    const searchTypes = types ? (types as string).split(',') : ['place', 'address']

    // Try OpenStreetMap Nominatim first
    try {
      const nominatimResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: searchLimit,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'TravelPricingApp/1.0',
        },
        timeout: 10000,
      })

      if (nominatimResponse.data && nominatimResponse.data.length > 0) {
        const features = nominatimResponse.data.map((result: any) => {
          let city = ''
          let country = ''

          if (result.address) {
            city =
              result.address.city ||
              result.address.town ||
              result.address.village ||
              result.address.municipality ||
              ''
            country = result.address.country || ''
          }

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
            },
            properties: {
              name: result.display_name,
              place_type: [result.type],
              address: result.address,
            },
            center: [parseFloat(result.lon), parseFloat(result.lat)],
            place_name: result.display_name,
            text: result.display_name.split(',')[0],
            context: [
              {
                id: 'place',
                text: city,
              },
              {
                id: 'country',
                text: country,
              },
            ],
          }
        })

        return res.json({
          type: 'FeatureCollection',
          features,
          attribution: 'OpenStreetMap Nominatim',
        })
      }
    } catch (nominatimError: unknown) {
      console.warn(
        'Nominatim search failed, trying Mapbox fallback:',
        getErrorMessage(nominatimError)
      )
    }

    // Fallback to Mapbox if configured
    if (process.env.MAPBOX_TOKEN && process.env.MAPBOX_TOKEN !== 'your_mapbox_token_here') {
      const typesParam = searchTypes.join(',')
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(String(query))}.json`,
        {
          params: {
            access_token: process.env.MAPBOX_TOKEN,
            types: typesParam,
            limit: searchLimit,
          },
          timeout: 10000,
        }
      )

      return res.json(response.data)
    }

    // Return empty results if both failed
    return res.json({
      type: 'FeatureCollection',
      features: [],
      attribution: 'OpenStreetMap Nominatim',
    })
  })
)

export default router
