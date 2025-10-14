# Core Python ML Engine

The `core/` directory contains the Python-based machine learning and analytics **library** for the Jengu Dynamic Pricing Platform. This is a standalone library used by scripts and analysis tools, not a running service.

## 📂 Directory Structure

```
core/
├── analysis/              # Correlation & statistical analysis
│   ├── correlations.py    # Multi-method correlation analysis
│   ├── pricing_weights.py # Auto-generate pricing weights
│   ├── elasticity.py      # Price elasticity analysis
│   └── recommendations.py # AI-powered recommendations
│
├── analytics/             # Business analytics
│   ├── correlation.py     # Correlation utilities
│   ├── enrichment.py      # Data enrichment helpers
│   └── insights.py        # Insight generation
│
├── connectors/            # External data sources
│   ├── weather.py         # Open-Meteo weather API
│   ├── holidays.py        # Holiday calendar data
│   ├── makcorps.py        # Makcorps hotel API
│   ├── airbtics.py        # Airbtics competitor data
│   └── csv_import.py      # CSV/Excel import
│
├── data/                  # Data models & repository
│   ├── models.py          # SQLAlchemy models (future)
│   └── repo.py            # Data repository pattern
│
├── features/              # Feature engineering
│   ├── build.py           # Feature builder pipeline
│   └── encoders.py        # Cyclical, lag, weather encoders
│
├── ml/                    # Machine learning models
│   ├── forecaster.py      # Demand forecasting
│   ├── predictor.py       # Price prediction
│   └── optimizer.py       # Price optimization
│
├── modeling/              # Statistical models
│   ├── demand_glm.py      # GLM demand modeling
│   ├── elasticity_ols.py  # OLS elasticity estimation
│   └── price_predictor.py # Price prediction models
│
├── models/                # Business domain models
│   ├── business_profile.py # Business profile management
│   └── competitor.py      # Competitor model
│
├── optimize/              # Optimization algorithms
│   ├── price_optimizer.py # Price optimization engine
│   └── price_search.py    # Grid search for optimal prices
│
├── policies/              # Business policies
│   └── policy.py          # Pricing policy rules
│
├── security/              # Security utilities
│   ├── auth.py            # Authentication
│   ├── encryption.py      # Data encryption
│   ├── middleware.py      # Security middleware
│   └── rbac.py            # Role-based access control
│
├── services/              # Business services
│   ├── enrichment_pipeline.py # Data enrichment orchestration
│   ├── competitor_intelligence.py # Competitor analysis
│   ├── data_validator.py  # Data validation
│   └── geocoding.py       # Geocoding service
│
└── utils/                 # Utilities
    ├── config.py          # Configuration management
    ├── geocode.py         # Geocoding utilities
    ├── logging.py         # Logging setup
    └── timeseries.py      # Time series utilities
```

## 🚀 Quick Start

### Import Core Modules

```python
from core.models.business_profile import BusinessProfile, BusinessProfileManager
from core.services.enrichment_pipeline import EnrichmentPipeline
from core.analysis.correlations import compute_correlations, rank_top_features
from core.analysis.pricing_weights import PricingWeightGenerator
```

### Example: Enrich Booking Data

```python
import pandas as pd
from core.models.business_profile import BusinessProfile
from core.services.enrichment_pipeline import EnrichmentPipeline

# Create business profile
profile = BusinessProfile(
    business_name="My Hotel",
    business_type="Hotel",
    country="FR",
    city="Paris",
    latitude=48.8566,
    longitude=2.3522,
    timezone="Europe/Paris"
)

# Load booking data
bookings_df = pd.read_csv("data/sample_bookings.csv")

# Enrich with weather, holidays, temporal features
pipeline = EnrichmentPipeline(profile)
enriched_df, summary = pipeline.enrich_bookings(
    bookings_df,
    date_col='booking_date'
)

print(f"Enriched {summary['total_bookings']} bookings")
print(f"Weather coverage: {summary['weather_coverage_pct']}%")
print(f"Features added: {summary['features_added']}")
```

### Example: Correlation Analysis

```python
from core.analysis.correlations import compute_correlations, rank_top_features

# Compute correlations with bookings
correlations_df = compute_correlations(enriched_df, target='bookings')

# Rank top features
top_features = rank_top_features(correlations_df, top_n=10)
print(top_features)
```

### Example: Generate Pricing Weights

```python
from core.analysis.pricing_weights import PricingWeightGenerator

generator = PricingWeightGenerator()
weights = generator.generate_weights(top_features)

for category, weight in weights.items():
    print(f"{category}: {weight*100:.1f}%")
```

## 🧪 Testing

Run tests from the project root:

```bash
# All tests
pytest tests/

# With coverage
pytest tests/ --cov=core --cov-report=html

# Specific test
pytest tests/unit/test_pricing.py -v
```

## 📦 Dependencies

See `requirements.txt` in the project root:

- **Data Processing**: pandas, numpy, scipy
- **Machine Learning**: scikit-learn, statsmodels
- **API Connectors**: requests, httpx
- **Utilities**: pydantic, python-dateutil
- **Performance**: joblib (caching)

## 🔧 Configuration

Configuration is managed via:
- Environment variables (`.env` file)
- `core/utils/config.py` module
- Business profiles stored in `data/config/`

## 📚 Documentation

- **Main docs**: `/docs/developer/`
- **Architecture**: `/docs/developer/ARCHITECTURE.md`
- **API docs**: Generate with `pydoc` for Python modules

## 🤝 Contributing

1. Follow PEP 8 style guide
2. Add type hints to all functions
3. Write docstrings (Google style)
4. Add tests for new features
5. Run `black` and `flake8` before committing

---

**Note**: This is a Python package. Import it with `from core import ...` from the project root.
