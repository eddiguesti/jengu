# Jengu Setup Guide

Complete setup guide to get the world's best dynamic pricing platform running locally.

## Prerequisites

### Required
- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm 8+** - Package manager (installed via corepack or npm)
- **Supabase Account** - [Sign up free](https://supabase.com/)

### Optional (for full features)
- **Redis** - For job queues and caching
- **Python 3.11+** - For ML pricing service
- **Docker** - For containerized development

## Quick Start (5 minutes)

### 1. Install Node.js and pnpm

```bash
# Option A: If you have Node 20+ installed
corepack enable
corepack prepare pnpm@latest --activate

# Option B: Install pnpm via npm
npm install -g pnpm

# Verify installation
node -v  # Should be v20+
pnpm -v  # Should be v8+
```

### 2. Install Dependencies

```bash
cd jengu
pnpm install
```

### 3. Configure Environment Variables

#### Backend (.env)

Edit `backend/.env` and fill in your API keys:

```bash
# REQUIRED - Get from Supabase Dashboard → Project Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# REQUIRED - Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...

# RECOMMENDED - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...
```

#### Frontend (.env)

Edit `frontend/.env`:

```bash
# REQUIRED - Same Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Set Up Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or use existing)
3. Go to SQL Editor
4. Run the SQL from `RUN-THIS-IN-SUPABASE.sql`

### 5. Start Development Servers

```bash
# Terminal 1: Backend (http://localhost:3001)
cd backend
pnpm run dev

# Terminal 2: Frontend (http://localhost:5173)
cd frontend
pnpm run dev
```

### 6. Verify Installation

- Open http://localhost:5173
- Create an account or sign in
- You should see the Dashboard

---

## Detailed Setup

### Supabase Configuration

#### Required Tables

The database needs these tables:
- `properties` - Uploaded file metadata
- `pricing_data` - Time-series pricing records
- `business_settings` - User business profiles

#### Row-Level Security (RLS)

All tables have RLS policies for multi-tenant security. The SQL file creates:
- SELECT policies for authenticated users
- INSERT/UPDATE/DELETE policies filtered by userId

### API Keys Reference

| Service | Required | Purpose | Get From |
|---------|----------|---------|----------|
| Supabase | Yes | Database & Auth | [supabase.com](https://supabase.com/dashboard) |
| Anthropic | Yes | AI insights (Claude) | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | Recommended | Chatbot assistant | [platform.openai.com](https://platform.openai.com/api-keys) |
| OpenWeather | Optional | Weather enrichment | [openweathermap.org](https://home.openweathermap.org/api_keys) |
| Mapbox | Optional | Geocoding | [mapbox.com](https://account.mapbox.com/access-tokens/) |
| Sentry | Optional | Error tracking | [sentry.io](https://sentry.io/) |

### Redis Setup (Optional)

For background job processing:

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Verify
redis-cli ping  # Should return PONG
```

### ML Pricing Service (Optional)

For advanced pricing recommendations:

```bash
cd pricing-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
```

The service runs on http://localhost:8000

---

## Code Quality

### Run All Checks

```bash
# From project root
pnpm run check-all  # TypeScript + ESLint + Prettier + Tests
```

### Fix Issues Automatically

```bash
pnpm run fix-all  # Auto-fix lint and format issues
```

### Individual Commands

```bash
pnpm run type-check     # TypeScript only
pnpm run lint           # ESLint only
pnpm run format:check   # Prettier only
pnpm run test           # Run tests
```

---

## Project Structure

```
jengu/
├── backend/           # Node.js + Express + TypeScript API
│   ├── routes/        # API route handlers (17 modules)
│   ├── services/      # Business logic (13 services)
│   ├── middleware/    # Express middleware
│   ├── workers/       # Background job processors
│   └── server.ts      # Main entry point
│
├── frontend/          # React 18 + TypeScript SPA
│   ├── src/pages/     # Route pages (9 pages)
│   ├── src/components/# Reusable components
│   ├── src/store/     # Zustand state stores
│   └── src/lib/api/   # API client & services
│
├── pricing-service/   # Python ML pricing engine
│
├── docs/              # Documentation
│   ├── developer/     # Technical docs
│   └── completion-reports/  # Task completion records
│
└── k8s/               # Kubernetes deployments
```

---

## Features

### Core Platform
- [x] Multi-tenant authentication (Supabase Auth)
- [x] CSV data upload with streaming
- [x] Weather enrichment (Open-Meteo + OpenWeather)
- [x] Holiday enrichment (190+ countries)
- [x] Statistical analytics (correlation, forecasting)
- [x] AI-powered insights (Claude 3.5)
- [x] GPT-5 chatbot assistant
- [x] Real-time job progress (WebSocket)

### Pricing Intelligence
- [x] Price elasticity analysis
- [x] Demand forecasting
- [x] Weather impact analysis
- [x] Competitor monitoring
- [x] Pricing calendar with recommendations
- [x] ML pricing engine (Python)

### Enterprise Features
- [x] Rate limiting
- [x] Redis caching
- [x] Background job queues (BullMQ)
- [x] Error tracking (Sentry)
- [x] OpenAPI documentation
- [x] Kubernetes deployment configs

---

## Troubleshooting

### Port Already in Use

```bash
# macOS/Linux
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Clear Browser Cache

1. Open http://localhost:5173
2. DevTools (F12) → Application → Local Storage → Clear
3. Hard refresh (Ctrl+Shift+R)

### Database Connection Failed

- Check Supabase project is active
- Verify credentials in `.env` files
- Test with: `curl http://localhost:3001/health`

### TypeScript Errors

```bash
# Regenerate database types (if schema changed)
cd backend
npx supabase gen types typescript --project-id <id> > types/database.types.ts
```

---

## Development Workflow

### Before Committing

```bash
# Always run from project root
pnpm run check-all

# If errors, fix automatically
pnpm run fix-all
```

### Adding Features

1. Check `docs/developer/ARCHITECTURE.md` for patterns
2. Follow existing code conventions
3. Add TypeScript types
4. Run quality checks before PR

### Database Changes

1. Create migration in `backend/migrations/`
2. Run in Supabase SQL Editor
3. Regenerate TypeScript types
4. Update `RUN-THIS-IN-SUPABASE.sql`

---

## Next Steps After Setup

1. **Upload sample data** - Use `frontend/public/sample_booking_data.csv`
2. **Configure business profile** - Settings page with location
3. **Run enrichment** - Add weather and holiday data
4. **View analytics** - Dashboard with insights
5. **Try AI assistant** - Ask pricing questions

---

## Support

- **Documentation**: See `docs/` folder
- **Architecture**: `docs/developer/ARCHITECTURE.md`
- **Task History**: `docs/completion-reports/`
