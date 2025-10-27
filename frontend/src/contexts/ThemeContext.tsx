import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize theme from localStorage or system preference
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    console.log('🎨 Initializing theme - localStorage value:', stored)
    if (stored) return stored

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      console.log('🎨 Using system preference: dark')
      return 'dark'
    }
    console.log('🎨 Using default: light')
    return 'light'
  })

  // Update document class and localStorage when theme changes
  useEffect(() => {
    console.log('🎨 Theme effect triggered - theme value:', theme)
    const root = window.document.documentElement

    // Force remove both classes first
    root.classList.remove('light', 'dark')
    console.log('🎨 Removed all theme classes')

    // Add the new theme class
    root.classList.add(theme)
    console.log('🎨 Added class:', theme)

    // Store in localStorage
    localStorage.setItem('theme', theme)
    console.log('🎨 Saved to localStorage:', theme)

    // Log final state
    console.log('✨ Theme applied:', theme, '- HTML classes:', root.classList.toString())
    console.log('✨ Document element:', root)
  }, [theme])

  // Listen to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setThemeState(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
