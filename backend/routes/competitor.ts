import { Router } from 'express'
import axios from 'axios'
import { asyncHandler, sendError } from '../utils/errorHandler.js'

const router = Router()

/**
 * Scrape competitor website
 * POST /api/competitor/scrape
 */
router.post(
  '/scrape',
  asyncHandler(async (req, res) => {
    const { url } = req.body

    if (!url) {
      return sendError(res, 'VALIDATION', 'Missing required field: url')
    }

    const response = await axios.get('https://api.scraperapi.com/', {
      params: {
        api_key: process.env.SCRAPERAPI_KEY,
        url,
        render: 'true',
      },
      timeout: 30000,
    })

    res.json({ success: true, html: response.data })
  })
)

/**
 * Search hotels via Makcorps API
 * POST /api/hotels/search
 */
router.post(
  '/hotels/search',
  asyncHandler(async (req, res) => {
    const { cityId, checkIn, checkOut, adults, rooms, currency } = req.body

    if (!cityId || !checkIn || !checkOut) {
      return sendError(res, 'VALIDATION', 'Missing required fields: cityId, checkIn, checkOut')
    }

    const response = await axios.post(
      'https://api.makcorps.com/v1/hotels/search',
      {
        cityId,
        checkIn,
        checkOut,
        adults: adults || 2,
        rooms: rooms || 1,
        currency: currency || 'USD',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.MAKCORPS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    )

    res.json(response.data)
  })
)

export default router
