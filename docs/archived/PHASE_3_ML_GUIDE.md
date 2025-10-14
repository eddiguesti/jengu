# Phase 3: ML Prediction & Optimization - User Guide

## Overview

Phase 3 adds advanced machine learning capabilities to the JENGU Dynamic Pricing App, enabling you to:

1. **Train ML Models** - Build predictive models to forecast prices based on historical data
2. **Optimize Prices** - Generate data-driven pricing recommendations to maximize revenue or occupancy
3. **Test Scenarios** - Compare different pricing strategies and their expected outcomes
4. **Forecast Demand** - Predict future occupancy and booking patterns

---

## Getting Started

### Prerequisites

Before using Phase 3 features, ensure you have:

1. **Loaded Data** - Upload your CSV in the **Data** page
2. **Enriched Data** - Run enrichment in the **Enrichment** page to add weather, holidays, and temporal features

The app will show a warning if prerequisites are missing.

---

## 1. Model Training Page

Navigate to **Model** in the sidebar to access the ML training interface.

### Tab 1: Train Models

**Step 1: Select Algorithms**

Choose one or more ML algorithms to train:

- **XGBoost Gradient Boosting** - Fast, accurate, handles missing data well (recommended)
- **LightGBM Gradient Boosting** - Very fast for large datasets (requires `lightgbm` package)
- **Random Forest** - Robust, less prone to overfitting
- **Ridge Regression** - Simple linear model with L2 regularization
- **Lasso Regression** - Linear model with feature selection (L1 regularization)

**Step 2: Configure Training**

Click "Advanced Settings" to adjust:

- **Cross-Validation Folds** (3-10): Number of time-series splits for validation
  - More folds = more robust evaluation but slower training
  - Default: 5 folds

- **Test Split %** (10-30%): Percentage of data held out for final testing
  - Default: 20%

**Step 3: Train**

Click **Train Models** button. Training typically takes 10-60 seconds depending on:
- Number of algorithms selected
- Dataset size
- Number of CV folds

**Results Table**

After training, you'll see a comparison table with:

- **Algorithm** - Model name
- **R² Score** - How well the model explains price variance (0-1, higher is better)
  - 0.7-0.8 = Good
  - 0.8-0.9 = Very good
  - 0.9+ = Excellent

- **RMSE** - Root Mean Squared Error (lower is better)
  - Average prediction error in your price currency units

- **MAE** - Mean Absolute Error (lower is better)
  - Average absolute difference between predicted and actual prices

- **MAPE** - Mean Absolute Percentage Error (lower is better)
  - Average percentage error (e.g., 5% means predictions are off by 5% on average)

- **Training Time** - How long it took to train

The **best model** (highest R²) is automatically selected and saved for predictions.

---

### Tab 2: Model Performance

Visualize your trained model's performance:

**Performance Metrics**

Four key metrics displayed as cards:
- **R² Score** - Variance explained
- **RMSE** - Prediction error magnitude
- **MAE** - Average absolute error
- **MAPE** - Percentage error

**Feature Importance Chart**

Shows which features have the most impact on price predictions:

- **High importance** (>0.05) - Strong drivers of price
- **Medium importance** (0.01-0.05) - Moderate impact
- **Low importance** (<0.01) - Minimal impact

Common important features:
- `is_weekend` - Weekend vs weekday
- `temp_max` - Maximum temperature
- `days_since_start` - Seasonal trends
- `is_holiday` - Holiday periods
- `month_sin`, `month_cos` - Seasonal cycles

**Actual vs Predicted Chart**

Time series showing:
- Blue line = Actual historical prices
- Orange line = Model predictions

Good models show close alignment between lines.

---

### Tab 3: Make Predictions

Generate future price forecasts:

**Step 1: Select Date Range**

- **Start Date** - When to begin forecasting
- **Number of Days** - How many days ahead to forecast (1-365)

**Step 2: Generate Forecast**

Click **Generate Forecast** button. The model will:
1. Create future date features (weather averages, temporal patterns)
2. Generate price predictions
3. Calculate prediction intervals (if supported by the algorithm)

**Results**

- **Chart** - Visual forecast with confidence bands
- **Table** - Daily predictions with dates and prices
- **Download** - CSV export button for further analysis

**Tips for Accurate Forecasts**

- Train on at least 6-12 months of historical data
- Use XGBoost or LightGBM for best accuracy
- Forecast closer dates are more reliable than distant ones
- Update model regularly as new data becomes available

---

## 2. Price Optimization Page

Navigate to **Optimize** in the sidebar to access pricing recommendations.

### Tab 1: Optimize Prices

Generate optimal pricing for future dates.

**Step 1: Select Objective**

Choose what to optimize:

- **Maximize Revenue** - Highest total revenue
  - Best when: You have flexible capacity and want maximum profit
  - Typically results in: Higher prices, moderate occupancy

- **Maximize Occupancy** - Highest booking rate
  - Best when: You need to fill capacity (off-season, new property)
  - Typically results in: Lower prices, high occupancy

- **Balance Revenue & Occupancy** - Best of both worlds
  - Best when: You want sustainable growth
  - Typically results in: Moderate prices, good occupancy

**Step 2: Select Period**

Choose optimization period:
- Next 7 Days
- Next 30 Days
- Next 90 Days
- Custom Date Range

**Step 3: Set Business Constraints**

Click "Business Constraints" to configure limits:

- **Min/Max Price** - Price bounds (default: 50-300)
  - Prevents unrealistic recommendations

- **Max Price Change %** - Maximum daily change (default: 20%)
  - Prevents sudden price jumps that might deter bookings

- **Capacity** - Number of units available (default: 100)
  - Used for occupancy calculations

- **Min Occupancy %** - Minimum acceptable occupancy (default: 50%)
  - Ensures you don't price too high

**Step 4: Optimize**

Click **Optimize Prices** button. The optimizer will:
1. Run 100-1000 price simulations per day
2. Find optimal balance based on your objective
3. Apply business constraints
4. Calculate expected revenue lift

**Results**

**Metrics Section:**
- **Total Revenue Lift** - Expected increase vs current pricing
- **Average Occupancy** - Expected booking rate
- **Average Price** - Mean recommended price

**Price Calendar Chart:**
- Bar chart showing recommended prices by date
- Color intensity indicates price level
- Hover for exact values

**Recommendations Table:**
- Daily breakdown with:
  - Date
  - Current Price (if available)
  - Recommended Price
  - Expected Occupancy
  - Price Change %
  - Revenue Impact

**Download Button:**
- Export recommendations as CSV
- Import into your booking system

---

### Tab 2: Scenarios

Compare multiple pricing strategies side-by-side.

**Available Scenarios:**

1. **Current Strategy** - Your existing prices (baseline)
2. **Premium Strategy** - Increase prices by 10%
3. **Value Strategy** - Decrease prices by 10%
4. **Custom Strategy** - Set your own adjustment

**How to Use:**

1. Select period (7/30/90 days or custom)
2. Configure custom adjustment if desired
3. Click **Run Scenario Comparison**
4. Review comparison table and chart

**Results Table:**

For each scenario:
- **Total Revenue** - Expected earnings
- **Avg Occupancy** - Booking rate
- **Avg Price** - Mean price point
- **Price Elasticity** - How demand responds to price changes

**Revenue Chart:**

Bar chart comparing total revenue across scenarios.
- Helps identify which strategy maximizes earnings
- Shows trade-off between price and volume

**Interpreting Results:**

- **High elasticity** (>1.5) - Demand very sensitive to price
  - Small price cuts = big occupancy gains
  - Small price increases = big occupancy losses

- **Low elasticity** (<1.0) - Demand relatively insensitive
  - You can increase prices with minimal occupancy loss
  - Good opportunity to boost revenue

---

### Tab 3: Insights

Automated pricing insights from your historical data.

**Optimal Price Range:**

Calculated from historical performance:
- **Recommended Price** - Sweet spot balancing revenue and occupancy
- **Min Price** - Lower bound based on costs
- **Max Price** - Upper bound based on demand ceiling

**Price-Occupancy Relationship:**

Chart showing how occupancy changes with price:
- X-axis = Price
- Y-axis = Occupancy %
- Trend line shows relationship

**Automated Recommendations:**

The system analyzes your data and provides actionable advice:

Examples:
- "Your current average price ($180) is 12% below optimal ($203). Consider gradual increases."
- "Occupancy drops sharply above $250. Avoid pricing beyond this threshold."
- "Weekend prices can be 25% higher than weekdays without occupancy loss."

---

## Technical Details

### Supported ML Algorithms

| Algorithm | Pros | Cons | Best For |
|-----------|------|------|----------|
| **XGBoost** | Fast, accurate, handles missing data | Requires tuning | General purpose (recommended) |
| **LightGBM** | Very fast, low memory | Extra dependency | Large datasets (10k+ rows) |
| **Random Forest** | Robust, interpretable | Slower, larger file size | Stable predictions |
| **Ridge** | Simple, fast | Assumes linear relationships | Linear patterns |
| **Lasso** | Feature selection built-in | Assumes linear relationships | High-dimensional data |

### Feature Engineering

The model automatically uses these features (created during enrichment):

**Temporal Features:**
- `year`, `month`, `day`, `day_of_week`
- `is_weekend`, `is_holiday`
- `days_since_start`, `days_until_end`
- `month_sin`, `month_cos` (cyclical encoding)

**Weather Features:**
- `temp_max`, `temp_min`, `temp_mean`
- `precipitation`, `wind_speed`
- `weather_code` (sunny, rainy, etc.)

**Seasonal Features:**
- `season` (spring, summer, fall, winter)
- `is_peak_season`, `is_shoulder_season`
- Moving averages of key metrics

### Model Persistence

Trained models are automatically saved to `data/models/`:
- `price_prediction_model_{algorithm}.pkl`
- `demand_forecaster.pkl`

Models persist across sessions - no need to retrain every time.

### Explainability (SHAP)

If `shap` package is installed, you get:
- **SHAP values** - How much each feature contributed to each prediction
- **Feature importance** - Global importance rankings
- **Prediction explanations** - Why the model predicted a specific price

To install SHAP:
```bash
.venv\Scripts\pip install shap
```

---

## Optimization Algorithms

### Price Optimization

Uses **scipy.optimize** with L-BFGS-B algorithm:

1. **Objective Function:**
   - Revenue: `price × predicted_occupancy × capacity`
   - Occupancy: `predicted_occupancy`
   - Balanced: `price × occupancy² × capacity` (penalizes low occupancy)

2. **Constraints:**
   - Price bounds (min/max)
   - Max price change percentage
   - Min occupancy threshold
   - Competitive positioning (if competitors loaded)

3. **Search Process:**
   - Tests 100-1000 price points
   - Finds maximum objective within constraints
   - Returns optimal price + expected outcomes

### Demand Forecasting

Uses trained ML model to predict occupancy:

1. **Feature Creation:**
   - Extract temporal patterns from historical data
   - Calculate seasonal averages
   - Create cyclical encodings

2. **Prediction:**
   - Feed features into trained model
   - Generate occupancy forecast
   - Apply business rules (0-100% bounds)

3. **Scenario Testing:**
   - Adjust prices by specified percentage
   - Predict impact on demand using elasticity
   - Calculate revenue outcomes

---

## Best Practices

### Model Training

1. **Data Requirements:**
   - Minimum: 3 months of daily data (~90 rows)
   - Recommended: 12+ months (365+ rows)
   - Ideal: 2+ years for seasonal patterns

2. **Algorithm Selection:**
   - Start with **XGBoost** (best all-around)
   - Add **Random Forest** for comparison
   - Try **LightGBM** if dataset is large (>5000 rows)

3. **Feature Selection:**
   - Include all enriched features initially
   - Remove low-importance features (<0.001) if overfitting
   - Keep temporal and weather features

4. **Model Updates:**
   - Retrain monthly with new data
   - Monitor R² - if it drops below 0.7, investigate
   - Check feature importance for shifts

### Price Optimization

1. **Objective Selection:**
   - **High season** → Maximize Revenue
   - **Low season** → Maximize Occupancy
   - **Normal season** → Balanced

2. **Constraint Setting:**
   - Set realistic min/max prices based on costs and market
   - Limit price changes to 15-20% to avoid booking friction
   - Adjust capacity if you have multiple units

3. **Implementation:**
   - Don't apply recommendations blindly
   - Test on small date ranges first
   - Compare recommendations to competitor prices
   - Gradually implement suggested changes

4. **Monitoring:**
   - Track actual occupancy vs predicted
   - Measure revenue lift vs baseline
   - Adjust constraints if results differ from expectations

### Scenario Testing

1. **Run scenarios before major decisions:**
   - Pricing strategy changes
   - Seasonal transitions
   - Competitor analysis

2. **Test multiple adjustments:**
   - -20%, -10%, 0%, +10%, +20%
   - Identify revenue-maximizing range

3. **Consider elasticity:**
   - High elasticity → focus on volume
   - Low elasticity → focus on price

---

## Troubleshooting

### "No enriched data found"

**Solution:** Go to **Enrichment** page and click "Enrich Data" first.

### "Model training failed"

**Possible causes:**
- Insufficient data (<50 rows)
- Missing target column (`price` or `occupancy`)
- All features are constant (no variation)

**Solution:**
- Check data quality in **Data** page
- Ensure at least 3 months of data
- Verify price column has variation

### "Optimization returned no results"

**Possible causes:**
- Constraints too restrictive
- No trained model available
- Invalid date range

**Solution:**
- Widen min/max price bounds
- Train a model first in **Model** page
- Check date range is in the future

### Low R² score (<0.5)

**Possible causes:**
- Insufficient training data
- Price not correlated with available features
- High randomness in pricing

**Solution:**
- Collect more historical data
- Add more features (events, competitors, etc.)
- Try different algorithms
- Consider external factors not captured

### Predictions seem unrealistic

**Possible causes:**
- Model trained on limited season (e.g., only summer)
- Extrapolating beyond training range
- Outliers in training data

**Solution:**
- Train on full year of data
- Set min/max price constraints
- Remove outliers from training data
- Use "Balanced" objective to temper extremes

---

## FAQ

**Q: How often should I retrain models?**

A: Monthly is recommended. Retrain immediately if:
- You have 30+ new days of data
- Seasonal shift occurred
- Major market changes (new competitors, events)

**Q: Can I use models without enrichment?**

A: No. Models require temporal and weather features created during enrichment. These features are crucial for accurate predictions.

**Q: What if I don't have XGBoost/LightGBM installed?**

A: Random Forest and Ridge/Lasso will work fine. To install XGBoost:
```bash
.venv\Scripts\pip install xgboost
```

**Q: How do I export optimized prices to my booking system?**

A:
1. Generate optimization in **Optimize** page
2. Click "Download Recommendations CSV"
3. Import CSV into your property management system
4. Most systems support bulk price imports

**Q: Can I optimize for specific date ranges (e.g., weekends only)?**

A: Currently, optimization runs on continuous date ranges. To optimize weekends:
1. Export recommendations CSV
2. Filter to weekend dates in Excel
3. Apply those prices manually

**Q: What's the difference between prediction and optimization?**

A:
- **Prediction** (Model page) - Forecasts what price you'll charge based on historical patterns
- **Optimization** (Optimize page) - Recommends what price you *should* charge to maximize your objective

Use prediction for planning, optimization for decision-making.

---

## Next Steps

After mastering Phase 3, consider:

1. **API Integration** - Connect real competitor pricing APIs (see [API_SETUP_GUIDE.md](API_SETUP_GUIDE.md))
2. **Advanced Features** - Implement dynamic repricing, event detection, multi-property optimization
3. **Automation** - Schedule daily model retraining and price updates
4. **Monitoring** - Build dashboards to track prediction accuracy and revenue impact

---

## Support

For questions or issues:
1. Check this guide and [API_SETUP_GUIDE.md](API_SETUP_GUIDE.md)
2. Review app logs in the terminal
3. Contact support with screenshots and error messages

---

**Version:** Phase 3.0
**Last Updated:** October 2025
**Compatibility:** JENGU Dynamic Pricing App v1.0+
