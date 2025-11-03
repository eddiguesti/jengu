import { Card, Badge } from '../ui'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Activity, Target } from 'lucide-react'
import type { DemandForecast, WeatherImpactAnalysis } from '../../lib/services/analyticsService'

interface MLAnalyticsCardProps {
  demandForecast: DemandForecast | null
  weatherAnalysis: WeatherImpactAnalysis | null
}

export const MLAnalyticsCard: React.FC<MLAnalyticsCardProps> = ({
  demandForecast,
  weatherAnalysis,
}) => {
  if (!demandForecast && !weatherAnalysis) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Demand Forecast */}
      {demandForecast && demandForecast.forecast && demandForecast.forecast.length > 0 && (
        <Card variant="default">
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-text flex items-center gap-2 text-xl font-semibold">
                  <TrendingUp className="text-primary h-5 w-5" />
                  ML-Powered Demand Forecast
                </h2>
                <p className="text-muted mt-1 text-sm">
                  {demandForecast.forecast.length} days ahead •{' '}
                  {demandForecast.method.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {demandForecast.accuracy && (
                  <>
                    <div className="text-right">
                      <p className="text-muted text-xs">Model Accuracy (R²)</p>
                      <p className="text-primary text-lg font-bold">
                        {(demandForecast.accuracy.r2 * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted text-xs">Error (MAPE)</p>
                      <p className="text-text text-lg font-bold">
                        {demandForecast.accuracy.mape.toFixed(1)}%
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={demandForecast.forecast}>
                <defs>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EBFF57" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EBFF57" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '8px',
                    color: '#FAFAFA',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Predicted Occupancy') {
                      return [`${value}%`, name]
                    }
                    return [value, name]
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="predictedOccupancy"
                  stroke="#EBFF57"
                  strokeWidth={3}
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props
                    const color =
                      payload.confidence === 'high'
                        ? '#10B981'
                        : payload.confidence === 'medium'
                          ? '#EBFF57'
                          : '#F59E0B'
                    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill={color} />
                  }}
                  name="Predicted Occupancy"
                  fill="url(#forecastGradient)"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Confidence Legend */}
            <div className="mt-4 flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="bg-success h-3 w-3 rounded-full" />
                <span className="text-muted">High Confidence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary h-3 w-3 rounded-full" />
                <span className="text-muted">Medium Confidence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-warning h-3 w-3 rounded-full" />
                <span className="text-muted">Low Confidence</span>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Weather Correlation Analysis */}
      {weatherAnalysis && (
        <Card variant="default">
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-text flex items-center gap-2 text-xl font-semibold">
                  <Activity className="text-primary h-5 w-5" />
                  Weather Correlation Analysis
                </h2>
                <p className="text-muted mt-1 text-sm">
                  Statistical relationships between weather and business metrics
                </p>
              </div>
              <Badge
                variant={
                  weatherAnalysis.confidence === 'high'
                    ? 'success'
                    : weatherAnalysis.confidence === 'medium'
                      ? 'default'
                      : 'warning'
                }
                size="md"
              >
                <Target className="mr-1 h-3 w-3" />
                {weatherAnalysis.confidence} confidence
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Temperature ↔ Price */}
              <div className="border-border bg-elevated rounded-xl border p-6 text-center">
                <p className="text-muted mb-2 text-sm">Temperature ↔ Price</p>
                <p
                  className={`mb-2 text-4xl font-bold ${
                    Math.abs(weatherAnalysis.correlations.temperaturePrice) > 0.5
                      ? 'text-success'
                      : Math.abs(weatherAnalysis.correlations.temperaturePrice) > 0.3
                        ? 'text-primary'
                        : 'text-muted'
                  }`}
                >
                  {weatherAnalysis.correlations.temperaturePrice > 0 ? '+' : ''}
                  {weatherAnalysis.correlations.temperaturePrice.toFixed(2)}
                </p>
                <p className="text-muted text-xs">
                  {Math.abs(weatherAnalysis.correlations.temperaturePrice) > 0.5
                    ? 'Strong'
                    : Math.abs(weatherAnalysis.correlations.temperaturePrice) > 0.3
                      ? 'Moderate'
                      : 'Weak'}{' '}
                  correlation
                </p>
              </div>

              {/* Temperature ↔ Occupancy */}
              <div className="border-border bg-elevated rounded-xl border p-6 text-center">
                <p className="text-muted mb-2 text-sm">Temperature ↔ Occupancy</p>
                <p
                  className={`mb-2 text-4xl font-bold ${
                    Math.abs(weatherAnalysis.correlations.temperatureOccupancy) > 0.5
                      ? 'text-success'
                      : Math.abs(weatherAnalysis.correlations.temperatureOccupancy) > 0.3
                        ? 'text-primary'
                        : 'text-muted'
                  }`}
                >
                  {weatherAnalysis.correlations.temperatureOccupancy > 0 ? '+' : ''}
                  {weatherAnalysis.correlations.temperatureOccupancy.toFixed(2)}
                </p>
                <p className="text-muted text-xs">
                  {Math.abs(weatherAnalysis.correlations.temperatureOccupancy) > 0.5
                    ? 'Strong'
                    : Math.abs(weatherAnalysis.correlations.temperatureOccupancy) > 0.3
                      ? 'Moderate'
                      : 'Weak'}{' '}
                  correlation
                </p>
              </div>

              {/* Price ↔ Occupancy */}
              <div className="border-border bg-elevated rounded-xl border p-6 text-center">
                <p className="text-muted mb-2 text-sm">Price ↔ Occupancy</p>
                <p
                  className={`mb-2 text-4xl font-bold ${
                    Math.abs(weatherAnalysis.correlations.priceOccupancy) > 0.5
                      ? 'text-success'
                      : Math.abs(weatherAnalysis.correlations.priceOccupancy) > 0.3
                        ? 'text-primary'
                        : 'text-muted'
                  }`}
                >
                  {weatherAnalysis.correlations.priceOccupancy > 0 ? '+' : ''}
                  {weatherAnalysis.correlations.priceOccupancy.toFixed(2)}
                </p>
                <p className="text-muted text-xs">
                  {Math.abs(weatherAnalysis.correlations.priceOccupancy) > 0.5
                    ? 'Strong'
                    : Math.abs(weatherAnalysis.correlations.priceOccupancy) > 0.3
                      ? 'Moderate'
                      : 'Weak'}{' '}
                  correlation
                </p>
              </div>
            </div>

            {/* Weather Stats */}
            {weatherAnalysis.weatherStats && weatherAnalysis.weatherStats.length > 0 && (
              <div>
                <h3 className="text-text mb-3 text-sm font-semibold">
                  Weather Conditions Breakdown
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {weatherAnalysis.weatherStats.map((stat, index) => (
                    <div key={index} className="border-border bg-elevated rounded-lg border p-4">
                      <p className="text-muted mb-2 text-xs">{stat.weather}</p>
                      <p className="text-text text-lg font-bold">€{stat.avgPrice}</p>
                      <p className="text-muted text-xs">{stat.avgOccupancy}% occupancy</p>
                      <p className="text-muted mt-1 text-xs">{stat.sampleSize} days</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Size Warning */}
            {weatherAnalysis.sampleSize < 30 && (
              <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                <p className="text-xs text-orange-500">
                  <strong>Note:</strong> Sample size ({weatherAnalysis.sampleSize} records) is
                  limited. Upload more historical data for more accurate correlations.
                </p>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
