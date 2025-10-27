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
        <h1 className="mb-2 text-3xl font-bold text-text">Analytics</h1>
        <p className="text-muted">
          Comprehensive insights and trend analysis for your pricing strategy
        </p>
      </div>

      {/* Placeholder Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-muted">Total Revenue</p>
              <p className="text-3xl font-bold text-text">€24,500</p>
              <p className="mt-1 text-xs text-success">+12.5% vs last month</p>
            </div>
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-muted">Avg Occupancy</p>
              <p className="text-3xl font-bold text-text">78%</p>
              <p className="mt-1 text-xs text-success">+5.2% vs last month</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-muted">Avg Price</p>
              <p className="text-3xl font-bold text-text">€185</p>
              <p className="mt-1 text-xs text-error">-3.1% vs last month</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-muted">Bookings</p>
              <p className="text-3xl font-bold text-text">132</p>
              <p className="mt-1 text-xs text-success">+8.3% vs last month</p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card className="p-12 text-center">
        <div className="mx-auto max-w-md">
          <BarChart3 className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h2 className="mb-2 text-2xl font-bold text-text">Analytics Dashboard Coming Soon</h2>
          <p className="mb-6 text-muted">
            We're building a comprehensive analytics dashboard with revenue insights, demand
            forecasting, competitor analysis, and AI-powered recommendations.
          </p>
          <div className="text-sm text-muted">
            <p className="mb-2 font-semibold">Planned Features:</p>
            <ul className="mx-auto max-w-xs space-y-1 text-left">
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
