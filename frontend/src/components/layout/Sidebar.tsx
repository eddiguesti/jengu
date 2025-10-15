import { Link, useLocation } from 'react-router-dom'
import { Home, Database, Zap, LineChart, MessageCircle, Settings, Sparkles, Building2, LogOut, User } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../contexts/AuthContext'

// Workflow Order: Setup → Data Collection → Analysis → Optimization → Monitor
const navItems = [
  { path: '/settings', icon: Settings, label: '1. Settings', description: 'Setup your business' },
  { path: '/data', icon: Database, label: '2. Upload Data', description: 'Import your pricing data' },
  { path: '/competitor-monitor', icon: Building2, label: '3. Market Data', description: 'Collect competitor prices' },
  { path: '/insights', icon: LineChart, label: '4. Insights', description: 'Analyze trends' },
  { path: '/pricing-engine', icon: Zap, label: '5. Optimize Prices', description: 'AI recommendations', highlight: true },
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
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold text-primary">Jengu</span>
        </div>
        <p className="text-sm text-muted mt-1">Dynamic Pricing Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    'hover:bg-elevated group relative',
                    isActive
                      ? 'bg-elevated text-primary border-l-4 border-primary'
                      : 'text-muted hover:text-text',
                    item.highlight && 'ring-1 ring-primary/20'
                  )}
                >
                  <Icon className={clsx('w-5 h-5 flex-shrink-0', isActive && 'text-primary')} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-muted truncate">{item.description}</div>
                    )}
                  </div>
                  {item.highlight && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-border space-y-3">
        {/* User Info */}
        <div className="bg-elevated rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                     bg-elevated hover:bg-red-500/10 hover:text-red-500
                     text-muted transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
