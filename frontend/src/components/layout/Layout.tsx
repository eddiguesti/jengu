import { Outlet } from 'react-router-dom'
import { SidebarV2 } from './SidebarV2'
import { FloatingAssistant } from './FloatingAssistant'
import { NavigationFlagToggle } from '@/components/dev/NavigationFlagToggle'

export const Layout = () => {
  return (
    <div className="bg-background flex min-h-screen">
      {/* Use SidebarV2 (new navigation) */}
      <SidebarV2 />

      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      <FloatingAssistant />

      {/* Dev Tools: Navigation Flag Toggle - Disabled to avoid covering AI Assistant */}
      {/* <NavigationFlagToggle /> */}
    </div>
  )
}
