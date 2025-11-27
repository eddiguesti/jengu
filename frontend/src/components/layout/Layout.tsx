import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { SidebarV2 } from './SidebarV2'
import { FloatingAssistant } from './FloatingAssistant'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { useOnboardingStore } from '@/stores/useOnboardingStore'

export const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { hasCompletedOnboarding, hasDismissedOnboarding, completeOnboarding, dismissOnboarding } =
    useOnboardingStore()

  const showOnboarding = !hasCompletedOnboarding && !hasDismissedOnboarding

  return (
    <div className="bg-background flex min-h-screen">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="bg-surface border-border fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg lg:hidden"
      >
        <Menu className="text-text h-5 w-5" />
      </button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 h-full lg:hidden"
            >
              <SidebarV2 />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="bg-surface border-border absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border"
              >
                <X className="text-text h-4 w-4" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarV2 />
      </div>

      <main className="flex-1 p-4 pt-16 lg:ml-64 lg:p-8 lg:pt-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      <FloatingAssistant />

      {/* Onboarding Wizard for new users */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard onComplete={completeOnboarding} onDismiss={dismissOnboarding} />
        )}
      </AnimatePresence>
    </div>
  )
}
