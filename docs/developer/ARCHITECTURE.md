# Jengu - Technical Architecture

**Last Updated**: 2025-10-16

This document provides detailed technical architecture for the Jengu dynamic pricing platform. For high-level guidance, see `CLAUDE.md` in the project root.

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Database Schema](#database-schema)
5. [Data Flow](#data-flow)
6. [Where to Add New Code](#where-to-add-new-code)

---

## Directory Structure

### Backend Structure

```
backend/
├── server.ts                  # Main Express server (entry point)
├── lib/
│   └── supabase.ts           # Supabase clients + auth middleware
├── services/                  # Business logic layer
│   ├── dataTransform.ts      # Data validation & transformation
│   ├── enrichmentService.ts  # Weather/holiday/temporal enrichment
│   ├── marketSentiment.ts    # AI insights (Claude integration)
│   └── mlAnalytics.ts        # Statistical analysis & forecasting
├── utils/                     # Utility functions
│   ├── dateParser.ts         # Date parsing helpers
│   ├── errorHandler.ts       # Centralized error handling
│   ├── validators.ts         # Input validation schemas
│   └── weatherCodes.ts       # WMO weather code mapping
├── types/                     # TypeScript type definitions
│   ├── database.types.ts     # Supabase database types
│   ├── express.d.ts          # Express type extensions
│   └── env.d.ts              # Environment variable types
├── dist/                      # Compiled JavaScript output
├── docs/
│   └── README.md             # Backend-specific docs
├── .env.example              # Environment template
├── tsconfig.json             # TypeScript configuration
├── setup-database.js         # Database initialization script (legacy)
├── test-db.js                # Database connection test (legacy)
└── package.json              # Backend dependencies
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Root component with routing
│   ├── index.css             # Global styles (Tailwind)
│   │
│   ├── pages/                # Top-level page components
│   │   ├── Dashboard.tsx     # Main overview dashboard
│   │   ├── Data.tsx          # CSV upload & data management
│   │   ├── Insights.tsx      # ML analytics visualization
│   │   ├── Settings.tsx      # Business profile settings
│   │   ├── PricingEngine.tsx # Pricing recommendations
│   │   ├── CompetitorMonitor.tsx # Competitor tracking
│   │   ├── Model.tsx         # ML model management
│   │   ├── Assistant.tsx     # AI chat assistant
│   │   ├── Login.tsx         # Login page
│   │   ├── SignUp.tsx        # Registration page
│   │   └── Auth.tsx          # Unified auth page
│   │
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base design system components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── index.ts     # Barrel export
│   │   ├── layout/          # Layout components
│   │   │   ├── Layout.tsx   # Main app layout wrapper
│   │   │   ├── Sidebar.tsx  # Navigation sidebar
│   │   │   └── FloatingAssistant.tsx # AI assistant widget
│   │   └── insights/        # Feature-specific components
│   │       ├── AIInsightsCard.tsx
│   │       ├── MLAnalyticsCard.tsx
│   │       └── MarketSentimentCard.tsx
│   │
│   ├── contexts/             # React Context providers
│   │   └── AuthContext.tsx  # Authentication state
│   │
│   ├── store/                # Zustand state stores
│   │   ├── index.ts         # Store exports
│   │   ├── useDataStore.ts  # File upload & pricing data
│   │   └── useBusinessStore.ts # Business settings
│   │
│   ├── lib/                  # Library code & configurations
│   │   ├── supabase.ts      # Supabase client + auth helpers
│   │   ├── chartConfig.ts   # Recharts theme configuration
│   │   ├── api/
│   │   │   └── client.ts    # Axios instance with auth
│   │   └── services/        # Type-safe API service layer
│   │       ├── data.ts      # File upload services
│   │       ├── enrichment.ts # Enrichment services
│   │       ├── insights.ts  # Analytics services
│   │       ├── weather.ts   # Weather API services
│   │       ├── holidays.ts  # Holiday API services
│   │       ├── geocoding.ts # Geocoding services
│   │       ├── competitor.ts # Competitor services
│   │       ├── makcorps.ts  # Hotel API services
│   │       └── assistant.ts # AI assistant services
│   │
│   └── vite-env.d.ts         # Vite TypeScript declarations
│
├── public/                   # Static assets
│   └── sample_booking_data.csv
├── vite.config.ts            # Vite build configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Frontend dependencies
```

---

## Backend Architecture

**Language**: TypeScript 5+ with strict mode enabled. All source files use `.ts` extension and are compiled to JavaScript in `dist/` directory.

### Server Entry Point (`server.ts`)

Single 1500+ line TypeScript file containing:

- Express app initialization
- Middleware (CORS, rate limiting, JSON parsing)
- Multer file upload configuration
- All API route handlers (~20 endpoints)
- Error handling middleware
- Graceful shutdown handlers

**Why single file?**

- Small API surface (20 endpoints)
- Easy to find code (no jumping between files)
- Simple deployment model
- TypeScript provides type safety without needing multiple files
- Can refactor later if needed

**TypeScript Benefits**:
- Full type checking on request/response objects
- Auto-completion in editors
- Compile-time error detection
- Type-safe middleware and route handlers

### Service Layer

All services are written in TypeScript with full type annotations.

#### `services/dataTransform.ts`

- `transformDataForAnalytics()` - Normalizes CSV data for ML
- `validateDataQuality()` - Checks for missing values, outliers
- Data cleaning and type coercion
- Fully typed data transformation pipeline

#### `services/enrichmentService.ts`

- `enrichWithWeather()` - Fetches historical weather from Open-Meteo
- `enrichWithTemporalFeatures()` - Adds day of week, season, is_weekend
- `enrichWithHolidays()` - Marks holidays (TODO: needs Supabase migration)
- `enrichPropertyData()` - Orchestrates all enrichment
- Type-safe enrichment with proper error handling

**Note**: Holiday enrichment currently disabled pending Supabase migration.

#### `services/mlAnalytics.ts`

- `generateAnalyticsSummary()` - Computes descriptive statistics
- `analyzeWeatherImpact()` - Correlations between weather & price
- `forecastDemand()` - Simple moving average forecasting
- `calculateFeatureImportance()` - Correlation-based feature ranking
- `analyzeCompetitorPricing()` - Competitor price comparison
- All analytics functions fully typed

#### `services/marketSentiment.ts`

- `analyzeMarketSentiment()` - Weighted scoring algorithm
- `generateClaudeInsights()` - AI-powered insights via Anthropic API
- `generatePricingRecommendations()` - Price adjustment suggestions
- Type-safe AI integration

### Authentication Architecture

**Flow**:

1. Frontend: User signs in → Supabase Auth → JWT token
2. Frontend: Stores JWT in localStorage (auto-managed by Supabase)
3. Frontend: `apiClient` axios instance intercepts requests, adds `Authorization: Bearer <token>`
4. Backend: `authenticateUser` middleware validates JWT via Supabase
5. Backend: Attaches `req.userId` to request
6. Backend: Uses `userId` to filter queries (manual RLS)

**Database Clients**:

- `supabaseAdmin` (service role key) - Bypasses RLS, used for all backend operations
- `supabase` (anon key) - Respects RLS, rarely used in backend

**Why manual filtering?**
Backend uses service role for batch operations and admin tasks. RLS is enforced at application level.

### File Upload Pipeline

```
1. POST /api/files/upload
   ↓
2. Multer saves to backend/uploads/
   ↓
3. Create property record (status: 'processing')
   ↓
4. Stream CSV with csv-parser
   ↓
5. Batch insert (1000 rows/batch) to pricing_data
   ↓
6. Delete local CSV file
   ↓
7. Return success response
   ↓
8. setImmediate() → Background enrichment
   ↓
9. Fetch business_settings for coordinates
   ↓
10. enrichPropertyData() pipeline
    ├── enrichWithTemporalFeatures() (always)
    ├── enrichWithWeather() (if coordinates exist)
    └── enrichWithHolidays() (if API key exists - currently disabled)
   ↓
11. Update property.enrichmentStatus = 'completed'
```

---

## Frontend Architecture

### Routing Structure (`App.tsx`)

```typescript
<AuthContext>
  {' '}
  // Wraps entire app
  <Routes>
    <Route path="/login" /> // Public
    <Route path="/signup" /> // Public
    <Route element={<ProtectedRoute />}>
      {' '}
      // Requires auth
      <Route element={<Layout />}>
        {' '}
        // Sidebar + content
        <Route path="/" element={<Dashboard />} />
        <Route path="/data" element={<Data />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings" element={<Settings />} />
        {/* ... other protected routes */}
      </Route>
    </Route>
  </Routes>
</AuthContext>
```

### State Management Strategy

**Zustand Stores** (client-side state):

- `useDataStore` - Uploaded files, pricing data arrays
- `useBusinessStore` - Business profile (name, location, property type)

**React Context**:

- `AuthContext` - User session, sign in/out functions

**Server State**:

- No React Query (yet) - using plain `axios` calls
- Consider adding TanStack Query for caching

### API Client Pattern

```typescript
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
})

// Interceptor adds JWT automatically
apiClient.interceptors.request.use(async config => {
  const token = await getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// lib/api/services/data.ts
export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post('/api/files/upload', formData)
}
```

### Component Hierarchy

```
App
└── Layout (if authenticated)
    ├── Sidebar
    │   └── Navigation links
    └── Page Content
        └── Page-specific components
            ├── UI components (Button, Card, etc.)
            ├── Feature components (AIInsightsCard)
            └── Charts (Recharts)
```

---

## Database Schema

### Tables Overview

**`properties`** - Metadata for uploaded CSV files

- `id` (UUID, PK)
- `userId` (UUID, FK to auth.users) - **RLS filter**
- `name` (text) - Internal filename
- `originalName` (text) - User's filename
- `size` (bigint) - File size in bytes
- `rows` (int) - Number of data rows
- `columns` (int) - Number of columns
- `status` (text) - 'processing' | 'complete' | 'error'
- `enrichmentStatus` (text) - 'none' | 'completed' | 'failed'
- `enrichedAt` (timestamp)
- `enrichmentError` (text)
- `uploadedAt` (timestamp, default now())

**`pricing_data`** - Time-series pricing records

- `id` (UUID, PK)
- `propertyId` (UUID, FK to properties, ON DELETE CASCADE)
- `date` (date) - Booking date
- `price` (decimal)
- `occupancy` (decimal) - 0.0 to 1.0
- `bookings` (int)
- Core enriched fields:
  - `temperature` (decimal)
  - `precipitation` (decimal)
  - `weatherCondition` (text)
  - `sunshineHours` (decimal)
  - `dayOfWeek` (int) - 0-6
  - `month` (int) - 1-12
  - `season` (text) - 'Winter' | 'Spring' | 'Summer' | 'Fall'
  - `isWeekend` (boolean)
  - `isHoliday` (boolean)
  - `holidayName` (text)
- `extraData` (jsonb) - Original CSV row (all columns preserved)

**RLS**: Filtered via `properties.userId` join

**`business_settings`** - User's business profile

- `id` (UUID, PK)
- `userid` (UUID, FK to auth.users) - **RLS filter** (lowercase!)
- `business_name` (text)
- `property_type` (text) - 'Hotel' | 'Hostel' | 'Apartment' | etc.
- `city` (text)
- `country` (text) - ISO code
- `latitude` (decimal)
- `longitude` (decimal)
- `currency` (text) - ISO code
- `timezone` (text)
- `createdat` (timestamp)
- `updatedat` (timestamp)

**Note**: Column names are lowercase (`userid`, `createdat`) due to PostgreSQL conventions.

### RLS Policies

All tables have Row-Level Security enabled. Policies defined in `backend/prisma/supabase-rls-policies.sql`:

```sql
-- properties: Users can only see their own files
CREATE POLICY "Users can view own properties" ON properties
  FOR SELECT USING (auth.uid() = "userId");

-- pricing_data: Users can only see data for their files
CREATE POLICY "Users can view own pricing data" ON pricing_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = pricing_data."propertyId"
      AND properties."userId" = auth.uid()
    )
  );

-- business_settings: Users can only see their own settings
CREATE POLICY "Users can view own settings" ON business_settings
  FOR SELECT USING (auth.uid() = userid);
```

---

## Data Flow

### CSV Upload → Enrichment

```
User uploads CSV
  ↓
Frontend: POST /api/files/upload with multipart/form-data
  ↓
Backend: Multer saves to backend/uploads/TIMESTAMP-filename.csv
  ↓
Backend: Create property record (status: 'processing')
  ↓
Backend: Stream CSV rows
  ├── Normalize column names (lowercase, trim)
  ├── Map columns: date, price, occupancy, bookings, temperature, weather
  ├── Parse types safely (date, float, int)
  └── Batch insert 1000 rows at a time to pricing_data
  ↓
Backend: Update property (status: 'complete', rows, columns)
  ↓
Backend: Delete CSV file from disk
  ↓
Backend: Return response { success: true, file: {...} }
  ↓
Backend: setImmediate() async enrichment
  ├── Fetch user's business_settings for coordinates
  ├── If coordinates exist:
  │   ├── enrichWithTemporalFeatures() - always runs
  │   ├── enrichWithWeather() - calls Open-Meteo API
  │   └── enrichWithHolidays() - currently disabled
  └── Update property.enrichmentStatus = 'completed'
```

### Analytics Flow

```
User clicks "Analyze" on Data page
  ↓
Frontend: Fetch data via GET /api/files/:fileId/data
  ↓
Backend: Query pricing_data (paginated, max 10K rows)
  ↓
Frontend: Store in useDataStore
  ↓
Frontend: Navigate to /insights
  ↓
Insights page: POST /api/analytics/summary with data array
  ↓
Backend: services/mlAnalytics.generateAnalyticsSummary()
  ├── Descriptive stats (mean, median, std dev)
  ├── Time series analysis
  ├── Correlation matrix
  └── Data quality report
  ↓
Frontend: Render charts (Recharts) and AI insights cards
  ↓
Optional: POST /api/analytics/ai-insights
  ↓
Backend: services/marketSentiment.generateClaudeInsights()
  ↓
Backend: Call Anthropic Claude API
  ↓
Frontend: Display natural language insights
```

---

## Where to Add New Code

### Adding a New API Endpoint

**File**: `backend/server.ts`

```typescript
// Add after existing endpoints, before error handlers

app.post('/api/your-endpoint', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId // From auth middleware (typed in express.d.ts)
    const { param1, param2 } = req.body

    // Validate input
    if (!param1) {
      return res.status(400).json({ error: 'Missing param1' })
    }

    // Query database (always filter by userId)
    const { data, error } = await supabaseAdmin
      .from('your_table')
      .select('*')
      .eq('userId', userId)

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    console.error('Your Endpoint Error:', error)
    res.status(500).json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})
```

**Note**: TypeScript provides type safety for `req.userId` through custom type definitions in `backend/types/express.d.ts`.

### Adding a New Service Function

**File**: Create `backend/services/yourService.ts` OR add to existing service

```typescript
/**
 * Your service function
 * @param param - Description
 * @returns Description
 */
export async function yourServiceFunction(param: YourParamType): Promise<YourReturnType> {
  // Implementation with full type safety

  return result
}
```

**Import in server.ts**:

```typescript
import { yourServiceFunction } from './services/yourService.js'
// Note: .js extension in import (ESM convention), TypeScript resolves to .ts file
```

**Best Practices**:
- Always provide explicit return types
- Use TypeScript interfaces for complex data structures
- Prefer `unknown` over `any` when type is truly unknown
- Use type guards for runtime type validation

### Adding a New Frontend Page

1. **Create**: `frontend/src/pages/YourPage.tsx`

```typescript
import { Card } from '@/components/ui'

export default function YourPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Your Page</h1>
      <Card>{/* Content */}</Card>
    </div>
  )
}
```

2. **Add route** in `App.tsx`:

```typescript
<Route path="/your-page" element={<YourPage />} />
```

3. **Add navigation** in `Sidebar.tsx`:

```typescript
<NavLink to="/your-page">Your Page</NavLink>
```

### Adding a New API Service

**File**: `frontend/src/lib/api/services/yourService.ts`

```typescript
import { apiClient } from '../client'

export interface YourResponse {
  success: boolean
  data: YourData
}

export const yourService = {
  async fetchSomething(id: string): Promise<YourResponse> {
    const response = await apiClient.get(`/api/your-endpoint/${id}`)
    return response.data
  },

  async createSomething(payload: YourPayload): Promise<YourResponse> {
    const response = await apiClient.post('/api/your-endpoint', payload)
    return response.data
  },
}
```

**Use in component**:

```typescript
import { yourService } from '@/lib/api/services/yourService'

const handleClick = async () => {
  const result = await yourService.fetchSomething('123')
  console.log(result)
}
```

### Adding a New UI Component

**File**: `frontend/src/components/ui/YourComponent.tsx`

```typescript
import { cn } from '@/lib/utils' // if you add this utility

interface YourComponentProps {
  variant?: 'default' | 'primary'
  children: React.ReactNode
  className?: string
}

export function YourComponent({
  variant = 'default',
  children,
  className,
}: YourComponentProps) {
  return (
    <div className={cn('base-classes', variantClasses[variant], className)}>
      {children}
    </div>
  )
}
```

**Export** from `frontend/src/components/ui/index.ts`:

```typescript
export { YourComponent } from './YourComponent'
```

### Adding a New Database Table

1. **Create SQL** in `backend/prisma/create-tables.sql`:

```sql
CREATE TABLE IF NOT EXISTS "your_table" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "field1" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_your_table_userId" ON "your_table"("userId");
```

2. **Add RLS policies** in `backend/prisma/supabase-rls-policies.sql`:

```sql
ALTER TABLE "your_table" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records" ON "your_table"
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own records" ON "your_table"
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own records" ON "your_table"
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own records" ON "your_table"
  FOR DELETE USING (auth.uid() = "userId");
```

3. **Run setup**:

```bash
cd backend
node setup-database.js
```

---

## Design Patterns & Conventions

### Error Handling

**Backend**:

- Always use try-catch in route handlers
- Return structured errors: `{ error: string, message: string }`
- Log errors with `console.error()` including context

**Frontend**:

- Use try-catch in async functions
- Display user-friendly messages
- Consider adding error boundaries for crash protection

### API Response Format

**Success**:

```json
{
  "success": true,
  "data": { ... }
}
```

**Error**:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### File Naming

- Backend TypeScript: camelCase (e.g., `mlAnalytics.ts`, `server.ts`)
- Frontend Components: PascalCase (e.g., `Button.tsx`, `Dashboard.tsx`)
- Frontend Utilities: camelCase (e.g., `chartConfig.ts`, `apiClient.ts`)
- Type Definitions: camelCase with `.d.ts` or `.types.ts` (e.g., `database.types.ts`)

### Code Style

**Backend**:

- TypeScript strict mode (all files use `.ts` extension)
- ES modules (`import`/`export`)
- Async/await (no callbacks)
- Descriptive console logs with emojis (📊 🌤️ ✅ ❌)
- TypeScript JSDoc comments for complex functions
- Explicit return types on all exported functions

**Frontend**:

- TypeScript strict mode (`.tsx` for components, `.ts` for utilities)
- Functional components only
- Hooks for state/effects
- Tailwind for styling
- Explicit prop types using TypeScript interfaces

**Code Quality**:

- ESLint 9 enforces TypeScript best practices
- Prettier handles all formatting
- Run `pnpm run check-all` from root before commits
- See `docs/developer/CODE_QUALITY.md` for details

---

## External API Integration

### Open-Meteo (Historical Weather)

- **URL**: `https://archive-api.open-meteo.com/v1/archive`
- **Auth**: None required (free)
- **Usage**: Automatic enrichment after CSV upload
- **Endpoint**: Backend calls directly (not exposed to frontend)

### Anthropic Claude (AI Insights)

- **Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Auth**: API key in `ANTHROPIC_API_KEY`
- **Usage**: `/api/analytics/ai-insights` and `/api/assistant/message`
- **Rate Limiting**: Backend enforces 60 req/min per IP

### Supabase (Database + Auth)

- **Database**: PostgreSQL with REST API
- **Auth**: JWT-based authentication
- **Usage**: All data persistence + user authentication
- **Clients**: Admin client (service role) in backend, anon client in frontend

### Calendarific (Holidays)

- **Auth**: API key in `CALENDARIFIC_API_KEY`
- **Usage**: Holiday enrichment (currently disabled)
- **TODO**: Needs migration to Supabase queries

### Nominatim (Geocoding)

- **URL**: `https://nominatim.openstreetmap.org`
- **Auth**: None (requires User-Agent header)
- **Fallback**: Mapbox if `MAPBOX_TOKEN` provided
- **Usage**: Address → coordinates in Settings page

---

## Performance Considerations

### Backend

- **Streaming**: CSV parsing uses streams (not loading entire file into memory)
- **Batch Operations**: Database inserts in batches of 1000
- **Background Jobs**: Enrichment runs via `setImmediate()` after response sent
- **Rate Limiting**: 60 requests/minute per IP (in-memory, resets on restart)

### Frontend

- **Code Splitting**: Vite automatically splits by route
- **Lazy Loading**: Consider for chart libraries
- **Bundle Size**: Monitor with `pnpm run build`
- **Caching**: No client-side caching yet (add React Query?)

---

## Security

### Authentication

- JWT tokens from Supabase Auth
- Tokens stored in localStorage (managed by Supabase client)
- Backend validates on every request
- Automatic token refresh

### Authorization

- Row-Level Security policies on all tables
- Backend manually filters by `userId` (using service role)
- No user can access another user's data

### Input Validation

- CSV: Only accepts `.csv` files, 50MB max
- API: Validate all inputs before processing
- SQL: Supabase client handles parameterization

### Secrets

- Never commit `.env` files
- Use environment variables for all API keys
- Service role key only in backend

---

## Testing Strategy

**Current state**: No automated tests yet

---

## Deployment

**Current**: Development only (localhost)

**Production checklist**:

1. Set `NODE_ENV=production`
2. Configure frontend `VITE_API_URL` to production backend
3. Use production Supabase project
4. Enable HTTPS
5. Set proper CORS origins
6. Increase rate limits or add Redis-based limiting
7. Add monitoring (e.g., Sentry)
8. Set up CI/CD (GitHub Actions)

---

## Troubleshooting

See `CLAUDE.md` in project root for common troubleshooting steps.

For detailed service documentation, check:

- `backend/services/README.md` (if exists)
- `backend/utils/README.md` (exists - utilities documentation)
- `frontend/src/components/README.md` (if exists)

---

**This document should be updated whenever:**

- New files/directories are added
- Database schema changes
- New external APIs are integrated
- Major architectural decisions are made
- New patterns are established
