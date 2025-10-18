# Critical Fixes Implementation Plan

**Created**: October 18, 2025
**Based On**: Post-Integration Audit Report
**Priority**: Phase 1 - Critical (Must fix before staging)

---

## ✅ COMPLETED FIXES

### 1. Token Refresh & Session Timeout ✅

**Status**: IMPLEMENTED
**File**: `frontend/src/contexts/AuthContext.tsx`

**Changes Made**:

- Added automatic token refresh handling (Supabase handles this automatically)
- Implemented 30-minute session timeout on inactivity
- Added activity tracking on user interactions (mouse, keyboard, scroll, touch)
- Added timeout checker (runs every minute)
- Added logging for token refresh events
- Updated AuthContext interface to include `lastActivity`

**Testing Required**:

1. Test session timeout after 30 minutes of inactivity
2. Test token refresh (happens automatically by Supabase)
3. Test activity tracking on user interactions
4. Verify auto-logout on timeout

**Code Changes**:

```typescript
// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

// Activity tracking
const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
events.forEach(event => {
  window.addEventListener(event, updateActivity)
})

// Timeout checker (every minute)
timeoutRef.current = setInterval(checkTimeout, 60 * 1000)
```

---

## 🔴 REMAINING CRITICAL FIXES

### 2. Enhanced File Upload Validation

**Status**: PARTIALLY DONE
**Priority**: CRITICAL
**Estimated Time**: 1-2 hours

**Current State**:

- ✅ 50MB file size limit
- ✅ CSV file type check
- ❌ No content validation
- ❌ No malicious code scanning
- ❌ No CSV structure validation

**Implementation Plan**:

#### Step 1: Add Zod Schema for Upload Validation

**File**: `backend/schemas/upload.schema.ts` (create new)

```typescript
import { z } from 'zod'

export const fileUploadSchema = z.object({
  file: z.object({
    mimetype: z.enum(['text/csv', 'application/vnd.ms-excel']),
    size: z.number().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
    originalname: z.string().regex(/\.csv$/i, 'Only CSV files are allowed'),
  }),
})

export const csvContentSchema = z.object({
  headers: z.array(z.string()).min(1, 'CSV must have at least one column'),
  rows: z.array(z.record(z.string(), z.any())).min(1, 'CSV must have at least one row'),
})
```

#### Step 2: Add Content Validation Function

**File**: `backend/utils/csvValidator.ts` (create new)

```typescript
/**
 * Validate CSV content for malicious code
 */
export function validateCSVContent(content: string): { valid: boolean; error?: string } {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i, // JavaScript injection
    /javascript:/i, // JavaScript protocol
    /onerror=/i, // Event handlers
    /onclick=/i,
    /<iframe/i, // iFrames
    /eval\(/i, // eval() calls
    /exec\(/i, // exec() calls
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return {
        valid: false,
        error: `Suspicious content detected: ${pattern.source}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Validate CSV structure
 */
export function validateCSVStructure(
  headers: string[],
  rows: any[]
): {
  valid: boolean
  error?: string
} {
  // Check for required columns
  const requiredColumns = ['date', 'price']
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase())

  for (const required of requiredColumns) {
    if (!normalizedHeaders.some(h => h.includes(required))) {
      return {
        valid: false,
        error: `Missing required column: ${required}`,
      }
    }
  }

  // Check row count
  if (rows.length === 0) {
    return {
      valid: false,
      error: 'CSV file is empty',
    }
  }

  if (rows.length > 100000) {
    return {
      valid: false,
      error: 'CSV file too large (max 100,000 rows)',
    }
  }

  return { valid: true }
}
```

#### Step 3: Apply Validation to Upload Route

**File**: `backend/routes/files.ts` (modify)

```typescript
import { validateCSVContent, validateCSVStructure } from '../utils/csvValidator.js'

router.post('/upload', authenticateUser, upload.single('file'), async (req, res) => {
  // ... existing code ...

  // Add content validation
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const contentValidation = validateCSVContent(fileContent)

  if (!contentValidation.valid) {
    fs.unlinkSync(filePath)
    return res.status(400).json({
      error: 'INVALID_CONTENT',
      message: contentValidation.error,
    })
  }

  // ... continue with existing parsing ...
})
```

---

### 3. Error Tracking with Sentry

**Status**: NOT STARTED
**Priority**: CRITICAL
**Estimated Time**: 2-3 hours

**Implementation Plan**:

#### Step 1: Install Sentry

```bash
# Backend
cd backend
pnpm add @sentry/node @sentry/profiling-node

# Frontend
cd frontend
pnpm add @sentry/react @sentry/browser
```

#### Step 2: Configure Backend Sentry

**File**: `backend/server.ts` (add at top)

```typescript
import * as Sentry from '@sentry/node'
import { ProfilingIntegration } from '@sentry/profiling-node'

// Initialize Sentry
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [new ProfilingIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    environment: process.env.NODE_ENV,
  })
}

// Request handler (before routes)
app.use(Sentry.Handlers.requestHandler())

// ... routes ...

// Error handler (after routes, before custom error handler)
app.use(Sentry.Handlers.errorHandler())
```

#### Step 3: Configure Frontend Sentry

**File**: `frontend/src/main.tsx` (add at top)

```typescript
import * as Sentry from '@sentry/react'

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}
```

#### Step 4: Add Error Boundaries

**File**: `frontend/src/components/ErrorBoundary.tsx` (create new)

```typescript
import * as Sentry from '@sentry/react'
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    Sentry.captureException(error, { contexts: { react: errorInfo } })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text mb-4">
              Something went wrong
            </h1>
            <p className="text-muted mb-4">
              We've been notified and are working on a fix.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
```

#### Step 5: Wrap App with Error Boundary

**File**: `frontend/src/App.tsx`

```typescript
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      {/* existing app content */}
    </ErrorBoundary>
  )
}
```

---

### 4. Rate Limiting Middleware

**Status**: NOT STARTED
**Priority**: CRITICAL
**Estimated Time**: 1-2 hours

**Implementation Plan**:

#### Step 1: Install express-rate-limit

```bash
cd backend
pnpm add express-rate-limit
```

#### Step 2: Create Rate Limiting Middleware

**File**: `backend/middleware/rateLimit.ts` (create new)

```typescript
import rateLimit from 'express-rate-limit'

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Auth endpoints (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: {
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
})

// Upload endpoints (very strict)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    error: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    message: 'Upload limit exceeded, please try again later.',
  },
})

// Pricing endpoints (moderate)
export const pricingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 pricing requests per minute
  message: {
    error: 'PRICING_RATE_LIMIT_EXCEEDED',
    message: 'Too many pricing requests, please slow down.',
  },
})
```

#### Step 3: Apply Rate Limiters

**File**: `backend/server.ts`

```typescript
import { apiLimiter, authLimiter, uploadLimiter, pricingLimiter } from './middleware/rateLimit.js'

// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter)

// Apply specific rate limiters
app.use('/api/auth/signin', authLimiter)
app.use('/api/auth/signup', authLimiter)
app.use('/api/files/upload', uploadLimiter)
app.use('/api/pricing/', pricingLimiter)
```

---

### 5. Bundle Size Optimization with Lazy Loading

**Status**: NOT STARTED
**Priority**: CRITICAL
**Estimated Time**: 2-3 hours

**Implementation Plan**:

#### Step 1: Lazy Load Route Components

**File**: `frontend/src/App.tsx`

```typescript
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Lazy load page components
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Data = lazy(() => import('./pages/Data'))
const Insights = lazy(() => import('./pages/Insights'))
const PricingEngine = lazy(() => import('./pages/PricingEngine'))
const Settings = lazy(() => import('./pages/Settings'))
const Model = lazy(() => import('./pages/Model'))
const CompetitorMonitor = lazy(() => import('./pages/CompetitorMonitor'))
const Assistant = lazy(() => import('./pages/Assistant'))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data" element={<Data />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/pricing" element={<PricingEngine />} />
          <Route path="/settings" element={<Settings />} />
          {/* ... other routes ... */}
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

#### Step 2: Lazy Load Chart Libraries

**File**: `frontend/src/features/pricingDashboard/DashboardShell.tsx`

```typescript
import { lazy, Suspense } from 'react'

// Lazy load chart components
const LineWithBand = lazy(() => import('./components/charts/LineWithBand'))
const HeatmapRevLead = lazy(() => import('./components/charts/HeatmapRevLead'))
const ElasticityCurve = lazy(() => import('./components/charts/ElasticityCurve'))
const WaterfallPrice = lazy(() => import('./components/charts/WaterfallPrice'))

const ChartLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-pulse text-muted">Loading chart...</div>
  </div>
)

export default function DashboardShell() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Suspense fallback={<ChartLoader />}>
        {rev.data && <LineWithBand ... />}
      </Suspense>
      {/* ... other charts ... */}
    </div>
  )
}
```

#### Step 3: Configure Vite Code Splitting

**File**: `frontend/vite.config.ts`

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          charts: ['echarts', 'echarts-for-react', '@ant-design/plots'],
          supabase: ['@supabase/supabase-js'],
          ui: ['framer-motion', 'lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Warn if chunk > 600KB
  },
})
```

---

## 📊 IMPLEMENTATION PROGRESS

### Completed (1/5)

- ✅ Token Refresh & Session Timeout

### Remaining (4/5)

- 🔴 Enhanced File Upload Validation
- 🔴 Sentry Error Tracking
- 🔴 Rate Limiting
- 🔴 Bundle Size Optimization

### Estimated Total Time: 6-10 hours

---

## 🎯 TESTING CHECKLIST

### After Each Fix

- [ ] TypeScript type check passes
- [ ] ESLint passes (or warnings documented)
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Commit with descriptive message

### Before Staging Deployment

- [ ] All 5 critical fixes implemented
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Error tracking configured

---

## 📝 NEXT STEPS

1. **Continue with Fix #2**: Enhanced File Upload Validation
2. **Then Fix #3**: Sentry Error Tracking
3. **Then Fix #4**: Rate Limiting
4. **Then Fix #5**: Bundle Size Optimization
5. **Comprehensive Testing**: All fixes together
6. **Deployment**: To staging environment

---

**Document Owner**: Claude Code Agent
**Last Updated**: October 18, 2025
**Status**: In Progress (1/5 complete)
