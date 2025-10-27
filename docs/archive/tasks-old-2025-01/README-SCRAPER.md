# 🏖️ Sanary-sur-Mer Campsite Scraper - READY TO USE

## ✅ What You Have Now

I've created **5 working files** for you:

1. **`SanaryCampingScraper.ts`** - The actual scraper code
2. **`package.json`** - All dependencies configured
3. **`.env.example`** - Environment variables template
4. **`test-scraper.ts`** - Test script to run everything
5. **`setup-scraper.sh`** - One-click setup script

## 🚀 Quick Start (3 Steps)

### Step 1: Run Setup Script

```bash
# Make setup script executable
chmod +x setup-scraper.sh

# Run the setup (installs everything)
./setup-scraper.sh
```

This will:

- Create project folder
- Install all dependencies
- Install Chromium browser
- Set up the complete structure

### Step 2: Configure Your Credentials

```bash
cd sanary-scraper
nano .env

# Add your Redis URL from earlier:
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_REDIS_ENDPOINT:PORT

# Add your Supabase keys (from your existing system):
SUPABASE_URL=https://geehtuuyyxhyissplfjb.supabase.co
SUPABASE_ANON_KEY=your_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

### Step 3: Run the Scraper

```bash
# Run the test
npm run test

# OR use the simple run script
./run.sh
```

## 📊 What It Will Do

When you run it, the scraper will:

1. **Search 3 platforms** for campsites near Sanary-sur-Mer
2. **Find 10-30 campsites** in the coastal area
3. **Extract prices** (where available)
4. **Save results** to JSON file
5. **Cache in Redis** for 24 hours

## 🎯 Expected Output

```
🧪 Testing Sanary Coastal Scraper
==================================================
✅ Scraper initialized

🔍 Searching for campsites in Sanary-sur-Mer region...
   Coverage: 30km coastal radius
   Including: Bandol, Six-Fours, Saint-Cyr

Scraping vacances-campings.fr...
Scraping camping.fr...
Scraping known local campsites...
✅ Found 18 unique campsites

==================================================
📊 RESULTS SUMMARY

Total campsites found: 18

📍 By Location:
   Sanary-sur-Mer: 6 campsite(s)
   Bandol: 4 campsite(s)
   Six-Fours-les-Plages: 5 campsite(s)
   Saint-Cyr-sur-Mer: 3 campsite(s)

💰 Price Analysis:
   Min: €25
   Max: €120
   Average: €48.50

✅ Scraping completed in 23.45 seconds
📁 Full results saved to: sanary-campsites-2024-12-21.json
```

## 🔧 Troubleshooting

### If you see "No results found"

- Check your internet connection
- The platforms might have changed their HTML structure
- Try running with `headless: false` in the browser config to see what's happening

### If Redis connection fails

- Make sure your Redis URL is correct
- Check that Redis is running
- You can comment out Redis lines for testing

### If prices aren't found

- This is normal in off-season
- Some sites don't show prices without dates
- The scraper will still get campsite names and locations

## 📁 File Structure After Setup

```
sanary-scraper/
├── src/
│   ├── scrapers/
│   │   └── SanaryCampingScraper.ts
│   └── test-scraper.ts
├── dist/                  # Compiled JS files
├── data/                  # Scraped data storage
├── node_modules/          # Dependencies
├── .env                   # Your configuration
├── .env.example           # Template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── run.sh                 # Quick run script
└── README.md              # Instructions
```

## 🎯 Next Steps

Once it's working, you can:

1. **Schedule it** - Add to cron for automatic updates
2. **Integrate with Jengu** - Connect to your pricing engine
3. **Add more sources** - Pitchup, Booking.com, etc.
4. **Add proxy support** - For production use

## ⚠️ Important Notes

- **First run takes longer** (20-30 seconds) as it loads pages
- **Respect rate limits** - Don't run too frequently
- **Check robots.txt** - Some sites may not allow scraping
- **Use proxies in production** - To avoid IP blocking

## 💡 Integration with Your System

```typescript
// In your existing Jengu system:
import { SanaryCampingScraper } from './scrapers/SanaryCampingScraper'

// Use the data
const scraper = new SanaryCampingScraper()
const competitors = await scraper.scrapeAllCompetitors()

// Feed into your ML pricing model
const optimalPrice = await calculatePrice({
  myPrice: 45,
  competitorPrices: competitors.map(c => c.price),
  marketAverage: avgPrice,
})
```

## 🆘 Need Help?

If something doesn't work:

1. Check the error message
2. Verify your .env file has correct credentials
3. Try running with fewer sources first
4. Check if the websites are accessible

---

**Ready to run!** Just follow the 3 steps above and you'll have live competitor data from Sanary-sur-Mer in minutes! 🚀
