import { Card } from '@/components/ui/Card'
import { Calendar, TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts'

interface DemandPatternsCardProps {
  peakDays: string[]
  lowDays: string[]
  demandPatterns: {
    seasonal: Record<string, number>
    dayOfWeek: Record<string, number>
  }
}

export const DemandPatternsCard: React.FC<DemandPatternsCardProps> = ({
  peakDays = [],
  lowDays = [],
  demandPatterns,
}) => {
  // Convert day of week data to chart format
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayOfWeekData = demandPatterns?.dayOfWeek
    ? Object.entries(demandPatterns.dayOfWeek).map(([day, occupancy]) => ({
        name: dayNames[parseInt(day)] || day,
        occupancy: Math.round(occupancy),
        isPeak: peakDays.includes(dayNames[parseInt(day)]),
      }))
    : []

  // Convert seasonal data to chart format
  const seasonalData = demandPatterns?.seasonal
    ? Object.entries(demandPatterns.seasonal).map(([season, occupancy]) => ({
        name: season.charAt(0).toUpperCase() + season.slice(1),
        occupancy: Math.round(occupancy),
      }))
    : []

  return (
    <Card>
      <Card.Header>
        <div>
          <h3 className="text-text flex items-center gap-2 text-lg font-semibold">
            <Calendar className="text-primary h-5 w-5" />
            Demand Patterns
          </h3>
          <p className="text-muted mt-1 text-sm">When your property is most in demand</p>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Peak vs Low Days */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="bg-success/10 border-success/30 rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-success text-xs font-semibold uppercase">Peak Days</span>
              <TrendingUp className="text-success h-4 w-4" />
            </div>
            <div className="flex flex-wrap gap-2">
              {peakDays.length > 0 ? (
                peakDays.map((day, i) => (
                  <span key={i} className="bg-success/20 text-success rounded px-2 py-1 text-xs font-medium">
                    {day}
                  </span>
                ))
              ) : (
                <span className="text-muted text-xs">No data</span>
              )}
            </div>
          </div>

          <div className="bg-warning/10 border-warning/30 rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-warning text-xs font-semibold uppercase">Low Days</span>
              <TrendingUp className="text-warning h-4 w-4 rotate-180" />
            </div>
            <div className="flex flex-wrap gap-2">
              {lowDays.length > 0 ? (
                lowDays.map((day, i) => (
                  <span key={i} className="bg-warning/20 text-warning rounded px-2 py-1 text-xs font-medium">
                    {day}
                  </span>
                ))
              ) : (
                <span className="text-muted text-xs">No data</span>
              )}
            </div>
          </div>
        </div>

        {/* Day of Week Pattern */}
        {dayOfWeekData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-text mb-3 text-sm font-semibold">Weekly Demand Pattern</h4>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Avg Occupancy']}
                />
                <Bar dataKey="occupancy" fill="#EBFF57" radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="occupancy" stroke="#10B981" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Seasonal Pattern */}
        {seasonalData.length > 0 && (
          <div>
            <h4 className="text-text mb-3 text-sm font-semibold">Seasonal Demand Pattern</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={seasonalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Avg Occupancy']}
                />
                <Bar dataKey="occupancy" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Actionable Insight */}
        <div className="bg-primary/10 border-primary/30 mt-6 rounded-lg border p-4">
          <p className="text-text text-sm font-medium">💡 Optimization Tip</p>
          <p className="text-muted mt-2 text-xs leading-relaxed">
            {peakDays.length > 0 && lowDays.length > 0
              ? `Increase prices by 10-20% on ${peakDays.join(', ')} when demand is highest. Consider promotional pricing on ${lowDays.join(', ')} to boost occupancy during slower periods.`
              : 'Upload more historical data to identify your peak and low demand periods for optimal pricing strategies.'}
          </p>
        </div>
      </Card.Body>
    </Card>
  )
}
