import { Router } from 'express'
import axios from 'axios'
import { asyncHandler, sendError } from '../utils/errorHandler.js'
import { mapWeatherCode } from '../utils/weatherCodes.js'
import { DailyForecast, ForecastItem } from '../types/api.types.js'

const router = Router()

/**
 * Historical weather data (Open-Meteo - FREE, no API key needed)
 * POST /api/weather/historical
 */
router.post(
  '/historical',
  asyncHandler(async (req, res) => {
    const { latitude, longitude, dates } = req.body

    if (!latitude || !longitude || !dates || !Array.isArray(dates)) {
      return sendError(res, 'VALIDATION', 'Missing required fields: latitude, longitude, dates')
    }

    const formattedDates = dates.map(timestamp => {
      const date = new Date(timestamp * 1000)
      return date.toISOString().split('T')[0]
    })

    const uniqueDates = [...new Set(formattedDates)].sort()
    const startDate = uniqueDates[0]
    const endDate = uniqueDates[uniqueDates.length - 1]

    const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
      params: {
        latitude: latitude,
        longitude: longitude,
        start_date: startDate,
        end_date: endDate,
        daily:
          'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weathercode',
        timezone: 'auto',
      },
      timeout: 15000,
    })

    const weatherData = response.data.daily.time.map((date: string, index: number) => {
      const weathercode = response.data.daily.weathercode[index]
      const weatherDescription = mapWeatherCode(weathercode)

      return {
        date: date,
        temperature: {
          max: response.data.daily.temperature_2m_max[index],
          min: response.data.daily.temperature_2m_min[index],
          mean: response.data.daily.temperature_2m_mean[index],
        },
        precipitation: response.data.daily.precipitation_sum[index],
        weather: weatherDescription,
        weathercode: weathercode,
      }
    })

    res.json({
      success: true,
      data: weatherData,
      source: 'Open-Meteo (Free)',
      message: 'Historical weather data from Open-Meteo - No API key required!',
    })
  })
)

/**
 * Current weather endpoint (OpenWeather - FREE)
 * GET /api/weather/current
 */
router.get(
  '/current',
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query

    if (!latitude || !longitude) {
      return sendError(res, 'VALIDATION', 'Missing required parameters: latitude, longitude')
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: latitude,
        lon: longitude,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 10000,
    })

    const weatherData = {
      location: response.data.name,
      temperature: {
        current: response.data.main.temp,
        feels_like: response.data.main.feels_like,
        min: response.data.main.temp_min,
        max: response.data.main.temp_max,
      },
      weather: response.data.weather[0].main,
      description: response.data.weather[0].description,
      humidity: response.data.main.humidity,
      wind_speed: response.data.wind.speed,
      timestamp: new Date(response.data.dt * 1000).toISOString(),
      source: 'OpenWeather (Free)',
    }

    res.json({
      success: true,
      data: weatherData,
      message: 'Current weather data - perfect for live pricing optimization!',
    })
  })
)

/**
 * 5-day weather forecast endpoint (OpenWeather - FREE)
 * GET /api/weather/forecast
 */
router.get(
  '/forecast',
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query

    if (!latitude || !longitude) {
      return sendError(res, 'VALIDATION', 'Missing required parameters: latitude, longitude')
    }

    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat: latitude,
        lon: longitude,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 10000,
    })

    const dailyForecasts: Record<string, DailyForecast> = {}

    response.data.list.forEach((item: ForecastItem) => {
      const date = item.dt_txt.split(' ')[0]

      if (!dailyForecasts[date]) {
        dailyForecasts[date] = {
          date: date,
          temperatures: [],
          weather: [],
          humidity: [],
          precipitation: item.rain ? item.rain['3h'] || 0 : 0,
        }
      }

      dailyForecasts[date].temperatures.push(item.main.temp)
      dailyForecasts[date].weather.push(item.weather[0].main)
      dailyForecasts[date].humidity.push(item.main.humidity)
    })

    const forecastData = Object.values(dailyForecasts).map((day: DailyForecast) => {
      const temps = day.temperatures
      const mostCommonWeather = day.weather
        .sort(
          (a: string, b: string) =>
            day.weather.filter((v: string) => v === a).length -
            day.weather.filter((v: string) => v === b).length
        )
        .pop()

      return {
        date: day.date,
        temperature: {
          min: Math.min(...temps),
          max: Math.max(...temps),
          avg: temps.reduce((a: number, b: number) => a + b, 0) / temps.length,
        },
        weather: mostCommonWeather,
        humidity_avg: day.humidity.reduce((a: number, b: number) => a + b, 0) / day.humidity.length,
        precipitation: day.precipitation,
      }
    })

    res.json({
      success: true,
      data: forecastData,
      location: response.data.city.name,
      source: 'OpenWeather (Free)',
      message: '5-day forecast - use this for dynamic pricing recommendations!',
    })
  })
)

export default router
