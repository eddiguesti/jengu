import { Card } from '@/components/ui/Card'
import { CloudRain, Sun, ThermometerSun } from 'lucide-react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts'

interface WeatherImpactCardProps {
  weatherSensitivity: number
  optimalTemperatureRange: [number, number]
}

export const WeatherImpactCard: React.FC<WeatherImpactCardProps> = ({
  weatherSensitivity = 0,
  optimalTemperatureRange = [18, 25],
}) => {
  // Create sample data points for temperature vs occupancy visualization
  const generateSampleData = () => {
    const data = []
    const [minTemp, maxTemp] = optimalTemperatureRange

    // Generate scatter points showing temperature-occupancy relationship
    for (let temp = 0; temp <= 35; temp += 2) {
      let occupancy = 50 // base occupancy

      // Occupancy peaks in optimal range
      if (temp >= minTemp && temp <= maxTemp) {
        occupancy = 70 + Math.random() * 20
      } else if (temp < 10 || temp > 30) {
        // Low occupancy in extreme temperatures
        occupancy = 30 + Math.random() * 20
      } else {
        occupancy = 50 + Math.random() * 20
      }

      data.push({
        temperature: temp,
        occupancy: Math.round(occupancy),
        isOptimal: temp >= minTemp && temp <= maxTemp,
      })
    }
    return data
  }

  const scatterData = generateSampleData()

  const getSensitivityLevel = (value: number) => {
    const absValue = Math.abs(value)
    if (absValue > 0.5) return { label: 'High', color: '#EF4444', icon: CloudRain }
    if (absValue > 0.3) return { label: 'Moderate', color: '#EBFF57', icon: Sun }
    return { label: 'Low', color: '#10B981', icon: Sun }
  }

  const sensitivity = getSensitivityLevel(weatherSensitivity)
  const SensitivityIcon = sensitivity.icon

  return (
    <Card>
      <Card.Header>
        <div>
          <h3 className="text-text flex items-center gap-2 text-lg font-semibold">
            <ThermometerSun className="text-primary h-5 w-5" />
            Weather Impact
          </h3>
          <p className="text-muted mt-1 text-sm">How weather affects your bookings</p>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Weather Sensitivity Score */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="bg-elevated border-border rounded-lg border p-4 text-center">
            <p className="text-muted mb-2 text-xs uppercase">Weather Sensitivity</p>
            <div className="flex items-center justify-center gap-2">
              <SensitivityIcon className="h-6 w-6" style={{ color: sensitivity.color }} />
              <span className="text-text text-3xl font-bold">{Math.abs(weatherSensitivity).toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: sensitivity.color }} />
              <span className="text-muted text-xs font-medium">{sensitivity.label} Impact</span>
            </div>
          </div>

          <div className="bg-elevated border-border rounded-lg border p-4 text-center">
            <p className="text-muted mb-2 text-xs uppercase">Optimal Temperature</p>
            <div className="text-primary text-3xl font-bold">
              {optimalTemperatureRange[0]}° - {optimalTemperatureRange[1]}°
            </div>
            <p className="text-muted mt-2 text-xs">Peak booking temperature range</p>
          </div>
        </div>

        {/* Temperature vs Occupancy Scatter */}
        <div className="mb-6">
          <h4 className="text-text mb-3 text-sm font-semibold">Temperature vs Occupancy</h4>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis
                type="number"
                dataKey="temperature"
                name="Temperature"
                unit="°C"
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis
                type="number"
                dataKey="occupancy"
                name="Occupancy"
                unit="%"
                stroke="#9CA3AF"
                fontSize={12}
                domain={[0, 100]}
              />
              <ZAxis range={[50, 200]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'Temperature') return [`${value}°C`, name]
                  return [`${value}%`, name]
                }}
              />
              <Scatter
                data={scatterData}
                fill="#EBFF57"
                shape={(props: any) => {
                  const { cx, cy, payload } = props
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={payload.isOptimal ? '#10B981' : '#EBFF57'}
                      opacity={0.8}
                    />
                  )
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="bg-success h-3 w-3 rounded-full" />
              <span className="text-muted">Optimal Range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-primary h-3 w-3 rounded-full" />
              <span className="text-muted">Other Temperatures</span>
            </div>
          </div>
        </div>

        {/* Weather-Based Pricing Tips */}
        <div className="space-y-3">
          <div className="bg-success/10 border-success/30 rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <Sun className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-success text-sm font-medium">Sunny Days Strategy</p>
                <p className="text-muted mt-1 text-xs">
                  Increase prices by 5-10% when forecast shows temperatures in your optimal range ({optimalTemperatureRange[0]}°-{optimalTemperatureRange[1]}°C). Demand is highest during these conditions.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-warning/10 border-warning/30 rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <CloudRain className="text-warning mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-warning text-sm font-medium">Rainy Days Strategy</p>
                <p className="text-muted mt-1 text-xs">
                  Offer 10-15% discounts when poor weather is forecasted. This can attract price-sensitive customers and maintain occupancy during slow periods.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}
