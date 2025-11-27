import { useState } from 'react'
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
  ChevronDown,
  DollarSign,
  BarChart3,
  Crown,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigationStore } from '@/stores/useNavigationStore'

interface NavItem {
  path: string
  icon: React.ElementType
  label: string
  description?: string
  highlight?: boolean
  badge?: string
  isNew?: boolean
}

interface NavSection {
  id: string
  label: string
  icon?: React.ElementType
  items: NavItem[]
  defaultOpen?: boolean
}

// Navigation Structure with Apple-style icons
const navigationSections: NavSection[] = [
  {
    id: 'home',
    label: 'Home',
    items: [
      {
        path: '/',
        icon: Home,
        label: 'Dashboard',
        description: 'Overview & quick actions',
      },
    ],
    defaultOpen: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: LineChart,
    items: [
      {
        path: '/analytics',
        icon: BarChart3,
        label: 'Overview',
        description: 'Charts & insights',
      },
      {
        path: '/analytics?view=advanced',
        icon: Crown,
        label: 'Advanced View',
        description: 'Executive analytics',
        isNew: true,
        highlight: true,
      },
    ],
    defaultOpen: true,
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: DollarSign,
    items: [
      {
        path: '/pricing/optimizer',
        icon: Sparkles,
        label: 'Price Optimizer',
        description: 'AI recommendations',
        highlight: true,
      },
      {
        path: '/pricing/competitors',
        icon: Building2,
        label: 'Competitor Intel',
        description: 'Market data',
      },
    ],
    defaultOpen: true,
  },
  {
    id: 'data',
    label: 'Data Sources',
    items: [
      {
        path: '/data-sources',
        icon: Database,
        label: 'Manage Data',
        description: 'Upload & enrich files',
      },
    ],
    defaultOpen: false,
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: MessageCircle,
    items: [
      {
        path: '/tools/assistant',
        icon: MessageCircle,
        label: 'AI Assistant',
        description: 'Ask questions',
      },
      {
        path: '/tools/settings',
        icon: Settings,
        label: 'Settings',
        description: 'Configure your account',
      },
    ],
    defaultOpen: false,
  },
]

export const SidebarV2 = () => {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { useGroupedSidebar } = useNavigationStore()

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(navigationSections.filter(s => s.defaultOpen).map(s => s.id))
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isPathActive = (path: string) => {
    if (path.includes('?')) {
      const [basePath, query] = path.split('?')
      return location.pathname === basePath && location.search.includes(query)
    }
    return location.pathname === path
  }

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-border/40 bg-surface/95 backdrop-blur-xl">
      {/* Logo - Premium design */}
      <div className="border-b border-border/40 p-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
            {/* Logo container */}
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-text">Jengu</span>
            <p className="text-[11px] font-medium tracking-wide text-text-tertiary">
              Pricing Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
        <ul className="space-y-1">
          {navigationSections.map(section => {
            const isExpanded = expandedSections.has(section.id)
            const isSingleItem = section.items.length === 1
            const SectionIcon = section.icon

            // Single-item sections render directly
            if (isSingleItem) {
              const item = section.items[0]
              const isActive = isPathActive(item.path)
              const Icon = item.icon

              return (
                <li key={section.id}>
                  <Link
                    to={item.path}
                    className={clsx(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
                      'transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <div
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-primary/15 text-primary'
                          : 'bg-transparent group-hover:bg-surface-hover'
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={clsx('text-sm font-medium', isActive && 'font-semibold')}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            }

            // Flat rendering when grouped sidebar is disabled
            if (!useGroupedSidebar) {
              return (
                <li key={section.id} className="space-y-1">
                  {section.items.map(item => {
                    const isActive = isPathActive(item.path)
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={clsx(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
                          'transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <div
                          className={clsx(
                            'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                            isActive
                              ? 'bg-primary/15 text-primary'
                              : 'bg-transparent group-hover:bg-surface-hover'
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={clsx('text-sm font-medium', isActive && 'font-semibold')}
                            >
                              {item.label}
                            </span>
                            {item.isNew && (
                              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                New
                              </span>
                            )}
                          </div>
                        </div>
                        {item.highlight && (
                          <div className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </li>
              )
            }

            // Grouped/collapsible rendering
            return (
              <li key={section.id} className="space-y-1">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary transition-all duration-200 hover:bg-surface-hover hover:text-text-secondary"
                >
                  {SectionIcon && <SectionIcon className="h-3.5 w-3.5" />}
                  <span className="flex-1 text-left">{section.label}</span>
                  <div
                    className={clsx(
                      'transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </button>

                {/* Section Items with animation */}
                <div
                  className={clsx(
                    'overflow-hidden transition-all duration-300',
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <ul className="space-y-0.5 py-1 pl-2">
                    {section.items.map(item => {
                      const isActive = isPathActive(item.path)
                      const Icon = item.icon

                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={clsx(
                              'group relative flex items-center gap-3 rounded-xl px-3 py-2',
                              'transition-all duration-200',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                            )}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                            )}
                            <div
                              className={clsx(
                                'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200',
                                isActive
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-transparent group-hover:bg-surface-hover'
                              )}
                            >
                              <Icon
                                className="h-4 w-4"
                                strokeWidth={isActive ? 2.5 : 2}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={clsx(
                                    'text-[13px] font-medium',
                                    isActive && 'font-semibold'
                                  )}
                                >
                                  {item.label}
                                </span>
                                {item.isNew && (
                                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                    New
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.highlight && (
                              <div className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                              </div>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile & Logout - Premium design */}
      <div className="border-t border-border/40 p-3">
        {/* User Info Card */}
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-surface-hover/50 p-3 transition-all duration-200 hover:bg-surface-hover">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <User className="h-4 w-4 text-primary" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="truncate text-xs text-text-tertiary">{user?.email}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary transition-all duration-200 hover:bg-error/10 hover:text-error"
        >
          <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2} />
          <span className="font-medium">Sign Out</span>
        </button>

        {/* Version */}
        <div className="mt-3 text-center">
          <p className="text-[10px] font-medium tracking-wider text-text-muted">JENGU v2.0</p>
        </div>
      </div>
    </aside>
  )
}
