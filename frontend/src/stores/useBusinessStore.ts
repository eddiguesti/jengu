import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BusinessProfile {
  business_name: string
  location: {
    city: string
    country: string
    latitude: number
    longitude: number
  }
  currency: 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY' | 'AUD' | 'CAD' | 'AED'
  timezone: string
  property_type: 'hotel' | 'resort' | 'vacation_rental' | 'hostel' | 'other'
}

interface BusinessStore {
  // State
  profile: BusinessProfile | null
  isSetup: boolean

  // Actions
  setProfile: (profile: BusinessProfile) => void
  updateProfile: (updates: Partial<BusinessProfile>) => void
  clearProfile: () => void
}

export const useBusinessStore = create<BusinessStore>()(
  persist(
    set => ({
      // Initial state
      profile: null,
      isSetup: false,

      // Actions
      setProfile: profile => set({ profile, isSetup: true }),

      updateProfile: updates =>
        set(state => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),

      clearProfile: () => set({ profile: null, isSetup: false }),
    }),
    {
      name: 'jengu-business-storage',
    }
  )
)
