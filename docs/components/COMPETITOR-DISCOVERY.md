# Competitor Discovery System

**Date:** 2025-10-26
**Status:** ✅ Phase 1 Complete - Discovery UI & Scraper Live
**Data Source:** camping-and-co.com (France)

---

## Overview

The Competitor Discovery system allows users to find and monitor nearby campsites in France using **camping-and-co.com** as the data source. Users can search by location, view competitor details, and eventually track pricing trends over time.

---

## Architecture

### Backend Components

#### 1. **CampingAndCoScraper** (`backend/scrapers/CampingAndCoScraper.ts`)

Web scraper class that extracts campsite data from camping-and-co.com.

**Key Methods:**

```typescript
class CampingAndCoScraper {
  // Search for campsites near a location
  async searchByLocation(location: string, radiusKm: number = 50): Promise<CampsiteResult[]>

  // Get detailed information about a specific campsite
  async getCampsiteDetails(campsiteUrl: string): Promise<CampsiteResult>

  // Get pricing data for a campsite over a date range
  async getPricing(campsiteUrl: string, startDate: Date, endDate: Date, occupancy: number = 4): Promise<PricingData[]>
}
```

**Data Structures:**

```typescript
interface CampsiteResult {
  id: string                  // Extracted from URL
  name: string                // Campsite name
  url: string                 // Full URL to campsite page
  photoUrl: string            // Primary photo
  photos: string[]            // All photos (15+ high-res images)
  distance: number            // Distance in km
  distanceText: string        // Human-readable distance
  address: string             // Full address
  town: string                // City name
  region: string              // Region name
  coordinates: {
    latitude: number
    longitude: number
  }
  rating: number              // 0-5 star rating
  reviewCount: number         // Number of reviews
  amenities: string[]         // List of amenities
  description: string         // Full description
  pricePreview?: {
    amount: number            // Price in euros
    period: string            // e.g., "7 nuits"
  }
}

interface PricingData {
  date: string                // YYYY-MM-DD
  occupancy: number           // Number of people
  price: number               // Price in euros
  originalPrice?: number      // Original price (if discounted)
  availability: 'available' | 'limited' | 'unavailable'
}
```

#### 2. **API Endpoints** (`backend/routes/competitor.ts`)

**POST /api/competitor/discover**
- Search for campsites near a location
- Body: `{ location: string, radiusKm: number }`
- Returns: Array of `CampsiteResult`

**POST /api/competitor/details**
- Get detailed information about a specific campsite
- Body: `{ url: string }`
- Returns: `CampsiteResult` with full details

**POST /api/competitor/pricing**
- Get pricing data for a campsite over a date range
- Body: `{ url: string, startDate: string, endDate: string, occupancy: number }`
- Returns: Array of `PricingData`

---

### Frontend Components

#### **CompetitorMonitor Page** (`frontend/src/pages/CompetitorMonitor.tsx`)

Beautiful, modern UI for discovering and viewing competitor campsites.

**Features:**
- 📍 Location search with postal code support
- 📏 Adjustable search radius (5-50 km)
- 🏕️ Beautiful campsite cards with photos
- 📊 Distance, pricing, and rating display
- 🎨 Smooth animations with Framer Motion
- 🔗 Direct links to camping-and-co.com

**UI Components:**
- Search input with MapPin icon
- Radius slider (5-50 km)
- Grid of animated campsite cards
- Loading states with skeleton loaders
- Error handling with user-friendly messages

---

## camping-and-co.com URL Patterns

### Important: Postal Codes Required!

camping-and-co.com requires **5-digit French postal codes** in URLs for most locations.

**Working URL Format:**
```
https://fr.camping-and-co.com/location-camping-{city-slug}-{postal-code}
```

**Examples:**
- ✅ `/location-camping-sanary-sur-mer-83110` - **200 OK**
- ❌ `/location-camping-sanary-sur-mer` - **404 Not Found**

### City Slug Normalization

The scraper converts French city names to URL-friendly slugs:

```typescript
const locationSlug = cityName.toLowerCase()
  .replace(/[àâä]/g, 'a')
  .replace(/[éèêë]/g, 'e')
  .replace(/[îï]/g, 'i')
  .replace(/[ôö]/g, 'o')
  .replace(/[ùûü]/g, 'u')
  .replace(/[^a-z0-9]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
```

**Examples:**
- "Sanary-sur-Mer" → "sanary-sur-mer"
- "Sainte-Maxime" → "sainte-maxime"
- "Èze" → "eze"

### URL Fallback Strategy

The scraper tries multiple URL patterns in order of specificity:

1. `/location-camping-{slug}-{postal}` (if postal code provided)
2. `/location-mobil-home-{slug}-{postal}` (mobile home rentals)
3. `/location-camping-{slug}` (fallback without postal)
4. `/camping/{slug}` (alternative pattern)

---

## How to Use

### 1. **Search for Competitors**

Navigate to the Competitor Monitor page:
```
http://localhost:5173/competitor
```

Enter a French location **with postal code**:
```
Sanary-sur-Mer 83110
Paris 75001
Nice 06000
```

Adjust the search radius (5-50 km) and click **Discover**.

### 2. **View Results**

The system displays:
- **Photo** - Primary campsite image
- **Name** - Campsite name
- **Location** - Town and region
- **Distance** - Distance from search location
- **Price** - Price preview (if available)
- **Rating** - Star rating and review count
- **Amenities** - List of amenities

### 3. **Actions**

- **View Details** - Opens camping-and-co.com page in new tab
- **Start Monitoring** - (Coming soon) Save competitor to database for daily price tracking

---

## Technical Implementation

### Scraping Strategy

**Why Cheerio?**
- Lightweight HTML parsing
- jQuery-like syntax
- Works with server-side rendering
- No browser automation needed

**Data Extraction:**
1. Fetch HTML from camping-and-co.com
2. Parse with Cheerio
3. Extract campsite listings from HTML structure
4. Find embedded JSON data in `<script>` tags
5. Parse coordinates, photos, pricing from JavaScript objects

**Example Extraction:**
```typescript
const $ = cheerio.load(response.data)

// Find campsite listings
$('.campsite-card, .listing-item').each((index, element) => {
  const $listing = $(element)

  const name = $listing.find('h2, h3').first().text().trim()
  const url = $listing.find('a').first().attr('href')
  const photoUrl = $listing.find('img').first().attr('src')

  // Extract distance
  const distanceText = $listing.find('[class*="distance"]').text()
  const distanceMatch = distanceText.match(/([\\d,.]+)\\s*km/i)
  const distance = distanceMatch ? parseFloat(distanceMatch[1].replace(',', '.')) : 0

  campsites.push({
    id: extractCampsiteId(url),
    name,
    url: fullUrl,
    photoUrl: fullPhotoUrl,
    distance,
    // ... more fields
  })
})
```

### Postal Code Extraction

The scraper uses regex to extract French postal codes from user input:

```typescript
// Extract postal code if provided (e.g., "Sanary-sur-Mer 83110")
const postalMatch = location.match(/\b(\d{5})\b/)
const postalCode = postalMatch ? postalMatch[1] : ''
const cityName = location.replace(/\b\d{5}\b/, '').trim()
```

**Examples:**
- "Sanary-sur-Mer 83110" → `cityName: "Sanary-sur-Mer"`, `postalCode: "83110"`
- "Paris 75001" → `cityName: "Paris"`, `postalCode: "75001"`
- "Nice" → `cityName: "Nice"`, `postalCode: ""`

---

## UI Design

### Search Section

```typescript
<Card>
  <Card.Body>
    {/* Location Input */}
    <Input
      placeholder="e.g., Sanary-sur-Mer 83110, Paris 75001..."
      value={location}
      onChange={(e) => setLocation(e.target.value)}
    />

    {/* Helpful Hint */}
    <p className="mt-2 text-xs text-muted">
      💡 <strong>Include the 5-digit postal code</strong> for best results
    </p>

    {/* Radius Slider */}
    <input type="range" min="5" max="50" step="5" value={radiusKm} />

    <Button onClick={handleSearch}>Discover</Button>
  </Card.Body>
</Card>
```

### Campsite Card

Each campsite is displayed as a beautiful card with:

```typescript
<Card className="group overflow-hidden transition-all hover:shadow-lg">
  {/* Photo with hover zoom effect */}
  <div className="relative h-48 overflow-hidden">
    <img
      src={campsite.photoUrl}
      className="object-cover transition-transform group-hover:scale-105"
    />

    {/* Distance Badge */}
    <Badge className="absolute left-2 top-2">
      <MapPin className="mr-1 h-3 w-3" />
      {campsite.distance.toFixed(1)} km
    </Badge>

    {/* Favorite Button */}
    <button className="absolute right-2 top-2">
      <Heart className="h-4 w-4 text-white" />
    </button>
  </div>

  {/* Details */}
  <Card.Body>
    <h3>{campsite.name}</h3>
    <p>{campsite.town}, {campsite.region}</p>

    {/* Rating */}
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 fill-yellow-400" />
      <span>{campsite.rating.toFixed(1)}</span>
    </div>

    {/* Price Preview */}
    {campsite.pricePreview && (
      <span className="text-2xl font-bold text-success">
        €{campsite.pricePreview.amount}
      </span>
    )}

    {/* Amenities */}
    <div className="flex flex-wrap gap-1">
      {campsite.amenities.slice(0, 3).map(amenity => (
        <span className="rounded-full bg-elevated px-2 py-1 text-xs">
          {amenity}
        </span>
      ))}
    </div>
  </Card.Body>

  {/* Actions */}
  <Card.Footer>
    <Button onClick={() => window.open(campsite.url)}>
      View Details
    </Button>
    <Button variant="primary">
      Start Monitoring
    </Button>
  </Card.Footer>
</Card>
```

### Animations

Using Framer Motion for smooth entrance animations:

```typescript
import { motion, AnimatePresence } from 'framer-motion'

// Staggered card entrance
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05 }}
>
  <CampsiteCard campsite={campsite} />
</motion.div>
```

---

## Error Handling

### Missing Postal Code

If user searches without postal code, the scraper tries fallback URLs but may fail.

**User-Facing Error:**
```
Could not find results for location: Sanary-sur-Mer
```

**Solution:**
The UI now includes a prominent hint:
```
💡 Include the 5-digit postal code for best results (e.g., "Sanary-sur-Mer 83110")
```

### No Results Found

If camping-and-co.com has no campsites for a location, the UI shows:

```typescript
<Card className="p-12 text-center">
  <Tent className="mx-auto mb-4 h-16 w-16 text-muted" />
  <h2 className="mb-2 text-xl font-bold">No Competitors Found</h2>
  <p className="text-muted">
    Try searching in a different location or increasing the search radius
  </p>
</Card>
```

### Network Errors

All axios requests have 15-second timeouts. If camping-and-co.com is unreachable:

```typescript
try {
  const response = await axios.get(url, {
    timeout: 15000,
  })
} catch (error: any) {
  console.error('❌ Error scraping camping-and-co.com:', error.message)
  throw error
}
```

---

## Next Steps (Phase 2)

### 1. **Database Schema**

Create Supabase tables to store competitor data:

```sql
-- Competitors table
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  campsite_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  photo_url TEXT,
  address TEXT,
  town TEXT,
  region TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  rating DECIMAL(3, 2),
  review_count INTEGER,
  amenities TEXT[],
  description TEXT,
  is_monitoring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitor pricing history
CREATE TABLE competitor_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price DECIMAL(10, 2),
  occupancy INTEGER,
  availability TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_competitors_user_id ON competitors(user_id);
CREATE INDEX idx_competitors_monitoring ON competitors(user_id, is_monitoring);
CREATE INDEX idx_pricing_competitor_date ON competitor_pricing(competitor_id, date);
```

### 2. **"Start Monitoring" Functionality**

When user clicks "Start Monitoring":

1. Save competitor to `competitors` table
2. Set `is_monitoring = true`
3. Queue initial pricing scrape job
4. Show success message

```typescript
const handleStartMonitoring = async (campsite: Campsite) => {
  await apiClient.post('/competitor/monitor', {
    campsiteId: campsite.id,
    campsiteUrl: campsite.url,
  })

  toast.success(`Now monitoring ${campsite.name}!`)
}
```

### 3. **BullMQ Daily Price Scraping**

Create a recurring job to scrape prices for all monitored competitors:

```typescript
// backend/workers/competitorWorker.ts
import { Worker, Queue } from 'bullmq'
import { CampingAndCoScraper } from '../scrapers/CampingAndCoScraper.js'

const competitorQueue = new Queue('competitor-pricing', {
  connection: redisConnection,
})

// Schedule daily scraping (every day at 2 AM)
await competitorQueue.add(
  'daily-price-scrape',
  {},
  {
    repeat: {
      pattern: '0 2 * * *', // Cron: 2 AM daily
    },
  }
)

const competitorWorker = new Worker(
  'competitor-pricing',
  async (job) => {
    // Get all monitored competitors
    const { data: competitors } = await supabase
      .from('competitors')
      .select('*')
      .eq('is_monitoring', true)

    const scraper = new CampingAndCoScraper()

    for (const competitor of competitors) {
      // Scrape pricing for next 30 days
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      const pricing = await scraper.getPricing(
        competitor.url,
        startDate,
        endDate,
        4 // Default occupancy
      )

      // Save to database
      for (const pricePoint of pricing) {
        await supabase.from('competitor_pricing').insert({
          competitor_id: competitor.id,
          date: pricePoint.date,
          price: pricePoint.price,
          occupancy: pricePoint.occupancy,
          availability: pricePoint.availability,
        })
      }
    }
  },
  { connection: redisConnection }
)
```

### 4. **Competitor Pricing Dashboard**

Build a dashboard to visualize competitor pricing trends:

```typescript
// frontend/src/pages/CompetitorAnalytics.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts'

export const CompetitorAnalytics = () => {
  const [competitors, setCompetitors] = useState([])
  const [pricingData, setPricingData] = useState([])

  // Fetch monitored competitors
  useEffect(() => {
    fetchCompetitors()
    fetchPricingHistory()
  }, [])

  return (
    <div>
      <h1>Competitor Price Trends</h1>

      {/* Price Comparison Chart */}
      <Card>
        <Card.Body>
          <LineChart data={pricingData} width={800} height={400}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />

            {competitors.map((competitor, index) => (
              <Line
                key={competitor.id}
                type="monotone"
                dataKey={competitor.name}
                stroke={colors[index]}
              />
            ))}
          </LineChart>
        </Card.Body>
      </Card>

      {/* Competitor Cards */}
      <div className="grid grid-cols-3 gap-4">
        {competitors.map(competitor => (
          <CompetitorCard key={competitor.id} competitor={competitor} />
        ))}
      </div>
    </div>
  )
}
```

---

## Testing

### Manual Testing

1. **Go to Competitor Monitor page:**
   ```
   http://localhost:5173/competitor
   ```

2. **Search for Sanary-sur-Mer with postal code:**
   ```
   Sanary-sur-Mer 83110
   ```

3. **Adjust radius to 15 km**

4. **Click "Discover"**

5. **Verify:**
   - ✅ Campsites load successfully
   - ✅ Photos display correctly
   - ✅ Distance badge shows km
   - ✅ Price preview appears (if available)
   - ✅ "View Details" opens camping-and-co.com
   - ✅ Cards have smooth hover effects
   - ✅ Entrance animations play

### API Testing with cURL

**Discover Campsites:**
```bash
curl -X POST http://localhost:3001/api/competitor/discover \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Sanary-sur-Mer 83110",
    "radiusKm": 15
  }'
```

**Get Campsite Details:**
```bash
curl -X POST http://localhost:3001/api/competitor/details \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://fr.camping-and-co.com/camping-les-playes"
  }'
```

**Get Pricing:**
```bash
curl -X POST http://localhost:3001/api/competitor/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://fr.camping-and-co.com/camping-les-playes",
    "startDate": "2025-06-01",
    "endDate": "2025-08-31",
    "occupancy": 4
  }'
```

---

## Performance Considerations

### Rate Limiting

camping-and-co.com may rate-limit requests. To avoid being blocked:

1. **Add delays between requests:**
   ```typescript
   const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

   for (const competitor of competitors) {
     await scraper.getPricing(competitor.url, startDate, endDate)
     await delay(2000) // 2-second delay
   }
   ```

2. **Use realistic User-Agent headers:**
   ```typescript
   headers: {
     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
     'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
   }
   ```

3. **Respect robots.txt:**
   ```
   https://fr.camping-and-co.com/robots.txt
   ```

### Caching

Cache scraped data to reduce load on camping-and-co.com:

```typescript
// Cache competitor details for 24 hours
const cacheKey = `competitor:${campsiteId}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

const details = await scraper.getCampsiteDetails(url)
await redis.setex(cacheKey, 86400, JSON.stringify(details)) // 24h TTL
```

---

## Legal & Ethical Considerations

### Terms of Service

Before deploying to production:

1. **Review camping-and-co.com Terms of Service**
2. **Check robots.txt for scraping restrictions**
3. **Consider reaching out for API access** (if available)

### Data Attribution

Always attribute data to camping-and-co.com:

```typescript
<p className="text-xs text-muted">
  Data provided by{' '}
  <a href="https://fr.camping-and-co.com" target="_blank" rel="noopener noreferrer">
    camping-and-co.com
  </a>
</p>
```

### Privacy

- **Do not store personal data** from camping-and-co.com
- **Only scrape publicly available data**
- **Respect privacy policies**

---

## Summary

### What's Working (Phase 1 - Complete ✅)

- ✅ CampingAndCoScraper class with search, details, pricing methods
- ✅ API endpoints for competitor discovery
- ✅ Beautiful Competitor Monitor UI with search and cards
- ✅ Postal code extraction and URL normalization
- ✅ Framer Motion animations
- ✅ Error handling and user feedback
- ✅ Direct links to camping-and-co.com

### Next Phase (Phase 2 - TODO 🔜)

- 🔜 Create Supabase tables for competitor data
- 🔜 Implement "Start Monitoring" functionality
- 🔜 Build BullMQ daily price scraping job
- 🔜 Create Competitor Analytics dashboard with pricing trends
- 🔜 Add price alerts (email/push notifications when competitor prices change)
- 🔜 Build comparison charts (your prices vs competitors)

### Files Modified

**Backend:**
- ✅ `backend/scrapers/CampingAndCoScraper.ts` (NEW)
- ✅ `backend/routes/competitor.ts` (MODIFIED - added /discover, /details, /pricing)
- ✅ `backend/package.json` (MODIFIED - added cheerio dependency)

**Frontend:**
- ✅ `frontend/src/pages/CompetitorMonitor.tsx` (COMPLETELY REWRITTEN)

**Documentation:**
- ✅ `docs/components/COMPETITOR-DISCOVERY.md` (NEW - this file)

---

**Your competitor discovery system is now live and ready to use!** 🎉🏕️
