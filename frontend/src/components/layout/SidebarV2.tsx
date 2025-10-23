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
  ChevronRight,
  DollarSign,
  BarChart3,
  Crown,
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

// New IA Navigation Structure
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
        icon: Zap,
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
    // Handle query params for view toggle
    if (path.includes('?')) {
      const [basePath, query] = path.split('?')
      return location.pathname === basePath && location.search.includes(query)
    }
    return location.pathname === path
  }

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl"></div>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
              <Zap className="h-6 w-6 text-background" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold tracking-tight text-text">Jengu</span>
            <p className="text-xs font-medium text-muted">AI Pricing Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-hide flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {navigationSections.map(section => {
            const isExpanded = expandedSections.has(section.id)
            const isSingleItem = section.items.length === 1
            const SectionIcon = section.icon

            // For single-item sections, render directly without collapsible header
            if (isSingleItem) {
              const item = section.items[0]
              const isActive = isPathActive(item.path)
              const Icon = item.icon

              return (
                <li key={section.id}>
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
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{item.label}</span>
                        {item.isNew && (
                          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-background">
                            New
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="truncate text-xs text-muted">{item.description}</div>
                      )}
                    </div>
                  </Link>
                </li>
              )
            }

            // For multi-item sections, render collapsible group
            if (!useGroupedSidebar) {
              // Flat rendering when grouped sidebar is disabled
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
                          'flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200',
                          'group relative hover:bg-elevated',
                          isActive
                            ? 'border-l-4 border-primary bg-elevated text-primary'
                            : 'text-muted hover:text-text',
                          item.highlight && 'ring-1 ring-primary/20'
                        )}
                      >
                        <Icon
                          className={clsx('h-5 w-5 flex-shrink-0', isActive && 'text-primary')}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{item.label}</span>
                            {item.isNew && (
                              <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-background">
                                New
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="truncate text-xs text-muted">{item.description}</div>
                          )}
                        </div>
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
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted transition-all hover:bg-elevated hover:text-text"
                >
                  {SectionIcon && <SectionIcon className="h-4 w-4" />}
                  <span className="flex-1 text-left">{section.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Section Items */}
                {isExpanded && (
                  <ul className="space-y-1 pl-2">
                    {section.items.map(item => {
                      const isActive = isPathActive(item.path)
                      const Icon = item.icon

                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={clsx(
                              'flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-200',
                              'group relative hover:bg-elevated',
                              isActive
                                ? 'border-l-4 border-primary bg-elevated text-primary'
                                : 'text-muted hover:text-text',
                              item.highlight && 'ring-1 ring-primary/20'
                            )}
                          >
                            <Icon
                              className={clsx('h-4 w-4 flex-shrink-0', isActive && 'text-primary')}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">{item.label}</span>
                                {item.isNew && (
                                  <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-background">
                                    New
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <div className="truncate text-xs text-muted">
                                  {item.description}
                                </div>
                              )}
                            </div>
                            {item.highlight && (
                              <span className="absolute -right-1 -top-1 flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
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
          <p className="text-xs text-muted">Jengu v2.0.0</p>
        </div>
      </div>
    </aside>
  )
}
