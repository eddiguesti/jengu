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

### 2. Enhanced File Upload Validation ✅

**Status**: IMPLEMENTED
**Files**:

- `backend/schemas/upload.schema.ts` (created)
- `backend/utils/csvValidator.ts` (created)
- `backend/routes/files.ts` (modified)

**Changes Made**:

- ✅ Created Zod schema for file upload validation
- ✅ Created CSV content validation (scans for malicious code)
- ✅ Created CSV structure validation (required columns, row limits)
- ✅ Applied 3-layer validation to upload route

**Validation Layers**:

1. **File Size Validation** - Checked before reading file content
2. **Content Security Scanning** - Scans for suspicious patterns:
   - JavaScript injection (`<script>`, event handlers)
   - Code execution attempts (`eval()`, `exec()`)
   - Malicious protocols (`javascript:`, `data:text/html`)
   - iFrame and embed tags
3. **Structure Validation** - Validates CSV format:
   - Required columns (date, price)
   - Non-empty data
   - Row count limits (max 100,000 rows)
   - Valid data types in sample rows

**Testing Required**:

1. Test uploading valid CSV file
2. Test uploading oversized file (> 50MB)
3. Test uploading file with malicious content
4. Test uploading file without required columns
5. Test uploading empty CSV file

**Code Changes**:

```typescript
// Three-layer validation in upload route:
// 1. File size check
const sizeValidation = validateFileSize(req.file.size)

// 2. Content security scan
const fileContent = fs.readFileSync(filePath, 'utf-8')
const contentValidation = validateCSVContent(fileContent)

// 3. Structure validation
const structureValidation = validateCSVStructure(headers, allRows)
```

---

### 3. Error Tracking with Sentry ✅

**Status**: IMPLEMENTED
**Files**:

- `backend/lib/sentry.ts` (created)
- `backend/server.ts` (modified)
- `frontend/src/lib/sentry.ts` (created)
- `frontend/src/main.tsx` (modified)
- `frontend/src/components/ErrorBoundary.tsx` (created)
- `backend/.env.example` (modified)
- `frontend/.env.example` (modified)

**Changes Made**:

- ✅ Installed @sentry/node, @sentry/profiling-node (backend)
- ✅ Installed @sentry/react (frontend)
- ✅ Configured backend Sentry with automatic error capture
- ✅ Configured frontend Sentry with performance monitoring and session replay
- ✅ Created React Error Boundary with Sentry integration
- ✅ Wrapped app in ErrorBoundary component
- ✅ Added Sentry DSN configuration to .env.example files

**Features**:

**Backend:**

- Automatic error capture in all routes
- Performance profiling (10% in prod, 100% in dev)
- Privacy: Scrubs authorization headers and sensitive data
- Ignores validation errors (user input issues)
- Environment-aware configuration

**Frontend:**

- Error boundary catches React render errors
- Session replay on errors (100% of error sessions)
- Performance traces (10% in prod, 100% in dev)
- Privacy: Masks all text and blocks media in replays
- Beautiful fallback UI for errors

**Testing Required**:

1. Test backend error capture (throw error in route)
2. Test frontend error boundary (throw error in component)
3. Test error reporting to Sentry dashboard
4. Test session replay functionality
5. Verify privacy settings (no sensitive data in reports)

**Code Changes**:

```typescript
// Backend - Automatic error capture
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  Sentry.captureException(err, {
    contexts: {
      request: {
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.body,
      },
    },
  })
  // ... error response
})

// Frontend - Error boundary
export class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }
}
```

---

## 🔴 REMAINING CRITICAL FIXES

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

### Completed (3/5)

- ✅ Token Refresh & Session Timeout
- ✅ Enhanced File Upload Validation
- ✅ Sentry Error Tracking

### Remaining (2/5)

- 🔴 Rate Limiting
- 🔴 Bundle Size Optimization

### Estimated Total Time: 3-5 hours remaining

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

1. **Fix #4**: Rate Limiting
2. **Fix #5**: Bundle Size Optimization
3. **Comprehensive Testing**: All fixes together
4. **Deployment**: To staging environment

---

**Document Owner**: Claude Code Agent
**Last Updated**: October 18, 2025
**Status**: In Progress (3/5 complete)
