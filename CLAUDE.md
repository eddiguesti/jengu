# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See @docs/tasks.md for task management

## Project Overview

**Jengu** is a dynamic pricing intelligence platform for hospitality businesses. It's a full-stack monorepo with React frontend and Node.js/Express backend, using Supabase PostgreSQL for database and authentication.

## Technology Stack

### Backend (`backend/`)
- **Runtime**: Node.js 20+ with ES modules
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL (via REST API + Supabase JS Client)
- **Auth**: Supabase Auth (JWT tokens)
- **File Processing**: Multer (uploads), csv-parser (streaming CSV)
- **Package Manager**: pnpm

### Frontend (`frontend/`)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Charts**: Recharts
- **Routing**: React Router v6
- **Auth**: Supabase Auth
- **Package Manager**: pnpm

### External APIs
- **Anthropic Claude**: AI insights (Claude Sonnet 4.5)
- **Open-Meteo**: Historical weather data (free, no API key)
- **OpenWeather**: Current/forecast weather
- **Nominatim**: Geocoding (free, with Mapbox fallback)
- **Calendarific**: Holiday data

## Development Commands

### Start Development Servers

```bash
# Backend (port 3001)
cd backend
pnpm run dev

# Frontend (port 5173)
cd frontend
pnpm run dev
```

The backend uses Node's `--watch` flag for auto-restart. Frontend uses Vite HMR.

### Build & Type Check

```bash
# Frontend build (with TypeScript check)
cd frontend
pnpm run build:check

# Frontend build (skip TypeScript check)
pnpm run build

# Preview production build
pnpm run preview
```

### Database Setup

```bash
# Run database setup script (creates tables + RLS policies)
cd backend
node setup-database.js

# Test database connection
node test-db.js
```

**Note**: If automated setup fails, manually run SQL files in Supabase dashboard:
1. `backend/prisma/create-tables.sql` (creates tables)
2. `backend/prisma/supabase-rls-policies.sql` (sets up RLS)

## Architecture

### Monorepo Structure

The project uses pnpm workspaces defined in `pnpm-workspace.yaml`:
- `backend/` - Express API server
- `frontend/` - React SPA

### Backend Architecture

**Entry Point**: `backend/server.js`

**Key Services** (`backend/services/`):
- `mlAnalytics.js` - Statistical analysis, demand forecasting, feature importance
- `marketSentiment.js` - AI-powered insights using Claude, pricing recommendations
- `dataTransform.js` - Data validation and transformation
- `enrichmentService.js` - Automatic weather/holiday data enrichment

**Authentication Flow**:
1. Frontend gets JWT from Supabase Auth (`supabase.auth.signInWithPassword()`)
2. JWT sent in `Authorization: Bearer <token>` header to backend
3. Backend middleware `authenticateUser()` validates JWT and extracts user ID
4. User ID attached to `req.userId` for RLS queries

**Database Access**:
- `supabaseAdmin` - Service role key, bypasses RLS (for admin operations, batch inserts)
- `supabase` - Anon key, respects RLS (not used much in backend)

**File Upload Pipeline**:
1. CSV uploaded via Multer to `backend/uploads/`
2. Streaming CSV parser processes rows
3. Batch insert (1000 rows/batch) to `pricing_data` table
4. Automatic enrichment runs in background (weather + holidays)
5. Original CSV deleted after import

### Frontend Architecture

**Entry Point**: `frontend/src/main.tsx` → `App.tsx`

**Routing** (`App.tsx`):
- Protected routes wrapped in `AuthContext`
- Public: `/login`, `/signup`
- Protected: `/`, `/data`, `/insights`, `/settings`, etc.

**State Management**:
- `useDataStore.ts` - Zustand store for uploaded files and pricing data
- `useBusinessStore.ts` - Business settings (location, property type)
- `AuthContext.tsx` - Auth state and user info

**API Client** (`frontend/src/lib/api/`):
- `client.ts` - Axios instance with auth interceptor (auto-adds JWT)
- `services/` - Type-safe API service functions

**Key Pages** (`frontend/src/pages/`):
- `Data.tsx` - CSV upload, file management, data preview
- `Insights.tsx` - ML analytics dashboard
- `Settings.tsx` - Business profile with geocoding
- `PricingEngine.tsx` - Pricing recommendations
- `CompetitorMonitor.tsx` - Competitor tracking

### Database Schema

**Tables**:
- `properties` - Uploaded CSV files metadata
  - Links to user via `userId` (auth.users)
  - Tracks enrichment status
- `pricing_data` - Time-series pricing records
  - Foreign key to `properties.id` (CASCADE delete)
  - Contains date, price, occupancy, weather data, holidays
- `business_settings` - User's business profile
  - One-to-one with user (via `userid`)
  - Stores location (lat/lon), property type, currency

**RLS Policies**:
- All tables have RLS enabled
- Users can only access their own data (filtered by `userId` or `userid`)
- Policies defined in `backend/prisma/supabase-rls-policies.sql`

### Data Enrichment Pipeline

When a CSV is uploaded:
1. File metadata saved to `properties` table
2. Rows parsed and batch-inserted to `pricing_data`
3. Background enrichment triggered (via `setImmediate`):
   - Fetches user's business settings for coordinates
   - Calls Open-Meteo API for historical weather
   - Matches dates to holidays (Calendarific API)
   - Updates `pricing_data` rows with enriched fields
   - Marks property as `enrichmentStatus: 'completed'`

Enrichment runs automatically if user has set coordinates in Settings. Can also be triggered manually via `/api/files/:fileId/enrich`.

## API Endpoints

**Health**: `GET /health`

**Files**:
- `POST /api/files/upload` - Upload CSV (authenticated)
- `GET /api/files` - List user's files
- `GET /api/files/:fileId/data` - Get pricing data (paginated)
- `DELETE /api/files/:fileId` - Delete file
- `POST /api/files/:fileId/enrich` - Manual enrichment

**Analytics**:
- `POST /api/analytics/summary` - Comprehensive analytics
- `POST /api/analytics/weather-impact` - Weather correlation analysis
- `POST /api/analytics/demand-forecast` - Demand forecasting
- `POST /api/analytics/feature-importance` - Feature importance scores
- `POST /api/analytics/ai-insights` - Claude-powered insights
- `POST /api/analytics/pricing-recommendations` - Pricing suggestions

**External APIs**:
- `POST /api/weather/historical` - Open-Meteo historical data
- `GET /api/weather/current` - OpenWeather current
- `GET /api/weather/forecast` - OpenWeather 5-day forecast
- `GET /api/geocoding/forward` - Address to coordinates
- `GET /api/geocoding/reverse` - Coordinates to address

**Settings**:
- `GET /api/settings` - Get user's business settings
- `POST /api/settings` - Save/update settings

## Environment Setup

### Backend `.env`
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

ANTHROPIC_API_KEY=sk-ant-...
OPENWEATHER_API_KEY=your-key
CALENDARIFIC_API_KEY=your-key
MAPBOX_TOKEN=pk.your-token (optional, Nominatim fallback exists)
```

### Frontend `.env`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

See `backend/.env.example` for full list.

## Common Development Patterns

### Adding a New API Endpoint

1. Add route handler in `backend/server.js`
2. Use `authenticateUser` middleware if requires auth
3. Access user ID via `req.userId`
4. Use `supabaseAdmin` for database operations
5. Add TypeScript types in frontend
6. Create service function in `frontend/src/lib/api/services/`

### Working with Supabase

**Backend queries** (always use `supabaseAdmin`):
```javascript
const { data, error } = await supabaseAdmin
  .from('properties')
  .select('*')
  .eq('userId', req.userId)  // Manually filter by user
  .single();
```

**Frontend queries** (use `supabase` from `lib/supabase.ts`):
```typescript
const { data, error } = await supabase
  .from('properties')
  .select('*');  // RLS automatically filters by authenticated user
```

### Authentication Flow

**Frontend login**:
```typescript
import { signIn } from '@/lib/supabase';
const { session } = await signIn(email, password);
// Session automatically stored in localStorage
```

**Backend API calls**:
```typescript
import { apiClient } from '@/lib/api/client';
// JWT automatically added to Authorization header
const response = await apiClient.get('/api/files');
```

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

### Stale Data in Frontend
1. Open DevTools → Application tab
2. Clear Local Storage and Session Storage
3. Hard refresh (Ctrl+Shift+R)

### Database Connection Issues
- Verify Supabase credentials in `.env`
- Check Supabase project status in dashboard
- Ensure RLS policies are created
- Test with `backend/test-db.js`

### Authentication Issues
- Clear browser localStorage
- Verify JWT token is being sent (Network tab)
- Check Supabase Auth dashboard for user status
- Ensure RLS policies allow authenticated access

## Code Style & Conventions

- **Backend**: ES modules, async/await, descriptive console logs with emojis
- **Frontend**: TypeScript strict mode, functional components, hooks
- **File naming**: camelCase for .js/.ts, PascalCase for React components
- **API responses**: Always return `{ success: boolean, data?: any, error?: string }`
- **Error handling**: Try-catch blocks with descriptive error messages
- **Comments**: JSDoc style for functions, inline comments for complex logic

## Important Notes

- Never run `pnpm run dev` unless user explicitly asks - suggest they run it instead
- Always use `pnpm` not `npm` (workspace management)
- Backend auto-restarts with `--watch` flag (no nodemon needed)
- CSV uploads are streamed (not loaded into memory) for large files
- Enrichment runs asynchronously after upload response sent
- All dates stored as ISO 8601 strings in database
- Weather codes mapped via `backend/utils/weatherCodes.js`
- Rate limiting: 60 requests/minute per IP (in-memory, resets on restart)
