import { BarChart3, TrendingUp, DollarSign, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/**
 * Analytics Page - Placeholder
 *
 * TODO: Implement analytics dashboard with:
 * - Revenue insights
 * - Demand forecasting
 * - Competitor analysis
 * - Price optimization recommendations
 */

export const Analytics = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">Analytics</h1>
        <p className="text-muted">
          Comprehensive insights and trend analysis for your pricing strategy
        </p>
      </div>

      {/* Placeholder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-text">€24,500</p>
              <p className="text-xs text-success mt-1">+12.5% vs last month</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Avg Occupancy</p>
              <p className="text-3xl font-bold text-text">78%</p>
              <p className="text-xs text-success mt-1">+5.2% vs last month</p>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Avg Price</p>
              <p className="text-3xl font-bold text-text">€185</p>
              <p className="text-xs text-error mt-1">-3.1% vs last month</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Bookings</p>
              <p className="text-3xl font-bold text-text">132</p>
              <p className="text-xs text-success mt-1">+8.3% vs last month</p>
            </div>
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <BarChart3 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text mb-2">Analytics Dashboard Coming Soon</h2>
          <p className="text-muted mb-6">
            We're building a comprehensive analytics dashboard with revenue insights, demand
            forecasting, competitor analysis, and AI-powered recommendations.
          </p>
          <div className="text-sm text-muted">
            <p className="font-semibold mb-2">Planned Features:</p>
            <ul className="text-left space-y-1 max-w-xs mx-auto">
              <li>• Revenue trend analysis</li>
              <li>• Weather impact correlation</li>
              <li>• Demand forecasting models</li>
              <li>• Competitor price tracking</li>
              <li>• AI-powered pricing recommendations</li>
              <li>• Custom report generation</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
