/**
 * Analytics Data Contracts for Director Dashboard
 *
 * These types define the shape of data returned by the backend analytics endpoints.
 * Keep these stable - any changes should be versioned to avoid breaking charts.
 */

// Revenue vs Optimized (Gain Chart)
export interface RevenueSeries {
  dates: string[]
  actual: number[]
  optimized?: number[] // if /simulate available
  revpau_lift_pct?: number // optional KPI
}

// Occupancy Pace vs Target (Lead Buckets)
export interface OccupancyPace {
  lead: string[] // e.g., ["0-1","2-7","8-21","22-90"]
  actual: number[] // 0..1
  target: number[] // 0..1
  model?: number[] // 0..1 projected
}

// ADR (Average Daily Rate) Index
export interface AdrIndex {
  dates: string[]
  propertyIndex: number[] // 100 = parity
  marketIndex?: number[]
}

// Revenue Heatmap by Lead × Season
export interface RevLeadHeatmap {
  leadBuckets: string[]
  seasons: string[]
  matrix: number[][] // seasons x leads
}

// Forecast vs Actual Bookings
export interface ForecastActual {
  dates: string[]
  forecast: number[]
  actual: number[]
  mape?: number // Mean Absolute Percentage Error
  crps?: number // Continuous Ranked Probability Score
}

// Elasticity Curve (price sensitivity)
export interface ElasticityCurve {
  priceGrid: number[]
  probMean: number[] // 0..1
  probLow?: number[]
  probHigh?: number[]
  compMedian?: number | null
  chosenPrice?: number | null
}

// Price Decision Waterfall (Explainability)
export interface PriceExplain {
  steps: Array<{ name: string; value: number }>
  final: number
}

// Dashboard KPIs (Header Tiles)
export interface DashboardKPIs {
  revpau_lift_pct: number // Revenue per Available Unit lift %
  adr_delta_vs_market: number // ADR delta vs market
  occupancy_gap: number // Gap from target occupancy
  coverage_pct: number // Prediction band coverage %
  constraint_violations_pct: number // Should be <1%
}

// Global Dashboard Filters
export interface DashboardFilters {
  propertyId?: string
  productType?: string
  dateRange?: { start: string; end: string }
  leadBucket?: string
  strategyMode?: 'conservative' | 'balanced' | 'aggressive'
}

// Event/Holiday Uplift Analysis
export interface EventUplift {
  type: string // 'Weekday', 'Weekend', 'Holiday'
  occupancyUplift: number
  priceUplift: number
  count: number
}

// Correlation Heatmap
export interface CorrelationHeatmap {
  features: string[] // ['price', 'occupancy', 'temperature', 'day_of_week']
  matrix: number[][] // correlation matrix [-1..1]
}

// Weather Impact Scatter
export interface WeatherImpact {
  temperature: number[]
  occupancy: number[]
  bookings: number[]
  correlation: number // -1..1
}

// Price-Revenue/Occupancy Frontier
export interface PriceFrontier {
  price: number
  revenue: number
  occupancy: number
}

// Risk-Return Scatter
export interface RiskReturn {
  strategy: string // 'Conservative', 'Balanced', 'Aggressive'
  risk: number // standard deviation
  expectedReturn: number // expected revenue
  count: number
}

// Conformal Prediction Safe Range
export interface ConformalRange {
  intervals: Array<{
    confidence: number // 0.90, 0.95, 0.99
    lower: number
    upper: number
  }>
  recommended: {
    price: number
    lowerBound: number
    upperBound: number
    confidence: number
  }
  currentPrice: number
}
