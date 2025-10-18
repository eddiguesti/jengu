import { create } from 'zustand'

type DashboardState = {
  propertyId: string | null
  dateRange: { start: string; end: string } | null
  leadBucket: string | null // "0-1" | "2-7" | "8-21" | "22-90"
  strategy: 'conservative' | 'balanced' | 'aggressive'
  productType: string | null
  set: (s: Partial<DashboardState>) => void
}

export const useDashboardStore = create<DashboardState>(set => ({
  propertyId: null,
  dateRange: null,
  leadBucket: null,
  strategy: 'balanced',
  productType: null,
  set: s => set(s),
}))
