import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingStore {
  hasCompletedOnboarding: boolean
  hasDismissedOnboarding: boolean
  completeOnboarding: () => void
  dismissOnboarding: () => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      hasDismissedOnboarding: false,

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true })
      },

      dismissOnboarding: () => {
        set({ hasDismissedOnboarding: true })
      },

      resetOnboarding: () => {
        set({ hasCompletedOnboarding: false, hasDismissedOnboarding: false })
      },
    }),
    {
      name: 'jengu-onboarding',
    }
  )
)
