import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Auth from './pages/Auth'

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Data = lazy(() => import('./pages/Data').then(m => ({ default: m.Data })))
const PricingEngine = lazy(() =>
  import('./pages/PricingEngine').then(m => ({ default: m.PricingEngine }))
)
const Insights = lazy(() => import('./pages/Insights').then(m => ({ default: m.Insights })))
const Assistant = lazy(() => import('./pages/Assistant').then(m => ({ default: m.Assistant })))
const CompetitorMonitor = lazy(() =>
  import('./pages/CompetitorMonitor').then(m => ({ default: m.CompetitorMonitor }))
)
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Loading component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="animate-pulse text-muted">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="data" element={<Data />} />
              <Route path="pricing-engine" element={<PricingEngine />} />
              <Route path="insights" element={<Insights />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="competitor-monitor" element={<CompetitorMonitor />} />
              <Route path="settings" element={<Settings />} />
              {/* 404 Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
