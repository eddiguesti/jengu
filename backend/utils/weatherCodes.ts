/**
 * Weather Code Mapping Constants
 * Standardized weather code to description mapping
 * Based on Open-Meteo WMO Weather interpretation codes
 * https://open-meteo.com/en/docs
 */

/**
 * Map WMO weather code to human-readable description
 */
export function mapWeatherCode(weathercode: number): string {
  // Clear
  if (weathercode === 0) return 'Clear'

  // Partly Cloudy
  if ([1, 2, 3].includes(weathercode)) return 'Partly Cloudy'

  // Fog
  if ([45, 48].includes(weathercode)) return 'Foggy'

  // Drizzle
  if ([51, 53, 55, 56, 57].includes(weathercode)) return 'Drizzle'

  // Rain
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weathercode)) return 'Rainy'

  // Snow
  if ([71, 73, 75, 77, 85, 86].includes(weathercode)) return 'Snowy'

  // Thunderstorm
  if ([95, 96, 99].includes(weathercode)) return 'Thunderstorm'

  // Default to Cloudy for unmapped codes
  return 'Cloudy'
}

/**
 * Weather code category mapping
 */
export const WEATHER_CATEGORIES = {
  CLEAR: [0],
  PARTLY_CLOUDY: [1, 2, 3],
  FOGGY: [45, 48],
  DRIZZLE: [51, 53, 55, 56, 57],
  RAINY: [61, 63, 65, 66, 67, 80, 81, 82],
  SNOWY: [71, 73, 75, 77, 85, 86],
  THUNDERSTORM: [95, 96, 99],
} as const

/**
 * Check if weather is favorable for tourism
 */
export function isGoodWeatherCode(weathercode: number): boolean {
  return (
    (WEATHER_CATEGORIES.CLEAR as readonly number[]).includes(weathercode) ||
    (WEATHER_CATEGORIES.PARTLY_CLOUDY as readonly number[]).includes(weathercode)
  )
}

/**
 * Get weather severity (0-4, where 0 is best, 4 is worst)
 */
export function getWeatherSeverity(weathercode: number): number {
  if ((WEATHER_CATEGORIES.CLEAR as readonly number[]).includes(weathercode)) return 0
  if ((WEATHER_CATEGORIES.PARTLY_CLOUDY as readonly number[]).includes(weathercode)) return 1
  if ((WEATHER_CATEGORIES.DRIZZLE as readonly number[]).includes(weathercode)) return 2
  if (
    (WEATHER_CATEGORIES.RAINY as readonly number[]).includes(weathercode) ||
    (WEATHER_CATEGORIES.FOGGY as readonly number[]).includes(weathercode)
  )
    return 3
  if (
    (WEATHER_CATEGORIES.THUNDERSTORM as readonly number[]).includes(weathercode) ||
    (WEATHER_CATEGORIES.SNOWY as readonly number[]).includes(weathercode)
  )
    return 4
  return 2 // Default medium severity
}
