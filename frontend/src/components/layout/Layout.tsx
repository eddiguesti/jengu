import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { FloatingAssistant } from './FloatingAssistant'

export const Layout = () => {
  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
      <FloatingAssistant />
    </div>
  )
}
