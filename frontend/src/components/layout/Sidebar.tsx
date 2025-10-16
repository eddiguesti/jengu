import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Database,
  Zap,
  LineChart,
  MessageCircle,
  Settings,
  Sparkles,
  Building2,
  LogOut,
  User,
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
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-primary">Jengu</span>
        </div>
        <p className="mt-1 text-sm text-muted">Dynamic Pricing Platform</p>
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
                    'group relative hover:bg-elevated',
                    isActive
                      ? 'border-l-4 border-primary bg-elevated text-primary'
                      : 'text-muted hover:text-text',
                    item.highlight && 'ring-1 ring-primary/20'
                  )}
                >
                  <Icon className={clsx('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.label}</div>
                    {item.description && (
                      <div className="truncate text-xs text-muted">{item.description}</div>
                    )}
                  </div>
                  {item.highlight && (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile & Logout */}
      <div className="space-y-3 border-t border-border p-4">
        {/* User Info */}
        <div className="flex items-center gap-3 rounded-lg bg-elevated p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-2 rounded-lg bg-elevated px-4 py-2 text-sm text-muted transition-all duration-200 hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>Logout</span>
        </button>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted">Jengu v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
