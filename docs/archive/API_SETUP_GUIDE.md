# Jengu API Integration Setup Guide

This guide will help you set up all the external APIs required for the Jengu Dynamic Pricing Platform.

## Overview

The platform integrates with 6 external APIs to provide comprehensive pricing intelligence:

1. **OpenWeatherMap** - Historical weather data and forecasts (✅ ACTIVE)
2. **Anthropic Claude** - AI-powered pricing assistant (✅ IMPLEMENTED)
3. **ScraperAPI** - Competitor pricing intelligence (✅ IMPLEMENTED)
4. **Calendarific** - Holiday and events data (✅ IMPLEMENTED)
5. **Mapbox** - Geocoding and location services (✅ IMPLEMENTED)
6. **ExchangeRate-API** - Multi-currency support (OPTIONAL)

## Quick Start

### 1. Create Environment File

Create a `.env` file in the `frontend` directory:

```bash
# frontend/.env

# OpenWeatherMap API (REQUIRED - Currently Active)
VITE_OPENWEATHER_API_KEY=ad75235deeaa288b6389465006fad960

# Anthropic Claude API (HIGH PRIORITY)
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here

# ScraperAPI (HIGH PRIORITY)
VITE_SCRAPER_API_KEY=your_scraper_api_key_here

# Calendarific API (MEDIUM PRIORITY)
VITE_CALENDARIFIC_API_KEY=your_calendarific_key_here

# Mapbox API (MEDIUM PRIORITY)
VITE_MAPBOX_API_KEY=your_mapbox_key_here

# ExchangeRate-API (OPTIONAL)
VITE_EXCHANGE_RATE_API_KEY=your_exchange_rate_key_here
```

### 2. Sign Up for APIs

#### OpenWeatherMap ✅ (Already Configured)

- **Status**: Active with your key
- **Features**: 45 years of historical data, 5-day and 8-day forecasts
- **Usage**: Weather enrichment for pricing data
- **No action needed** - Already working!

#### Anthropic Claude (AI Assistant)

1. Visit: https://console.anthropic.com/
2. Sign up for an account
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy key to `.env` as `VITE_ANTHROPIC_API_KEY`

**Pricing:**

- Free tier: 5,000 requests/month
- Pay-as-you-go: ~$0.01 per conversation
- Estimated cost: $10-30/month

**Features Enabled:**

- Real-time AI pricing recommendations
- Conversational insights
- Data analysis
- Strategic pricing advice

#### ScraperAPI (Competitor Pricing)

1. Visit: https://www.scraperapi.com/
2. Sign up for an account
3. Get your API key from dashboard
4. Copy key to `.env` as `VITE_SCRAPER_API_KEY`

**Pricing:**

- Free tier: 5,000 API calls/month
- Hobby: $49/month (100K calls)
- Estimated cost: $0-49/month

**Features Enabled:**

- Automated competitor price scraping
- Price positioning analysis
- Market intelligence
- Price gap calculations

#### Calendarific (Holidays & Events)

1. Visit: https://calendarific.com/signup
2. Sign up for a free account
3. Get your API key from dashboard
4. Copy key to `.env` as `VITE_CALENDARIFIC_API_KEY`

**Pricing:**

- Free tier: 1,000 calls/month
- Premium: $10/month (10K calls)
- Estimated cost: $0-10/month

**Features Enabled:**

- Holiday detection and enrichment
- Holiday period analysis
- Event-based pricing adjustments
- Holiday impact scoring

#### Mapbox (Geocoding)

1. Visit: https://account.mapbox.com/auth/signup/
2. Create an account
3. Navigate to "Access tokens"
4. Copy your default public token
5. Add to `.env` as `VITE_MAPBOX_API_KEY`

**Pricing:**

- Free tier: 100,000 requests/month
- Pay-as-you-go: $0.50 per 1,000 requests
- Estimated cost: $0/month (free tier sufficient)

**Features Enabled:**

- Address to coordinates conversion
- Location validation in Settings
- Automatic timezone detection
- Distance calculations

#### ExchangeRate-API (Optional - Multi-Currency)

1. Visit: https://www.exchangerate-api.com/
2. Sign up for a free account
3. Get your API key
4. Add to `.env` as `VITE_EXCHANGE_RATE_API_KEY`

**Pricing:**

- Free tier: 1,500 requests/month
- Estimated cost: $0/month

## Testing Your Setup

### Test All APIs at Once

Navigate to the Settings page in the app and click "Test API Connections" (feature to be added).

### Test Individual APIs

#### Test Weather API

```typescript
import { getCurrentWeather, testConnection } from './lib/api/services/weather'

// Test connection
const isConnected = await testConnection()
console.log('Weather API:', isConnected ? '✅ Connected' : '❌ Failed')

// Test data fetch
const weather = await getCurrentWeather(40.7128, -74.006)
console.log('Current weather:', weather)
```

#### Test AI Assistant

```typescript
import { sendMessage, testConnection } from './lib/api/services/assistant'

// Test connection
const isConnected = await testConnection()
console.log('Claude API:', isConnected ? '✅ Connected' : '❌ Failed')

// Test message
const response = await sendMessage('What are the best pricing strategies?')
console.log('AI Response:', response)
```

#### Test Competitor Pricing

```typescript
import { scrapeCompetitorPrices, testScraperConnection } from './lib/api/services/competitor'

// Test connection
const isConnected = await testScraperConnection()
console.log('ScraperAPI:', isConnected ? '✅ Connected' : '❌ Failed')

// Test scraping
const config = {
  location: 'Paris, France',
  checkIn: '2024-12-01',
  checkOut: '2024-12-05',
  guests: 2,
  propertyType: 'hotel',
}
const prices = await scrapeCompetitorPrices(config)
console.log('Competitor prices:', prices)
```

#### Test Holidays API

```typescript
import { getHolidays, testCalendarificConnection } from './lib/api/services/holidays'

// Test connection
const isConnected = await testCalendarificConnection()
console.log('Calendarific:', isConnected ? '✅ Connected' : '❌ Failed')

// Test holidays fetch
const holidays = await getHolidays('US', 2024)
console.log('Holidays:', holidays)
```

#### Test Geocoding

```typescript
import { geocodeAddress, testMapboxConnection } from './lib/api/services/geocoding'

// Test connection
const isConnected = await testMapboxConnection()
console.log('Mapbox:', isConnected ? '✅ Connected' : '❌ Failed')

// Test geocoding
const location = await geocodeAddress('Paris, France')
console.log('Location:', location)
```

## Features by API

### OpenWeatherMap ✅

- ✅ Historical weather enrichment (45 years)
- ✅ Current weather data
- ✅ 5-day forecast (3-hour intervals)
- ✅ 8-day forecast (daily)
- ✅ Weather impact scoring
- ✅ Batch processing with progress tracking

### Anthropic Claude ✅

- ✅ Real-time AI chat assistant
- ✅ Streaming responses
- ✅ Context-aware recommendations
- ✅ Business profile integration
- ✅ Data-driven insights
- ✅ Pricing analysis

### ScraperAPI ✅

- ✅ Multi-platform scraping (Booking.com, Airbnb, Hotels.com)
- ✅ Competitor price analysis
- ✅ Price positioning metrics
- ✅ Mock data fallback for testing
- ✅ Rate limiting protection

### Calendarific ✅

- ✅ Holiday detection and enrichment
- ✅ Holiday period analysis
- ✅ Impact scoring (0-100)
- ✅ Price multiplier recommendations
- ✅ Multi-country support
- ✅ Batch processing for multiple dates

### Mapbox ✅

- ✅ Forward geocoding (address → coordinates)
- ✅ Reverse geocoding (coordinates → address)
- ✅ Place search with autocomplete
- ✅ Location validation
- ✅ Distance calculations
- ✅ Timezone detection

## Cost Estimate

| API              | Free Tier       | Expected Usage | Monthly Cost     |
| ---------------- | --------------- | -------------- | ---------------- |
| OpenWeatherMap   | 1,000 calls/day | ~500 calls/day | $0               |
| Anthropic Claude | 5K requests     | ~2K requests   | $10-20           |
| ScraperAPI       | 5K calls        | ~1K calls      | $0-49            |
| Calendarific     | 1K calls        | ~100 calls     | $0               |
| Mapbox           | 100K requests   | ~1K requests   | $0               |
| **TOTAL**        | -               | -              | **$10-69/month** |

## Troubleshooting

### API Key Not Working

1. **Check `.env` file format**
   - Must be in `frontend/.env`
   - No quotes around values
   - Prefix with `VITE_` for Vite access

2. **Restart development server**

   ```bash
   # Stop the server (Ctrl+C)
   # Restart
   npm run dev
   ```

3. **Check browser console**
   - Open DevTools (F12)
   - Look for API error messages
   - Check Network tab for failed requests

### Weather API Issues

**Problem**: "API key invalid" error

**Solution**: Your OpenWeatherMap key is already configured and working. If you see this error, verify the key in `.env` matches: `ad75235deeaa288b6389465006fad960`

### AI Assistant Not Responding

**Problem**: Messages don't get responses

**Solutions**:

1. Verify `VITE_ANTHROPIC_API_KEY` is set in `.env`
2. Check Anthropic dashboard for API key status
3. Ensure you have available credits/quota
4. Check browser console for error messages

### Competitor Prices Not Loading

**Problem**: Scraping returns no results

**Solutions**:

1. ScraperAPI free tier may have rate limits
2. Mock data will be used automatically as fallback
3. Check if `VITE_SCRAPER_API_KEY` is valid
4. Verify ScraperAPI dashboard for quota

### Holiday Data Missing

**Problem**: No holidays found for dates

**Solutions**:

1. Verify country code is supported (US, GB, FR, etc.)
2. Check Calendarific dashboard for remaining quota
3. Mock data will be used as fallback
4. Ensure dates are within valid range

## Mock Data Fallback

All APIs have **intelligent mock data fallback**:

- If API key is missing → Uses realistic mock data
- If API call fails → Falls back to mock data
- If rate limit exceeded → Uses cached/mock data
- **You can develop without any API keys!**

This means you can:

1. Build and test the app without any API keys
2. Add real API keys one at a time
3. Replace mock data progressively
4. Never worry about API downtime

## Security Best Practices

### ⚠️ IMPORTANT: Never Commit `.env` File

The `.env` file is already in `.gitignore` but double-check:

```bash
# Check if .env is ignored
git status

# If .env shows up, it's NOT ignored (bad!)
# Make sure .gitignore contains:
.env
.env.local
.env.*.local
```

### Production Deployment

For production, **NEVER** expose API keys in frontend code:

1. **Use Backend Proxy** (Recommended)
   - Create backend API routes
   - Store keys in backend environment
   - Frontend calls your backend
   - Backend calls external APIs

2. **Use Serverless Functions**
   - Netlify Functions / Vercel Serverless
   - Keys stored in hosting platform
   - Auto-secured with HTTPS

3. **Environment Variables on Host**
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables

## Next Steps

1. **Get API Keys** (prioritize high-priority APIs)
2. **Add keys to `.env`** file
3. **Restart dev server**
4. **Test each API** using examples above
5. **Configure business profile** in Settings page
6. **Upload data** and test enrichment
7. **Use AI Assistant** for recommendations

## Support

If you encounter issues:

1. **Check API Documentation**
   - OpenWeatherMap: https://openweathermap.org/api
   - Anthropic: https://docs.anthropic.com/
   - ScraperAPI: https://www.scraperapi.com/documentation
   - Calendarific: https://calendarific.com/api-documentation
   - Mapbox: https://docs.mapbox.com/api/search/geocoding/

2. **Review Console Logs**
   - All API services log errors with details
   - Check browser DevTools console
   - Check network requests

3. **Test with Mock Data**
   - Remove API key from `.env` temporarily
   - Verify mock data works
   - This confirms issue is with API, not code

## Summary

✅ **OpenWeatherMap** - Already configured and working!
🔄 **Anthropic Claude** - Get key to enable AI Assistant
🔄 **ScraperAPI** - Get key for real competitor data
🔄 **Calendarific** - Get key for real holiday data
🔄 **Mapbox** - Get key for geocoding in Settings
⏸️ **ExchangeRate-API** - Optional, not critical

**Total setup time**: 15-20 minutes
**Total monthly cost**: $10-69 (can start at $0 with mock data!)

Happy pricing! 🚀
