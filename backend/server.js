import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Simple rate limiting (in-memory, for demo)
const rateLimitMap = new Map();
const RATE_LIMIT = parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60');

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap.get(ip).filter(time => time > windowStart);

  if (requests.length >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Max ${RATE_LIMIT} requests per minute.`
    });
  }

  requests.push(now);
  rateLimitMap.set(ip, requests);
  next();
}

app.use(rateLimit);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ========================================
// ANTHROPIC CLAUDE API (AI Assistant)
// ========================================
app.post('/api/assistant/message', async (req, res) => {
  try {
    const { message, conversationHistory, context } = req.body;

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        system: `You are a helpful AI assistant for a dynamic pricing platform for hospitality businesses. ${context ? JSON.stringify(context) : ''}`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Anthropic API Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to get AI response',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

// ========================================
// OPENWEATHER API (Weather Data)
// ========================================
app.post('/api/weather/historical', async (req, res) => {
  try {
    const { latitude, longitude, dates } = req.body;

    if (!latitude || !longitude || !dates || !Array.isArray(dates)) {
      return res.status(400).json({ error: 'Missing required fields: latitude, longitude, dates' });
    }

    const weatherPromises = dates.map(async (timestamp) => {
      const response = await axios.get(
        `https://api.openweathermap.org/data/3.0/onecall/timemachine`,
        {
          params: {
            lat: latitude,
            lon: longitude,
            dt: timestamp,
            appid: process.env.OPENWEATHER_API_KEY,
            units: 'metric'
          }
        }
      );
      return response.data;
    });

    const weatherData = await Promise.all(weatherPromises);
    res.json({ success: true, data: weatherData });
  } catch (error) {
    console.error('OpenWeather API Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch weather data',
      message: error.response?.data?.message || error.message
    });
  }
});

// ========================================
// CALENDARIFIC API (Holidays)
// ========================================
app.get('/api/holidays', async (req, res) => {
  try {
    const { country, year } = req.query;

    if (!country || !year) {
      return res.status(400).json({ error: 'Missing required parameters: country, year' });
    }

    const response = await axios.get('https://calendarific.com/api/v2/holidays', {
      params: {
        api_key: process.env.CALENDARIFIC_API_KEY,
        country,
        year
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Calendarific API Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch holidays',
      message: error.response?.data?.error || error.message
    });
  }
});

// ========================================
// GEOCODING API (OpenStreetMap Nominatim + Mapbox fallback)
// ========================================
app.get('/api/geocoding/forward', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Missing required parameter: address' });
    }

    // Try OpenStreetMap Nominatim first (free, no API key needed)
    try {
      const nominatimResponse = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: address,
            format: 'json',
            limit: 1,
            addressdetails: 1
          },
          headers: {
            'User-Agent': 'TravelPricingApp/1.0' // Required by Nominatim
          }
        }
      );

      if (nominatimResponse.data && nominatimResponse.data.length > 0) {
        const result = nominatimResponse.data[0];

        // Convert Nominatim format to Mapbox-compatible format
        const mapboxFormat = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(result.lon), parseFloat(result.lat)]
            },
            properties: {
              name: result.display_name,
              place_type: [result.type],
              address: result.address
            },
            center: [parseFloat(result.lon), parseFloat(result.lat)]
          }],
          attribution: 'OpenStreetMap Nominatim'
        };

        return res.json(mapboxFormat);
      }
    } catch (nominatimError) {
      console.warn('Nominatim geocoding failed, trying Mapbox fallback:', nominatimError.message);
    }

    // Fallback to Mapbox if Nominatim fails or returns no results
    if (process.env.MAPBOX_TOKEN && process.env.MAPBOX_TOKEN !== 'your_mapbox_token_here') {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`,
        {
          params: {
            access_token: process.env.MAPBOX_TOKEN,
            limit: 1
          }
        }
      );

      return res.json(response.data);
    }

    // If both failed or no Mapbox token
    return res.status(404).json({
      error: 'Location not found',
      message: 'Could not geocode the provided address. Please try a more specific location (e.g., "City, Country")'
    });

  } catch (error) {
    console.error('Geocoding Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to geocode address',
      message: error.response?.data?.message || error.message
    });
  }
});

app.get('/api/geocoding/reverse', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required parameters: latitude, longitude' });
    }

    // Try OpenStreetMap Nominatim first (free, no API key needed)
    try {
      const nominatimResponse = await axios.get(
        'https://nominatim.openstreetmap.org/reverse',
        {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
            addressdetails: 1
          },
          headers: {
            'User-Agent': 'TravelPricingApp/1.0'
          }
        }
      );

      if (nominatimResponse.data) {
        const result = nominatimResponse.data;

        // Convert to Mapbox-compatible format
        const mapboxFormat = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(result.lon), parseFloat(result.lat)]
            },
            properties: {
              name: result.display_name,
              place_type: [result.type],
              address: result.address
            },
            center: [parseFloat(result.lon), parseFloat(result.lat)],
            place_name: result.display_name
          }],
          attribution: 'OpenStreetMap Nominatim'
        };

        return res.json(mapboxFormat);
      }
    } catch (nominatimError) {
      console.warn('Nominatim reverse geocoding failed, trying Mapbox fallback:', nominatimError.message);
    }

    // Fallback to Mapbox if configured
    if (process.env.MAPBOX_TOKEN && process.env.MAPBOX_TOKEN !== 'your_mapbox_token_here') {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
        {
          params: {
            access_token: process.env.MAPBOX_TOKEN
          }
        }
      );

      return res.json(response.data);
    }

    return res.status(404).json({
      error: 'Location not found',
      message: 'Could not reverse geocode the coordinates'
    });

  } catch (error) {
    console.error('Reverse Geocoding Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to reverse geocode',
      message: error.response?.data?.message || error.message
    });
  }
});

// ========================================
// SCRAPERAPI (Competitor Pricing)
// ========================================
app.post('/api/competitor/scrape', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Missing required field: url' });
    }

    const response = await axios.get('https://api.scraperapi.com/', {
      params: {
        api_key: process.env.SCRAPERAPI_KEY,
        url,
        render: 'true'
      }
    });

    res.json({ success: true, html: response.data });
  } catch (error) {
    console.error('ScraperAPI Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to scrape competitor data',
      message: error.response?.data?.message || error.message
    });
  }
});

// ========================================
// MAKCORPS API (Hotel Pricing)
// ========================================
app.post('/api/hotels/search', async (req, res) => {
  try {
    const { cityId, checkIn, checkOut, adults, rooms, currency } = req.body;

    if (!cityId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'Missing required fields: cityId, checkIn, checkOut' });
    }

    const response = await axios.post(
      'https://api.makcorps.com/v1/hotels/search',
      {
        cityId,
        checkIn,
        checkOut,
        adults: adults || 2,
        rooms: rooms || 1,
        currency: currency || 'USD'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MAKCORPS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Makcorps API Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to search hotels',
      message: error.response?.data?.error || error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Jengu Backend API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Frontend URL: ${process.env.FRONTEND_URL}
✅ Rate limit: ${RATE_LIMIT} requests/minute
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Available endpoints:
   - GET  /health
   - POST /api/assistant/message
   - POST /api/weather/historical
   - GET  /api/holidays
   - GET  /api/geocoding/forward
   - GET  /api/geocoding/reverse
   - POST /api/competitor/scrape
   - POST /api/hotels/search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
