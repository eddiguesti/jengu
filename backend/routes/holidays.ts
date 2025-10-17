import { Router } from 'express'
import axios from 'axios'
import { asyncHandler, sendError } from '../utils/errorHandler.js'

const router = Router()

/**
 * Get holidays for a country and year
 * GET /api/holidays
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { country, year } = req.query

    if (!country || !year) {
      return sendError(res, 'VALIDATION', 'Missing required parameters: country, year')
    }

    const response = await axios.get('https://calendarific.com/api/v2/holidays', {
      params: {
        api_key: process.env.CALENDARIFIC_API_KEY,
        country,
        year,
      },
      timeout: 10000,
    })

    res.json(response.data)
  })
)

export default router
