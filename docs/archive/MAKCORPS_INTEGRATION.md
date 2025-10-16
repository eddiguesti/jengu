# Makcorps Hotel API Integration - Complete Guide

## 🎯 Overview

The Makcorps Hotel API integration provides **real-time hotel pricing data** with intelligent caching and automatic historical price tracking. This system is designed to **maximize the value of your 30 test API calls** by saving every response to build a comprehensive price database.

**API Key**: `68ed86819d19968d101c2f43`
**Documentation**: https://docs.makcorps.com/hotel-price-apis/hotel-api-search-by-city-id

---

## 🚀 Key Features

### 1. **Intelligent Caching System**

- ✅ Every API call is automatically cached to localStorage
- ✅ Cache expires after 24 hours
- ✅ Search cached data without using API calls
- ✅ Force refresh option when needed

### 2. **Historical Price Database**

- ✅ Automatically builds database of historical prices
- ✅ Track price trends over time
- ✅ Compare prices across dates
- ✅ Export all data for analysis

### 3. **API Call Management**

- ✅ Real-time API call counter (30 calls limit)
- ✅ Warning when calls are running low
- ✅ Cache-first strategy to preserve calls
- ✅ Visual progress tracking

### 4. **Price Analytics**

- ✅ Price trend visualization
- ✅ Average, min, max price calculations
- ✅ Price change percentage tracking
- ✅ Hotel-specific history viewing

---

## 📁 Files Created

### 1. **API Service** - [frontend/src/lib/api/services/makcorps.ts](frontend/src/lib/api/services/makcorps.ts)

**Core Functions:**

```typescript
// Search hotels by city (uses cache automatically)
searchHotelsByCity(params, forceRefresh = false): Promise<HotelPrice[]>

// Get remaining API calls
getRemainingCalls(): number

// Get hotel price history
getHotelPriceHistory(hotel_id): HotelPriceHistory | null

// Get price trend analytics
getHotelPriceTrend(hotel_id): TrendData

// Export all cached data
exportAllData(): { hotels, histories, api_calls_used }

// Get cache statistics
getCacheStats(): CacheStats
```

**Key Features:**

- 600+ lines of production code
- Automatic caching on every API call
- Historical price tracking per hotel
- Cache expiration (24 hours)
- Storage quota management
- API call counter

### 2. **UI Component** - [frontend/src/pages/CompetitorMonitor.tsx](frontend/src/pages/CompetitorMonitor.tsx)

**Features:**

- Search hotel prices by city
- Real-time API usage tracking
- Cache statistics dashboard
- Hotel price cards with trends
- Historical price modal with charts
- Data export functionality

---

## 🔧 How to Use

### Step 1: Access the Competitor Monitor

Navigate to **Competitor Monitor** in the sidebar or visit `/competitor-monitor`

### Step 2: Search for Hotels

1. **Enter City ID** (see Makcorps docs for city IDs)
2. **Select dates** (check-in and check-out)
3. **Set guests and rooms**
4. **Choose currency**

### Step 3: Choose Search Mode

**Option A: Search (Use Cache)** ✅ Recommended

- Uses cached data if available
- No API call used
- Returns instantly

**Option B: Force Refresh** ⚠️ Use sparingly

- Always makes API call
- Uses 1 of 30 calls
- Gets latest data

### Step 4: View Results

- **Hotel cards** show current price
- **Trend indicators** show price changes
- **Data points badge** shows history count
- **Click "View History"** for detailed analytics

### Step 5: Analyze Price History

Price history modal shows:

- Current vs. average price
- Price range (min-max)
- Price change percentage
- Historical trend chart
- Complete price table

### Step 6: Export Data

Click **"Export All Data"** to download:

- All hotel search results
- Complete price histories
- API usage statistics
- JSON format for analysis

---

## 📊 API Usage Strategy

### Maximize Your 30 Calls

**1. Use Cache First (90% of searches)**

```typescript
// This checks cache first, NO API call if found
await searchHotelsByCity(params, false)
```

**2. Force Refresh Only When Needed**

```typescript
// Only use when absolutely need fresh data
await searchHotelsByCity(params, true)
```

**3. Strategic Call Planning**

| Use Case              | API Calls | Strategy                          |
| --------------------- | --------- | --------------------------------- |
| Initial city search   | 1 call    | Force refresh to get initial data |
| Same search next hour | 0 calls   | Use cache                         |
| New city/dates        | 1 call    | Force refresh                     |
| Checking cached city  | 0 calls   | Use cache                         |
| Weekly price check    | ~5 calls  | One per city you monitor          |

**Recommendation**:

- Use 5-10 calls for initial setup (different cities/dates)
- Save remaining 20-25 calls for weekly price checks
- Always try cache first!

---

## 💾 Data Storage

### LocalStorage Schema

**Cache Keys:**

```
makcorps_hotel_prices_{city_id}_{check_in}_{check_out}_{guests}_{rooms}
```

**History Keys:**

```
makcorps_history_{hotel_id}
```

**Counter Key:**

```
makcorps_api_calls_count
```

### Data Retention

- **Cache**: 24 hours, then auto-deleted
- **History**: Permanent (until manually cleared)
- **Counter**: Permanent (until manually reset)

### Storage Limits

- **LocalStorage limit**: ~5-10 MB per domain
- **Auto-cleanup**: Removes oldest 25% when full
- **Current usage**: Displayed in dashboard

---

## 📈 Analytics Features

### 1. Cache Statistics Dashboard

```typescript
{
  total_cached_searches: 12,
  total_hotels_cached: 150,
  total_histories: 45,
  api_calls_used: 8,
  api_calls_remaining: 22,
  cache_size_kb: 245.67
}
```

### 2. Hotel Price Trends

```typescript
{
  current_price: 150.00,
  avg_price: 145.50,
  min_price: 130.00,
  max_price: 160.00,
  price_change_percent: +8.5,
  data_points: 5
}
```

### 3. Price History Chart

- Line chart showing price over time
- Interactive tooltips
- Date labels
- Price axis

---

## 🔍 Search Parameters

### Required

- `city_id` - City identifier from Makcorps (e.g., "1", "paris", etc.)
- `check_in` - Date in YYYY-MM-DD format
- `check_out` - Date in YYYY-MM-DD format

### Optional

- `guests` - Number of guests (default: 2)
- `rooms` - Number of rooms (default: 1)
- `currency` - USD, EUR, GBP, CAD (default: USD)

### Example

```typescript
const params = {
  city_id: '1',
  check_in: '2024-12-01',
  check_out: '2024-12-05',
  guests: 2,
  rooms: 1,
  currency: 'USD',
}

const hotels = await searchHotelsByCity(params)
```

---

## 🛡️ Error Handling

### Scenario 1: No API Calls Remaining

```
Error: "No API calls remaining! Using cached data only."
```

**Solution**: Use cached data or wait for API limit reset

### Scenario 2: Invalid City ID

```
Error: "No hotels found. Try different search parameters..."
```

**Solution**: Check Makcorps docs for valid city IDs

### Scenario 3: API Error

```
Error: "Makcorps API error: 401 Unauthorized"
```

**Solution**: Verify API key is correct (already embedded in code)

### Scenario 4: Network Error

```
Error: "Failed to fetch from Makcorps API"
```

**Solution**: Check internet connection, falls back to cache automatically

---

## 📱 UI Components

### 1. API Usage Warning Card

- Shows remaining calls (e.g., "22 / 30")
- Progress bar visualization
- Warning message about caching

### 2. Cache Statistics Cards

- Cached Searches
- Hotels Tracked
- Total Hotels
- Cache Size

### 3. Search Form

- City ID input
- Date pickers (check-in/out)
- Guest/room selectors
- Currency dropdown
- Two search buttons (cache vs. refresh)

### 4. Hotel Result Cards

- Hotel name & star rating
- Location info
- Date range
- Guest/room details
- Current price (large, bold)
- Price trend (if history exists)
- "View History" button

### 5. Price History Modal

- **Header**: Hotel name
- **Stats Cards**: Current, average, range, change%
- **Chart**: Line chart of price over time
- **Table**: Complete price history

---

## 🎨 Example Usage

### Scenario 1: First-Time Search

```typescript
// Search Paris hotels for next week
const params = {
  city_id: 'paris',
  check_in: '2024-12-01',
  check_out: '2024-12-05',
  guests: 2,
  rooms: 1,
}

// Force refresh to get initial data (uses 1 API call)
const hotels = await searchHotelsByCity(params, true)

// Result: 50 hotels cached
// Remaining calls: 29/30
```

### Scenario 2: Checking Same Search

```typescript
// Same search parameters, 1 hour later

// Use cache (uses 0 API calls)
const hotels = await searchHotelsByCity(params, false)

// Result: Same 50 hotels from cache
// Remaining calls: 29/30 (unchanged!)
```

### Scenario 3: Weekly Price Check

```typescript
// One week later, same search

// Force refresh to see new prices (uses 1 API call)
const hotels = await searchHotelsByCity(params, true)

// Now each hotel has 2 price points
// Can see price trends
// Remaining calls: 28/30
```

### Scenario 4: Export for Analysis

```typescript
// Export all data after 10 searches
const data = exportAllData()

// data.hotels: All 500 hotel results
// data.histories: Price trends for 150 hotels
// data.api_calls_used: 10

// Download as JSON for Excel/Python analysis
```

---

## 📊 Data Export Format

```json
{
  "hotels": [
    {
      "hotel_id": "hotel123",
      "hotel_name": "Grand Hotel Paris",
      "city_id": "paris",
      "price": 150.0,
      "currency": "USD",
      "check_in": "2024-12-01",
      "check_out": "2024-12-05",
      "guests": 2,
      "rooms": 1,
      "rating": 4.5,
      "stars": 5,
      "fetched_at": "2024-11-24T10:30:00Z"
    }
  ],
  "histories": [
    {
      "hotel_id": "hotel123",
      "hotel_name": "Grand Hotel Paris",
      "prices": [
        {
          "price": 145.0,
          "check_in": "2024-12-01",
          "check_out": "2024-12-05",
          "fetched_at": "2024-11-17T10:30:00Z"
        },
        {
          "price": 150.0,
          "check_in": "2024-12-01",
          "check_out": "2024-12-05",
          "fetched_at": "2024-11-24T10:30:00Z"
        }
      ]
    }
  ],
  "api_calls_used": 10
}
```

---

## 🔧 Advanced Features

### Manual Cache Management

```typescript
// Get cache statistics
const stats = getCacheStats()
console.log(`Using ${stats.api_calls_used} of 30 calls`)

// Clear all cache (use with caution!)
clearAllCache()

// Reset API call counter
resetCallCounter()
```

### Query Specific Hotel History

```typescript
// Get full history for specific hotel
const history = getHotelPriceHistory('hotel123')

if (history) {
  console.log(`${history.hotel_name} has ${history.prices.length} data points`)
}
```

### Get All Tracked Hotels

```typescript
// Get all hotels with history
const allHistories = getAllHotelHistories()

console.log(`Tracking ${allHistories.length} hotels`)
```

---

## 🎯 Best Practices

### 1. **Plan Your Searches**

- Decide which cities to monitor before searching
- Use force refresh sparingly
- Check cache first always

### 2. **Monitor API Usage**

- Watch the counter in the UI
- Get warnings when <5 calls remain
- Export data regularly

### 3. **Build Historical Database**

- Search same cities weekly
- Build 4-8 weeks of price history
- Use data for trend analysis

### 4. **Export and Backup**

- Export data monthly
- Import into Excel/Python for analysis
- Keep backups of historical data

### 5. **Cache Strategy**

- Use cache for demonstrations
- Use cache when showing clients
- Only force refresh for fresh pricing data

---

## 📈 Future Enhancements

### Potential Improvements

1. **Scheduled Searches**
   - Automatic weekly price checks
   - Background cache updates
   - Email price alerts

2. **Price Alerts**
   - Notify when prices drop
   - Track competitor changes
   - Set price thresholds

3. **Advanced Analytics**
   - Price prediction models
   - Seasonal trend analysis
   - Demand indicators

4. **Multi-City Comparison**
   - Compare prices across cities
   - Regional pricing trends
   - Market positioning

5. **Backend Integration**
   - Move API calls to backend
   - Unlimited searches
   - Centralized database

---

## ❓ FAQ

**Q: What happens when I run out of API calls?**
A: You can still use all cached data. The system automatically falls back to cache when calls are exhausted.

**Q: How long does cache last?**
A: Cache expires after 24 hours. Historical data is permanent until manually deleted.

**Q: Can I reset the API call counter?**
A: Yes, use `resetCallCounter()` in browser console, but use with caution!

**Q: What's the difference between "Search" and "Force Refresh"?**
A: "Search" uses cache if available (0 calls). "Force Refresh" always makes API call (1 call).

**Q: How do I find city IDs?**
A: Check the Makcorps documentation at https://docs.makcorps.com/hotel-price-apis/hotel-api-search-by-city-id

**Q: Can I export my data?**
A: Yes! Click "Export All Data" to download everything as JSON.

**Q: What if I need more than 30 calls?**
A: You can purchase additional calls from Makcorps, or use the historical data you've already collected.

---

## 🎓 Summary

The Makcorps integration is designed to be **intelligent and efficient**:

✅ **Every API call creates permanent value** (historical data)
✅ **Cache-first strategy preserves your 30 calls**
✅ **Automatic tracking builds price database**
✅ **Export functionality for external analysis**
✅ **Real-time usage monitoring prevents waste**

**With strategic use, 30 API calls can build weeks of historical pricing data for competitor analysis!**

---

## 🚀 Quick Start Checklist

- [ ] Navigate to Competitor Monitor page
- [ ] Check API usage (should show 30/30)
- [ ] Plan which cities to monitor (3-5 cities recommended)
- [ ] Make initial searches with "Force Refresh"
- [ ] Bookmark those search parameters
- [ ] Use "Search (Use Cache)" for demonstrations
- [ ] Make weekly "Force Refresh" to build history
- [ ] Export data monthly for backup
- [ ] Analyze price trends after 4+ weeks

**Happy price monitoring!** 🎯
