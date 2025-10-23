import { useState } from 'react'
import { Settings, X, Check } from 'lucide-react'
import { useNavigationStore } from '@/stores/useNavigationStore'
import type { NavigationFlags } from '@/stores/useNavigationStore'
import { Card } from '@/components/ui/Card'

/**
 * Dev Tools Component for Testing Navigation Flags
 * Only shown in development mode
 *
 * Usage: Add <NavigationFlagToggle /> to Layout component
 */

export function NavigationFlagToggle() {
  const [isOpen, setIsOpen] = useState(false)
  const navigationStore = useNavigationStore()

  // Only show in development
  if (import.meta.env.MODE !== 'development') {
    return null
  }

  const flagDescriptions: Record<keyof NavigationFlags, string> = {
    useNewNavigation: 'Master flag: Enable new IA structure',
    useGroupedSidebar: 'Collapsible section groups',
    dashboardAsRoot: 'Make Dashboard the root route',
    unifyAnalyticsPages: 'Merge Insights + Director pages',
    defaultToAdvancedAnalytics: 'Show V2 charts by default',
    usePricingSectionGroup: 'Group Price Optimizer + Competitors',
    enhancedDataView: 'Enhanced Data Sources tabs',
    showQuickStartWizard: 'Show first-time user wizard',
    highlightCoreActions: 'Spotlight quick actions',
    showWhatsNew: "Show 'What's New' modal",
    useCompactSidebar: 'Compact sidebar (icons only)',
    enableBreadcrumbs: 'Show breadcrumb navigation',
  }

  const flagCategories = {
    'Core Navigation': [
      'useNewNavigation',
      'useGroupedSidebar',
      'dashboardAsRoot',
    ] as (keyof NavigationFlags)[],
    Analytics: ['unifyAnalyticsPages', 'defaultToAdvancedAnalytics'] as (keyof NavigationFlags)[],
    'Pricing & Data': ['usePricingSectionGroup', 'enhancedDataView'] as (keyof NavigationFlags)[],
    'Onboarding & Discovery': [
      'showQuickStartWizard',
      'highlightCoreActions',
      'showWhatsNew',
    ] as (keyof NavigationFlags)[],
    Experimental: ['useCompactSidebar', 'enableBreadcrumbs'] as (keyof NavigationFlags)[],
  }

  const activeFlagsCount = Object.keys(navigationStore.getActiveFlags()).length

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        title="Toggle Navigation Flags"
      >
        <Settings className="animate-spin-slow h-6 w-6" />
        {activeFlagsCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            {activeFlagsCount}
          </span>
        )}
      </button>

      {/* Modal Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 p-4">
              <div>
                <h2 className="text-xl font-bold text-gray-100">Navigation Feature Flags</h2>
                <p className="text-sm text-gray-400">
                  Toggle flags to test new IA structure (Dev Only)
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Quick Actions */}
              <div className="mb-6 flex gap-2">
                <button
                  onClick={() => navigationStore.enableAllFlags()}
                  className="flex-1 rounded-lg bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20"
                >
                  Enable All
                </button>
                <button
                  onClick={() => navigationStore.disableAllFlags()}
                  className="flex-1 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Disable All
                </button>
                <button
                  onClick={() => navigationStore.resetFlags()}
                  className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-600"
                >
                  Reset
                </button>
              </div>

              {/* Flag Categories */}
              <div className="space-y-6">
                {Object.entries(flagCategories).map(([category, flags]) => (
                  <div key={category}>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {flags.map(flag => {
                        const isEnabled = navigationStore[flag]

                        return (
                          <label
                            key={flag}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-700 p-3 transition-all hover:border-gray-600 hover:bg-gray-800/50"
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded transition-all ${
                                  isEnabled ? 'bg-[#EBFF57]' : 'border-2 border-gray-600'
                                }`}
                              >
                                {isEnabled && <Check className="h-4 w-4 text-black" />}
                              </div>
                            </div>
                            <div
                              className="flex-1"
                              onClick={() => navigationStore.toggleFlag(flag)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-200">{flag}</span>
                                {isEnabled && (
                                  <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs font-bold uppercase text-green-400">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-gray-400">{flagDescriptions[flag]}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Active Flags Summary */}
              <div className="mt-6 rounded-lg bg-gray-800 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-300">Active Flags</h3>
                {activeFlagsCount === 0 ? (
                  <p className="text-sm text-gray-500">No flags enabled</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(navigationStore.getActiveFlags()).map(([flag]) => (
                      <span
                        key={flag}
                        className="rounded-full bg-[#EBFF57] px-3 py-1 text-xs font-medium text-black"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-700 p-4">
              <p className="text-xs text-gray-500">
                💡 Tip: Changes persist in localStorage. Use console:{' '}
                <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono">
                  window.navigationFlags.list()
                </code>
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

// Add to tailwind config for custom animation
// animate-spin-slow: { animation: 'spin 3s linear infinite' }
