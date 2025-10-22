import { create } from 'zustand'
import type { DashboardFilters } from '@/types/analytics'

interface DashboardState {
  // Global filters
  filters: DashboardFilters

  // Feature flag
  usePricingDashV2: boolean

  // Selected date for drill-down (waterfall)
  selectedDate: string | null

  // Hover sync state
  hoveredDate: string | null

  // Actions
  setFilter: <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => void
  setFilters: (filters: Partial<DashboardFilters>) => void
  resetFilters: () => void
  toggleDashboardVersion: () => void
  setSelectedDate: (date: string | null) => void
  setHoveredDate: (date: string | null) => void
}

const DEFAULT_FILTERS: DashboardFilters = {
  propertyId: undefined,
  productType: undefined,
  dateRange: undefined,
  leadBucket: undefined,
  strategyMode: 'balanced',
}

export const useDashboardStore = create<DashboardState>((set) => ({
  // Initial state
  filters: DEFAULT_FILTERS,
  usePricingDashV2: false, // Feature flag - set to true to enable new dashboard
  selectedDate: null,
  hoveredDate: null,

  // Actions
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  resetFilters: () =>
    set({
      filters: DEFAULT_FILTERS,
      selectedDate: null,
    }),

  toggleDashboardVersion: () =>
    set((state) => ({
      usePricingDashV2: !state.usePricingDashV2,
    })),

  setSelectedDate: (date) => set({ selectedDate: date }),

  setHoveredDate: (date) => set({ hoveredDate: date }),
}))
