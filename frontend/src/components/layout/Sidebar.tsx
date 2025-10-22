import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Database,
  Zap,
  LineChart,
  MessageCircle,
  Settings,
  Building2,
  LogOut,
  User,
  Crown,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../contexts/AuthContext'

// Workflow Order: Setup → Data Collection → Analysis → Optimization → Monitor
const navItems = [
  { path: '/settings', icon: Settings, label: '1. Settings', description: 'Setup your business' },
  {
    path: '/data',
    icon: Database,
    label: '2. Upload Data',
    description: 'Import your pricing data',
  },
  {
    path: '/competitor-monitor',
    icon: Building2,
    label: '3. Market Data',
    description: 'Collect competitor prices',
  },
  { path: '/insights', icon: LineChart, label: '4. Insights', description: 'Analyze trends' },
  {
    path: '/pricing-engine',
    icon: Zap,
    label: '5. Optimize Prices',
    description: 'AI recommendations',
    highlight: true,
  },
  { path: '/dashboard', icon: Home, label: 'Dashboard', description: 'Overview & metrics' },
  {
    path: '/director',
    icon: Crown,
    label: 'Director View',
    description: 'Executive analytics',
    highlight: true,
  },
  { path: '/assistant', icon: MessageCircle, label: 'AI Assistant', description: 'Ask questions' },
]

export const Sidebar = () => {
  const location = useLocation()
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
      // User will be redirected to login by the ProtectedRoute
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <aside className="border-border bg-card fixed left-0 top-0 flex h-screen w-64 flex-col border-r">
      {/* Logo */}
      <div className="border-border border-b p-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-primary/20 absolute inset-0 rounded-full blur-xl"></div>
            <div className="from-primary to-primary/60 shadow-primary/25 relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg">
              <Zap className="text-background h-6 w-6" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <span className="text-text text-2xl font-bold tracking-tight">Jengu</span>
            <p className="text-muted text-xs font-medium">AI Pricing Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-hide flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200',
                    'hover:bg-elevated group relative',
                    isActive
                      ? 'border-primary bg-elevated text-primary border-l-4'
                      : 'text-muted hover:text-text',
                    item.highlight && 'ring-primary/20 ring-1'
                  )}
                >
                  <Icon className={clsx('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-muted truncate text-xs">{item.description}</div>
                    )}
                  </div>
                  {item.highlight && (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                      <span className="bg-primary relative inline-flex h-3 w-3 rounded-full"></span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile & Logout */}
      <div className="border-border space-y-3 border-t p-4">
        {/* User Info */}
        <div className="bg-elevated flex items-center gap-3 rounded-lg p-3">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
            <User className="text-primary h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-text truncate text-sm font-medium">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-muted truncate text-xs">{user?.email}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="bg-elevated text-muted group flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all duration-200 hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>Logout</span>
        </button>

        {/* Footer */}
        <div className="text-center">
          <p className="text-muted text-xs">Jengu v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
