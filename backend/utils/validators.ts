/**
 * Input Validation Helpers
 * Centralized validation functions for API inputs
 */

interface ValidationResult {
  valid: boolean
  error: string | null
}

interface ValidationResultWithValue<T> extends ValidationResult {
  value: T | null
}

interface ValidationResultWithDate extends ValidationResult {
  date: Date | null
}

interface ValidationResultWithMissing {
  valid: boolean
  missing: string[]
}

interface NumericValidationOptions {
  min?: number
  max?: number
  fieldName?: string
}

interface ArrayValidationOptions {
  minLength?: number
  maxLength?: number
  fieldName?: string
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(body: Record<string, unknown>, requiredFields: string[]): ValidationResultWithMissing {
  const missing: string[] = []

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Validate coordinate values
 */
export function validateCoordinates(latitude: unknown, longitude: unknown): ValidationResult {
  const lat = parseFloat(String(latitude))
  const lon = parseFloat(String(longitude))

  if (isNaN(lat) || isNaN(lon)) {
    return {
      valid: false,
      error: 'Latitude and longitude must be valid numbers'
    }
  }

  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      error: 'Latitude must be between -90 and 90'
    }
  }

  if (lon < -180 || lon > 180) {
    return {
      valid: false,
      error: 'Longitude must be between -180 and 180'
    }
  }

  return { valid: true, error: null }
}

/**
 * Validate date string
 */
export function validateDate(dateStr: unknown): ValidationResultWithDate {
  if (!dateStr) {
    return {
      valid: false,
      error: 'Date is required',
      date: null
    }
  }

  const date = new Date(String(dateStr))

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: 'Invalid date format',
      date: null
    }
  }

  return { valid: true, error: null, date }
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: unknown, endDate: unknown): ValidationResult {
  const start = validateDate(startDate)
  const end = validateDate(endDate)

  if (!start.valid) {
    return { valid: false, error: `Start date: ${start.error}` }
  }

  if (!end.valid) {
    return { valid: false, error: `End date: ${end.error}` }
  }

  if (start.date && end.date && start.date > end.date) {
    return {
      valid: false,
      error: 'Start date must be before end date'
    }
  }

  return { valid: true, error: null }
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
export function validateCountryCode(countryCode: unknown): ValidationResult {
  if (!countryCode || typeof countryCode !== 'string') {
    return {
      valid: false,
      error: 'Country code is required'
    }
  }

  if (countryCode.length !== 2) {
    return {
      valid: false,
      error: 'Country code must be 2 characters (ISO 3166-1 alpha-2)'
    }
  }

  if (!/^[A-Z]{2}$/i.test(countryCode)) {
    return {
      valid: false,
      error: 'Country code must contain only letters'
    }
  }

  return { valid: true, error: null }
}

/**
 * Validate numeric value with optional min/max
 */
export function validateNumeric(value: unknown, options: NumericValidationOptions = {}): ValidationResultWithValue<number> {
  const { min, max, fieldName = 'Value' } = options

  const num = Number(value)

  if (isNaN(num)) {
    return {
      valid: false,
      error: `${fieldName} must be a valid number`,
      value: null
    }
  }

  if (min !== undefined && num < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min}`,
      value: null
    }
  }

  if (max !== undefined && num > max) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${max}`,
      value: null
    }
  }

  return { valid: true, error: null, value: num }
}

/**
 * Validate array input
 */
export function validateArray(value: unknown, options: ArrayValidationOptions = {}): ValidationResult {
  const { minLength, maxLength, fieldName = 'Array' } = options

  if (!Array.isArray(value)) {
    return {
      valid: false,
      error: `${fieldName} must be an array`
    }
  }

  if (minLength !== undefined && value.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must have at least ${minLength} items`
    }
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must have at most ${maxLength} items`
    }
  }

  return { valid: true, error: null }
}

/**
 * Safe float parser
 */
export function parseFloatSafe(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const num = Number(val)
  return isNaN(num) ? null : num
}

/**
 * Safe integer parser
 */
export function parseIntSafe(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const num = Number(val)
  return isNaN(num) ? null : Math.floor(num)
}
