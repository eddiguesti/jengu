# 🔌 API Integration Guide - Jengu Dynamic Pricing Platform

## Overview
This document outlines all the APIs needed to connect your Jengu platform to real-world data sources. Each API is categorized by priority and mapped to specific features in your application.

---

## 📋 **QUICK SUMMARY - APIs Needed**

| API Category | Provider Options | Est. Cost | Priority |
|-------------|------------------|-----------|----------|
| 1. Weather Data | OpenWeatherMap / WeatherAPI | Free-$50/mo | **CRITICAL** |
| 2. AI Assistant | OpenAI / Anthropic Claude | $10-100/mo | **HIGH** |
| 3. Competitor Pricing | Custom Scraping + Proxy | $20-100/mo | **HIGH** |
| 4. Holiday/Events | Calendarific / Abstract API | Free-$20/mo | **MEDIUM** |
| 5. Geocoding | Google Maps / Mapbox | Free-$50/mo | **MEDIUM** |
| 6. Currency Exchange | ExchangeRate-API | Free | **LOW** |

**Total Estimated Monthly Cost:** $60-$320/month (depending on usage & tiers)

---

## 🌦️ **1. WEATHER DATA API** ⚡ CRITICAL

### **Purpose**
- Enrich historical booking data with weather conditions
- Live weather forecasts for demand prediction
- Temperature, precipitation, sunshine hours correlation with pricing

### **Where It's Used**
- `/data` page → Enrichment step (historical weather)
- `/pricing-engine` → Live forecasting engine (current + forecast weather)
- `/insights` → Weather correlation charts

### **Recommended Provider: OpenWeatherMap**

**Why OpenWeatherMap?**
- ✅ Historical weather data available
- ✅ 5-day / 16-day forecasts
- ✅ Hourly data
- ✅ 1,000 free API calls/day
- ✅ Well-documented

**Pricing:**
- **Free Tier:** 1,000 calls/day, current + 5-day forecast
- **Startup Plan:** $40/month, 100,000 calls/day, historical data
- **Developer Plan:** $120/month, unlimited calls, historical data

**API Endpoints Needed:**

```javascript
// 1. Historical Weather Data (for enrichment)
GET https://api.openweathermap.org/data/3.0/onecall/timemachine
Parameters:
  - lat, lon (from business location)
  - dt (Unix timestamp for each booking date)
  - appid (your API key)

Response Example:
{
  "current": {
    "temp": 18.5,
    "humidity": 72,
    "weather": [{"main": "Rain", "description": "light rain"}],
    "wind_speed": 5.2
  },
  "hourly": [...]
}

// 2. Current Weather (for live forecasting)
GET https://api.openweathermap.org/data/2.5/weather
Parameters:
  - lat, lon
  - appid

// 3. 5-Day Forecast (for pricing optimization)
GET https://api.openweathermap.org/data/2.5/forecast
Parameters:
  - lat, lon
  - appid
```

**Integration Files to Update:**
- `frontend/src/lib/api/services/enrichment.ts` - Add weather enrichment function
- `backend/api/weather.py` - Create weather service wrapper
- `frontend/src/pages/PricingEngine.tsx` - Connect live weather to forecast engine

**Alternative:** WeatherAPI.com (14 days forecast, 300 days historical, $35/month for 1M calls)

**Sign Up:** https://openweathermap.org/api

---

## 🤖 **2. AI ASSISTANT API** ⚡ HIGH PRIORITY

### **Purpose**
- Power the AI Assistant chat interface
- Answer user questions about pricing strategies
- Provide data insights and recommendations
- Explain ML model decisions

### **Where It's Used**
- `/assistant` page → Chat interface
- Floating assistant widget (if implemented)
- Automated insights generation

### **Recommended Provider: Anthropic Claude API**

**Why Claude?**
- ✅ Better at analytical/business reasoning
- ✅ Longer context windows (200K tokens)
- ✅ More helpful for complex pricing questions
- ✅ Safer, less likely to hallucinate business advice
- ✅ You're already familiar with Claude!

**Pricing:**
- **Claude 3.5 Sonnet:** $3 per 1M input tokens, $15 per 1M output tokens
- **Estimated Usage:** ~$20-50/month for typical assistant usage

**API Integration:**

```javascript
// Frontend: src/lib/api/services/assistant.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
});

export async function sendMessage(message: string, conversationHistory: Message[]) {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: `You are Jengu AI, an expert pricing assistant for hotels and campsites.
             You help users understand dynamic pricing, interpret data, and optimize revenue.
             Be concise, actionable, and business-focused.`,
    messages: [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ]
  });

  return response.content[0].text;
}
```

**Backend Option (More Secure):**

```python
# backend/api/assistant.py
import anthropic
import os

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def get_assistant_response(messages: list) -> str:
    """Get response from Claude API for assistant feature"""
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        system="""You are Jengu AI, an expert pricing assistant.""",
        messages=messages
    )
    return response.content[0].text
```

**Alternative: OpenAI GPT-4**
- **Pricing:** $5 per 1M input tokens, $15 per 1M output tokens
- **Pros:** Slightly cheaper, widely adopted
- **Cons:** Less reliable for complex analytical reasoning

**Sign Up:** https://console.anthropic.com/

---

## 💰 **3. COMPETITOR PRICING API** ⚡ HIGH PRIORITY

### **Purpose**
- Track competitor prices in real-time
- Benchmark your pricing against market
- Identify pricing gaps and opportunities
- Power competitive intelligence in Insights page

### **Where It's Used**
- `/pricing-engine` → Competitor pricing influence parameter
- `/insights` → Competitor comparison charts
- `/data` → Enrichment with competitor baseline

### **Challenge:** No Direct API Exists

Hotels/campsites don't have public APIs for pricing. You need to **scrape their booking sites**.

### **Recommended Solution: Custom Web Scraping + Proxy Service**

**Architecture:**
1. **Web Scraper** (Python with Playwright/Selenium)
2. **Proxy Rotation** (to avoid rate limits/blocks)
3. **Data Normalization** (extract prices from different sites)
4. **Scheduled Jobs** (daily scraping via cron)

**Tools Needed:**

**A) Scraping Library:**
```bash
pip install playwright beautifulsoup4 scrapy
```

**B) Proxy Service:**
- **BrightData (formerly Luminati):** $500/month for 40GB
- **Oxylabs:** $99/month starter
- **ScraperAPI:** $49/month, 100K requests
- **Apify:** $49/month, pay-as-you-go

**Recommended:** **ScraperAPI** (best value, handles captchas)

**C) Target Sites to Scrape:**
```
Hotels:
- Booking.com
- Expedia.com
- Hotels.com
- Direct competitor websites

Campsites:
- Pitchup.com
- Campsite.co.uk
- HipCamp.com
- Direct competitor websites
```

**Sample Implementation:**

```python
# backend/scraping/competitor_scraper.py
import requests
from bs4 import BeautifulSoup
import os

SCRAPER_API_KEY = os.environ.get("SCRAPER_API_KEY")

def scrape_competitor_price(competitor_url: str, check_in_date: str, nights: int):
    """
    Scrape competitor pricing using ScraperAPI proxy
    """
    # ScraperAPI handles proxies, captchas, browser rendering
    scraper_url = f"http://api.scraperapi.com"

    params = {
        'api_key': SCRAPER_API_KEY,
        'url': competitor_url,
        'render': 'true'  # For JS-heavy sites like Booking.com
    }

    response = requests.get(scraper_url, params=params)
    soup = BeautifulSoup(response.content, 'html.parser')

    # Extract price (varies by site - need custom selectors per site)
    price_element = soup.select_one('.price-element-class')  # Update selector
    price = float(price_element.text.strip().replace('€', '').replace(',', ''))

    return {
        'competitor': 'Competitor Name',
        'url': competitor_url,
        'price': price,
        'date_checked': check_in_date,
        'nights': nights
    }

# Schedule this to run daily via cron/celery
def scrape_all_competitors():
    competitors = [
        {'name': 'Competitor A', 'url': 'https://...'},
        {'name': 'Competitor B', 'url': 'https://...'},
    ]

    results = []
    for comp in competitors:
        try:
            price_data = scrape_competitor_price(comp['url'], ...)
            results.append(price_data)
        except Exception as e:
            print(f"Failed to scrape {comp['name']}: {e}")

    return results
```

**Legal Note:** Web scraping for competitive intelligence is generally legal if:
- ✅ You're scraping publicly available data
- ✅ You're not overwhelming their servers (rate limiting)
- ✅ You respect robots.txt
- ❌ Don't scrape personal data or copyrighted content

**Cost Breakdown:**
- ScraperAPI: $49/month (100K requests)
- Alternative: BrightData $99/month (more reliable for large scale)

**Sign Up:**
- ScraperAPI: https://www.scraperapi.com/
- Oxylabs: https://oxylabs.io/

---

## 📅 **4. HOLIDAY & EVENTS API** 🔶 MEDIUM PRIORITY

### **Purpose**
- Identify public holidays for demand forecasting
- Detect school breaks (high occupancy periods)
- Track local events (festivals, conferences, sports)
- Enrich historical data with holiday indicators

### **Where It's Used**
- `/data` → Enrichment step (add `is_holiday`, `is_school_break` columns)
- `/pricing-engine` → Factor holidays into demand forecasting
- `/insights` → Holiday impact analysis

### **Recommended Provider: Calendarific**

**Why Calendarific?**
- ✅ 230+ countries covered
- ✅ Public holidays, observances, seasons
- ✅ Historical data available
- ✅ Free tier: 1,000 requests/month
- ✅ Simple REST API

**Pricing:**
- **Free Tier:** 1,000 requests/month
- **Basic:** $15/month, 10K requests
- **Plus:** $30/month, 100K requests

**API Endpoints:**

```javascript
// Get holidays for a specific country & year
GET https://calendarific.com/api/v2/holidays
Parameters:
  - api_key: YOUR_API_KEY
  - country: FR (France) / GB (UK) / DE (Germany) / etc.
  - year: 2024
  - type: national,local,religious

Response Example:
{
  "response": {
    "holidays": [
      {
        "name": "New Year's Day",
        "date": {"iso": "2024-01-01"},
        "type": ["National holiday"],
        "locations": "All",
        "states": "All"
      },
      {
        "name": "Easter Monday",
        "date": {"iso": "2024-04-01"},
        "type": ["National holiday"]
      }
    ]
  }
}
```

**Integration Example:**

```typescript
// frontend/src/lib/api/services/holidays.ts
export async function getHolidays(country: string, year: number) {
  const response = await fetch(
    `https://calendarific.com/api/v2/holidays?api_key=${API_KEY}&country=${country}&year=${year}`
  );
  const data = await response.json();
  return data.response.holidays;
}

// Enrich booking data
export function enrichWithHolidays(bookingData: BookingRecord[], holidays: Holiday[]) {
  const holidayDates = new Set(holidays.map(h => h.date.iso));

  return bookingData.map(booking => ({
    ...booking,
    is_holiday: holidayDates.has(booking.date),
    is_weekend: isWeekend(booking.date),
  }));
}
```

**Alternative: AbstractAPI Holidays**
- Free tier: 1,000 requests/month
- https://www.abstractapi.com/holidays-api

**Sign Up:** https://calendarific.com/

---

## 🗺️ **5. GEOCODING API** 🔶 MEDIUM PRIORITY

### **Purpose**
- Convert business address to coordinates (lat/lon)
- Required for weather API calls
- Location-based competitor search
- Map visualizations (future feature)

### **Where It's Used**
- `/settings` → When user enters business address
- Backend → Store lat/lon for weather queries
- `/insights` → Geographic market analysis (future)

### **Recommended Provider: Mapbox Geocoding API**

**Why Mapbox?**
- ✅ 100,000 free requests/month (generous)
- ✅ Accurate worldwide coverage
- ✅ Fast and reliable
- ✅ Beautiful maps if you want visualizations later

**Pricing:**
- **Free Tier:** 100,000 requests/month
- **Pay-as-you-go:** $0.50 per 1,000 requests after free tier

**API Example:**

```javascript
// Convert address to coordinates
GET https://api.mapbox.com/geocoding/v5/mapbox.places/123%20Main%20St%2C%20Paris%2C%20France.json
Parameters:
  - access_token: YOUR_MAPBOX_TOKEN

Response:
{
  "features": [
    {
      "center": [2.3522, 48.8566],  // [longitude, latitude]
      "place_name": "123 Main St, 75001 Paris, France",
      "context": [
        {"text": "Paris"},
        {"text": "France"}
      ]
    }
  ]
}
```

**Integration:**

```typescript
// frontend/src/lib/api/services/geocoding.ts
export async function geocodeAddress(address: string) {
  const encoded = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.features && data.features.length > 0) {
    const [lon, lat] = data.features[0].center;
    return {
      latitude: lat,
      longitude: lon,
      formatted_address: data.features[0].place_name
    };
  }

  throw new Error('Address not found');
}
```

**Alternative: Google Maps Geocoding API**
- $5 per 1,000 requests (more expensive)
- $200 free credit per month
- https://developers.google.com/maps/documentation/geocoding

**Sign Up:** https://www.mapbox.com/

---

## 💱 **6. CURRENCY EXCHANGE API** 🟢 LOW PRIORITY

### **Purpose**
- Support multi-currency pricing
- Convert prices for international properties
- Display prices in user's preferred currency

### **Where It's Used**
- `/settings` → Currency selection
- All pages → Display prices in selected currency
- `/pricing-engine` → Convert competitor prices if needed

### **Recommended Provider: ExchangeRate-API**

**Why ExchangeRate-API?**
- ✅ **100% FREE** for basic usage
- ✅ 1,500 requests/month free
- ✅ Updates daily
- ✅ 161 currencies supported

**Pricing:**
- **Free Tier:** 1,500 requests/month
- **Basic:** $10/month, 100K requests (if you need more)

**API Example:**

```javascript
// Get latest exchange rates (EUR as base)
GET https://v6.exchangerate-api.com/v6/YOUR-API-KEY/latest/EUR

Response:
{
  "result": "success",
  "base_code": "EUR",
  "conversion_rates": {
    "USD": 1.09,
    "GBP": 0.86,
    "CHF": 0.97,
    "JPY": 163.45,
    "AUD": 1.66
  }
}
```

**Integration:**

```typescript
// frontend/src/lib/api/services/currency.ts
export async function getExchangeRates(baseCurrency: string = 'EUR') {
  const response = await fetch(
    `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`
  );
  const data = await response.json();
  return data.conversion_rates;
}

// Convert price
export function convertPrice(amount: number, from: string, to: string, rates: any) {
  if (from === to) return amount;

  // Convert to base currency first, then to target
  const inBase = from === 'EUR' ? amount : amount / rates[from];
  return to === 'EUR' ? inBase : inBase * rates[to];
}
```

**Alternative:** Free Forex API (https://www.freeforexapi.com/)

**Sign Up:** https://www.exchangerate-api.com/

---

## 🎯 **IMPLEMENTATION PRIORITY & ROADMAP**

### **Phase 1: Core Functionality (Week 1-2)** 🚀
**Goal:** Get basic pricing optimization working with real data

1. ✅ **Weather API** (OpenWeatherMap) - CRITICAL
   - Historical weather enrichment
   - Current weather for dashboard
   - 5-day forecast for pricing engine

2. ✅ **Geocoding API** (Mapbox) - Needed for weather
   - Convert business address to lat/lon
   - Store in settings

**Deliverable:** User can upload data, enrich with weather, see weather-based insights

---

### **Phase 2: Intelligence Layer (Week 3-4)** 🤖
**Goal:** Add AI assistance and competitive intelligence

3. ✅ **AI Assistant API** (Claude)
   - Chat interface working
   - Context-aware responses about user's data
   - Pricing recommendations

4. ✅ **Holiday API** (Calendarific)
   - Add holiday indicators to enrichment
   - Factor into demand forecasting

**Deliverable:** AI assistant can answer questions, holidays factored into pricing

---

### **Phase 3: Market Intelligence (Week 5-6)** 💰
**Goal:** Competitive pricing intelligence

5. ✅ **Competitor Pricing** (ScraperAPI + Custom)
   - Set up scraping infrastructure
   - Identify 3-5 key competitors
   - Daily price monitoring
   - Display in insights & pricing engine

**Deliverable:** Real-time competitor benchmarking

---

### **Phase 4: Polish (Week 7+)** ✨
**Goal:** Multi-currency and advanced features

6. ✅ **Currency API** (ExchangeRate-API)
   - Multi-currency display
   - Currency conversion in settings

**Deliverable:** Full international support

---

## 🔐 **API KEY MANAGEMENT** (IMPORTANT!)

### **Environment Variables Setup**

Create `.env` file in `frontend/` and `backend/`:

```bash
# frontend/.env
VITE_OPENWEATHER_API_KEY=your_key_here
VITE_ANTHROPIC_API_KEY=your_key_here
VITE_MAPBOX_TOKEN=your_token_here
VITE_CALENDARIFIC_API_KEY=your_key_here
VITE_EXCHANGE_RATE_API_KEY=your_key_here

# backend/.env
OPENWEATHER_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
SCRAPER_API_KEY=your_key_here
CALENDARIFIC_API_KEY=your_key_here
DATABASE_URL=postgresql://...
```

### **Security Best Practices:**

1. **Never commit API keys to Git**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use backend proxy for sensitive APIs**
   - Weather, Competitor scraping → Backend only
   - AI Assistant → Backend proxy (more secure)
   - Client-side only for non-sensitive (maps, currency)

3. **Rotate keys regularly** (every 90 days)

4. **Set up rate limiting** on your backend to prevent abuse

---

## 💰 **TOTAL COST BREAKDOWN**

### **Minimal Setup (Getting Started)**
| Service | Plan | Cost |
|---------|------|------|
| OpenWeatherMap | Free | $0 |
| Claude API | Pay-as-you-go | $10-20/mo |
| Mapbox | Free | $0 |
| Calendarific | Free | $0 |
| ExchangeRate-API | Free | $0 |
| **TOTAL MONTHLY** | | **$10-20/mo** |

### **Production Setup (Recommended)**
| Service | Plan | Cost |
|---------|------|------|
| OpenWeatherMap | Startup | $40/mo |
| Claude API | Pay-as-you-go | $30-50/mo |
| ScraperAPI | Basic | $49/mo |
| Mapbox | Free | $0 |
| Calendarific | Basic | $15/mo |
| ExchangeRate-API | Free | $0 |
| **TOTAL MONTHLY** | | **$134-154/mo** |

### **Enterprise Setup (Scale)**
| Service | Plan | Cost |
|---------|------|------|
| OpenWeatherMap | Developer | $120/mo |
| Claude API | Volume | $100-200/mo |
| BrightData | Starter | $500/mo |
| Mapbox | Pay-as-you-go | $10-50/mo |
| Calendarific | Plus | $30/mo |
| ExchangeRate-API | Basic | $10/mo |
| **TOTAL MONTHLY** | | **$770-910/mo** |

---

## 📝 **NEXT STEPS - ACTION PLAN**

### **Step 1: Sign Up for Free Tier APIs (Today)** ⚡
1. OpenWeatherMap → https://openweathermap.org/api
2. Mapbox → https://www.mapbox.com/
3. Calendarific → https://calendarific.com/
4. ExchangeRate-API → https://www.exchangerate-api.com/
5. Anthropic Claude → https://console.anthropic.com/

### **Step 2: Set Up Environment Variables (Day 1)**
1. Create `.env` files
2. Add API keys
3. Test each API with simple fetch calls

### **Step 3: Implement Weather Integration (Day 2-3)**
1. Create `backend/api/weather.py`
2. Create `frontend/src/lib/api/services/weather.ts`
3. Update enrichment flow in Data page
4. Test with real coordinates

### **Step 4: Implement AI Assistant (Day 4-5)**
1. Create `backend/api/assistant.py` (backend proxy recommended)
2. Update `frontend/src/pages/Assistant.tsx`
3. Replace mock responses with real Claude API calls
4. Add conversation history persistence

### **Step 5: Add Holiday Enrichment (Day 6)**
1. Fetch holidays for business location's country
2. Add to enrichment step
3. Display holiday indicators in data preview

### **Step 6: Set Up Competitor Scraping (Week 2)**
1. Sign up for ScraperAPI
2. Identify 3-5 competitor URLs
3. Build scraper script
4. Set up daily cron job
5. Store results in database
6. Display in Insights & Pricing Engine

---

## 📚 **HELPFUL RESOURCES**

### **API Documentation**
- OpenWeatherMap: https://openweathermap.org/api/one-call-3
- Claude API: https://docs.anthropic.com/en/api/getting-started
- Mapbox: https://docs.mapbox.com/api/search/geocoding/
- Calendarific: https://calendarific.com/api-documentation
- ScraperAPI: https://www.scraperapi.com/documentation/

### **Code Examples**
- Weather integration: https://github.com/search?q=openweathermap+react
- Claude chatbot: https://github.com/anthropics/anthropic-sdk-typescript
- Web scraping: https://github.com/topics/web-scraping

### **Tutorials**
- Building a weather app: https://www.youtube.com/results?search_query=openweathermap+api+tutorial
- Claude API quickstart: https://docs.anthropic.com/en/api/getting-started
- Web scraping best practices: https://www.scraperapi.com/blog/

---

## ❓ **FAQ**

**Q: Can I start with free tiers and upgrade later?**
A: Yes! All recommended APIs have free tiers. Start there, monitor usage, upgrade when needed.

**Q: Is web scraping legal for competitor prices?**
A: Generally yes for publicly available data, but respect rate limits and robots.txt. Some booking sites may block aggressive scraping. Use proxies and be respectful.

**Q: Should I put API keys in frontend or backend?**
A: **Backend for sensitive/expensive APIs** (Claude, Weather historical, Scraping). Frontend is OK for read-only public APIs (Mapbox, Currency).

**Q: How do I protect my API keys in production?**
A: Use environment variables, never commit to Git, rotate regularly, use backend proxies for sensitive calls, implement rate limiting.

**Q: What if I exceed free tier limits?**
A: Most APIs will just stop working or return errors. Upgrade to paid tier or implement caching to reduce API calls.

**Q: Can I cache API responses to save money?**
A: Yes! Cache weather forecasts for 1 hour, holidays for 1 year, exchange rates for 24 hours, competitor prices for 24 hours.

---

## 🎉 **YOU'RE READY!**

You now have a complete roadmap to connect your Jengu platform to real-world data sources. Start with Phase 1 (Weather + Geocoding), then progressively add intelligence layers.

**Estimated Timeline:**
- Phase 1 (Weather): 2-3 days
- Phase 2 (AI + Holidays): 3-4 days
- Phase 3 (Competitors): 5-7 days
- Phase 4 (Currency): 1-2 days

**Total:** ~2-3 weeks to full real-data integration

Good luck! 🚀

---

**Need Help?**
- Weather API issues? Check OpenWeatherMap community forum
- Claude API questions? Anthropic Discord: https://discord.gg/anthropic
- Scraping blocked? ScraperAPI support is responsive
- General integration? Create an issue in your GitHub repo
