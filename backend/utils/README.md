# Backend Utilities

Shared utility functions for the Travel Pricing backend.

---

## 📁 Files

### `dateParser.js`
Centralized date parsing and formatting utilities.

```javascript
import { parseDate, formatDateISO, getDateRange, isDateInRange } from './utils/dateParser.js';

// Parse flexible date formats
const date = parseDate('2024-01-15'); // Returns Date object or null

// Format to ISO string
const isoDate = formatDateISO(new Date()); // Returns '2024-01-15'

// Get min/max from array
const range = getDateRange([date1, date2, date3]);
// Returns { min: Date, max: Date }

// Check if date in range
const inRange = isDateInRange(checkDate, startDate, endDate); // Returns boolean
```

---

### `weatherCodes.js`
Weather code mapping based on Open-Meteo WMO codes.

```javascript
import { mapWeatherCode, isGoodWeatherCode, getWeatherSeverity, WEATHER_CATEGORIES } from './utils/weatherCodes.js';

// Convert weather code to description
const weather = mapWeatherCode(0);  // Returns 'Clear'
const weather = mapWeatherCode(61); // Returns 'Rainy'

// Check if good weather for tourism
const isGood = isGoodWeatherCode(0); // Returns true (Clear)
const isGood = isGoodWeatherCode(61); // Returns false (Rainy)

// Get severity level (0-4)
const severity = getWeatherSeverity(0);  // Returns 0 (best)
const severity = getWeatherSeverity(95); // Returns 4 (worst)

// Access categories
console.log(WEATHER_CATEGORIES.CLEAR); // [0]
console.log(WEATHER_CATEGORIES.RAINY); // [61, 63, 65, 66, 67, 80, 81, 82]
```

**WMO Weather Code Reference**:
- `0` - Clear sky
- `1,2,3` - Mainly clear, partly cloudy, and overcast
- `45,48` - Fog and depositing rime fog
- `51,53,55,56,57` - Drizzle: Light, moderate, and dense intensity
- `61,63,65,66,67` - Rain: Slight, moderate and heavy intensity
- `71,73,75,77` - Snow fall: Slight, moderate, and heavy intensity
- `80,81,82` - Rain showers: Slight, moderate, and violent
- `85,86` - Snow showers slight and heavy
- `95,96,99` - Thunderstorm: Slight or moderate, with hail

---

### `errorHandler.js`
Standardized error handling and logging.

```javascript
import {
  formatErrorResponse,
  sendError,
  asyncHandler,
  logError,
  ErrorTypes
} from './utils/errorHandler.js';

// Format error response
const errorResponse = formatErrorResponse(
  'Validation Error',
  'Missing required field: email',
  400,
  { field: 'email' }
);

// Send error in Express route
app.get('/api/test', (req, res) => {
  sendError(res, 'VALIDATION', 'Missing required field: email', { field: 'email' });
  // Returns 400 with standard error format
});

// Wrap async routes for automatic error handling
app.get('/api/data', asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));

// Log errors with context
try {
  await someOperation();
} catch (error) {
  logError(error, 'File Upload', { userId: req.userId, fileSize: req.file.size });
}

// Error types
ErrorTypes.VALIDATION      // 400 - Validation Error
ErrorTypes.AUTHENTICATION  // 401 - Authentication Error
ErrorTypes.AUTHORIZATION   // 403 - Authorization Error
ErrorTypes.NOT_FOUND       // 404 - Resource Not Found
ErrorTypes.RATE_LIMIT      // 429 - Rate Limit Exceeded
ErrorTypes.DATABASE        // 500 - Database Error
ErrorTypes.EXTERNAL_API    // 502 - External API Error
ErrorTypes.INTERNAL        // 500 - Internal Server Error
```

---

### `validators.js`
Input validation helpers for API endpoints.

```javascript
import {
  validateRequiredFields,
  validateCoordinates,
  validateDate,
  validateDateRange,
  validateCountryCode,
  validateNumeric,
  validateArray,
  parseFloatSafe,
  parseIntSafe
} from './utils/validators.js';

// Validate required fields
const validation = validateRequiredFields(req.body, ['email', 'password']);
if (!validation.valid) {
  return res.status(400).json({
    error: 'Missing fields',
    missing: validation.missing
  });
}

// Validate coordinates
const coords = validateCoordinates(48.8566, 2.3522);
if (!coords.valid) {
  return res.status(400).json({ error: coords.error });
}

// Validate date
const dateCheck = validateDate('2024-01-15');
if (!dateCheck.valid) {
  return res.status(400).json({ error: dateCheck.error });
}
const date = dateCheck.date; // Use parsed Date object

// Validate date range
const rangeCheck = validateDateRange('2024-01-01', '2024-12-31');
if (!rangeCheck.valid) {
  return res.status(400).json({ error: rangeCheck.error });
}

// Validate country code
const countryCheck = validateCountryCode('FR');
if (!countryCheck.valid) {
  return res.status(400).json({ error: countryCheck.error });
}

// Validate numeric with min/max
const priceCheck = validateNumeric(req.body.price, {
  min: 0,
  max: 10000,
  fieldName: 'Price'
});
if (!priceCheck.valid) {
  return res.status(400).json({ error: priceCheck.error });
}
const price = priceCheck.value; // Use parsed number

// Validate array
const arrayCheck = validateArray(req.body.items, {
  minLength: 1,
  maxLength: 100,
  fieldName: 'Items'
});
if (!arrayCheck.valid) {
  return res.status(400).json({ error: arrayCheck.error });
}

// Safe parsing (replaces global parseFloat/parseInt)
const price = parseFloatSafe(req.body.price);     // Returns number or null
const quantity = parseIntSafe(req.body.quantity); // Returns integer or null
```

---

## 🎯 Usage Examples

### Express Route with Full Validation

```javascript
import { asyncHandler, sendError } from './utils/errorHandler.js';
import { validateRequiredFields, validateCoordinates, parseFloatSafe } from './utils/validators.js';

app.post('/api/properties', asyncHandler(async (req, res) => {
  // Validate required fields
  const validation = validateRequiredFields(req.body, ['name', 'latitude', 'longitude']);
  if (!validation.valid) {
    return sendError(res, 'VALIDATION', `Missing fields: ${validation.missing.join(', ')}`);
  }

  // Validate coordinates
  const coords = validateCoordinates(req.body.latitude, req.body.longitude);
  if (!coords.valid) {
    return sendError(res, 'VALIDATION', coords.error);
  }

  // Parse price safely
  const price = parseFloatSafe(req.body.price);
  if (price === null || price < 0) {
    return sendError(res, 'VALIDATION', 'Invalid price value');
  }

  // Create property
  const property = await createProperty({
    name: req.body.name,
    latitude: parseFloatSafe(req.body.latitude),
    longitude: parseFloatSafe(req.body.longitude),
    price
  });

  res.json({ success: true, property });
}));
```

### Weather API Integration

```javascript
import axios from 'axios';
import { mapWeatherCode, isGoodWeatherCode } from './utils/weatherCodes.js';
import { logError } from './utils/errorHandler.js';

async function fetchWeather(latitude, longitude) {
  try {
    const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
      params: { latitude, longitude, daily: 'weathercode' },
      timeout: 15000
    });

    return response.data.daily.time.map((date, index) => {
      const weathercode = response.data.daily.weathercode[index];
      return {
        date,
        weather: mapWeatherCode(weathercode),
        isGoodWeather: isGoodWeatherCode(weathercode)
      };
    });
  } catch (error) {
    logError(error, 'Weather API', { latitude, longitude });
    throw error;
  }
}
```

### CSV Upload with Validation

```javascript
import { parseDate, formatDateISO } from './utils/dateParser.js';
import { parseFloatSafe, parseIntSafe } from './utils/validators.js';
import { logError } from './utils/errorHandler.js';

function parseCSVRow(row) {
  try {
    return {
      date: parseDate(row.date),
      price: parseFloatSafe(row.price),
      occupancy: parseFloatSafe(row.occupancy),
      bookings: parseIntSafe(row.bookings)
    };
  } catch (error) {
    logError(error, 'CSV Parsing', { row });
    return null;
  }
}
```

---

## 🔧 Best Practices

1. **Always use safe parsing**: Use `parseFloatSafe()` and `parseIntSafe()` instead of global functions
2. **Validate early**: Validate inputs at the start of your route handlers
3. **Use asyncHandler**: Wrap async routes with `asyncHandler()` for automatic error handling
4. **Centralize error responses**: Use `sendError()` for consistent API errors
5. **Log with context**: Use `logError()` with metadata for better debugging
6. **Check validation results**: Always check `.valid` before using parsed values

---

## 📊 Migration Guide

### Replace Global parseFloat/parseInt

```javascript
// ❌ Before (shadows global functions)
const price = parseFloat(value);
const count = parseInt(value);

// ✅ After (safe, no shadowing)
import { parseFloatSafe, parseIntSafe } from './utils/validators.js';
const price = parseFloatSafe(value);
const count = parseIntSafe(value);
```

### Replace Duplicate Weather Mapping

```javascript
// ❌ Before (duplicate code)
let weatherDescription = 'Clear';
if (weathercode === 0) weatherDescription = 'Clear';
else if ([1, 2, 3].includes(weathercode)) weatherDescription = 'Partly Cloudy';
// ... 20 more lines

// ✅ After (centralized)
import { mapWeatherCode } from './utils/weatherCodes.js';
const weatherDescription = mapWeatherCode(weathercode);
```

### Replace Manual Error Handling

```javascript
// ❌ Before (inconsistent)
res.status(400).json({ error: 'Bad request', msg: 'Invalid input' });

// ✅ After (standardized)
import { sendError } from './utils/errorHandler.js';
sendError(res, 'VALIDATION', 'Invalid input', { field: 'email' });
```

---

## 📝 Testing

All utilities include null/undefined checks and return safe defaults:

```javascript
parseFloatSafe(null);        // → null
parseFloatSafe('invalid');   // → null
parseFloatSafe('123.45');    // → 123.45

parseDate(null);             // → null
parseDate('invalid');        // → null
parseDate('2024-01-15');     // → Date object

mapWeatherCode(9999);        // → 'Cloudy' (safe default)
mapWeatherCode(0);           // → 'Clear'
```

---

## 🚀 Performance

All utilities are lightweight and optimized:
- No external dependencies (except axios for timeout examples)
- Pure functions (no side effects)
- Minimal memory footprint
- Safe for high-frequency calls

---

## 📚 Related Documentation

- [Production Refactoring Complete](../../PRODUCTION_REFACTORING_COMPLETE.md)
- [Open-Meteo Weather Codes](https://open-meteo.com/en/docs)
- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0
**Status**: Production-Ready ✅
