/**
 * CSV Content Validation Utilities
 *
 * Security-focused validation for uploaded CSV files
 */

/**
 * Validate CSV content for malicious code and suspicious patterns
 *
 * Scans for common injection attacks:
 * - JavaScript injection (script tags, event handlers)
 * - Code execution attempts (eval, exec)
 * - Malicious protocols (javascript:, data:)
 * - iFrame injections
 */
export function validateCSVContent(content: string): { valid: boolean; error?: string } {
  // Check for suspicious patterns that could indicate malicious content
  const suspiciousPatterns = [
    { pattern: /<script/i, description: 'JavaScript injection (<script>)' },
    { pattern: /javascript:/i, description: 'JavaScript protocol (javascript:)' },
    { pattern: /onerror=/i, description: 'Event handler (onerror=)' },
    { pattern: /onclick=/i, description: 'Event handler (onclick=)' },
    { pattern: /onload=/i, description: 'Event handler (onload=)' },
    { pattern: /<iframe/i, description: 'iFrame injection' },
    { pattern: /eval\(/i, description: 'eval() call' },
    { pattern: /exec\(/i, description: 'exec() call' },
    { pattern: /data:text\/html/i, description: 'Data URI with HTML' },
    { pattern: /<embed/i, description: 'Embed tag' },
    { pattern: /<object/i, description: 'Object tag' },
  ]

  for (const { pattern, description } of suspiciousPatterns) {
    if (pattern.test(content)) {
      return {
        valid: false,
        error: `Suspicious content detected: ${description}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Validate CSV structure and required columns
 *
 * Checks for:
 * - Required columns (date, price)
 * - Non-empty data
 * - Row count limits
 */
export function validateCSVStructure(
  headers: string[],
  rows: any[]
): {
  valid: boolean
  error?: string
} {
  // Check for required columns
  const requiredColumns = ['date', 'price']
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase())

  for (const required of requiredColumns) {
    if (!normalizedHeaders.some(h => h.includes(required))) {
      return {
        valid: false,
        error: `Missing required column: "${required}". CSV must contain date and price columns.`,
      }
    }
  }

  // Check row count
  if (rows.length === 0) {
    return {
      valid: false,
      error: 'CSV file is empty. Please upload a file with at least one row of data.',
    }
  }

  if (rows.length > 100000) {
    return {
      valid: false,
      error: `CSV file too large (${rows.length.toLocaleString()} rows). Maximum allowed is 100,000 rows.`,
    }
  }

  // Check for valid data in required columns
  const dateIndex = normalizedHeaders.findIndex(h => h.includes('date'))
  const priceIndex = normalizedHeaders.findIndex(h => h.includes('price'))

  // Sample first 10 rows to validate data format
  const sampleSize = Math.min(10, rows.length)
  for (let i = 0; i < sampleSize; i++) {
    const row = rows[i]
    const rowValues = Object.values(row)

    // Check date column is not empty
    if (!rowValues[dateIndex] || String(rowValues[dateIndex]).trim() === '') {
      return {
        valid: false,
        error: `Invalid data: Row ${i + 1} has empty date value`,
      }
    }

    // Check price column is not empty
    if (!rowValues[priceIndex] || String(rowValues[priceIndex]).trim() === '') {
      return {
        valid: false,
        error: `Invalid data: Row ${i + 1} has empty price value`,
      }
    }

    // Check price is a valid number
    const price = parseFloat(String(rowValues[priceIndex]))
    if (isNaN(price) || price < 0) {
      return {
        valid: false,
        error: `Invalid data: Row ${i + 1} has invalid price value (must be a positive number)`,
      }
    }
  }

  return { valid: true }
}

/**
 * Validate file size before reading
 *
 * Prevents reading extremely large files into memory
 */
export function validateFileSize(fileSizeBytes: number): { valid: boolean; error?: string } {
  const maxSizeBytes = 50 * 1024 * 1024 // 50MB

  if (fileSizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large (${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB). Maximum allowed is 50MB.`,
    }
  }

  return { valid: true }
}
