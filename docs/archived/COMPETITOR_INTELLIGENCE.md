# Competitor Intelligence Module

Complete documentation for the JENGU Dynamic Pricing App's Competitor Intelligence system.

## Overview

The Competitor Intelligence module automatically discovers, tracks, and analyzes competitive pricing dynamics from:
- **Hotel competitors** (via Makcorps Historical Hotel Prices API)
- **Airbnb market data** (via Airbtics or AirDNA APIs)

It computes similarity scores, fetches historical and live pricing data, and integrates competitive metrics into the existing correlation engine and dynamic pricing algorithms.

---

## Architecture

### Data Flow

```
1. Discovery
   ├── Makcorps API → Discover hotel competitors
   └── Airbtics API → Discover Airbnb markets

2. Similarity Scoring
   └── Mathematical algorithm → Rank competitors by relevance

3. Data Fetching
   ├── Historical prices (past 10+ years)
   └── Live prices (daily snapshots)

4. Storage
   └── File-based repository (JSON + Parquet)

5. Analysis
   ├── Competitive gap (comp_gap_z)
   ├── Lag correlations
   └── Elasticity regression

6. Integration
   └── Correlation Engine → Feed into pricing algorithm
```

---

## Environment Variables

Add these to your `.env` file or environment:

```bash
# Makcorps Historical Hotel Prices API
MAKCORPS_API_KEY=your_makcorps_api_key_here

# Airbtics API (primary)
AIRBTICS_API_KEY=your_airbtics_api_key_here

# AirDNA API (fallback if Airbtics not available)
AIRDNA_API_KEY=your_airdna_api_key_here
```

**Mock Mode**: If no API keys are provided, the system automatically runs in mock mode with realistic synthetic data.

---

## Core Components

### 1. Data Models (`core/models/competitor.py`)

#### Competitor
Represents a competitor property or market:
```python
@dataclass
class Competitor:
    comp_id: str                  # Unique ID (e.g., "hotel_12345" or "airbnb_paris_center")
    comp_type: str                # "hotel" or "airbnb_market"
    name: str                     # Display name
    region: str
    city: str
    lat: float
    lon: float
    stars: Optional[int]          # Star rating (hotels only)
    rating: Optional[float]       # User rating
    amenities: List[str]          # List of amenities
    size: Optional[int]           # Number of rooms/units
    provider_ref: Dict[str, Any]  # API-specific IDs
```

#### CompetitorObservation
Daily price/occupancy data point:
```python
@dataclass
class CompetitorObservation:
    date: date
    comp_id: str
    price: float
    currency: str = "EUR"
    occupancy: Optional[float]    # 0.0 to 1.0
    source: str                   # "makcorps", "airbtics", "airdna"
    confidence: float = 1.0       # Data quality (0.0 to 1.0)
```

#### CompetitorSimilarity
Computed similarity between properties:
```python
@dataclass
class CompetitorSimilarity:
    base_property_id: str
    comp_id: str
    distance_km: float
    similarity_score: float       # 0.0 to 1.0
    rank: int                     # 1 = most similar
```

### 2. API Connectors

#### Makcorps Connector (`core/connectors/makcorps.py`)

```python
connector = MakcorpsConnector(mock_mode=False)

# Search for hotels near location
hotels = await connector.search_hotels(
    lat=43.4204,
    lon=6.7713,
    radius_km=10,
    min_stars=3,
    max_stars=5
)

# Get historical prices
prices = await connector.get_price_history(
    hotel_id="hotel_12345",
    start_date=date(2023, 1, 1),
    end_date=date(2024, 1, 1)
)

# Get live prices (current availability)
live = await connector.get_live_prices(
    hotel_ids=["hotel_1", "hotel_2"],
    check_in=date.today(),
    check_out=date.today() + timedelta(days=1)
)
```

#### Airbtics Connector (`core/connectors/airbtics.py`)

```python
connector = AirbticsConnector(mock_mode=False)

# Search for Airbnb markets
markets = await connector.search_markets(
    city="Paris",
    country="FR",
    lat=48.8566,
    lon=2.3522
)

# Get market metrics (ADR, occupancy, revenue)
metrics = await connector.get_market_data(
    market_id="market_paris_central",
    start_date=date(2023, 1, 1),
    end_date=date(2024, 1, 1)
)
```

### 3. Similarity Algorithm (`core/analysis/similarity.py`)

Mathematical formula:

```
S = α_loc * w_loc + α_star * w_star + α_amen * w_amen + α_size * w_size
```

**Sub-formulas:**

1. **Geographical distance** (Haversine):
   ```
   d_km = 6371 * acos(cos(lat1)*cos(lat2)*cos(lon2-lon1) + sin(lat1)*sin(lat2))
   w_loc = exp(-(d_km / σ_loc)^2),  σ_loc = 2 km
   ```

2. **Star similarity**:
   ```
   w_star = exp(-((Δstars) / σ_star)^2),  σ_star = 1
   ```

3. **Amenity overlap** (Jaccard index):
   ```
   w_amen = |A ∩ B| / |A ∪ B|
   ```

4. **Size similarity** (log scale):
   ```
   w_size = exp(-(|log(size_A) - log(size_B)| / σ_size)^2),  σ_size = 0.5
   ```

**Default weights**: α = [0.4, 0.3, 0.2, 0.1] (location, stars, amenities, size)

**Filters**:
- Similarity ≥ 0.6 (configurable)
- Distance ≤ 10 km (configurable)
- Hotels: Keep only within ±1 star category band
- Airbnb: Same city/region

**Usage:**

```python
from core.analysis.similarity import SimilarityScorer, PropertyAttributes

scorer = SimilarityScorer()

base = PropertyAttributes(lat=43.4204, lon=6.7713, stars=4, amenities=["wifi", "pool"], size=120)
candidates = [
    ("hotel_1", PropertyAttributes(lat=43.4250, lon=6.7800, stars=4, amenities=["wifi", "pool", "spa"], size=100)),
    ("hotel_2", PropertyAttributes(lat=43.3900, lon=6.7500, stars=3, amenities=["wifi"], size=80))
]

results = scorer.find_similar_competitors(base, candidates, min_similarity=0.6, max_distance_km=10, top_n=10)
```

### 4. Competitor Intelligence Service (`core/services/competitor_intelligence.py`)

Main orchestration layer:

```python
from core.services.competitor_intelligence import CompetitorIntelligenceService

service = CompetitorIntelligenceService(mock_mode=False)

# Discover competitors
hotels = await service.discover_hotel_competitors(profile, radius_km=10)
markets = await service.discover_airbnb_markets(profile)

# Compute similarity
similarities = service.compute_similarity_scores(
    profile,
    min_similarity=0.6,
    max_distance_km=10,
    top_n=20
)

# Fetch data for similar competitors
counts = await service.fetch_all_competitor_data(
    profile,
    start_date=date(2024, 1, 1),
    end_date=date(2024, 12, 31),
    min_similarity=0.6
)

# Compute competitive gap
gap_df = service.compute_competitive_gap(our_prices_df, date_col="date", price_col="price")
```

### 5. Competition Correlation Analyzer (`core/analysis/competition_correlation.py`)

Extends base correlation engine:

```python
from core.analysis.competition_correlation import CompetitionCorrelationAnalyzer

analyzer = CompetitionCorrelationAnalyzer(service=service)

# Add competition features to dataset
enriched = analyzer.enrich_with_competition_features(
    our_df,
    date_col="date",
    price_col="price"
)
# Adds: median_comp_price, comp_gap, comp_gap_z, airbnb_adr, airbnb_occupancy

# Compute lag correlations
lag_df = analyzer.compute_lag_correlations_with_competition(
    enriched,
    target="occupancy",
    max_lag=7
)

# Compute competitive elasticity (OLS regression)
elasticity = analyzer.compute_competitive_elasticity(
    enriched,
    target="occupancy",
    price_col="price"
)
# Model: occupancy = β0 + β1*comp_gap + β2*airbnb_adr + β3*airbnb_occupancy + ε

# Generate full report
report = analyzer.generate_competition_report(enriched, target="occupancy", price_col="price")
```

---

## Competition Formulas

### 1. Competitive Price Gap

```
comp_gap_t = our_price_t - median(competitor_price_t)
```

### 2. Standardized Gap (Z-score)

```
comp_gap_z_t = (comp_gap_t - mean(comp_gap)) / std(comp_gap)
```

### 3. Lag Correlation

```
corr(occupancy_t, comp_gap_{t+k}),  k ∈ [-7, 7]
```

**Interpretation**:
- k > 0: Leading indicator (competitor changes predict our occupancy)
- k < 0: Lagging indicator (our occupancy follows competitor changes)
- k = 0: Immediate correlation

### 4. Competitive Elasticity (OLS Regression)

```
occupancy_t = β0 + β1·comp_gap_t + β2·airbnb_adr_t + β3·airbnb_occupancy_t + ε_t
```

**Coefficients**:
- β1 > 0: Higher prices than competitors → Higher occupancy (premium brand)
- β1 < 0: Higher prices than competitors → Lower occupancy (price sensitive)
- β2, β3: Airbnb market influence on demand

---

## User Interface

The Competitors page has 3 tabs:

### Tab 1: Overview (Discovery)

1. **Competitor Discovery**
   - Search radius slider (1-50 km)
   - Minimum similarity slider (0.0-1.0)
   - "Discover Hotel Competitors" button
   - "Discover Airbnb Markets" button

2. **Similarity Computation**
   - "Compute Similarity Scores" button
   - Table showing ranked competitors with distance and similarity

3. **Data Fetching**
   - Date range picker (start/end dates)
   - "Fetch Competitor Pricing Data" button
   - Fetches historical data from APIs

### Tab 2: Analysis

1. **Price Comparison**
   - Line chart: Our Price vs Median Competitor Price over time

2. **Competitive Gap Analysis**
   - comp_gap_z time series with reference lines (±1σ, ±2σ)
   - Positioning interpretation (premium/value/competitive)

3. **Airbnb Market Impact**
   - Avg Airbnb ADR metric
   - Avg Airbnb Occupancy metric

### Tab 3: Impact on Pricing

1. **Competitive Elasticity**
   - OLS regression results
   - Coefficients table with interpretations
   - Model R² and fit quality

2. **Lag Correlation Analysis**
   - Table showing best lag for each competition feature
   - Leading/lagging indicator interpretations

3. **Recommendations**
   - Automated insights based on analysis
   - Pricing strategy suggestions

---

## Scheduled Data Fetching

Use the snapshot script for daily data collection:

```bash
# Fetch yesterday's data
python scripts/snapshot_competition.py --days 1

# Fetch last 7 days
python scripts/snapshot_competition.py --days 7

# Fetch specific date range
python scripts/snapshot_competition.py --start 2024-01-01 --end 2024-01-31

# Test with mock data
python scripts/snapshot_competition.py --days 1 --mock
```

### Schedule with Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add line: Run daily at 2 AM
0 2 * * * cd /path/to/project && .venv/bin/python scripts/snapshot_competition.py --days 1
```

### Schedule with Task Scheduler (Windows)

1. Open Task Scheduler
2. Create Basic Task → Name: "Competitor Snapshot"
3. Trigger: Daily at 2:00 AM
4. Action: Start a program
   - Program: `C:\path\to\project\.venv\Scripts\python.exe`
   - Arguments: `C:\path\to\project\scripts\snapshot_competition.py --days 1`
   - Start in: `C:\path\to\project`

---

## Data Storage

File-based repository (matches existing app pattern):

```
data/competitors/
├── competitors.json          # Competitor catalog
├── observations.parquet      # Daily price/occupancy observations
└── similarity.json           # Similarity scores cache
```

**Advantages**:
- No database required
- Easy backup and versioning
- Fast queries with Parquet
- Compatible with existing app architecture

---

## Integration with Existing Systems

### 1. Correlation Engine

Competition features are automatically integrated:

```python
# Existing correlation workflow
from core.analysis.correlations import compute_correlations
from core.analysis.competition_correlation import add_competition_to_correlations

# Base correlations (weather, holidays, temporal)
base_corr = compute_correlations(enriched_df, target="occupancy")

# Add competition correlations
full_corr = add_competition_to_correlations(base_corr, competition_enriched_df, target="occupancy")

# Competition features now appear in correlation rankings tagged with category='competition'
```

### 2. Pricing Algorithm

Competitive metrics can be used as input features:

```python
# Example: Train model with competition features
features = [
    'day_of_week', 'month', 'is_holiday',    # Base features
    'temp_avg', 'precipitation',              # Weather
    'comp_gap_z', 'median_comp_price',        # Competition (NEW)
    'airbnb_adr', 'airbnb_occupancy'          # Airbnb market (NEW)
]

model = train_pricing_model(df, features=features, target='price')
```

### 3. Optimization

Use competitive elasticity in pricing optimization:

```python
# If β1 (comp_gap coefficient) < 0, implement dynamic adjustment
if elasticity['coefficients']['comp_gap'] < -0.1:
    # Price sensitive market → reduce prices when above competitors
    optimal_price = median_comp_price * 0.95
else:
    # Premium positioning → maintain price premium
    optimal_price = median_comp_price * 1.10
```

---

## Testing

All modules have mock mode:

```python
# Test discovery
service = CompetitorIntelligenceService(mock_mode=True)
hotels = await service.discover_hotel_competitors(profile, radius_km=10)
# Returns realistic synthetic hotel data

# Test similarity
# Mock data respects distance calculations and similarity rules

# Test data fetching
# Mock data has realistic seasonal patterns and noise
```

---

## Troubleshooting

### "No competitor data available"
- Run discovery first: Click "Discover Hotel Competitors" in UI
- Or run: `python scripts/snapshot_competition.py --days 1 --mock`

### "API rate limit exceeded"
- APIs have rate limits (varies by provider)
- Schedule snapshots during off-peak hours
- Use mock mode for development: `mock_mode=True`

### "Insufficient data for regression"
- Need at least 20 valid observations
- Fetch more historical data: `--days 90`
- Check data coverage: Some competitors may have gaps

### "Similarity scores all below threshold"
- Lower `min_similarity` threshold (e.g., 0.5 instead of 0.6)
- Increase `radius_km` search area
- Check if business profile location is accurate

---

## API Costs

**Makcorps** (pay-as-you-go):
- Search: ~$0.01 per request
- Historical prices: ~$0.05 per hotel per year
- Live prices: ~$0.02 per hotel per query

**Airbtics** (subscription):
- Market search: Included
- Historical metrics: Included
- Typical cost: $50-200/month depending on plan

**AirDNA** (subscription):
- Similar to Airbtics
- Typical cost: $100-300/month

**Recommendation**: Start with mock mode, then add one API at a time as needed.

---

## Future Enhancements

1. **PostgreSQL Migration**
   - If scaling beyond file-based storage
   - SQL migrations in `docs/competitor_intelligence_schema.sql`

2. **Real-time Updates**
   - WebSocket connections for live price changes
   - Push notifications when competitors adjust prices

3. **Campsite Competitors**
   - Extend similarity algorithm for campgrounds
   - Star category bands for campsites

4. **ML Price Predictions**
   - Predict competitor price changes
   - Proactive pricing adjustments

5. **Competitive Positioning Maps**
   - 2D scatter plots (price vs quality)
   - Perceptual mapping

---

## Support

For issues or questions:
1. Check logs: `data/logs/app.log`
2. Test with mock mode first
3. Review API documentation:
   - Makcorps: https://www.makcorps.com/historical-hotel-price.html
   - Airbtics: https://airbtics.com/

---

## Summary

The Competitor Intelligence module provides:
- ✅ Automatic competitor discovery (hotels + Airbnb markets)
- ✅ Mathematical similarity scoring
- ✅ Historical and live pricing data
- ✅ Competitive gap analysis (Z-scores)
- ✅ Lag correlation detection
- ✅ OLS elasticity regression
- ✅ Integration with existing correlation engine
- ✅ Streamlit UI with 3-tab interface
- ✅ Scheduled data fetching script
- ✅ Mock mode for testing

**Quick Start**:
1. Add API keys to `.env`
2. Run app: `streamlit run lime_app.py`
3. Go to "Competitors" page
4. Click "Discover Hotel Competitors"
5. Click "Compute Similarity Scores"
6. Click "Fetch Competitor Pricing Data"
7. Switch to "Analysis" tab to see results

**Production Deployment**:
1. Schedule `snapshot_competition.py` to run daily
2. Monitor data coverage and API costs
3. Review competitive insights weekly
4. Adjust pricing strategy based on elasticity coefficients
