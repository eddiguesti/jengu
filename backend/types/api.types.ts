/**
 * API Request and Response Type Definitions
 *
 * Centralized types for backend API operations
 */

// ========================================
// CSV Data Types
// ========================================

/**
 * Raw CSV row from file upload
 * Flexible structure to handle various CSV formats
 */
export interface CSVRow {
  [key: string]: string | number | null | undefined
}

/**
 * Parsed pricing data after CSV transformation
 * Ready for database insertion
 */
export interface ParsedPricingData {
  id: string
  propertyId: string
  date: string
  price: number | null
  occupancy: number | null
  bookings: number | null
  temperature: number | null
  weatherCondition: string | null
  extraData: CSVRow
}

// ========================================
// Error Handling Types
// ========================================

/**
 * Axios error response structure
 * Used for handling external API errors
 */
export interface AxiosErrorResponse {
  data?: {
    error?: { message?: string }
    message?: string
    [key: string]: unknown
  }
}

/**
 * Type guard to check if error is an Axios error
 */
export function isAxiosError(
  error: unknown
): error is { response?: AxiosErrorResponse; message?: string } {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error
}

// ========================================
// API Response Types
// ========================================

/**
 * Standard success response format
 */
export interface SuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
  [key: string]: unknown
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false
  error: string
  message: string
  details?: unknown
}

// ========================================
// Weather Forecast Types
// ========================================

/**
 * Daily forecast data structure
 */
export interface DailyForecast {
  date: string
  temperatures: number[]
  weather: string[]
  humidity: number[]
  precipitation: number
}

/**
 * Individual forecast item from OpenWeather API
 */
export interface ForecastItem {
  dt_txt: string
  main: { temp: number; humidity: number }
  weather: Array<{ main: string }>
  rain?: { '3h'?: number }
}
