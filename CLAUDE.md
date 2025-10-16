# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Structure

- **This file (CLAUDE.md)** - High-level guidance, principles, and quick-start
- **`docs/developer/ARCHITECTURE.md`** - Detailed technical architecture, directory structures, and "where to put code" guide
- **`docs/developer/`** - Evergreen developer documentation for specific subsystems
- **`docs/tasks.md`** - Task management system

**Always check `docs/developer/` for detailed documentation before making architectural changes.**

## Project Overview

Jengu is a dynamic pricing intelligence platform for hospitality businesses. Full-stack TypeScript/JavaScript monorepo:

- **Backend**: Node.js + Express API server
- **Frontend**: React 18 + TypeScript SPA
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (JWT)
- **Monorepo**: pnpm workspaces

## Technology Stack

### Backend

- **Runtime**: Node.js 20+ with ES modules
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL (via Supabase JS Client)
- **Auth**: Supabase Auth with JWT validation
- **File Processing**: Streaming CSV with multer + csv-parser
- **Package Manager**: **pnpm** (always use pnpm, not npm)

### Frontend

- **Framework**: React 18 + TypeScript
- **Build**: Vite (with HMR)
- **Styling**: Tailwind CSS
- **State**: Zustand stores
- **Routing**: React Router v6
- **Charts**: Recharts
- **Animations**: Framer Motion

### External APIs

- **Anthropic Claude**: AI-powered insights
- **Open-Meteo**: Free historical weather data (no API key)
- **OpenWeather**: Current/forecast weather
- **Nominatim**: Free geocoding (Mapbox fallback)
- **Calendarific**: Holiday data (currently disabled pending migration)

## Quick Start

```bash
# Install dependencies (from project root)
pnpm install

# Backend (auto-restarts with --watch)
cd backend
pnpm run dev

# Frontend (with Vite HMR)
cd frontend
pnpm run dev
```

**Default development ports**: Backend API and frontend dev server use standard ports. See `docs/developer/ARCHITECTURE.md` for details.

## Core Architectural Patterns

### Monorepo Structure

```
jengu/
├── backend/          # Express API server
├── frontend/         # React SPA
├── docs/
│   ├── developer/   # Technical documentation
│   ├── tasks*/      # Task management
│   └── archive/     # Historical docs (may be outdated - use with caution)
└── pnpm-workspace.yaml
```

**See `docs/developer/ARCHITECTURE.md` for complete directory trees.**

### Authentication Flow

1. **Frontend**: User logs in → Supabase Auth → JWT token (stored in localStorage)
2. **Frontend**: axios client auto-attaches `Authorization: Bearer <token>` header
3. **Backend**: `authenticateUser` middleware validates JWT via Supabase
4. **Backend**: Attaches `req.userId` to request object
5. **Backend**: Manually filters database queries by `userId` (using service role)

**Key concept**: Backend uses Supabase service role (bypasses RLS) for batch operations. RLS is enforced manually at application level.

### Data Flow Patterns

**CSV Upload → Enrichment**:

1. User uploads CSV via frontend
2. Backend streams CSV (not loaded into memory)
3. Batch insert to database (1000 rows/batch)
4. Return success response immediately
5. Background enrichment runs asynchronously (weather, temporal features, holidays)

**Analytics**:

1. Frontend fetches data from database
2. Stores in Zustand
3. Posts to analytics endpoints
4. Backend runs statistical analysis
5. Optional: AI insights via Claude API

**See `docs/developer/ARCHITECTURE.md` for detailed data flow diagrams.**

### Database Patterns

**Tables**:

- `properties` - CSV file metadata (belongs to user)
- `pricing_data` - Time-series pricing records (belongs to property)
- `business_settings` - User's business profile (one-per-user)

**Row-Level Security**: All tables have RLS enabled. Backend uses service role and manually filters by `userId`. Frontend queries respect RLS automatically.

**See `docs/developer/ARCHITECTURE.md` for complete database schema.**

## Development Patterns

### Backend Development

**Server Structure**: Single `backend/server.js` file (~1500 lines) contains all route handlers. This is intentional for simplicity - easy to find code, simple deployment.

**Services Layer**: Business logic lives in `backend/services/`:

- `mlAnalytics.js` - Statistical analysis & forecasting
- `marketSentiment.js` - AI insights via Claude
- `dataTransform.js` - Data validation & transformation
- `enrichmentService.js` - Weather/holiday enrichment pipeline

**Adding endpoints**: Add to `server.js`, use `authenticateUser` middleware, manually filter by `req.userId`.

### Frontend Development

**Pages**: Top-level routes in `src/pages/` (Dashboard, Data, Insights, Settings, etc.)

**Components**:

- `components/ui/` - Base design system (Button, Card, Input, etc.)
- `components/layout/` - Layout components (Sidebar, Layout wrapper)
- `components/insights/` - Feature-specific components

**State Management**:

- Zustand stores for client state (`useDataStore`, `useBusinessStore`)
- React Context for auth (`AuthContext`)
- No server state caching yet (consider adding React Query)

**API Client**: `lib/api/client.ts` provides axios instance with automatic JWT injection. Service modules in `lib/api/services/` provide type-safe API functions.

### Common Code Locations

**See `docs/developer/ARCHITECTURE.md` section "Where to Add New Code"** for detailed examples of:

- Adding API endpoints
- Adding service functions
- Creating new pages
- Adding UI components
- Adding database tables

## Development Workflow

### Environment Setup

**Backend** requires `.env` with:

- Supabase credentials (URL, anon key, service key)
- API keys (Anthropic, OpenWeather, etc.)

**Frontend** requires `.env` with:

- Supabase credentials (URL, anon key only)

See `backend/.env.example` for template.

### Database Setup

```bash
cd backend
node setup-database.js  # Creates tables + RLS policies
node test-db.js         # Test connection
```

If automated setup fails, manually run SQL files via Supabase dashboard:

1. `backend/prisma/create-tables.sql`
2. `backend/prisma/supabase-rls-policies.sql`

### Type Checking & Builds

```bash
# Type check both frontend and backend (from root)
pnpm run type-check

# Type check individual workspaces (from root)
pnpm run type-check:frontend
pnpm run type-check:backend

# Frontend type check + build
cd frontend
pnpm run build:check

# Build only (skip type check)
pnpm run build

# Preview production build
pnpm run preview
```

## Key Principles & Conventions

### Package Management

- **Always use pnpm** (not npm) - this is a workspace-managed monorepo
- Never run dev servers without being asked - suggest user runs them

### Code Style

- **Backend**: ES modules, async/await, descriptive console.logs with emojis
- **Frontend**: Functional components, TypeScript strict, Tailwind styling
- **File naming**: camelCase for JS, PascalCase for React components

### Error Handling

- Always return structured errors: `{ error: string, message: string }`
- Try-catch blocks in all async route handlers
- User-friendly error messages in frontend

### API Conventions

- Success: `{ success: true, data: {...} }`
- Error: `{ error: "type", message: "details" }`
- Always validate inputs
- Always filter by userId in backend queries

## Common Troubleshooting

### Port Already in Use

Kill process on the port and restart:

```bash
# macOS/Linux
lsof -ti:PORT | xargs kill -9

# Windows
netstat -ano | findstr :PORT
taskkill /PID <PID> /F
```

### Stale Data in Frontend

1. Open DevTools → Application tab
2. Clear Local Storage and Session Storage
3. Hard refresh (Ctrl+Shift+R)

### Database Connection Issues

- Verify `.env` credentials
- Check Supabase project status in dashboard
- Ensure RLS policies are created
- Test with `backend/test-db.js`

### Authentication Issues

- Clear browser localStorage
- Verify JWT in Network tab
- Check user status in Supabase Auth dashboard
- Ensure RLS policies allow authenticated access

## Important Notes

### Critical Constraints

- **Never run `pnpm run dev`** unless user explicitly asks - suggest they run it instead
- **Always use pnpm** not npm (monorepo workspace management)
- **Backend auto-restarts** with `--watch` flag (no nodemon needed)
- **Holiday enrichment is disabled** - needs Supabase migration (see TODOs in code)

### Performance Characteristics

- CSV uploads are **streamed** (not loaded into memory) for large files
- Database operations use **batch inserts** (1000 rows at a time)
- Enrichment runs **asynchronously** after upload response is sent
- Rate limiting is **in-memory** (60 req/min per IP, resets on restart)

### Security Model

- JWT tokens managed by Supabase client (auto-refresh)
- RLS policies on all tables
- Backend uses service role + manual filtering
- Never expose service role key to frontend

## When Making Changes

### Before Adding Features

1. Check `docs/developer/ARCHITECTURE.md` for current patterns
2. Look for similar existing code
3. Follow established conventions

### Before Refactoring

1. Understand the current data flow
2. Check for background jobs (e.g., enrichment)
3. Consider impact on RLS/auth

### Adding New Documentation

- Detailed architecture: `docs/developer/ARCHITECTURE.md`
- New subsystems: Create new file in `docs/developer/`
- Task planning: Use task management system in `docs/tasks.md`

## External Resources

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **React Docs**: [https://react.dev](https://react.dev)
- **Vite Docs**: [https://vitejs.dev](https://vitejs.dev)
- **Tailwind Docs**: [https://tailwindcss.com](https://tailwindcss.com)

---

**For detailed technical information, always refer to `docs/developer/ARCHITECTURE.md` first.**
