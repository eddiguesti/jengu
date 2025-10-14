import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { FloatingAssistant } from './FloatingAssistant'

export const Layout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <FloatingAssistant />
    </div>
  )
}
