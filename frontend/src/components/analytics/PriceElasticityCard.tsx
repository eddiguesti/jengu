import { Card } from '@/components/ui/Card'
import { TrendingDown, Info } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface PriceElasticityCardProps {
  elasticity: number
  weekendPremium: number
  holidayPremium: number
}

export const PriceElasticityCard: React.FC<PriceElasticityCardProps> = ({
  elasticity = 0,
  weekendPremium = 0,
  holidayPremium = 0,
}) => {
  // Interpret elasticity
  const getElasticityInterpretation = (value: number) => {
    const absValue = Math.abs(value)
    if (absValue > 2.5) return { label: 'Very Elastic', color: '#EF4444', desc: 'Customers very sensitive to price changes' }
    if (absValue > 1.5) return { label: 'Elastic', color: '#F59E0B', desc: 'Customers sensitive to price changes' }
    if (absValue > 0.8) return { label: 'Moderately Elastic', color: '#EBFF57', desc: 'Balanced price sensitivity' }
    return { label: 'Inelastic', color: '#10B981', desc: 'Price changes have minimal impact on demand' }
  }

  const interpretation = getElasticityInterpretation(elasticity)

  const premiumData = [
    { name: 'Weekday', value: 0, fill: '#6B7280' },
    { name: 'Weekend', value: weekendPremium * 100, fill: '#EBFF57' },
    { name: 'Holiday', value: holidayPremium * 100, fill: '#10B981' },
  ]

  return (
    <Card>
      <Card.Header>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-text flex items-center gap-2 text-lg font-semibold">
              <TrendingDown className="text-primary h-5 w-5" />
              Price Elasticity
            </h3>
            <p className="text-muted mt-1 text-sm">How demand responds to price changes</p>
          </div>
          <div className="group relative">
            <Info className="text-muted h-5 w-5 cursor-help" />
            <div className="bg-elevated border-border absolute right-0 top-6 z-10 hidden w-64 rounded-lg border p-3 text-xs shadow-lg group-hover:block">
              <p className="text-text font-semibold">What is Price Elasticity?</p>
              <p className="text-muted mt-1">
                Measures how much demand changes when you change prices.
                -1.2 means: 10% price increase → 12% demand decrease.
              </p>
            </div>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Main Elasticity Value */}
        <div className="mb-6 text-center">
          <div className="mb-2">
            <span className="text-text text-5xl font-bold">{elasticity.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: interpretation.color }}
            />
            <span className="text-muted text-sm font-medium">{interpretation.label}</span>
          </div>
          <p className="text-muted mt-2 text-xs">{interpretation.desc}</p>
        </div>

        {/* Premium Pricing Opportunities */}
        <div className="border-border border-t pt-6">
          <h4 className="text-text mb-4 text-sm font-semibold">Premium Pricing Opportunities</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={premiumData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `+${v}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`+${value.toFixed(1)}%`, 'Premium']}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {premiumData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="bg-primary/10 border-primary/30 mt-6 rounded-lg border p-4">
          <p className="text-text text-sm font-medium">💡 Pricing Strategy</p>
          <p className="text-muted mt-2 text-xs leading-relaxed">
            {Math.abs(elasticity) > 1.5
              ? 'Your customers are price-sensitive. Focus on competitive pricing and value-adds rather than aggressive price increases.'
              : 'You have pricing power. Customers are less sensitive to price changes, so you can increase prices during peak periods without losing much demand.'}
          </p>
        </div>
      </Card.Body>
    </Card>
  )
}
