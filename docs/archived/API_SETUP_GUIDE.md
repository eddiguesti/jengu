# API Setup Guide - Competitor Intelligence

Complete step-by-step guide to obtain API keys for the Competitor Intelligence module.

---

## 🎯 Overview

The Competitor Intelligence module uses two types of APIs:

1. **Makcorps API** - Historical hotel pricing data (10+ years of competitor prices)
2. **Airbtics API** (or AirDNA) - Airbnb market data (ADR, occupancy, revenue)

**Important**: The app works in **mock mode** without API keys. Only get real API keys when you're ready for production deployment.

---

## 1️⃣ Makcorps Historical Hotel Prices API

### What It Provides
- Historical daily prices for hotels worldwide (10+ years back)
- Live competitor pricing (current availability)
- Hotel search by location (radius search)
- Hotel details (stars, amenities, rooms)

### Pricing
- **Free Tier**: Limited (usually 100 requests/month)
- **Pay-as-you-go**: ~$0.01-0.05 per request
- **Monthly Plans**: $50-200/month depending on volume

### Step-by-Step Setup

#### Step 1: Visit Makcorps Website
```
URL: https://www.makcorps.com/historical-hotel-price.html
```

#### Step 2: Sign Up for an Account
1. Click **"Get Started"** or **"Sign Up"** button
2. Fill in your details:
   - Email address
   - Company name (can be individual)
   - Use case: "Competitive pricing analysis for hospitality"
3. Choose a plan:
   - **Start with Free Tier** to test
   - Upgrade later if needed

#### Step 3: Email Verification
1. Check your email inbox
2. Click the verification link
3. Log in to your account

#### Step 4: Get Your API Key
1. Go to **Dashboard** or **API Keys** section
2. Click **"Generate API Key"** or **"Create New Key"**
3. Copy your API key (format: `mk_live_xxxxxxxxxxxxx`)
4. **IMPORTANT**: Save it securely - it won't be shown again

#### Step 5: Test Your API Key (Optional)
```bash
# Test with curl (Windows PowerShell)
curl -H "Authorization: Bearer mk_live_xxxxxxxxxxxxx" `
  "https://api.makcorps.com/hotels/v1/search?lat=43.4204&lon=6.7713&radius_km=10"
```

#### Step 6: Add to Your App
1. Open `.env` file in project root (create if doesn't exist)
2. Add your key:
   ```bash
   MAKCORPS_API_KEY=mk_live_xxxxxxxxxxxxx
   ```
3. Save the file
4. Restart your app

### Troubleshooting Makcorps

**"API key not found"**
- Check you copied the entire key (starts with `mk_`)
- Make sure there are no spaces before/after the key in `.env`

**"Rate limit exceeded"**
- You've hit your monthly limit
- Upgrade your plan or wait for reset (usually 1st of month)

**"Invalid credentials"**
- Your API key may have been revoked
- Generate a new key from dashboard

---

## 2️⃣ Airbtics API (Airbnb Market Data)

### What It Provides
- Regional Airbnb market metrics (ADR, occupancy)
- Revenue estimates by market
- Listing availability data
- Market trends and seasonality

### Pricing
- **Free Trial**: Usually 7-14 days
- **Basic Plan**: $50-100/month
- **Pro Plan**: $150-300/month (more markets, historical data)

### Step-by-Step Setup

#### Step 1: Visit Airbtics Website
```
URL: https://airbtics.com/
```

#### Step 2: Sign Up
1. Click **"Get Started"** or **"Pricing"**
2. Choose a plan:
   - **Start with Free Trial** (no credit card required)
   - Select markets you need (e.g., France, Europe)
3. Create account:
   - Email
   - Password
   - Company/Property name

#### Step 3: Access Dashboard
1. Log in to your account
2. Navigate to **API Access** or **Integrations**
3. Click **"Generate API Key"**

#### Step 4: Get Your API Key
1. Copy your API key (format: `airbtics_xxxxxxxxxxxxx`)
2. Save it securely
3. Note any additional parameters (if required):
   - Region codes
   - Market IDs

#### Step 5: Test Your API Key (Optional)
```bash
# Test with curl
curl -H "Authorization: Bearer airbtics_xxxxxxxxxxxxx" `
  "https://api.airbtics.com/v1/markets?city=Paris&country=FR"
```

#### Step 6: Add to Your App
1. Open `.env` file
2. Add your key:
   ```bash
   AIRBTICS_API_KEY=airbtics_xxxxxxxxxxxxx
   ```
3. Save and restart app

### Troubleshooting Airbtics

**"Subscription required"**
- Your trial has ended
- Subscribe to a paid plan

**"Market not available"**
- Your plan doesn't include that market region
- Upgrade plan or choose different markets

**"No data for date range"**
- Historical data may be limited on Basic plan
- Upgrade to Pro for more historical data

---

## 3️⃣ Alternative: AirDNA API

If Airbtics is too expensive or unavailable, use AirDNA as a fallback.

### What It Provides
- Similar to Airbtics (Airbnb market data)
- More established (longer track record)
- More markets covered

### Pricing
- **Basic**: $100-150/month
- **Professional**: $200-400/month
- **Enterprise**: Custom pricing

### Step-by-Step Setup

#### Step 1: Visit AirDNA Website
```
URL: https://www.airdna.co/
```

#### Step 2: Request Access
1. Click **"Get Started"** or **"API Access"**
2. Fill out form:
   - Name, email, company
   - Use case: "Competitive analysis for hospitality pricing"
3. **Note**: AirDNA usually requires sales call for API access

#### Step 3: Sales Call
1. Schedule a demo/sales call
2. Discuss your needs:
   - Markets needed
   - Data frequency
   - Budget
3. They'll provide a quote

#### Step 4: Get API Credentials
1. After signup, access your dashboard
2. Go to **API Settings**
3. Copy your API key

#### Step 5: Add to Your App
```bash
AIRDNA_API_KEY=airdna_xxxxxxxxxxxxx
```

### Automatic Fallback
The app automatically uses AirDNA if Airbtics key is not found:
```
Priority: Airbtics → AirDNA → Mock Mode
```

---

## 🔧 Complete .env File Setup

Once you have your API keys, your `.env` file should look like this:

```bash
# Competitor Intelligence APIs

# Makcorps Historical Hotel Prices
MAKCORPS_API_KEY=mk_live_xxxxxxxxxxxxx

# Airbtics API (Airbnb Market Data)
AIRBTICS_API_KEY=airbtics_xxxxxxxxxxxxx

# AirDNA API (Alternative to Airbtics)
# AIRDNA_API_KEY=airdna_xxxxxxxxxxxxx

# Leave commented if you only have Airbtics
```

### Create .env File (If Doesn't Exist)

**Windows:**
1. Open project folder: `C:\Users\eddgu\travel-pricing`
2. Right-click → New → Text Document
3. Name it `.env` (delete the .txt extension)
4. Open with Notepad
5. Paste your API keys
6. Save

**Important**: Add `.env` to `.gitignore` to keep keys private!

---

## 🧪 Test Your API Keys

### Option 1: Use the App (Easiest)
1. Add API keys to `.env` file
2. Restart Streamlit app
3. Navigate to **Competitors** page
4. Click **"Discover Hotel Competitors"**
5. If it finds real hotels (not "mock_hotel_1"), your API works! ✅

### Option 2: Use Test Script
Create a test script:

```python
# test_apis.py
import os
import asyncio
from core.connectors.makcorps import MakcorpsConnector
from core.connectors.airbtics import AirbticsConnector

async def test_apis():
    print("Testing Makcorps API...")
    makcorps = MakcorpsConnector()
    try:
        hotels = await makcorps.search_hotels(
            lat=43.4204,
            lon=6.7713,
            radius_km=10
        )
        print(f"✓ Makcorps working! Found {len(hotels)} hotels")
        print(f"  Provider: {'Real API' if not makcorps.mock_mode else 'Mock Mode'}")
    except Exception as e:
        print(f"✗ Makcorps failed: {e}")

    print("\nTesting Airbtics/AirDNA API...")
    airbtics = AirbticsConnector()
    try:
        markets = await airbtics.search_markets(
            city="Paris",
            country="FR"
        )
        print(f"✓ Airbtics working! Found {len(markets)} markets")
        print(f"  Provider: {airbtics.provider}")
    except Exception as e:
        print(f"✗ Airbtics failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_apis())
```

Run it:
```bash
cd C:\Users\eddgu\travel-pricing
.venv\Scripts\python test_apis.py
```

Expected output:
```
Testing Makcorps API...
✓ Makcorps working! Found 12 hotels
  Provider: Real API

Testing Airbtics/AirDNA API...
✓ Airbtics working! Found 3 markets
  Provider: airbtics
```

---

## 💰 Cost Estimation

For a typical small hotel/campground:

### Mock Mode (FREE)
- Perfect for testing and development
- Realistic synthetic data
- No limitations

### Minimal Setup ($50-100/month)
- **Makcorps Free Tier**: $0 (limited requests)
- **Airbtics Basic**: $50-70/month
- **Total**: ~$50-70/month

### Recommended Setup ($100-150/month)
- **Makcorps Pay-as-you-go**: ~$20-50/month (depends on usage)
- **Airbtics Pro**: $100-150/month
- **Total**: ~$120-200/month

### Professional Setup ($200-400/month)
- **Makcorps Monthly Plan**: $100-150/month
- **AirDNA Professional**: $200-300/month
- **Total**: ~$300-450/month

### Cost-Saving Tips
1. **Start with Mock Mode** - Test everything first
2. **Use Free Tiers** - Makcorps free tier for initial tests
3. **Schedule Wisely** - Run daily snapshots (not hourly)
4. **Filter Competitors** - Only fetch top 5-10 most similar
5. **Cache Data** - Don't re-fetch historical data frequently

---

## 🔐 Security Best Practices

### Protecting Your API Keys

1. **Never commit .env to Git**
   ```bash
   # Check .gitignore includes:
   .env
   .env.local
   *.env
   ```

2. **Use Environment Variables (Production)**
   ```bash
   # On server, set environment variables instead of .env file
   export MAKCORPS_API_KEY="mk_live_xxxxx"
   export AIRBTICS_API_KEY="airbtics_xxxxx"
   ```

3. **Rotate Keys Regularly**
   - Generate new keys every 3-6 months
   - Revoke old keys after rotating

4. **Limit Key Permissions**
   - Use read-only keys if available
   - Restrict IP addresses (if API supports it)

---

## 📞 Support Contacts

### Makcorps Support
- **Website**: https://www.makcorps.com/contact
- **Email**: support@makcorps.com
- **Documentation**: https://docs.makcorps.com/

### Airbtics Support
- **Website**: https://airbtics.com/contact
- **Email**: support@airbtics.com
- **Documentation**: https://docs.airbtics.com/

### AirDNA Support
- **Website**: https://www.airdna.co/contact
- **Email**: support@airdna.co
- **Phone**: +1 (720) 372-2318

---

## ❓ FAQ

### Q: Do I need both Makcorps AND Airbtics?
**A**: No, but recommended:
- **Makcorps** = Hotel competitors only
- **Airbtics/AirDNA** = Airbnb market data only
- You can use just Makcorps if you don't care about Airbnb market

### Q: Can I test without API keys?
**A**: Yes! The app runs in **mock mode** with realistic synthetic data. Perfect for development.

### Q: How do I know if I'm in mock mode?
**A**: Check the logs or look for "mock" in the data. Mock hotels are named "mock_hotel_1", "mock_hotel_2", etc.

### Q: What if API keys stop working?
**A**: The app gracefully falls back to mock mode and logs a warning. Your app won't crash.

### Q: Can I use different APIs?
**A**: Yes! The connector architecture supports custom APIs. Extend `MakcorpsConnector` or `AirbticsConnector` classes.

### Q: How much data will I use?
**A**: Depends on:
- Number of competitors (5-20 typical)
- Date range (90 days typical)
- Update frequency (daily recommended)
- Estimated: ~500-1000 API calls/month

### Q: Are there free alternatives?
**A**: Limited options:
- **Booking.com scraping** (against ToS)
- **Public datasets** (outdated)
- **Mock mode** (best free option for testing)

---

## 🚀 Quick Start Checklist

- [ ] Decide if you need real API keys or mock mode is sufficient
- [ ] If real APIs:
  - [ ] Sign up for Makcorps (free tier first)
  - [ ] Sign up for Airbtics (free trial first)
  - [ ] Get API keys from both dashboards
- [ ] Create `.env` file in project root
- [ ] Add API keys to `.env`
- [ ] Add `.env` to `.gitignore`
- [ ] Restart Streamlit app
- [ ] Test in Competitors page
- [ ] Verify real data is coming through (no "mock_" prefixes)
- [ ] Schedule daily snapshots with `snapshot_competition.py`
- [ ] Monitor API usage and costs

---

## 📝 Summary

**Easiest Path (FREE)**:
```
Use Mock Mode → No API keys needed → Test everything → Add real APIs later
```

**Production Path**:
```
1. Sign up for Makcorps (free tier)
2. Sign up for Airbtics (free trial)
3. Get API keys
4. Add to .env file
5. Test with small date range
6. Monitor costs
7. Upgrade plans as needed
```

**Need Help?**
- Check logs in app for error messages
- Review [COMPETITOR_INTELLIGENCE.md](COMPETITOR_INTELLIGENCE.md) for troubleshooting
- Test APIs with `test_apis.py` script

---

Good luck! Start with **mock mode** to understand the system, then add real APIs when ready for production. 🚀
