import { TrendingUp, AlertCircle, Settings as SettingsIcon } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useNavigate } from 'react-router-dom'

/**
 * Competitor Monitor - Placeholder
 * TODO: Implement competitor price monitoring
 */

export const CompetitorMonitor = () => {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">Competitor Monitor</h1>
        <p className="text-muted">Track competitor pricing and market trends in real-time</p>
      </div>

      {/* Stats Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Your Position</p>
              <p className="text-2xl font-bold text-text">Competitive</p>
              <p className="text-xs text-success mt-1">Within 5% of market avg</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Market Avg Price</p>
              <p className="text-2xl font-bold text-text">€178</p>
              <p className="text-xs text-muted mt-1">Based on 12 competitors</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Price Alerts</p>
              <p className="text-2xl font-bold text-text">3 Active</p>
              <p className="text-xs text-warning mt-1">2 triggered today</p>
            </div>
            <AlertCircle className="w-8 h-8 text-warning" />
          </div>
        </Card>
      </div>

      {/* Configuration Notice */}
      <Card className="p-8 border-warning border-2">
        <div className="flex items-start gap-4">
          <SettingsIcon className="w-8 h-8 text-warning flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text mb-2">Configure Your Location</h3>
            <p className="text-muted mb-4">
              To start monitoring competitor prices, please configure your business location in
              Settings.
            </p>
            <Button onClick={() => navigate('/tools/settings')} className="bg-primary text-black">
              Go to Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Coming Soon */}
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <TrendingUp className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text mb-2">Competitor Monitoring Coming Soon</h2>
          <p className="text-muted mb-6">
            We're building comprehensive competitor monitoring with real-time price tracking, market
            analysis, and automated alerts.
          </p>
          <div className="text-sm text-muted">
            <p className="font-semibold mb-2">Planned Features:</p>
            <ul className="text-left space-y-1 max-w-xs mx-auto">
              <li>• Real-time competitor price scraping</li>
              <li>• Price trend analysis & charts</li>
              <li>• Market positioning insights</li>
              <li>• Automated price alerts</li>
              <li>• Competitive gap analysis</li>
              <li>• Historical price tracking</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
