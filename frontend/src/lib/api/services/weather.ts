/**
 * Weather API Service - OpenWeatherMap Integration
 *
 * Features:
 * - Historical weather data (45 years back)
 * - Current weather conditions
 * - 5-day/3-hour forecast
 * - 8-day daily forecast
 *
 * NOTE: All weather API calls now go through backend proxy to secure API keys
 */

import apiClient from '../client'

// ===== TYPES =====

export interface WeatherData {
  temperature: number // Celsius
  feels_like: number
  temp_min: number
  temp_max: number
  humidity: number // Percentage
  pressure: number // hPa
  weather_main: string // "Clear", "Clouds", "Rain", "Snow"
  weather_description: string // Detailed description
  wind_speed: number // m/s
  clouds: number // Cloudiness percentage
  rain_1h?: number // Rain volume last hour (mm)
  rain_3h?: number // Rain volume last 3 hours (mm)
  snow_1h?: number // Snow volume last hour (mm)
  visibility: number // meters
  uv_index?: number
  date: string // ISO date
  timestamp: number // Unix timestamp
}

export interface DailyWeatherSummary {
  date: string
  temp_avg: number
  temp_min: number
  temp_max: number
  humidity_avg: number
  precipitation: number // Total mm
  weather_main: string
  weather_description: string
  sunshine_hours: number // Estimated
  is_good_weather: boolean // Clear/Partly cloudy, no rain
  wind_speed_avg: number
}

export interface WeatherForecast {
  date: string
  day: string
  temp: number
  temp_min: number
  temp_max: number
  weather_main: string
  weather_description: string
  precipitation_probability: number // 0-100%
  precipitation_mm: number
  humidity: number
  wind_speed: number
  is_good_weather: boolean
}

// ===== CURRENT WEATHER =====

/**
 * Get current weather conditions for a location
 * Now uses backend proxy - no API key needed in frontend
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  try {
    const response = await apiClient.get('/weather/current', {
      params: {
        latitude: lat,
        longitude: lon,
      },
    })

    return parseCurrentWeather(response.data)
  } catch (error) {
    console.error('Failed to fetch current weather:', error)
    throw error
  }
}

function parseCurrentWeather(data: any): WeatherData {
  return {
    temperature: data.main.temp,
    feels_like: data.main.feels_like,
    temp_min: data.main.temp_min,
    temp_max: data.main.temp_max,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    weather_main: data.weather[0].main,
    weather_description: data.weather[0].description,
    wind_speed: data.wind.speed,
    clouds: data.clouds.all,
    rain_1h: data.rain?.['1h'],
    snow_1h: data.snow?.['1h'],
    visibility: data.visibility,
    date: new Date(data.dt * 1000).toISOString(),
    timestamp: data.dt,
  }
}

// ===== HISTORICAL WEATHER =====

/**
 * Get historical weather data for a specific date
 * Now uses backend proxy - no API key needed in frontend
 */
export async function getHistoricalWeather(
  lat: number,
  lon: number,
  date: Date
): Promise<WeatherData> {
  const timestamp = Math.floor(date.getTime() / 1000)

  try {
    const response = await apiClient.post('/weather/historical', {
      latitude: lat,
      longitude: lon,
      dates: [timestamp],
    })

    // Backend returns array, we need first item
    const weatherData = response.data.data[0]
    if (!weatherData) {
      throw new Error('No weather data returned')
    }

    return parseHistoricalWeather(weatherData, timestamp)
  } catch (error) {
    console.error('Failed to fetch historical weather:', error)
    throw error
  }
}

function parseHistoricalWeather(data: any, timestamp: number): WeatherData {
  // Backend returns Open-Meteo format with temperature object
  const temp = data.temperature?.mean || data.temperature?.max || data.temperature
  return {
    temperature: temp,
    feels_like: temp, // Open-Meteo doesn't provide feels_like
    temp_min: data.temperature?.min || temp,
    temp_max: data.temperature?.max || temp,
    humidity: 50, // Open-Meteo doesn't provide humidity in archive API
    pressure: 1013, // Standard pressure fallback
    weather_main: data.weather || 'Unknown',
    weather_description: data.weather || 'Unknown',
    wind_speed: 0, // Open-Meteo archive doesn't provide wind
    clouds: 0,
    rain_1h: data.precipitation || 0,
    visibility: 10000,
    date: data.date || new Date(timestamp * 1000).toISOString().split('T')[0],
    timestamp,
  }
}

/**
 * Batch fetch historical weather for multiple dates
 * Optimized with rate limiting to avoid API throttling
 */
export async function getHistoricalWeatherBatch(
  lat: number,
  lon: number,
  dates: Date[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, WeatherData>> {
  const results = new Map<string, WeatherData>()
  const delayMs = 100 // Delay between requests to avoid rate limits

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const dateKey = date.toISOString().split('T')[0]

    try {
      const weather = await getHistoricalWeather(lat, lon, date)
      results.set(dateKey, weather)

      if (onProgress) {
        onProgress(i + 1, dates.length)
      }

      // Add delay between requests
      if (i < dates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      console.error(`Failed to fetch weather for ${dateKey}:`, error)
      // Continue with other dates even if one fails
    }
  }

  return results
}

// ===== WEATHER FORECAST =====

/**
 * Get 5-day weather forecast (3-hour intervals)
 * Now uses backend proxy - no API key needed in frontend
 */
export async function getWeatherForecast5Day(lat: number, lon: number): Promise<WeatherForecast[]> {
  try {
    const response = await apiClient.get('/weather/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
      },
    })

    // Backend returns already formatted data
    return response.data.data.map((day: any) => ({
      date: day.date,
      day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      temp: day.temperature.avg,
      temp_min: day.temperature.min,
      temp_max: day.temperature.max,
      weather_main: day.weather,
      weather_description: day.weather.toLowerCase(),
      precipitation_probability: 0, // Backend doesn't provide this yet
      precipitation_mm: day.precipitation || 0,
      humidity: day.humidity_avg,
      wind_speed: 0, // Backend doesn't provide this yet
      is_good_weather: isGoodWeather(day.weather, day.precipitation || 0),
    }))
  } catch (error) {
    console.error('Failed to fetch 5-day forecast:', error)
    throw error
  }
}

/**
 * Get 8-day daily weather forecast
 * Fallback to 5-day forecast (backend doesn't support 8-day yet)
 */
export async function getWeatherForecast8Day(lat: number, lon: number): Promise<WeatherForecast[]> {
  try {
    // Backend doesn't support 8-day forecast yet, fallback to 5-day
    return getWeatherForecast5Day(lat, lon)
  } catch (error) {
    console.error('Failed to fetch 8-day forecast, falling back to 5-day:', error)
    return getWeatherForecast5Day(lat, lon)
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Determine if weather is "good" for tourism/hospitality
 */
export function isGoodWeather(weatherMain: string, precipitationMm: number): boolean {
  const goodConditions = ['Clear', 'Clouds']
  const isGoodCondition = goodConditions.includes(weatherMain)
  const lowPrecipitation = precipitationMm < 2 // Less than 2mm is light

  return isGoodCondition && lowPrecipitation
}

/**
 * Calculate estimated sunshine hours from weather data
 * Based on cloudiness and daylight hours
 */
export function estimateSunshineHours(clouds: number, date: Date, _latitude: number): number {
  // Simplified calculation - in production, use more accurate solar calculations
  const month = date.getMonth()
  const daylightHours = 12 + 4 * Math.sin((2 * Math.PI * (month - 3)) / 12) // Approximate

  // Reduce by cloudiness
  const sunshineHours = daylightHours * (1 - clouds / 100)
  return Math.max(0, sunshineHours)
}

/**
 * Convert weather data to daily summary format
 * Useful for enriching historical booking data
 */
export function weatherToDailySummary(weather: WeatherData, latitude: number): DailyWeatherSummary {
  const date = new Date(weather.timestamp * 1000)
  const sunshineHours = estimateSunshineHours(weather.clouds, date, latitude)

  return {
    date: date.toISOString().split('T')[0],
    temp_avg: weather.temperature,
    temp_min: weather.temp_min,
    temp_max: weather.temp_max,
    humidity_avg: weather.humidity,
    precipitation: (weather.rain_1h || 0) + (weather.snow_1h || 0),
    weather_main: weather.weather_main,
    weather_description: weather.weather_description,
    sunshine_hours: sunshineHours,
    is_good_weather: isGoodWeather(weather.weather_main, weather.rain_1h || 0),
    wind_speed_avg: weather.wind_speed,
  }
}

/**
 * Get weather impact score for pricing (0-100)
 * Higher score = better weather = potential for higher prices
 */
export function getWeatherImpactScore(weather: WeatherForecast | DailyWeatherSummary): number {
  let score = 50 // Base score

  // Temperature impact (optimal 18-28°C)
  const temp = 'temp' in weather ? weather.temp : weather.temp_avg
  if (temp >= 18 && temp <= 28) {
    score += 20
  } else if (temp >= 15 && temp <= 30) {
    score += 10
  } else if (temp < 10 || temp > 35) {
    score -= 20
  }

  // Weather condition impact
  if (weather.is_good_weather) {
    score += 20
  } else if (weather.weather_main === 'Rain') {
    score -= 30
  } else if (weather.weather_main === 'Snow') {
    // Snow can be positive for winter destinations
    score += 10
  }

  // Precipitation impact
  const precip = 'precipitation_mm' in weather ? weather.precipitation_mm : weather.precipitation
  if (precip > 10) {
    score -= 20
  } else if (precip > 5) {
    score -= 10
  }

  // Wind impact
  const wind = 'wind_speed' in weather ? weather.wind_speed : weather.wind_speed_avg
  if (wind > 15) {
    score -= 10
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Get weather description emoji
 */
export function getWeatherEmoji(weatherMain: string): string {
  const emojiMap: Record<string, string> = {
    Clear: '☀️',
    Clouds: '⛅',
    Rain: '🌧️',
    Drizzle: '🌦️',
    Thunderstorm: '⛈️',
    Snow: '❄️',
    Mist: '🌫️',
    Fog: '🌫️',
    Haze: '🌫️',
  }
  return emojiMap[weatherMain] || '🌤️'
}

/**
 * Format temperature for display
 */
export function formatTemperature(celsius: number, includeUnit = true): string {
  return `${Math.round(celsius)}${includeUnit ? '°C' : ''}`
}

/**
 * Format precipitation for display
 */
export function formatPrecipitation(mm: number): string {
  if (mm === 0) return 'None'
  if (mm < 0.1) return '<0.1mm'
  if (mm < 1) return `${mm.toFixed(1)}mm`
  return `${Math.round(mm)}mm`
}
