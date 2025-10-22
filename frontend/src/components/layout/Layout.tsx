import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { SidebarV2 } from './SidebarV2'
import { FloatingAssistant } from './FloatingAssistant'
import { NavigationFlagToggle } from '@/components/dev/NavigationFlagToggle'
import { useNavigationStore } from '@/stores/useNavigationStore'

export const Layout = () => {
  const { useNewNavigation } = useNavigationStore()

  return (
    <div className="bg-background flex min-h-screen">
      {/* Conditionally render sidebar based on feature flag */}
      {useNewNavigation ? <SidebarV2 /> : <Sidebar />}

      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      <FloatingAssistant />

      {/* Dev Tools: Navigation Flag Toggle (only in development) */}
      <NavigationFlagToggle />
    </div>
  )
}
