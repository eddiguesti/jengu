# 🚀 Quick Start - Intelligent Pricing System

## ⚡ 3-Minute Setup

### Step 1: Install New Dependencies (30 seconds)

```bash
.venv\Scripts\python -m pip install scipy scikit-learn pyarrow openpyxl
```

### Step 2: Run Setup Wizard (1 minute)

```bash
.venv\Scripts\streamlit run apps\ui\pages\01_Setup.py
```

**Fill in**:
- Business name: "Your Hotel Name"
- Business type: Hotel / Campsite / Resort / etc.
- Country: Select from dropdown
- City: "Your City"

**Click "Detect Location"** - System will:
- ✓ Find lat/lon coordinates
- ✓ Detect timezone
- ✓ Save to `data/config/business_profile.json`

### Step 3: Upload & Enrich Data (1 minute)

Navigate to **Data Enrichment** page:

1. Upload CSV/Excel with columns:
   - `booking_date` or `checkin_date` (required)
   - `final_price` (optional)
   - `bookings` or `quantity` (optional)

2. Map columns in dropdown

3. Click **"Start Enrichment"**

System will:
- ✓ Fetch weather for your location
- ✓ Add holidays for your country
- ✓ Add 20+ temporal features
- ✓ Save to `data/enriched/bookings_enriched.parquet`

### Step 4: Analyze Correlations (30 seconds)

Navigate to **Correlation Insights** page:

1. Select target: `bookings` or `revenue`
2. Click **"Analyze Correlations"**
3. View results:
   - Top 10 demand drivers
   - Correlation heatmap
   - Lag analysis
4. Click **"Generate Pricing Weights"**

✅ **Done!** You now have data-driven pricing recommendations.

---

## 📊 What You'll See

### Enrichment Summary
```
✓ Enriched 1,826 days (5 years)
✓ Weather coverage: 99.1%
✓ Holidays detected: 87
✓ Features added: 27
```

### Top Demand Drivers
```
1. weather_quality: 36.2%
2. is_holiday: 28.1%
3. temp_mean: 25.6%
4. is_weekend: 15.3%
5. season: 12.8%
```

### Pricing Weights
```
Weather: 35%  → Increase rates 12% on sunny days
Holiday: 28%  → Apply 25% holiday premiums
Season: 20%   → Create seasonal tiers
Weekend: 12%  → Add 10% weekend premium
```

---

## 🗂️ Files Created

```
data/
├── config/
│   └── business_profile.json         ← Your business info
├── cache/
│   ├── weather_*.parquet            ← Cached weather
│   ├── holidays_*.parquet           ← Cached holidays
│   └── geo_*.json                   ← Cached geocoding
├── enriched/
│   └── bookings_enriched.parquet    ← Enriched data
├── analysis/
│   ├── correlations_summary.parquet
│   └── feature_rankings.parquet
└── weights/
    └── feature_weights.json         ← Auto-generated weights
```

---

## 🎯 Use Weights in Your Pricing Logic

```python
import json

# Load weights
with open('data/weights/feature_weights.json', 'r') as f:
    data = json.load(f)
    weights = data['weights']

# Apply to pricing
base_price = 200

if weather_quality > 80:
    price = base_price * (1 + weights['weather'] * 0.3)  # +10% on great weather

if is_holiday:
    price = base_price * (1 + weights['holiday'] * 0.8)  # +25% on holidays

if is_weekend:
    price = base_price * (1 + weights['temporal'] * 0.8)  # +10% on weekends
```

---

## 📖 Full Documentation

- **[INTELLIGENT_PRICING_GUIDE.md](INTELLIGENT_PRICING_GUIDE.md)** - Complete guide
- **[WHATS_NEW.md](WHATS_NEW.md)** - What was added
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture

---

## 🆘 Troubleshooting

### "geocoding failed"
- Check city name spelling
- Try entering lat/lon manually
- Check internet connection

### "weather API failed"
- Date range too large (>10 years)
- Check coordinates are valid
- Wait 60 seconds and retry (rate limit)

### "No correlations found"
- Need at least 30 rows of data
- Target column must be numeric
- Check for missing values

---

## ✅ Success Checklist

- [x] Setup wizard completed
- [x] Business profile saved
- [x] Data uploaded and enriched
- [x] Correlation analysis run
- [x] Pricing weights generated
- [x] Recommendations reviewed

**You're ready to implement data-driven pricing!** 🎉

---

**Questions?** See [INTELLIGENT_PRICING_GUIDE.md](INTELLIGENT_PRICING_GUIDE.md)
