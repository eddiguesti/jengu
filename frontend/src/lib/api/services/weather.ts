/**
 * Weather API Service - OpenWeatherMap Integration
 *
 * Features:
 * - Historical weather data (45 years back)
 * - Current weather conditions
 * - 5-day/3-hour forecast
 * - 8-day daily forecast
 */

const OPENWEATHER_API_KEY = 'ad75235deeaa288b6389465006fad960'
const BASE_URL = 'https://api.openweathermap.org'

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
 */
export async function getCurrentWeather(
  lat: number,
  lon: number
): Promise<WeatherData> {
  const url = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }

    const data = await response.json()
    return parseCurrentWeather(data)
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
 * Note: OpenWeatherMap requires Unix timestamp
 */
export async function getHistoricalWeather(
  lat: number,
  lon: number,
  date: Date
): Promise<WeatherData> {
  const timestamp = Math.floor(date.getTime() / 1000)
  const url = `${BASE_URL}/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${OPENWEATHER_API_KEY}&units=metric`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Historical weather API error: ${response.status}`)
    }

    const data = await response.json()
    return parseHistoricalWeather(data.data[0], timestamp)
  } catch (error) {
    console.error('Failed to fetch historical weather:', error)
    throw error
  }
}

function parseHistoricalWeather(data: any, timestamp: number): WeatherData {
  return {
    temperature: data.temp,
    feels_like: data.feels_like,
    temp_min: data.temp, // Historical doesn't have min/max
    temp_max: data.temp,
    humidity: data.humidity,
    pressure: data.pressure,
    weather_main: data.weather[0].main,
    weather_description: data.weather[0].description,
    wind_speed: data.wind_speed,
    clouds: data.clouds,
    rain_1h: data.rain?.['1h'],
    snow_1h: data.snow?.['1h'],
    visibility: data.visibility || 10000,
    uv_index: data.uvi,
    date: new Date(timestamp * 1000).toISOString(),
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
 */
export async function getWeatherForecast5Day(
  lat: number,
  lon: number
): Promise<WeatherForecast[]> {
  const url = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.status}`)
    }

    const data = await response.json()
    return parseForecast5Day(data)
  } catch (error) {
    console.error('Failed to fetch 5-day forecast:', error)
    throw error
  }
}

function parseForecast5Day(data: any): WeatherForecast[] {
  // Group by date and aggregate to daily forecasts
  const dailyForecasts = new Map<string, any[]>()

  data.list.forEach((item: any) => {
    const date = new Date(item.dt * 1000)
    const dateKey = date.toISOString().split('T')[0]

    if (!dailyForecasts.has(dateKey)) {
      dailyForecasts.set(dateKey, [])
    }
    dailyForecasts.get(dateKey)!.push(item)
  })

  // Aggregate to daily summaries
  const forecasts: WeatherForecast[] = []

  dailyForecasts.forEach((hourlyData, dateKey) => {
    const temps = hourlyData.map(d => d.main.temp)
    const precip = hourlyData.reduce((sum, d) => sum + (d.rain?.['3h'] || 0), 0)
    const humidity = hourlyData.reduce((sum, d) => sum + d.main.humidity, 0) / hourlyData.length
    const windSpeed = hourlyData.reduce((sum, d) => sum + d.wind.speed, 0) / hourlyData.length

    // Most common weather condition for the day
    const weatherCounts = new Map<string, number>()
    hourlyData.forEach(d => {
      const main = d.weather[0].main
      weatherCounts.set(main, (weatherCounts.get(main) || 0) + 1)
    })
    const weatherMain = Array.from(weatherCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0]

    const date = new Date(dateKey)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

    forecasts.push({
      date: dateKey,
      day: dayName,
      temp: temps.reduce((a, b) => a + b, 0) / temps.length,
      temp_min: Math.min(...temps),
      temp_max: Math.max(...temps),
      weather_main: weatherMain,
      weather_description: hourlyData[0].weather[0].description,
      precipitation_probability: hourlyData[0].pop * 100,
      precipitation_mm: precip,
      humidity,
      wind_speed: windSpeed,
      is_good_weather: isGoodWeather(weatherMain, precip),
    })
  })

  return forecasts.slice(0, 5) // Return first 5 days
}

/**
 * Get 8-day daily weather forecast (requires One Call API 3.0)
 */
export async function getWeatherForecast8Day(
  lat: number,
  lon: number
): Promise<WeatherForecast[]> {
  const url = `${BASE_URL}/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&appid=${OPENWEATHER_API_KEY}&units=metric`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      // Fallback to 5-day forecast if One Call API not available
      return getWeatherForecast5Day(lat, lon)
    }

    const data = await response.json()
    return parseForecast8Day(data)
  } catch (error) {
    console.error('Failed to fetch 8-day forecast, falling back to 5-day:', error)
    return getWeatherForecast5Day(lat, lon)
  }
}

function parseForecast8Day(data: any): WeatherForecast[] {
  return data.daily.map((day: any) => {
    const date = new Date(day.dt * 1000)
    const dateKey = date.toISOString().split('T')[0]
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

    return {
      date: dateKey,
      day: dayName,
      temp: day.temp.day,
      temp_min: day.temp.min,
      temp_max: day.temp.max,
      weather_main: day.weather[0].main,
      weather_description: day.weather[0].description,
      precipitation_probability: day.pop * 100,
      precipitation_mm: day.rain || 0,
      humidity: day.humidity,
      wind_speed: day.wind_speed,
      is_good_weather: isGoodWeather(day.weather[0].main, day.rain || 0),
    }
  })
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
export function estimateSunshineHours(
  clouds: number,
  date: Date,
  latitude: number
): number {
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
export function weatherToDailySummary(
  weather: WeatherData,
  latitude: number
): DailyWeatherSummary {
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
