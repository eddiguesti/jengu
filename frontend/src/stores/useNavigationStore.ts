import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Navigation Feature Flags Store
 *
 * Controls the rollout of new IA/navigation structure.
 * Flags can be toggled in dev tools or via UI toggle.
 */

export interface NavigationFlags {
  // Core Navigation
  useNewNavigation: boolean // Master flag: Enable new IA structure
  useGroupedSidebar: boolean // Collapsible section groups
  dashboardAsRoot: boolean // Make Dashboard the root route

  // Analytics Unification
  unifyAnalyticsPages: boolean // Merge Insights + Director into single page
  defaultToAdvancedAnalytics: boolean // Show V2 charts by default in unified view

  // Pricing Section
  usePricingSectionGroup: boolean // Group Price Optimizer + Competitor Intel

  // Data Section
  enhancedDataView: boolean // Enhanced Data Sources page with tabs

  // Onboarding & Discovery
  showQuickStartWizard: boolean // Show first-time user wizard
  highlightCoreActions: boolean // Spotlight quick actions on Dashboard
  showWhatsNew: boolean // Show "What's New" modal after IA migration

  // Experimental
  useCompactSidebar: boolean // Compact sidebar mode (icons only)
  enableBreadcrumbs: boolean // Show breadcrumb navigation
}

interface NavigationState extends NavigationFlags {
  // Actions
  toggleFlag: (flag: keyof NavigationFlags) => void
  setFlag: (flag: keyof NavigationFlags, value: boolean) => void
  resetFlags: () => void
  enableAllFlags: () => void
  disableAllFlags: () => void

  // Derived state
  isNewNavigationActive: () => boolean
  getActiveFlags: () => Partial<NavigationFlags>
}

// Default flags (NEW NAVIGATION ENABLED BY DEFAULT)
const DEFAULT_FLAGS: NavigationFlags = {
  useNewNavigation: true, // ✅ NEW NAVIGATION ACTIVE
  useGroupedSidebar: true, // ✅ COLLAPSIBLE SECTIONS
  dashboardAsRoot: true, // ✅ DASHBOARD AS ROOT

  unifyAnalyticsPages: true, // ✅ UNIFIED ANALYTICS PAGE
  defaultToAdvancedAnalytics: false, // Start with basic view

  usePricingSectionGroup: true, // ✅ GROUPED PRICING SECTION

  enhancedDataView: false, // Future enhancement

  showQuickStartWizard: false, // For first-time users only
  highlightCoreActions: true, // ✅ SHOW QUICK ACTIONS
  showWhatsNew: false, // Show after migration (one-time)

  useCompactSidebar: false, // Experimental
  enableBreadcrumbs: false, // Future enhancement
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      // Initialize with default flags
      ...DEFAULT_FLAGS,

      // Actions
      toggleFlag: flag =>
        set(state => ({
          [flag]: !state[flag],
        })),

      setFlag: (flag, value) =>
        set({
          [flag]: value,
        }),

      resetFlags: () => set(DEFAULT_FLAGS),

      enableAllFlags: () =>
        set({
          useNewNavigation: true,
          useGroupedSidebar: true,
          dashboardAsRoot: true,
          unifyAnalyticsPages: true,
          defaultToAdvancedAnalytics: false, // Keep this off by default
          usePricingSectionGroup: true,
          enhancedDataView: true,
          showQuickStartWizard: false, // Only for first-time users
          highlightCoreActions: true,
          showWhatsNew: true,
          useCompactSidebar: false,
          enableBreadcrumbs: true,
        }),

      disableAllFlags: () => set(DEFAULT_FLAGS),

      // Derived state helpers
      isNewNavigationActive: () => get().useNewNavigation,

      getActiveFlags: () => {
        const state = get()
        const activeFlags: Partial<NavigationFlags> = {}

        Object.keys(DEFAULT_FLAGS).forEach(key => {
          const flagKey = key as keyof NavigationFlags
          if (state[flagKey]) {
            activeFlags[flagKey] = true
          }
        })

        return activeFlags
      },
    }),
    {
      name: 'jengu-navigation-flags', // LocalStorage key
      // Only persist flags that should survive page refresh
      partialize: state => ({
        useNewNavigation: state.useNewNavigation,
        useGroupedSidebar: state.useGroupedSidebar,
        dashboardAsRoot: state.dashboardAsRoot,
        unifyAnalyticsPages: state.unifyAnalyticsPages,
        defaultToAdvancedAnalytics: state.defaultToAdvancedAnalytics,
        usePricingSectionGroup: state.usePricingSectionGroup,
        enhancedDataView: state.enhancedDataView,
        useCompactSidebar: state.useCompactSidebar,
        enableBreadcrumbs: state.enableBreadcrumbs,
        // Don't persist onboarding flags (should be session-based)
      }),
    }
  )
)

/**
 * Dev Tools Hook
 * Exposes navigation flags to browser console for testing
 */
if (typeof window !== 'undefined' && import.meta.env.MODE === 'development') {
  ;(window as any).navigationFlags = {
    get: () => useNavigationStore.getState().getActiveFlags(),
    enable: (flag?: keyof NavigationFlags) => {
      if (flag) {
        useNavigationStore.getState().setFlag(flag, true)
        console.log(`✅ Enabled flag: ${flag}`)
      } else {
        useNavigationStore.getState().enableAllFlags()
        console.log('✅ Enabled all navigation flags')
      }
    },
    disable: (flag?: keyof NavigationFlags) => {
      if (flag) {
        useNavigationStore.getState().setFlag(flag, false)
        console.log(`❌ Disabled flag: ${flag}`)
      } else {
        useNavigationStore.getState().disableAllFlags()
        console.log('❌ Disabled all navigation flags')
      }
    },
    toggle: (flag: keyof NavigationFlags) => {
      useNavigationStore.getState().toggleFlag(flag)
      const newValue = useNavigationStore.getState()[flag]
      console.log(`🔄 Toggled ${flag}: ${newValue}`)
    },
    reset: () => {
      useNavigationStore.getState().resetFlags()
      console.log('🔄 Reset all flags to default')
    },
    list: () => {
      const flags = useNavigationStore.getState()
      console.table(
        Object.keys(DEFAULT_FLAGS).map(key => ({
          Flag: key,
          Enabled: flags[key as keyof NavigationFlags] ? '✅' : '❌',
        }))
      )
    },
  }

  console.log(
    '%c🚀 Navigation Flags Dev Tools',
    'background: #EBFF57; color: #000; font-size: 14px; padding: 4px 8px; border-radius: 4px;'
  )
  console.log('Use window.navigationFlags.list() to see all flags')
  console.log('Use window.navigationFlags.enable("flagName") to enable a flag')
  console.log('Use window.navigationFlags.toggle("flagName") to toggle a flag')
}
