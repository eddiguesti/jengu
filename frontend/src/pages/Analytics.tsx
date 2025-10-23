import { useSearchParams } from 'react-router-dom'
import { Insights } from './Insights'
import { DirectorDashboard } from './DirectorDashboard'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useNavigationStore } from '@/stores/useNavigationStore'
import { BarChart3, Crown, ToggleRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/**
 * Unified Analytics Page
 *
 * Combines Insights (basic analytics) and Director Dashboard (advanced analytics)
 * into a single page with a view toggle.
 *
 * Controlled by:
 * - URL query param: ?view=advanced
 * - Feature flag: defaultToAdvancedAnalytics
 * - Dashboard store: usePricingDashV2
 */

export const Analytics = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { unifyAnalyticsPages, defaultToAdvancedAnalytics } = useNavigationStore()
  const { usePricingDashV2 } = useDashboardStore()

  // Derive view state from URL query param (single source of truth)
  const queryView = searchParams.get('view')
  const activeView = queryView === 'advanced' || defaultToAdvancedAnalytics ? 'advanced' : 'basic'

  const handleViewChange = (view: 'basic' | 'advanced') => {
    if (view === 'advanced') {
      setSearchParams({ view: 'advanced' })
    } else {
      setSearchParams({}) // Remove query param
    }
  }

  // If analytics pages are NOT unified (flag off), decide which to show
  if (!unifyAnalyticsPages) {
    // Default to Director Dashboard if V2 flag is on, otherwise Insights
    return usePricingDashV2 ? <DirectorDashboard /> : <Insights />
  }

  // Unified view with toggle
  return (
    <div className="space-y-6">
      {/* View Toggle Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
            <p className="text-sm text-gray-400">
              {activeView === 'basic'
                ? 'Comprehensive insights and trend analysis'
                : 'Executive-level analytics with advanced visualizations'}
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-800 p-1">
            <button
              onClick={() => handleViewChange('basic')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeView === 'basic'
                  ? 'bg-[#EBFF57] text-black shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => handleViewChange('advanced')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeView === 'advanced'
                  ? 'bg-[#EBFF57] text-black shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Crown className="h-4 w-4" />
              <span>Advanced View</span>
              <span className="ml-1 rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-400">
                New
              </span>
            </button>
          </div>
        </div>

        {/* View Description */}
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-gray-800/50 p-3">
          {activeView === 'basic' ? (
            <>
              <BarChart3 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#EBFF57]" />
              <div>
                <h3 className="font-semibold text-gray-100">Overview Analytics</h3>
                <p className="text-sm text-gray-400">
                  Weather correlations, forecasting, market sentiment, and AI-powered insights.
                  Perfect for daily analysis and trend monitoring.
                </p>
              </div>
            </>
          ) : (
            <>
              <Crown className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#EBFF57]" />
              <div>
                <h3 className="font-semibold text-gray-100">Advanced Analytics</h3>
                <p className="text-sm text-gray-400">
                  Executive-level dashboards with interactive charts, revenue optimization analysis,
                  elasticity curves, and predictive modeling. Boardroom-grade visualizations.
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Content based on active view */}
      <div className="analytics-content">
        {activeView === 'basic' ? <Insights /> : <DirectorDashboard />}
      </div>

      {/* Quick Toggle FAB (Floating Action Button) */}
      <button
        onClick={() => handleViewChange(activeView === 'basic' ? 'advanced' : 'basic')}
        className="fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        title={`Switch to ${activeView === 'basic' ? 'Advanced' : 'Overview'} View`}
      >
        {activeView === 'basic' ? (
          <>
            <Crown className="h-5 w-5" />
            <span>Advanced</span>
          </>
        ) : (
          <>
            <BarChart3 className="h-5 w-5" />
            <span>Overview</span>
          </>
        )}
        <ToggleRight className="h-5 w-5" />
      </button>
    </div>
  )
}
