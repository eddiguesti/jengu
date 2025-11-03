import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeSwitcherProps {
  className?: string
  showLabel?: boolean
}

export function ThemeSwitcher({ className = '', showLabel = false }: ThemeSwitcherProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`ease-smooth focus-ring border-border bg-surface duration-fast hover:border-border-hover hover:bg-surface-hover hover:shadow-md-light dark:hover:shadow-md-dark group relative flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm transition-all ${className} `}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Icon container with rotation animation */}
      <div className="relative h-5 w-5">
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'dark' ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.45, 0, 0.15, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="text-primary h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.45, 0, 0.15, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="text-primary h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Optional label */}
      {showLabel && (
        <span className="text-text-secondary group-hover:text-text text-sm font-medium">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}

      {/* Hover effect - subtle glow */}
      <div className="bg-primary/5 duration-fast pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

/* Alternative: Compact toggle switch version */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`ease-smooth focus-ring relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'} ${className} `}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Sliding indicator */}
      <motion.div
        layout
        className={`bg-primary flex h-6 w-6 items-center justify-center rounded-full shadow-md ${theme === 'dark' ? 'ml-7' : 'ml-1'} `}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'dark' ? (
            <motion.div
              key="moon"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Moon className="text-background h-3.5 w-3.5" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sun className="text-background h-3.5 w-3.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  )
}

/* Alternative: Segmented control version */
export function ThemeSegmentedControl({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className={`border-border bg-surface relative flex items-center gap-1 rounded-lg border p-1 shadow-sm ${className} `}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {/* Background indicator */}
      <motion.div
        layout
        className="bg-primary/10 absolute h-8 w-[calc(50%-0.25rem)] rounded-md shadow-sm"
        initial={false}
        animate={{
          x: theme === 'dark' ? 'calc(100% + 0.25rem)' : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 40,
        }}
      />

      {/* Light button */}
      <button
        onClick={() => setTheme('light')}
        className={`focus-ring duration-fast relative z-10 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
          theme === 'light' ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
        } `}
        role="radio"
        aria-checked={theme === 'light'}
      >
        <Sun className="h-4 w-4" />
        <span className="text-sm font-medium">Light</span>
      </button>

      {/* Dark button */}
      <button
        onClick={() => setTheme('dark')}
        className={`focus-ring duration-fast relative z-10 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
          theme === 'dark' ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
        } `}
        role="radio"
        aria-checked={theme === 'dark'}
      >
        <Moon className="h-4 w-4" />
        <span className="text-sm font-medium">Dark</span>
      </button>
    </div>
  )
}
