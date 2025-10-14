# 🚀 Dynamic Pricing Platform - Complete Implementation Plan

## 📋 Overview

This document outlines the complete implementation plan for your Intelligent Dynamic Pricing Platform, covering all 7 phases from onboarding to dynamic pricing optimization.

---

## ✅ **Phase 0: Current Status** (COMPLETED)

### What's Already Built:

1. ✅ **Premium UI Theme** - Lime-on-grey neon design
2. ✅ **Navigation System** - 8-section sidebar with Lucide icons
3. ✅ **Business Profile Model** - Data class with JSON persistence
4. ✅ **Geocoding Service** - Dual-API (Open-Meteo + Nominatim)
5. ✅ **Weather Data Connector** - Open-Meteo Historical Weather API
6. ✅ **Holiday Data** - python-holidays library (190+ countries)
7. ✅ **Enrichment Pipeline** - Automatic weather + holidays + temporal features
8. ✅ **Correlation Analysis** - 5 methods (Pearson, Spearman, MI, Lag, ANOVA)
9. ✅ **Basic Pages** - Overview, Data, Enrichment, Insights, Settings

### Current File Structure:
```
travel-pricing/
├── lime_app.py              # Main app (ACTIVE)
├── apps/ui/
│   ├── _theme.py           # Premium lime theme ✅
│   ├── _icons.py           # Lucide icons ✅
│   ├── _nav.py             # Sidebar navigation ✅
│   ├── _ui.py              # UI helpers ✅
│   ├── _plotly.py          # Chart components ✅
│   └── setup_wizard.py     # Onboarding wizard ✅
├── core/
│   ├── models/
│   │   └── business_profile.py    # Profile model ✅
│   ├── services/
│   │   └── enrichment_pipeline.py # Enrichment ✅
│   ├── analysis/
│   │   ├── correlations.py        # 5 correlation methods ✅
│   │   └── pricing_weights.py     # Auto-weighting ✅
│   ├── utils/
│   │   └── geocode.py             # Geocoding ✅
│   └── connectors/
│       ├── weather.py             # Open-Meteo API ✅
│       └── holidays.py            # Holiday data ✅
└── data/
    ├── config/                    # Business profiles
    ├── enriched/                  # Enriched datasets
    └── cache/                     # API cache
```

---

## 🎯 **Phase 1: Onboarding & Setup** (90% COMPLETE)

### Current Status:
✅ Setup wizard exists (`apps/ui/setup_wizard.py`)
✅ Captures: business name, type, city, country
✅ Geocoding: Automatic lat/lon/timezone
✅ Saves to JSON: `data/config/business_profile.json`
✅ Routes to Overview after save

### Enhancements Needed:
- [ ] Add seasonal pattern selection (Q1-Q4 checkboxes)
- [ ] Add operating months (Jan-Dec multi-select)
- [ ] Add business logo upload (optional)
- [ ] Add currency selection (USD, EUR, GBP, etc.)
- [ ] Add welcome tour after setup

### Implementation:
```python
# In setup_wizard.py, add to Step 2:
operating_months = st.multiselect(
    "Operating Months",
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    default=["Jan", "Feb", "Mar", "Apr", "May", "Jun",
             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
)

seasonal_pattern = st.selectbox(
    "Primary Season",
    ["Spring Peak", "Summer Peak", "Fall Peak",
     "Winter Peak", "Year-Round", "Custom"]
)

currency = st.selectbox(
    "Currency",
    ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"],
    index=1  # EUR default
)
```

### API Required:
**NONE** - All data is user input

---

## 📊 **Phase 2: Data Upload** (80% COMPLETE)

### Current Status:
✅ File uploader (CSV/Excel)
✅ Preview with 50 rows
✅ Summary stats (rows, columns, date range)
✅ Session state storage

### Enhancements Needed:
- [ ] Column mapping interface (date, price, bookings, revenue, channel)
- [ ] Data validation (check for required columns)
- [ ] Automatic date format detection
- [ ] Handle missing values (show warning, suggest imputation)
- [ ] Duplicate detection
- [ ] Outlier detection with charts
- [ ] Export cleaned dataset

### Implementation:
```python
# In lime_app.py render_data(), after file upload:

st.markdown("### Column Mapping")
st.info("Map your columns to our standard format")

col_mapping = {}
col_mapping['date'] = st.selectbox(
    "Date Column",
    df.columns,
    index=next((i for i, col in enumerate(df.columns)
               if 'date' in col.lower()), 0)
)

col_mapping['price'] = st.selectbox(
    "Price Column",
    df.columns,
    index=next((i for i, col in enumerate(df.columns)
               if 'price' in col.lower()), 0)
)

col_mapping['bookings'] = st.selectbox(
    "Bookings/Occupancy Column",
    df.columns,
    index=next((i for i, col in enumerate(df.columns)
               if 'booking' in col.lower() or 'occupancy' in col.lower()), 0)
)

# Validation
if st.button("Validate Data"):
    validator = DataValidator(df, col_mapping)
    issues = validator.check()

    if issues:
        for issue in issues:
            st.warning(issue)
    else:
        st.success("✓ Data validated successfully!")
```

### New File Needed:
```python
# core/services/data_validator.py
class DataValidator:
    """Validate uploaded data"""

    def check_missing(self) -> List[str]:
        """Check for missing values"""
        pass

    def check_outliers(self) -> List[str]:
        """Detect outliers using IQR"""
        pass

    def check_dates(self) -> List[str]:
        """Validate date formats"""
        pass
```

### API Required:
**NONE** - All validation is local

---

## 🌦️ **Phase 3: Data Enrichment** (95% COMPLETE)

### Current Status:
✅ Weather data (Open-Meteo Historical Weather API)
✅ Holiday data (python-holidays library)
✅ Temporal features (weekday, month, season, etc.)
✅ Caching (Parquet files)
✅ Merge with uploaded data

### Enhancements Needed:
- [ ] Add event data (festivals, sports, concerts)
- [ ] Add competitor pricing (if available)
- [ ] Add local attractions data
- [ ] Progress bar during enrichment
- [ ] Feature summary after enrichment

### APIs Available:

#### 1. **Weather Data** (ALREADY INTEGRATED ✅)
- **API**: Open-Meteo Historical Weather
- **Endpoint**: `https://archive-api.open-meteo.com/v1/archive`
- **Free**: Yes (no API key needed)
- **Data**: Temperature, precipitation, wind, sunshine hours
- **Limit**: Unlimited requests
- **Docs**: https://open-meteo.com/en/docs/historical-weather-api

#### 2. **Holidays** (ALREADY INTEGRATED ✅)
- **Library**: `python-holidays`
- **Install**: `pip install holidays`
- **Free**: Yes (offline)
- **Coverage**: 190+ countries
- **Docs**: https://pypi.org/project/holidays/

#### 3. **Events** (OPTIONAL - NEEDS API)
- **Option A: PredictHQ** (Commercial)
  - **API**: https://www.predicthq.com/
  - **Free Tier**: 1,000 requests/month
  - **Data**: Concerts, sports, festivals, conferences
  - **Pricing**: $0 (free tier) → $500+/month

- **Option B: Ticketmaster** (Free)
  - **API**: https://developer.ticketmaster.com/
  - **Free**: Yes (5,000 requests/day)
  - **Data**: Concerts, sports, theater
  - **Docs**: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/

### Implementation (Events):
```python
# core/connectors/events.py
import requests
from typing import List, Dict
from datetime import date

class TicketmasterConnector:
    """Fetch events from Ticketmaster API"""

    BASE_URL = "https://app.ticketmaster.com/discovery/v2/events"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def get_events(
        self,
        city: str,
        country_code: str,
        start_date: date,
        end_date: date
    ) -> List[Dict]:
        """
        Fetch events for a location and date range

        Returns:
            List of events with name, date, type, venue
        """
        params = {
            "apikey": self.api_key,
            "city": city,
            "countryCode": country_code,
            "startDateTime": start_date.isoformat() + "T00:00:00Z",
            "endDateTime": end_date.isoformat() + "T23:59:59Z",
            "size": 200
        }

        response = requests.get(self.BASE_URL, params=params)
        response.raise_for_status()

        data = response.json()
        events = []

        if "_embedded" in data and "events" in data["_embedded"]:
            for event in data["_embedded"]["events"]:
                events.append({
                    "date": event["dates"]["start"]["localDate"],
                    "name": event["name"],
                    "type": event["classifications"][0]["segment"]["name"],
                    "venue": event["_embedded"]["venues"][0]["name"]
                })

        return events
```

### To Enable Events:
1. Sign up at https://developer.ticketmaster.com/
2. Get free API key
3. Add to `.env`: `TICKETMASTER_API_KEY=your_key_here`
4. Update enrichment pipeline

---

## 🧮 **Phase 4: Analytics & Insights** (85% COMPLETE)

### Current Status:
✅ Correlation analysis (5 methods)
✅ Heatmap visualization
✅ Lag correlation chart
✅ KPI gauges (ring progress)
✅ Feature ranking

### Enhancements Needed:
- [ ] Seasonal decomposition (trend, seasonality, residual)
- [ ] Time-lag analysis (7-14 days)
- [ ] Price elasticity calculation
- [ ] Demand forecasting (simple moving average)
- [ ] Feature importance chart (bar chart)
- [ ] Correlation confidence intervals
- [ ] Interactive filters (date range, season)

### Implementation:
```python
# core/analysis/seasonality.py
from statsmodels.tsa.seasonal import seasonal_decompose

def decompose_series(
    df: pd.DataFrame,
    value_col: str,
    date_col: str,
    period: int = 7  # Weekly seasonality
) -> Dict[str, pd.Series]:
    """
    Decompose time series into trend, seasonal, residual

    Returns:
        {
            'trend': pd.Series,
            'seasonal': pd.Series,
            'residual': pd.Series
        }
    """
    df_sorted = df.sort_values(date_col)
    df_sorted = df_sorted.set_index(date_col)

    result = seasonal_decompose(
        df_sorted[value_col],
        model='additive',
        period=period
    )

    return {
        'trend': result.trend,
        'seasonal': result.seasonal,
        'residual': result.resid
    }
```

### New Charts Needed:
- Seasonal decomposition (4 subplots)
- Feature importance bar chart
- Price elasticity curve
- Demand forecast vs actual

### API Required:
**NONE** - All analysis is local

---

## 🤖 **Phase 5: Predictive Modeling** (NOT STARTED)

### Requirements:
- Train ML models (XGBoost, LightGBM, Random Forest)
- Predict optimal price or occupancy
- Cross-validation with time-series split
- Feature importance from model
- SHAP values for explainability
- Model comparison dashboard
- Save/load trained models

### Implementation:
```python
# core/modeling/price_predictor.py
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from typing import Dict, Tuple

class PricePredictor:
    """Train and predict optimal pricing"""

    def __init__(self, model_type: str = "xgboost"):
        self.model_type = model_type
        self.model = None
        self.feature_names = []

    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        cv_folds: int = 5
    ) -> Dict[str, float]:
        """
        Train model with time-series cross-validation

        Returns:
            Metrics: {'mae': 10.5, 'rmse': 15.2, 'r2': 0.85}
        """
        tscv = TimeSeriesSplit(n_splits=cv_folds)

        if self.model_type == "xgboost":
            self.model = xgb.XGBRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                random_state=42
            )

        # Cross-validation
        scores = []
        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            self.model.fit(X_train, y_train)
            y_pred = self.model.predict(X_val)

            mae = mean_absolute_error(y_val, y_pred)
            scores.append(mae)

        # Final training on all data
        self.model.fit(X, y)
        self.feature_names = list(X.columns)

        return {
            'mae': np.mean(scores),
            'rmse': np.sqrt(np.mean(scores) ** 2),
            'r2': self.model.score(X, y)
        }

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Predict prices"""
        return self.model.predict(X)

    def get_feature_importance(self) -> pd.DataFrame:
        """Get feature importance"""
        importance = self.model.feature_importances_
        return pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance
        }).sort_values('importance', ascending=False)
```

### Libraries Needed:
```bash
pip install xgboost lightgbm scikit-learn shap joblib
```

### API Required:
**NONE** - All modeling is local

---

## 💰 **Phase 6: Dynamic Pricing Optimization** (NOT STARTED)

### Requirements:
- Recommend optimal price for upcoming dates
- "What-if" scenario analysis
- Price bounds (min/max constraints)
- Revenue optimization
- Competitor price comparison
- Demand curves
- A/B testing framework

### Implementation:
```python
# core/optimize/price_optimizer.py
from scipy.optimize import minimize
from typing import Dict, List

class PriceOptimizer:
    """Optimize pricing to maximize revenue"""

    def __init__(
        self,
        predictor: PricePredictor,
        min_price: float,
        max_price: float
    ):
        self.predictor = predictor
        self.min_price = min_price
        self.max_price = max_price

    def optimize_price(
        self,
        features: pd.DataFrame,
        objective: str = "revenue"  # or "occupancy"
    ) -> List[Dict]:
        """
        Find optimal price for each date

        Returns:
            [
                {
                    'date': '2025-01-01',
                    'optimal_price': 250.0,
                    'predicted_demand': 45,
                    'predicted_revenue': 11250,
                    'confidence': 0.85
                }
            ]
        """
        results = []

        for idx in range(len(features)):
            feature_row = features.iloc[[idx]]

            def objective_fn(price):
                # Predict demand at this price
                feature_row['price'] = price
                demand = self.predictor.predict(feature_row)[0]

                if objective == "revenue":
                    return -(price * demand)  # Negative for minimization
                else:
                    return -demand

            # Optimize
            result = minimize(
                objective_fn,
                x0=(self.min_price + self.max_price) / 2,
                bounds=[(self.min_price, self.max_price)],
                method='L-BFGS-B'
            )

            optimal_price = result.x[0]
            feature_row['price'] = optimal_price
            predicted_demand = self.predictor.predict(feature_row)[0]

            results.append({
                'date': features.index[idx],
                'optimal_price': round(optimal_price, 2),
                'predicted_demand': round(predicted_demand, 1),
                'predicted_revenue': round(optimal_price * predicted_demand, 2),
                'confidence': 0.85  # From model CV
            })

        return results

    def what_if_scenario(
        self,
        features: pd.DataFrame,
        scenarios: List[Dict]
    ) -> pd.DataFrame:
        """
        Run what-if scenarios

        scenarios = [
            {'name': 'Baseline', 'price_multiplier': 1.0},
            {'name': '+10%', 'price_multiplier': 1.1},
            {'name': '-10%', 'price_multiplier': 0.9}
        ]
        """
        results = []

        for scenario in scenarios:
            features_copy = features.copy()
            features_copy['price'] *= scenario['price_multiplier']

            demand = self.predictor.predict(features_copy)
            revenue = features_copy['price'] * demand

            results.append({
                'scenario': scenario['name'],
                'avg_price': features_copy['price'].mean(),
                'total_demand': demand.sum(),
                'total_revenue': revenue.sum()
            })

        return pd.DataFrame(results)
```

### API Required:
**NONE** - All optimization is local

---

## 📈 **Phase 7: Interactive Dashboard** (70% COMPLETE)

### Current Status:
✅ Top KPIs (4 metrics with deltas)
✅ Booking trend chart (90 days)
✅ Revenue by channel (bar chart)
✅ Quick action cards (3 CTAs)

### Enhancements Needed:
- [ ] Date range filter (last 7, 30, 90, 365 days)
- [ ] Season filter (Spring, Summer, Fall, Winter)
- [ ] Real-time metrics (if data is current)
- [ ] Comparison mode (this year vs last year)
- [ ] Export dashboard as PDF
- [ ] AI-generated recommendations
- [ ] Alerts (price too high/low, occupancy drop)

### Implementation:
```python
# In lime_app.py render_overview(), add filters:

col1, col2, col3 = st.columns(3)

with col1:
    date_range = st.selectbox(
        "Date Range",
        ["Last 7 Days", "Last 30 Days", "Last 90 Days",
         "Last Year", "All Time", "Custom"]
    )

with col2:
    season_filter = st.multiselect(
        "Season",
        ["Spring", "Summer", "Fall", "Winter"],
        default=["Spring", "Summer", "Fall", "Winter"]
    )

with col3:
    comparison_mode = st.checkbox("Compare to Last Year")

# AI Recommendations
st.markdown("### 🤖 AI Recommendations")
recommendations = generate_recommendations(enriched_df, correlations_df)

for rec in recommendations:
    st.info(f"💡 {rec}")
```

### API Required:
**NONE** - All visualization is local

---

## 🔑 **API Summary & Requirements**

### Already Integrated (No Action Needed):

1. **Open-Meteo Historical Weather** ✅
   - Status: FREE, NO API KEY
   - Integrated: Yes
   - File: `core/connectors/weather.py`

2. **python-holidays** ✅
   - Status: FREE, OFFLINE
   - Integrated: Yes
   - File: `core/connectors/holidays.py`

3. **OSM Nominatim Geocoding** ✅
   - Status: FREE, NO API KEY
   - Integrated: Yes (fallback)
   - File: `core/utils/geocode.py`

### Optional APIs (To Add):

4. **Ticketmaster Events API** (Optional)
   - Status: FREE (5,000 requests/day)
   - Sign up: https://developer.ticketmaster.com/
   - Use case: Major events (concerts, sports)
   - Priority: LOW (nice to have)

5. **PredictHQ Events API** (Optional)
   - Status: FREE TIER (1,000 requests/month)
   - Sign up: https://www.predicthq.com/
   - Use case: Comprehensive event data
   - Priority: LOW (alternative to Ticketmaster)

---

## 📦 **Dependencies to Install**

```bash
# Already installed:
pip install streamlit pandas numpy plotly holidays requests

# Need to install for Phase 5 (Modeling):
pip install xgboost lightgbm scikit-learn shap joblib statsmodels

# Optional (for advanced features):
pip install scipy prophet pmdarima
```

---

## 🗓️ **Recommended Implementation Order**

### Week 1: Polish Core Features
1. ✅ Fix button contrast (DONE)
2. Enhance data upload with validation
3. Add column mapping interface
4. Add outlier detection

### Week 2: Advanced Analytics
5. Seasonal decomposition
6. Price elasticity calculation
7. Feature importance charts
8. Interactive filters

### Week 3: Predictive Modeling
9. Train XGBoost model
10. Cross-validation
11. Feature importance from model
12. Model comparison dashboard

### Week 4: Optimization & Polish
13. Price optimizer
14. What-if scenarios
15. AI recommendations
16. Export functionality

### Week 5: Optional Enhancements
17. Event data integration (Ticketmaster)
18. A/B testing framework
19. Alerts system
20. PDF export

---

## ✅ **Next Immediate Steps**

1. **Refresh your browser** to see the sidebar button fix
2. Review this implementation plan
3. Let me know which phase you'd like to tackle first:
   - Option A: Perfect existing features (data upload, validation)
   - Option B: Add predictive modeling (ML)
   - Option C: Add event data (Ticketmaster API)
   - Option D: Enhance dashboard with filters

---

## 📞 **Support**

For any questions or clarifications:
- All code is in `C:\Users\eddgu\travel-pricing\`
- Main app: `lime_app.py`
- Current URL: http://localhost:8503

**Ready to continue with the next phase!** 🚀
