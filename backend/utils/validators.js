/**
 * Input Validation Helpers
 * Centralized validation functions for API inputs
 */

/**
 * Validate required fields in request body
 * @param {object} body - Request body
 * @param {string[]} requiredFields - Array of required field names
 * @returns {{valid: boolean, missing: string[]}} - Validation result
 */
export function validateRequiredFields(body, requiredFields) {
  const missing = [];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Validate coordinate values
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {{valid: boolean, error: string|null}} - Validation result
 */
export function validateCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return {
      valid: false,
      error: 'Latitude and longitude must be valid numbers'
    };
  }

  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      error: 'Latitude must be between -90 and 90'
    };
  }

  if (lon < -180 || lon > 180) {
    return {
      valid: false,
      error: 'Longitude must be between -180 and 180'
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate date string
 * @param {string} dateStr - Date string to validate
 * @returns {{valid: boolean, error: string|null, date: Date|null}} - Validation result
 */
export function validateDate(dateStr) {
  if (!dateStr) {
    return {
      valid: false,
      error: 'Date is required',
      date: null
    };
  }

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: 'Invalid date format',
      date: null
    };
  }

  return { valid: true, error: null, date };
}

/**
 * Validate date range
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {{valid: boolean, error: string|null}} - Validation result
 */
export function validateDateRange(startDate, endDate) {
  const start = validateDate(startDate);
  const end = validateDate(endDate);

  if (!start.valid) {
    return { valid: false, error: `Start date: ${start.error}` };
  }

  if (!end.valid) {
    return { valid: false, error: `End date: ${end.error}` };
  }

  if (start.date > end.date) {
    return {
      valid: false,
      error: 'Start date must be before end date'
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 * @param {string} countryCode - Two-letter country code
 * @returns {{valid: boolean, error: string|null}} - Validation result
 */
export function validateCountryCode(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') {
    return {
      valid: false,
      error: 'Country code is required'
    };
  }

  if (countryCode.length !== 2) {
    return {
      valid: false,
      error: 'Country code must be 2 characters (ISO 3166-1 alpha-2)'
    };
  }

  if (!/^[A-Z]{2}$/i.test(countryCode)) {
    return {
      valid: false,
      error: 'Country code must contain only letters'
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate numeric value with optional min/max
 * @param {any} value - Value to validate
 * @param {object} options - Validation options {min, max, fieldName}
 * @returns {{valid: boolean, error: string|null, value: number|null}} - Validation result
 */
export function validateNumeric(value, options = {}) {
  const { min, max, fieldName = 'Value' } = options;

  const num = Number(value);

  if (isNaN(num)) {
    return {
      valid: false,
      error: `${fieldName} must be a valid number`,
      value: null
    };
  }

  if (min !== undefined && num < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min}`,
      value: null
    };
  }

  if (max !== undefined && num > max) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${max}`,
      value: null
    };
  }

  return { valid: true, error: null, value: num };
}

/**
 * Validate array input
 * @param {any} value - Value to validate
 * @param {object} options - Validation options {minLength, maxLength, fieldName}
 * @returns {{valid: boolean, error: string|null}} - Validation result
 */
export function validateArray(value, options = {}) {
  const { minLength, maxLength, fieldName = 'Array' } = options;

  if (!Array.isArray(value)) {
    return {
      valid: false,
      error: `${fieldName} must be an array`
    };
  }

  if (minLength !== undefined && value.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must have at least ${minLength} items`
    };
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must have at most ${maxLength} items`
    };
  }

  return { valid: true, error: null };
}

/**
 * Safe float parser
 * @param {any} val - Value to parse
 * @returns {number|null} - Parsed float or null
 */
export function parseFloatSafe(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

/**
 * Safe integer parser
 * @param {any} val - Value to parse
 * @returns {number|null} - Parsed integer or null
 */
export function parseIntSafe(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : Math.floor(num);
}
