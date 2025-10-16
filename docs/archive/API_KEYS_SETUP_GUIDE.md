# API Keys Setup Guide

## Quick Summary

**CRITICAL FIX APPLIED:**
- Fixed Claude AI model version from `claude-3-5-sonnet-20241022` (invalid) to `claude-3-5-sonnet-20240620` (correct)
- Created `.env` file in backend folder - **YOU NEED TO ADD YOUR API KEYS**

---

## Issues Fixed

### 1. AI-Powered Insights Not Working
**Problem:** Claude API error - "model not found"
**Fix:** Updated model name in [backend/services/marketSentiment.js:268](backend/services/marketSentiment.js)
**Status:** ✅ Code fixed, waiting for API key

### 2. Charts May Not Be Working
**Problem:** Missing environment variables and API keys
**Fix:** Created `.env` file with placeholders
**Status:** ⏳ Needs your API keys

---

## Required API Key (For AI Insights)

### 🔴 CRITICAL: Anthropic Claude API

**What it does:** Powers the AI-generated insights on the Insights page

**How to get it:**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create Key"
5. Copy the API key (starts with `sk-ant-`)

**Where to add it:**
Open `backend/.env` and replace:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```
with:
```
ANTHROPIC_API_KEY=sk-ant-api03-...your-actual-key...
```

**Cost:** Pay-as-you-go (very affordable for small usage)
- First $5 free credit for new accounts
- ~$0.003 per insight generated (300+ insights for $1)

---

## Optional API Keys (Features work without these)

### 🟡 OpenWeather API (Weather Data)

**What it does:** Fetches historical and current weather data for weather-based insights

**How to get it (FREE):**
1. Go to https://home.openweathermap.org/users/sign_up
2. Create a free account
3. Go to "API keys" tab
4. Copy your API key

**Where to add it:**
```
OPENWEATHER_API_KEY=your_actual_key_here
```

**Free Tier:** 1,000 API calls/day (more than enough)

---

### 🟡 Mapbox API (Geocoding)

**What it does:** Converts city names to coordinates for location-based features

**How to get it (FREE):**
1. Go to https://account.mapbox.com/access-tokens/
2. Sign up or log in
3. Copy your default public token OR create a new one
4. Copy the token (starts with `pk.`)

**Where to add it:**
```
MAPBOX_TOKEN=pk.your_actual_token_here
```

**Free Tier:** 100,000 requests/month

---

### 🟡 Calendarific API (Holiday Data)

**What it does:** Provides holiday dates for better demand forecasting

**How to get it (FREE):**
1. Go to https://calendarific.com/api-documentation
2. Click "Get Started Free"
3. Create account
4. Copy API key from dashboard

**Where to add it:**
```
CALENDARIFIC_API_KEY=your_actual_key_here
```

**Free Tier:** 1,000 API calls/month

---

## Optional PAID APIs (Not needed for basic functionality)

### 🔵 ScraperAPI (Competitor Scraping)
- **Cost:** Starts at $49/month
- **URL:** https://www.scraperapi.com/
- **Not required** - You can manually collect competitor data

### 🔵 MakCorps Hotel Search API
- **Cost:** Contact for pricing
- **URL:** https://www.makcorps.com/
- **Not required** - Alternative competitor data source

---

## Setup Instructions

### Step 1: Open the .env file
```bash
cd backend
notepad .env
```

### Step 2: Add your API keys
Replace the placeholder text with your actual keys:

```env
# REQUIRED - For AI Insights to work
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-ACTUAL-KEY-HERE

# OPTIONAL - Recommended for better features
OPENWEATHER_API_KEY=your_actual_key_here
MAPBOX_TOKEN=pk.your_actual_token_here
CALENDARIFIC_API_KEY=your_actual_key_here

# Leave these as placeholders (paid services)
SCRAPERAPI_KEY=your_scraperapi_key_here
MAKCORPS_API_KEY=your_makcorps_api_key_here
```

### Step 3: Restart the backend server

The backend server should auto-restart when you save the `.env` file.

If it doesn't, manually restart:
1. Press `Ctrl+C` in the backend terminal
2. Run: `pnpm run dev`

---

## Testing

### After adding ANTHROPIC_API_KEY:

1. Open your app in the browser
2. Navigate to **Insights** page
3. Upload some data (if not already uploaded)
4. Click **"Generate Analytics"** button
5. You should see:
   - ✅ Market Sentiment Analysis (numbers, charts)
   - ✅ AI-Powered Insights (Claude-generated text)
   - ✅ ML Analytics (demand forecast)

### Expected Behavior:

**Before adding API key:**
- AI Insights shows "Unable to generate AI insights at this time"
- Backend logs show: `Claude API Error: model not found`

**After adding API key:**
- AI Insights shows 3-5 bullet points with actionable insights
- Backend logs show: `✅ Claude insights generated successfully`

---

## Troubleshooting

### "Model not found" error
**Solution:** Already fixed! Model updated to `claude-3-5-sonnet-20240620`

### "Authentication error" or "Invalid API key"
**Solution:** Double-check your ANTHROPIC_API_KEY starts with `sk-ant-`

### Backend not loading .env file
**Solution:**
1. Make sure .env is in the `backend/` folder (NOT root folder)
2. Restart the backend server
3. Check for typos in the .env file (no spaces around `=`)

### Charts still not working
**Solution:**
1. Check browser console for errors (F12)
2. Make sure you have data uploaded
3. Click "Generate Analytics" button
4. Share any error messages you see

---

## Cost Estimate

**For a typical small business (100-500 insights per month):**

| Service | Usage | Cost |
|---------|-------|------|
| Anthropic Claude | 300 insights | ~$1-2/month |
| OpenWeather API | FREE tier | $0 |
| Mapbox | FREE tier | $0 |
| Calendarific | FREE tier | $0 |
| **TOTAL** | | **~$1-2/month** |

**Free tier is sufficient for testing and small-scale usage!**

---

## Next Steps

1. **Get Anthropic API Key** (required for AI insights)
   - https://console.anthropic.com/

2. **Get OpenWeather API Key** (optional but recommended)
   - https://home.openweathermap.org/api_keys

3. **Add keys to backend/.env**

4. **Restart backend server**

5. **Test the Insights page**

---

## Need Help?

If you're stuck, check:
- Backend logs (terminal running `pnpm run dev`)
- Browser console (F12 → Console tab)
- Network tab (F12 → Network tab)

Look for error messages containing:
- "Claude API Error"
- "Authentication failed"
- "Invalid API key"
