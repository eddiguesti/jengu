# Jengu - Complete System Architecture & Technical Guide

**Dynamic Pricing Intelligence Platform for Hospitality**

**Version**: 1.0.0
**Last Updated**: 2025-10-23
**Status**: Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Application Hierarchy](#application-hierarchy)
5. [Data Flow & Processing Pipeline](#data-flow--processing-pipeline)
6. [Frontend Architecture](#frontend-architecture)
7. [Backend Architecture](#backend-architecture)
8. [Pricing Engine Architecture](#pricing-engine-architecture)
9. [Database Architecture](#database-architecture)
10. [External API Integrations](#external-api-integrations)
11. [Authentication & Security](#authentication--security)
12. [Feature Breakdown](#feature-breakdown)
13. [Development Workflow](#development-workflow)
14. [Deployment Architecture](#deployment-architecture)
15. [Code Quality & Standards](#code-quality--standards)
16. [Performance Characteristics](#performance-characteristics)
17. [Troubleshooting Guide](#troubleshooting-guide)
18. [Future Roadmap](#future-roadmap)

---

## Executive Summary

### What is Jengu?

Jengu is a **full-stack, AI-powered dynamic pricing intelligence platform** designed for hospitality businesses (hotels, vacation rentals, B&Bs). It helps property managers optimize their pricing strategy by:

- **Analyzing historical data** (pricing, occupancy, bookings)
- **Enriching data** with weather, temporal, and holiday information
- **Generating ML-powered insights** using statistical analysis
- **Providing AI recommendations** via Claude (Anthropic)
- **Calculating dynamic prices** based on demand, seasonality, and competitors

### Core Value Proposition

Instead of manually adjusting prices based on gut feeling, Jengu:

1. Ingests your historical pricing data via CSV upload
2. Enriches it with contextual data (weather, day of week, season, holidays)
3. Analyzes patterns using machine learning algorithms
4. Provides actionable insights and pricing recommendations
5. Generates optimal price quotes for future bookings

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│               React SPA (TypeScript + Tailwind CSS)                  │
│                                                                       │
│  Dashboard │ Data Upload │ Analytics │ Insights │ Pricing │ Settings│
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/REST API
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND API SERVER                                │
│                Node.js + Express + TypeScript                        │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐│
│  │ File Upload  │  │  Enrichment  │  │  Analytics  │  │  Pricing ││
│  │   & Storage  │  │   Pipeline   │  │   Engine    │  │  Routes  ││
│  └──────────────┘  └──────────────┘  └─────────────┘  └────┬─────┘│
└──────────┬──────────────────┬────────────────────────────────┼──────┘
           │                  │                                │
           ↓                  ↓                                ↓
┌────────────────┐  ┌──────────────────┐         ┌──────────────────┐
│  SUPABASE DB   │  │  EXTERNAL APIs   │         │ PRICING SERVICE  │
│  (PostgreSQL)  │  │                  │         │ (Python/FastAPI) │
│                │  │ • Open-Meteo     │         │                  │
│ • properties   │  │ • OpenWeather    │         │ Multi-factor     │
│ • pricing_data │  │ • Nominatim      │         │ Dynamic Pricing  │
│ • business_    │  │ • Anthropic      │         │ Algorithm        │
│   settings     │  │   Claude         │         │                  │
└────────────────┘  └──────────────────┘         └──────────────────┘
```

---

## System Architecture Overview

### Architecture Pattern: Microservices + Monorepo

Jengu uses a **hybrid architecture**:

- **Monorepo structure** for code organization (frontend + backend)
- **Microservices approach** for specialized components (pricing engine)
- **Event-driven processing** for background tasks (enrichment)
- **RESTful API** for client-server communication

### Three-Tier Architecture

**Tier 1: Presentation Layer (Frontend)**

- React 18 Single Page Application
- Runs in user's browser
- Communicates with backend via HTTP/REST
- Handles all UI/UX interactions

**Tier 2: Business Logic Layer (Backend + Pricing Service)**

- Node.js Express API server (main business logic)
- Python FastAPI service (specialized pricing calculations)
- Processes requests, validates data, orchestrates operations
- Communicates with database and external APIs

**Tier 3: Data Layer (Supabase PostgreSQL)**

- Stores all persistent data
- Row-Level Security (RLS) for multi-tenancy
- Real-time capabilities (not currently used)
- Authentication management

### Communication Flow

```
User Browser
    ↕ HTTP/REST (JSON)
Frontend (React)
    ↕ HTTP/REST (JSON + JWT Auth)
Backend (Node.js)
    ↕ Multiple Protocols
┌───────────────┬─────────────────┬────────────────┬─────────────────┐
│   Supabase    │   External APIs │  Pricing Service│  File System   │
│   REST API    │   HTTP          │   HTTP          │   Stream       │
└───────────────┴─────────────────┴────────────────┴─────────────────┘
```

---

## Technology Stack

### Frontend Stack

**Core Framework**

- **React 18.3.1** - UI library with hooks and functional components
- **TypeScript 5.6+** - Strict type checking for reliability
- **Vite 6.0** - Ultra-fast build tool with HMR (Hot Module Replacement)

**Styling**

- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Framer Motion** - Animation library for smooth transitions
- **Lucide React** - Icon library (modern, tree-shakeable)

**State Management**

- **Zustand** - Lightweight state management (simpler than Redux)
- **React Context** - Authentication state
- No server state caching (future: React Query)

**Routing & Navigation**

- **React Router v6** - Client-side routing with nested routes

**Data Visualization**

- **Recharts** - Composable charting library built on D3
- **Custom chart components** - V2 dashboard charts

**HTTP Client**

- **Axios** - Promise-based HTTP client with interceptors

**Build Output**

- **ES Modules** - Modern JavaScript module format
- **Code splitting** - Automatic chunk optimization
- **Tree shaking** - Dead code elimination

### Backend Stack

**Runtime & Language**

- **Node.js 20+** - JavaScript runtime
- **TypeScript 5+** - Strict mode for type safety
- **ES Modules** - Modern module system (not CommonJS)

**Web Framework**

- **Express.js** - Minimalist web framework
- **CORS enabled** - Cross-origin resource sharing
- **Helmet** - Security headers middleware

**Database Client**

- **Supabase JS Client** - Official PostgreSQL client
- **Service role access** - Bypass RLS for batch operations
- **Connection pooling** - Efficient database connections

**File Processing**

- **Multer** - Multipart/form-data file uploads
- **csv-parser** - Streaming CSV parser (memory efficient)
- **Node.js Streams** - Handle large files without OOM

**External API Clients**

- **node-fetch** - HTTP client for external APIs
- **Anthropic SDK** - Official Claude API client

**Logging & Monitoring**

- **Pino** - High-performance JSON logger
- **pino-http** - HTTP request logging middleware
- **Sentry** - Error tracking (optional, configured in .env)

**Authentication**

- **Supabase Auth** - JWT token validation
- **Custom middleware** - `authenticateUser` for protected routes

**Development Tools**

- **tsx watch** - Auto-restart server on code changes
- **No nodemon needed** - Built-in watch mode

### Pricing Service Stack

**Runtime & Language**

- **Python 3.11+** - For numerical computing
- **Type hints** - Optional static typing with Pydantic

**Web Framework**

- **FastAPI** - Modern async web framework
- **Uvicorn** - ASGI server with auto-reload
- **Pydantic** - Data validation and serialization

**Data Processing**

- **NumPy** - Numerical operations and arrays
- **Pandas** - Data manipulation (optional)
- **datetime** - Timezone-aware date calculations

**HTTP Client**

- **httpx** - Async HTTP client for Python

**Deployment**

- **Docker** - Containerization with multi-stage build
- **Python venv** - Virtual environment for dependencies

### Database

**Primary Database**

- **Supabase** - Hosted PostgreSQL platform
- **PostgreSQL 15+** - Open-source relational database
- **Row-Level Security (RLS)** - Multi-tenant data isolation
- **pgvector** - Vector similarity search (future: semantic search)

**Schema Management**

- **SQL files** - Version-controlled schema definitions
- **Manual migrations** - No ORM, explicit SQL

**Connection Method**

- **REST API** - Supabase client uses PostgREST
- **Service role** - Admin access for backend operations

### Development Tools

**Package Management**

- **pnpm** - Fast, disk-efficient package manager
- **Workspaces** - Monorepo with shared dependencies
- **Lock file** - `pnpm-lock.yaml` for reproducible installs

**Code Quality**

- **ESLint 9** - Flat config with TypeScript support
- **Prettier** - Opinionated code formatter
- **TypeScript Compiler** - Strict mode type checking

**Version Control**

- **Git** - Distributed version control
- **GitHub** - Code hosting and collaboration

**Build Tools**

- **Vite** (Frontend) - Dev server + production build
- **tsx** (Backend) - TypeScript execution + watch mode
- **Docker** (Pricing) - Container builds

### External APIs

**Weather Data**

- **Open-Meteo** - Free historical weather API (no key required)
- **OpenWeather** - Current weather + forecasts (free tier)

**Geocoding**

- **Nominatim** - Free OSM geocoding (no key required)
- **Mapbox** - Fallback geocoding (requires API key)

**AI & Insights**

- **Anthropic Claude** - AI-powered insights and recommendations
- **Model**: claude-sonnet-4-5-20250929

**Holidays** (Currently Disabled)

- **Calendarific** - Holiday data API (pending migration)

---

## Application Hierarchy

### Project Structure (Monorepo)

```
jengu/
├── frontend/                      # React SPA
│   ├── src/
│   │   ├── main.tsx              # App entry point
│   │   ├── App.tsx               # Root component with routing
│   │   ├── pages/                # Top-level route components
│   │   │   ├── Dashboard.tsx     # Main dashboard (landing page)
│   │   │   ├── DirectorDashboard.tsx  # V2 charts & analytics
│   │   │   ├── DataPage.tsx      # CSV upload & management
│   │   │   ├── InsightsPage.tsx  # AI insights & recommendations
│   │   │   ├── PricingPage.tsx   # Dynamic pricing quotes
│   │   │   ├── Settings.tsx      # Business settings & config
│   │   │   ├── Login.tsx         # Authentication
│   │   │   └── Register.tsx      # User registration
│   │   ├── components/           # Reusable UI components
│   │   │   ├── ui/               # Base design system
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/           # Layout components
│   │   │   │   ├── Sidebar.tsx   # Main navigation
│   │   │   │   └── Layout.tsx    # Page wrapper
│   │   │   ├── insights/         # Feature-specific components
│   │   │   └── charts/           # Custom chart components
│   │   ├── lib/                  # Utilities and services
│   │   │   ├── api/              # API client layer
│   │   │   │   ├── client.ts     # Axios instance with auth
│   │   │   │   └── services/     # Type-safe API functions
│   │   │   │       ├── files.ts
│   │   │   │       ├── analytics.ts
│   │   │   │       ├── pricing.ts
│   │   │   │       └── assistant.ts
│   │   │   ├── supabase.ts       # Supabase client config
│   │   │   └── utils.ts          # Helper functions
│   │   ├── store/                # Zustand state stores
│   │   │   ├── useDataStore.ts   # Pricing data state
│   │   │   └── useBusinessStore.ts # Business settings state
│   │   ├── contexts/             # React contexts
│   │   │   └── AuthContext.tsx   # Authentication state
│   │   └── types/                # TypeScript type definitions
│   ├── public/                   # Static assets
│   ├── index.html                # HTML entry point
│   ├── vite.config.ts            # Vite configuration
│   ├── tailwind.config.js        # Tailwind CSS config
│   ├── tsconfig.json             # TypeScript config
│   └── package.json              # Frontend dependencies
│
├── backend/                      # Node.js API server
│   ├── server.ts                 # Main server file (all routes)
│   ├── routes/                   # Route handlers (modular organization)
│   │   ├── files.ts              # File upload & management
│   │   ├── analytics.ts          # ML analytics endpoints
│   │   ├── pricing.ts            # Pricing engine proxy
│   │   ├── assistant.ts          # AI assistant endpoints
│   │   ├── weather.ts            # Weather API proxy
│   │   └── competitor.ts         # Competitor data scraping
│   ├── services/                 # Business logic layer
│   │   ├── enrichmentService.ts  # Data enrichment pipeline
│   │   ├── mlAnalytics.ts        # Statistical analysis
│   │   ├── marketSentiment.ts    # AI insights via Claude
│   │   ├── dataTransform.ts      # Data validation & transformation
│   │   └── weatherService.ts     # Weather API integration
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts               # JWT authentication
│   │   ├── errorHandler.ts       # Global error handling
│   │   └── rateLimit.ts          # Rate limiting
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Helper functions
│   ├── prisma/                   # Database schema & migrations
│   │   ├── create-tables.sql     # Table definitions
│   │   └── supabase-rls-policies.sql  # RLS policies
│   ├── setup-database.js         # Database initialization script
│   ├── test-db.js                # Database connection test
│   ├── .env                      # Environment variables (not in git)
│   ├── .env.example              # Environment template
│   ├── tsconfig.json             # TypeScript config
│   └── package.json              # Backend dependencies
│
├── pricing-service/              # Python pricing microservice
│   ├── main.py                   # FastAPI application
│   ├── pricing_engine.py         # Core pricing algorithm
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Container definition
│   ├── README.md                 # API documentation
│   ├── DEPLOYMENT-STATUS.md      # Deployment guide
│   ├── .env.example              # Environment template
│   └── test_request.json         # Sample API request
│
├── docs/                         # Documentation
│   ├── developer/                # Technical documentation
│   │   ├── ARCHITECTURE.md       # Detailed architecture guide
│   │   ├── SUPABASE_SECURITY.md  # Security patterns
│   │   └── CODE_QUALITY.md       # Quality standards
│   ├── tasks.md                  # Task management system
│   ├── DATA-PIPELINE-AUDIT-2025-10-22.md  # Pipeline audit
│   └── archive/                  # Historical docs
│
├── .claude/                      # Claude Code configuration
│   └── settings.local.json       # Local settings
│
├── CLAUDE.md                     # High-level guidance for AI
├── SYSTEM-STATUS.md              # System health report
├── COMPLETE-SYSTEM-GUIDE.md      # This file
├── pnpm-workspace.yaml           # Workspace configuration
├── package.json                  # Root package.json
├── .gitignore                    # Git ignore rules
├── .prettierrc                   # Prettier config
├── eslint.config.js              # ESLint config (flat)
└── tsconfig.json                 # Shared TypeScript config
```

### Component Hierarchy

#### Frontend Component Tree

```
App (Router + Auth)
├── Layout (Sidebar + Main Content)
│   ├── Dashboard (Landing Page)
│   │   ├── StatsCard (Revenue, Occupancy, etc.)
│   │   ├── RevenueChart
│   │   └── RecentActivity
│   │
│   ├── DirectorDashboard (V2 Analytics)
│   │   ├── PropertySelector
│   │   ├── DateRangeFilter
│   │   ├── MetricCards (KPIs)
│   │   ├── ChartGrid
│   │   │   ├── PricingTrendsChart
│   │   │   ├── OccupancyHeatmap
│   │   │   ├── RevenueBreakdown
│   │   │   ├── DemandForecast
│   │   │   ├── WeatherImpact
│   │   │   └── CompetitorComparison
│   │   └── InsightsSidebar
│   │
│   ├── DataPage (CSV Management)
│   │   ├── FileUploader
│   │   ├── FileList
│   │   │   └── FileCard
│   │   │       ├── EnrichButton
│   │   │       ├── DeleteButton
│   │   │       └── DownloadButton
│   │   └── DataPreview (Table)
│   │
│   ├── InsightsPage (AI Recommendations)
│   │   ├── ChatInterface
│   │   ├── QuickSuggestions
│   │   ├── InsightCards
│   │   └── TrendAnalysis
│   │
│   ├── PricingPage (Quote Generator)
│   │   ├── QuoteForm
│   │   │   ├── DatePicker
│   │   │   ├── GuestSelector
│   │   │   └── StrategyToggles
│   │   ├── PriceDisplay
│   │   │   ├── RecommendedPrice
│   │   │   ├── PriceGrid (A/B variants)
│   │   │   └── ConfidenceInterval
│   │   └── ReasonsList
│   │
│   └── Settings (Configuration)
│       ├── BusinessProfile
│       ├── PropertyDetails
│       ├── PricingStrategy
│       └── IntegrationSettings
│
└── Auth Pages (No Layout)
    ├── Login
    └── Register
```

#### Backend Service Hierarchy

```
Express Server
├── Middleware Stack
│   ├── CORS
│   ├── JSON Body Parser
│   ├── Pino HTTP Logger
│   ├── Rate Limiter
│   └── Error Handler
│
├── Public Routes
│   ├── POST /auth/login
│   ├── POST /auth/register
│   └── GET /health
│
└── Protected Routes (require JWT)
    ├── File Management
    │   ├── POST /api/files/upload
    │   ├── GET /api/files
    │   ├── GET /api/files/:id/data
    │   ├── DELETE /api/files/:id
    │   └── POST /api/files/:id/enrich
    │
    ├── Analytics
    │   ├── POST /api/analytics/summary
    │   ├── POST /api/analytics/weather-impact
    │   ├── POST /api/analytics/demand-forecast
    │   ├── POST /api/analytics/competitor-analysis
    │   ├── POST /api/analytics/feature-importance
    │   ├── POST /api/analytics/market-sentiment
    │   └── POST /api/analytics/ai-insights
    │
    ├── Pricing
    │   ├── POST /api/pricing/quote
    │   ├── POST /api/pricing/learn
    │   └── GET /api/pricing/check-readiness
    │
    ├── AI Assistant
    │   ├── POST /api/assistant/message
    │   ├── POST /api/assistant/quick-suggestion
    │   └── POST /api/assistant/analyze-pricing
    │
    ├── Weather & Location
    │   ├── POST /api/weather/historical
    │   ├── GET /api/weather/current
    │   ├── GET /api/weather/forecast
    │   ├── GET /api/geocoding/forward
    │   ├── GET /api/geocoding/reverse
    │   └── GET /api/geocoding/search
    │
    └── Competitor Data
        ├── POST /api/competitor/scrape
        └── POST /api/hotels/search
```

---

## Data Flow & Processing Pipeline

### Complete Data Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: DATA INGESTION                                               │
└─────────────────────────────────────────────────────────────────────┘

User uploads CSV file (Frontend)
         ↓
POST /api/files/upload (Backend)
         ↓
┌────────────────────────────────────┐
│ Multer receives multipart/form-data│
│ • Validates file type (.csv)       │
│ • Limits file size (50MB)          │
│ • Streams file (not buffered)      │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│ CSV Parser (Streaming)             │
│ • Parses row by row                │
│ • Validates required columns       │
│ • Transforms data types            │
│ • Handles missing values           │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│ Batch Insert (1000 rows/batch)    │
│ • Groups rows for efficiency       │
│ • Inserts to pricing_data table    │
│ • Links to property record         │
│ • Filters by userId (security)     │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│ Success Response                   │
│ • Returns property ID              │
│ • Returns row count                │
│ • Frontend updates UI              │
└────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: DATA ENRICHMENT (Background Process)                         │
└─────────────────────────────────────────────────────────────────────┘

User clicks "Enrich" button (Frontend)
         ↓
POST /api/files/:id/enrich (Backend)
         ↓
┌────────────────────────────────────┐
│ Enrichment Pipeline Start          │
│ • Runs asynchronously              │
│ • Three parallel stages            │
└────┬────────┬───────────┬──────────┘
     │        │           │
     ↓        ↓           ↓
 ┌───────┐ ┌──────┐  ┌────────┐
 │Temporal│ │Weather│ │Holidays│
 │Features│ │ Data  │ │  Data  │
 └───┬───┘ └───┬──┘  └───┬────┘
     │         │          │
     ↓         ↓          ↓

┌─────────────────────────────────────┐
│ TEMPORAL ENRICHMENT                 │
│ • Parse date field                  │
│ • Extract dayOfWeek (0-6)           │
│ • Extract month (1-12)              │
│ • Calculate isWeekend (boolean)     │
│ • Determine season (string)         │
│ • Update ALL rows (batch update)    │
│ Time: ~500ms for 1000 rows          │
└───────────────┬─────────────────────┘
                ↓

┌─────────────────────────────────────┐
│ WEATHER ENRICHMENT                  │
│ • Get property lat/lng              │
│ • Determine date range              │
│ • Call Open-Meteo API               │
│   - Free, no API key                │
│   - Historical data only            │
│ • Match dates to weather data       │
│ • Extract features:                 │
│   - temperature (°C)                │
│   - weatherCondition (string)       │
│   - precipitation (mm)              │
│   - sunshineHours (hours)           │
│ • Batch update rows                 │
│ Time: ~2-5s for 1000 rows           │
└───────────────┬─────────────────────┘
                ↓

┌─────────────────────────────────────┐
│ HOLIDAY ENRICHMENT (Disabled)       │
│ • Currently not operational         │
│ • Pending Supabase migration        │
│ • Future: Calendarific API          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Enrichment Complete                 │
│ • Returns statistics                │
│ • Frontend shows enriched count     │
│ • Data ready for analytics          │
└─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: ANALYTICS PROCESSING                                         │
└─────────────────────────────────────────────────────────────────────┘

User navigates to Analytics/Insights (Frontend)
         ↓
Frontend fetches enriched data
         ↓
POST /api/analytics/* (Multiple endpoints)
         ↓
┌────────────────────────────────────┐
│ ML Analytics Service               │
│ • Summary Statistics               │
│   - Mean, median, std dev          │
│   - Percentiles (P25, P50, P75)    │
│   - Trends & correlations          │
│                                    │
│ • Weather Impact Analysis          │
│   - Price by weather condition     │
│   - Temperature correlations       │
│   - Seasonal patterns              │
│                                    │
│ • Demand Forecasting               │
│   - Time series analysis           │
│   - Occupancy predictions          │
│   - Booking pattern detection      │
│                                    │
│ • Competitor Analysis              │
│   - Market positioning             │
│   - Price gap analysis             │
│   - Competitive index              │
│                                    │
│ • Feature Importance               │
│   - Correlation matrix             │
│   - Impact scoring                 │
│   - Key driver identification      │
│                                    │
│ Time: 2-12ms per endpoint           │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│ Market Sentiment (AI)              │
│ • Calls Anthropic Claude API       │
│ • Analyzes market conditions       │
│ • Generates strategic insights     │
│ • Natural language summaries       │
│ Time: 2-5s (API latency)            │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│ Results Returned to Frontend       │
│ • JSON response                    │
│ • Cached in Zustand store          │
│ • Rendered in charts/tables        │
└────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: DYNAMIC PRICING                                              │
└─────────────────────────────────────────────────────────────────────┘

User requests price quote (Frontend)
         ↓
POST /api/pricing/quote (Backend)
         ↓
┌────────────────────────────────────┐
│ Backend Pricing Route              │
│ • Validates request                │
│ • Prepares pricing context:        │
│   - Property info                  │
│   - Stay date & quote time         │
│   - Product (type, refundable, LOS)│
│   - Inventory (capacity, remaining)│
│   - Market (competitor prices)     │
│   - Context (season, day, weather) │
│   - Toggles (strategy flags)       │
└────────────┬───────────────────────┘
             ↓
POST http://localhost:8000/score
             ↓
┌────────────────────────────────────┐
│ Python Pricing Service             │
│ FastAPI endpoint: /score           │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│ Pricing Engine Algorithm           │
│ Step 1: Base Price                 │
│   • Use competitor P50 OR          │
│   • Fallback to config base price  │
│                                    │
│ Step 2: Seasonal Adjustment        │
│   • Winter: 0.9x                   │
│   • Spring: 1.0x                   │
│   • Summer: 1.3x                   │
│   • Fall: 1.1x                     │
│                                    │
│ Step 3: Day of Week Factor         │
│   • Mon-Thu: 1.0x                  │
│   • Fri: 1.15x                     │
│   • Sat: 1.25x                     │
│   • Sun: 1.1x                      │
│                                    │
│ Step 4: Demand Multiplier          │
│   • occupancy_rate * 0.5           │
│   • Higher occupancy = higher price│
│                                    │
│ Step 5: Lead Time Adjustment       │
│   • <7 days: +20%                  │
│   • 7-90 days: 0%                  │
│   • >90 days: -10%                 │
│                                    │
│ Step 6: Length of Stay Discount    │
│   • 7-13 nights: -10%              │
│   • 14-29 nights: -15%             │
│   • 30+ nights: -20%               │
│                                    │
│ Step 7: Refundability              │
│   • Non-refundable: -5%            │
│                                    │
│ Step 8: Strategy Toggles           │
│   • Aggressive: +10%               │
│   • Conservative: -10%             │
│                                    │
│ Step 9: Apply Bounds               │
│   • Min: 80% of comp P10           │
│   • Max: 200% of comp P90          │
│                                    │
│ Step 10: Generate Variants         │
│   • Price grid: 5 alternatives     │
│   • Confidence interval: ±10%      │
│   • Expected occupancy projection  │
│   • Reasoning explanations         │
│                                    │
│ Time: ~5-10ms                       │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│ Pricing Response                   │
│ {                                  │
│   price: 300.30,                   │
│   price_grid: [270, 285, 300, ...],│
│   conf_band: {lower: 270, ...},    │
│   expected: {occ_now: 0.8, ...},   │
│   reasons: ["Summer", "Weekend"],  │
│   safety: {...}                    │
│ }                                  │
└────────────┬───────────────────────┘
             ↓
Backend receives response
             ↓
Frontend displays price
         ↓
User sees recommended price + alternatives
```

### Database Write Flow

```
Frontend initiates action
         ↓
Backend receives authenticated request (JWT)
         ↓
Extract userId from JWT token
         ↓
┌────────────────────────────────────┐
│ Supabase Client (Service Role)    │
│ • Bypasses RLS                     │
│ • Manually filters by userId       │
│ • Example:                         │
│   .from('pricing_data')            │
│   .insert({...data, userId})       │
│   .eq('userId', userId)            │
└────────────────────────────────────┘
         ↓
PostgreSQL executes query
         ↓
RLS policies verify userId match
         ↓
Data written to table
         ↓
Success/error response
```

### Database Read Flow

```
Frontend requests data
         ↓
Backend receives authenticated request (JWT)
         ↓
Extract userId from JWT token
         ↓
┌────────────────────────────────────┐
│ Supabase Client Query              │
│ • Filters by userId                │
│ • Example:                         │
│   .from('pricing_data')            │
│   .select('*')                     │
│   .eq('propertyId', propertyId)    │
│   .eq('userId', userId)            │
│   .order('date', {ascending: true})│
└────────────────────────────────────┘
         ↓
PostgreSQL returns filtered results
         ↓
Backend processes/transforms data
         ↓
JSON response to frontend
         ↓
Frontend updates state + UI
```

---

## Frontend Architecture

### React Application Structure

**Entry Point Flow**:

```
index.html
  └─> main.tsx
       └─> App.tsx (Router + Auth Provider)
            └─> Layout (Authenticated)
                 └─> Page Components
```

### Routing Strategy

**React Router v6 Configuration**:

```typescript
// App.tsx routing structure
<BrowserRouter>
  <AuthProvider>
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes (require auth) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/director" element={<DirectorDashboard />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

**URL Structure**:

- `/` - Main dashboard (landing page after login)
- `/director` - Director Dashboard with V2 charts
- `/data` - CSV upload and data management
- `/insights` - AI-powered insights and chat
- `/pricing` - Dynamic pricing quote generator
- `/settings` - Business profile and configuration
- `/login` - Authentication page
- `/register` - User registration

### State Management Architecture

**Three-Layer State Strategy**:

1. **Server State** (Not cached - future: React Query)
   - Fetched on-demand from backend
   - No client-side caching currently
   - Re-fetched when component mounts

2. **Client State** (Zustand Stores)

   ```typescript
   // useDataStore - Pricing data management
   interface DataStore {
     files: Property[]
     selectedFile: Property | null
     pricingData: PricingDataRow[]
     loading: boolean
     error: string | null

     fetchFiles: () => Promise<void>
     selectFile: (file: Property) => void
     fetchPricingData: (propertyId: string) => Promise<void>
     deleteFile: (fileId: string) => Promise<void>
   }

   // useBusinessStore - Business settings
   interface BusinessStore {
     settings: BusinessSettings | null
     loading: boolean

     fetchSettings: () => Promise<void>
     updateSettings: (settings: Partial<BusinessSettings>) => Promise<void>
   }
   ```

3. **UI State** (Component State)
   - Form inputs
   - Modal visibility
   - Accordion expanded states
   - Loading spinners
   - Local component state

**State Flow**:

```
User Action (Click, Input, etc.)
         ↓
Component Event Handler
         ↓
Zustand Action (if global state)
    OR
Local setState (if component state)
         ↓
API Call (if data mutation)
         ↓
Backend Processing
         ↓
Response received
         ↓
Update Zustand Store
         ↓
React re-renders components
         ↓
UI updates
```

### API Client Layer

**Axios Instance with Interceptors**:

```typescript
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: Inject JWT token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('sb-access-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor: Handle errors globally
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

**Service Layer Pattern**:

```typescript
// lib/api/services/files.ts
export const filesApi = {
  uploadFile: async (file: File, metadata: FileMetadata) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify(metadata))

    const { data } = await apiClient.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  getFiles: async () => {
    const { data } = await apiClient.get('/api/files')
    return data
  },

  deleteFile: async (fileId: string) => {
    await apiClient.delete(`/api/files/${fileId}`)
  },
}
```

### UI Component Library

**Design System Structure**:

```
components/ui/
├── Button.tsx          # Primary, secondary, danger variants
├── Card.tsx            # Container with shadow and padding
├── Input.tsx           # Text, number, email inputs
├── Select.tsx          # Dropdown selector
├── Checkbox.tsx        # Boolean input
├── Radio.tsx           # Single choice from options
├── Switch.tsx          # Toggle switch
├── Badge.tsx           # Status indicators
├── Alert.tsx           # Success, warning, error, info
├── Modal.tsx           # Dialog overlay
├── Tooltip.tsx         # Hover information
├── Spinner.tsx         # Loading indicator
├── Progress.tsx        # Progress bar
├── Table.tsx           # Data table
└── Tabs.tsx            # Tabbed interface
```

**Tailwind CSS Patterns**:

- Utility-first styling
- Responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Dark mode support: `dark:` prefix (not currently implemented)
- Custom color palette in `tailwind.config.js`

### Chart Components (Recharts)

**V2 Dashboard Charts**:

1. **Pricing Trends Chart** (Line Chart)
   - X-axis: Date
   - Y-axis: Price (€)
   - Lines: Actual price, Predicted price, Competitor average
   - Tooltip: Date, price details

2. **Occupancy Heatmap** (Calendar Heatmap)
   - Color intensity: Occupancy rate (0-100%)
   - Interactive: Click to see details
   - Legend: Color scale

3. **Revenue Breakdown** (Pie/Donut Chart)
   - Segments: Room types, booking sources
   - Percentages shown
   - Hover: Detailed breakdown

4. **Demand Forecast** (Area Chart)
   - X-axis: Future dates
   - Y-axis: Predicted demand
   - Confidence bands: Upper/lower bounds
   - Shaded area: Uncertainty

5. **Weather Impact** (Bar Chart)
   - X-axis: Weather conditions
   - Y-axis: Average price/occupancy
   - Grouped bars: Price vs. Occupancy
   - Sorted by impact

6. **Competitor Comparison** (Radar Chart)
   - Axes: Price, occupancy, amenities, reviews, location
   - Lines: Your property vs. competitors
   - Interactive: Hover for values

---

## Backend Architecture

### Server Structure

**Single-File Server** (backend/server.ts):

- All route handlers in one file (~1500 lines)
- Simple to navigate and deploy
- No complex routing file structure
- Easy to find any endpoint

**Why Single File?**

- Simplicity for small-to-medium API
- Fewer files to manage
- Clear endpoint visibility
- Easier debugging

**Organization Pattern**:

```typescript
// Import dependencies
// Configure middleware
// Initialize Supabase client
// Define types
// Utility functions
// Authentication middleware
// Route handlers (grouped by feature)
// Error handling
// Server startup
```

### Authentication Middleware

**JWT Validation Flow**:

```typescript
// authenticateUser middleware
async function authenticateUser(req, res, next) {
  try {
    // 1. Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    // 2. Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // 3. Attach userId to request object
    req.userId = user.id
    req.user = user

    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}
```

**Usage Pattern**:

```typescript
// Public route (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

// Protected route (requires auth)
app.get('/api/files', authenticateUser, async (req, res) => {
  const userId = req.userId // Available after middleware
  // ... fetch user's files
})
```

### File Upload Processing

**Streaming CSV Upload**:

```typescript
// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files allowed'))
    }
  },
})

// Upload endpoint
app.post('/api/files/upload', authenticateUser, upload.single('file'), async (req, res) => {
  const userId = req.userId
  const file = req.file

  // 1. Create property record
  const property = await supabase
    .from('properties')
    .insert({
      userId,
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: new Date(),
    })
    .select()
    .single()

  // 2. Stream parse CSV
  const rows = []
  const stream = Readable.from(file.buffer)

  stream
    .pipe(csvParser())
    .on('data', row => {
      // Validate and transform row
      const transformed = {
        propertyId: property.id,
        userId,
        date: row.date,
        price: parseFloat(row.price),
        occupancy: parseFloat(row.occupancy),
        bookings: parseInt(row.bookings),
      }
      rows.push(transformed)

      // Batch insert when we hit 1000 rows
      if (rows.length >= 1000) {
        await supabase.from('pricing_data').insert(rows)
        rows.length = 0
      }
    })
    .on('end', async () => {
      // Insert remaining rows
      if (rows.length > 0) {
        await supabase.from('pricing_data').insert(rows)
      }

      res.json({ success: true, propertyId: property.id, rowCount: totalRows })
    })
    .on('error', error => {
      res.status(500).json({ error: 'CSV parsing failed' })
    })
})
```

### Enrichment Pipeline

**Three-Stage Enrichment**:

```typescript
// services/enrichmentService.ts

export async function enrichProperty(propertyId: string, userId: string) {
  console.log('🚀 Starting enrichment pipeline for', propertyId)

  // Stage 1: Temporal Enrichment
  console.log('📆 Starting temporal enrichment...')
  await enrichTemporal(propertyId, userId)

  // Stage 2: Weather Enrichment
  console.log('🌤️ Starting weather enrichment...')
  await enrichWeather(propertyId, userId)

  // Stage 3: Holiday Enrichment (disabled)
  console.log('🎉 Holiday enrichment requested...')
  console.warn('⚠️ Holiday enrichment not yet migrated to Supabase - skipping')

  console.log('✅ Enrichment pipeline complete!')
}

async function enrichTemporal(propertyId: string, userId: string) {
  // Fetch all pricing data for this property
  const { data: rows } = await supabase
    .from('pricing_data')
    .select('*')
    .eq('propertyId', propertyId)
    .eq('userId', userId)

  // Calculate temporal features for each row
  const enrichedRows = rows.map(row => {
    const date = new Date(row.date)

    return {
      ...row,
      dayOfWeek: date.getDay(), // 0-6 (Sunday = 0)
      month: date.getMonth() + 1, // 1-12
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      season: getSeason(date.getMonth() + 1),
    }
  })

  // Batch update all rows
  await supabase.from('pricing_data').upsert(enrichedRows).eq('userId', userId)
}

async function enrichWeather(propertyId: string, userId: string) {
  // Get property location
  const { data: property } = await supabase
    .from('properties')
    .select('latitude, longitude')
    .eq('id', propertyId)
    .single()

  // Fetch pricing data
  const { data: rows } = await supabase
    .from('pricing_data')
    .select('*')
    .eq('propertyId', propertyId)
    .eq('userId', userId)

  // Determine date range
  const dates = rows.map(r => r.date).sort()
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  // Call Open-Meteo API
  const weatherData = await fetch(
    `https://archive-api.open-meteo.com/v1/archive?` +
      `latitude=${property.latitude}&longitude=${property.longitude}&` +
      `start_date=${startDate}&end_date=${endDate}&` +
      `daily=temperature_2m_mean,precipitation_sum,sunshine_duration,weathercode`
  ).then(r => r.json())

  // Match weather to pricing data by date
  const enrichedRows = rows.map(row => {
    const weatherIndex = weatherData.daily.time.indexOf(row.date)

    if (weatherIndex === -1) return row

    return {
      ...row,
      temperature: weatherData.daily.temperature_2m_mean[weatherIndex],
      precipitation: weatherData.daily.precipitation_sum[weatherIndex],
      sunshineHours: weatherData.daily.sunshine_duration[weatherIndex] / 3600,
      weatherCondition: getWeatherDescription(weatherData.daily.weathercode[weatherIndex]),
    }
  })

  // Batch update
  await supabase.from('pricing_data').upsert(enrichedRows).eq('userId', userId)
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'Spring'
  if (month >= 6 && month <= 8) return 'Summer'
  if (month >= 9 && month <= 11) return 'Fall'
  return 'Winter'
}

function getWeatherDescription(code: number): string {
  // WMO Weather interpretation codes
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    61: 'Rain',
    // ... more codes
  }
  return codes[code] || 'Unknown'
}
```

### ML Analytics Service

**Statistical Analysis Functions**:

```typescript
// services/mlAnalytics.ts

export async function calculateSummaryStatistics(data: PricingDataRow[]) {
  const prices = data.map(d => d.price)
  const occupancy = data.map(d => d.occupancy)

  return {
    price: {
      mean: mean(prices),
      median: median(prices),
      stdDev: standardDeviation(prices),
      min: Math.min(...prices),
      max: Math.max(...prices),
      p25: percentile(prices, 25),
      p50: percentile(prices, 50),
      p75: percentile(prices, 75),
    },
    occupancy: {
      mean: mean(occupancy),
      median: median(occupancy),
      // ... same stats
    },
    revenue: {
      total: data.reduce((sum, d) => sum + d.price * d.occupancy, 0),
      average: mean(data.map(d => d.price * d.occupancy)),
    },
    trends: {
      priceGrowth: calculateGrowthRate(prices),
      occupancyTrend: calculateTrend(occupancy),
    },
  }
}

export async function analyzeWeatherImpact(data: PricingDataRow[]) {
  // Group by weather condition
  const grouped = groupBy(data, 'weatherCondition')

  const analysis = Object.entries(grouped).map(([condition, rows]) => {
    return {
      condition,
      count: rows.length,
      avgPrice: mean(rows.map(r => r.price)),
      avgOccupancy: mean(rows.map(r => r.occupancy)),
      avgRevenue: mean(rows.map(r => r.price * r.occupancy)),
    }
  })

  // Sort by impact (revenue)
  return analysis.sort((a, b) => b.avgRevenue - a.avgRevenue)
}

export async function forecastDemand(data: PricingDataRow[], daysAhead: number = 30) {
  // Simple moving average forecast
  const occupancyValues = data.map(d => d.occupancy)
  const windowSize = 7 // 7-day moving average

  const forecast = []
  const lastDate = new Date(data[data.length - 1].date)

  for (let i = 1; i <= daysAhead; i++) {
    const futureDate = addDays(lastDate, i)

    // Calculate moving average of last N days
    const recentValues = occupancyValues.slice(-windowSize)
    const predicted = mean(recentValues)

    // Add some uncertainty
    const confidence = {
      lower: predicted * 0.9,
      upper: predicted * 1.1,
    }

    forecast.push({
      date: futureDate,
      predicted,
      confidence,
    })
  }

  return forecast
}
```

### Market Sentiment (AI Integration)

**Claude API Integration**:

```typescript
// services/marketSentiment.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateMarketInsights(
  data: PricingDataRow[],
  businessSettings: BusinessSettings
) {
  const prompt = `
You are a hospitality pricing expert. Analyze this pricing data and provide strategic insights.

Data Summary:
- Property: ${businessSettings.propertyName}
- Location: ${businessSettings.city}, ${businessSettings.country}
- Date Range: ${data[0].date} to ${data[data.length - 1].date}
- Records: ${data.length}
- Average Price: €${mean(data.map(d => d.price)).toFixed(2)}
- Average Occupancy: ${(mean(data.map(d => d.occupancy)) * 100).toFixed(1)}%

Recent Trends:
${JSON.stringify(calculateTrends(data), null, 2)}

Weather Impact:
${JSON.stringify(analyzeWeatherImpact(data), null, 2)}

Please provide:
1. Market sentiment (bullish/bearish/neutral)
2. Key pricing opportunities
3. Risks to watch
4. Strategic recommendations
5. Optimal pricing strategy for next 30 days

Be specific and actionable.
`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  return {
    insights: message.content[0].text,
    model: message.model,
    usage: message.usage,
  }
}
```

### Rate Limiting

**In-Memory Rate Limiter**:

```typescript
// Simple rate limiting (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function rateLimit(requestsPerMinute: number) {
  return (req, res, next) => {
    const ip = req.ip
    const now = Date.now()

    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + 60000 }

    if (now > record.resetTime) {
      // Reset window
      record.count = 1
      record.resetTime = now + 60000
    } else {
      record.count++
    }

    rateLimitMap.set(ip, record)

    if (record.count > requestsPerMinute) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      })
    }

    next()
  }
}

// Usage
app.post('/api/files/upload', authenticateUser, rateLimit(10), uploadHandler)
app.post('/api/analytics/*', authenticateUser, rateLimit(60), analyticsHandler)
```

### Error Handling

**Global Error Handler**:

```typescript
// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Server Error:', err)

  // Supabase errors
  if (err.code?.startsWith('PGRST')) {
    return res.status(400).json({
      error: 'Database error',
      message: err.message,
    })
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details,
    })
  }

  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: err.retryAfter,
    })
  }

  // Generic error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  })
})
```

---

## Pricing Engine Architecture

### Python FastAPI Service

**Service Responsibilities**:

1. Receive pricing requests from Node.js backend
2. Calculate optimal price using multi-factor algorithm
3. Generate price variants for A/B testing
4. Provide confidence intervals
5. Explain pricing decisions
6. (Future) Learn from booking outcomes

### API Endpoints

**Health Check**:

```python
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": pricing_engine.is_ready(),
        "timestamp": datetime.now().isoformat()
    }
```

**Price Scoring**:

```python
@app.post("/score", response_model=PricingResponse)
async def score(request: PricingRequest):
    logger.info(f"Pricing request for property {request.entity.propertyId}")

    result = pricing_engine.calculate_price(
        property_id=request.entity.propertyId,
        user_id=request.entity.userId,
        stay_date=request.stay_date,
        quote_time=request.quote_time,
        product=request.product.dict(),
        inventory=request.inventory.dict(),
        market=request.market.dict(),
        context=request.context.dict(),
        toggles=request.toggles.dict(),
        allowed_price_grid=request.allowed_price_grid
    )

    logger.info(f"Price calculated: €{result['price']:.2f}")
    return PricingResponse(**result)
```

**Learning Endpoint** (Future):

```python
@app.post("/learn", response_model=LearnResponse)
async def learn(request: LearnRequest):
    """Submit booking outcomes for ML model training"""
    processed = pricing_engine.learn_from_outcomes(request.batch)
    return LearnResponse(
        success=True,
        processed=processed,
        message=f"Successfully processed {processed} outcomes"
    )
```

### Pricing Algorithm

**Multi-Factor Pricing**:

```python
class PricingEngine:
    def __init__(self):
        self.base_price = 100.0  # Default base price

        # Seasonal multipliers
        self.seasonal_factors = {
            'Winter': 0.9,   # -10%
            'Spring': 1.0,   # baseline
            'Summer': 1.3,   # +30%
            'Fall': 1.1,     # +10%
        }

        # Day of week multipliers
        self.dow_factors = {
            0: 1.0,  # Monday
            1: 1.0,  # Tuesday
            2: 1.0,  # Wednesday
            3: 1.0,  # Thursday
            4: 1.15, # Friday (+15%)
            5: 1.25, # Saturday (+25%)
            6: 1.1,  # Sunday (+10%)
        }

    def calculate_price(self, **kwargs):
        try:
            # Parse dates
            stay_dt = self._parse_date(kwargs['stay_date'])
            quote_dt = datetime.fromisoformat(kwargs['quote_time'].replace('Z', '+00:00'))

            # Calculate lead time
            lead_days = (stay_dt - quote_dt).days

            # Extract context
            season = kwargs['context'].get('season', 'Spring')
            day_of_week = kwargs['context'].get('day_of_week', 0)

            # Extract market data
            comp_p50 = kwargs['market'].get('comp_price_p50')

            # Extract inventory
            capacity = kwargs['inventory'].get('capacity', 100)
            remaining = kwargs['inventory'].get('remaining', capacity)
            occupancy_rate = 1 - (remaining / capacity)

            # Extract product
            los = kwargs['product'].get('los', 1)
            refundable = kwargs['product'].get('refundable', True)

            # Extract toggles
            aggressive = kwargs['toggles'].get('aggressive', False)
            conservative = kwargs['toggles'].get('conservative', False)

            # STEP 1: Base Price
            base_price = comp_p50 if comp_p50 else self.base_price
            reasons = []

            # STEP 2: Seasonal Adjustment
            seasonal_factor = self.seasonal_factors.get(season, 1.0)
            base_price *= seasonal_factor
            if seasonal_factor != 1.0:
                reasons.append(f"{season} season pricing")

            # STEP 3: Day of Week
            dow_factor = self.dow_factors.get(day_of_week, 1.0)
            base_price *= dow_factor
            if dow_factor > 1.0:
                reasons.append("Weekend premium")

            # STEP 4: Demand (Occupancy)
            occupancy_multiplier = 1.0 + (occupancy_rate * 0.5)
            base_price *= occupancy_multiplier
            if occupancy_rate > 0.7:
                reasons.append(f"High demand ({int(occupancy_rate * 100)}% occupied)")

            # STEP 5: Lead Time
            lead_factor = 1.0
            if lead_days < 7:
                lead_factor = 1.2  # Last minute booking
                reasons.append("Last-minute booking premium")
            elif lead_days > 90:
                lead_factor = 0.9  # Early bird discount
                reasons.append("Early booking discount")
            base_price *= lead_factor

            # STEP 6: Length of Stay Discount
            los_discount = 1.0
            if los >= 7:
                los_discount = 0.9  # 10% off weekly
                reasons.append("Weekly stay discount")
            if los >= 14:
                los_discount = 0.85  # 15% off bi-weekly
            if los >= 30:
                los_discount = 0.8  # 20% off monthly
                reasons.append("Monthly stay discount")
            base_price *= los_discount

            # STEP 7: Refundability
            if not refundable:
                base_price *= 0.95  # 5% discount for non-refundable
                reasons.append("Non-refundable rate")

            # STEP 8: Strategy Toggles
            if aggressive:
                base_price *= 1.1  # +10%
                reasons.append("Aggressive pricing strategy")
            elif conservative:
                base_price *= 0.9  # -10%
                reasons.append("Conservative pricing strategy")

            # STEP 9: Apply Bounds
            min_price = kwargs['market'].get('comp_price_p10', base_price * 0.5) * 0.8
            max_price = kwargs['market'].get('comp_price_p90', base_price * 2.0) * 2.0
            final_price = max(min_price, min(base_price, max_price))

            if comp_p50:
                if final_price > comp_p50 * 1.1:
                    reasons.append(f"Premium pricing vs competitors (€{comp_p50:.2f})")
                elif final_price < comp_p50 * 0.9:
                    reasons.append(f"Competitive pricing vs market (€{comp_p50:.2f})")

            # STEP 10: Generate Price Grid
            price_grid = [
                round(final_price * 0.9, 2),   # -10%
                round(final_price * 0.95, 2),  # -5%
                round(final_price, 2),         # recommended
                round(final_price * 1.05, 2),  # +5%
                round(final_price * 1.1, 2),   # +10%
            ]

            # Confidence Interval
            conf_band = {
                'lower': round(final_price * 0.9, 2),
                'upper': round(final_price * 1.1, 2),
            }

            # Expected Occupancy
            expected_occ = {
                'occ_now': round(occupancy_rate, 2),
                'occ_end_bucket': min(round(occupancy_rate + 0.1, 2), 1.0),
            }

            # Safety Information
            safety = {
                'base_price_used': round(final_price, 2),
                'occupancy_rate': round(occupancy_rate, 2),
                'lead_days': lead_days,
                'season': season,
                'day_of_week': day_of_week,
            }

            logger.info(f"Price calculated: €{final_price:.2f} (base: €{base_price:.2f})")

            return {
                'price': round(final_price, 2),
                'price_grid': price_grid,
                'conf_band': conf_band,
                'expected': expected_occ,
                'reasons': reasons,
                'safety': safety,
            }

        except Exception as e:
            logger.error(f"Error in price calculation: {str(e)}")
            # Return fallback pricing
            return self._fallback_pricing(str(e))

    def _parse_date(self, date_str: str):
        """Parse date string with timezone handling"""
        if 'T' in date_str:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            return datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)

    def _fallback_pricing(self, error: str):
        """Return safe fallback pricing when calculation fails"""
        return {
            'price': self.base_price,
            'price_grid': [
                self.base_price * 0.9,
                self.base_price,
                self.base_price * 1.1,
            ],
            'conf_band': {
                'lower': self.base_price * 0.8,
                'upper': self.base_price * 1.2,
            },
            'expected': {
                'occ_now': 0.5,
                'occ_end_bucket': 0.6,
            },
            'reasons': ['Fallback pricing due to calculation error'],
            'safety': {
                'error': error,
            },
        }
```

### Pydantic Models

**Request/Response Schemas**:

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class EntityInfo(BaseModel):
    userId: str
    propertyId: str

class Product(BaseModel):
    type: str  # 'standard', 'deluxe', etc.
    refundable: bool
    los: int  # Length of stay

class Inventory(BaseModel):
    capacity: int
    remaining: int
    overbook_limit: int = 0

class Market(BaseModel):
    comp_price_p10: Optional[float] = None
    comp_price_p50: Optional[float] = None
    comp_price_p90: Optional[float] = None

class Context(BaseModel):
    season: str  # 'Winter', 'Spring', 'Summer', 'Fall'
    day_of_week: int  # 0-6
    weather: Dict[str, Any] = {}

class Toggles(BaseModel):
    aggressive: bool = False
    conservative: bool = False
    use_ml: bool = True
    use_competitors: bool = True
    apply_seasonality: bool = True

class PricingRequest(BaseModel):
    entity: EntityInfo
    stay_date: str  # ISO date string
    quote_time: str  # ISO datetime string
    product: Product
    inventory: Inventory
    market: Market
    context: Context
    toggles: Toggles
    allowed_price_grid: Optional[List[float]] = None

class PricingResponse(BaseModel):
    price: float
    price_grid: List[float]
    conf_band: Dict[str, float]
    expected: Dict[str, float]
    reasons: List[str]
    safety: Dict[str, Any]
```

### Docker Deployment

**Multi-Stage Dockerfile**:

```dockerfile
FROM python:3.11-slim as base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Database Architecture

### Supabase PostgreSQL Schema

**Tables**:

1. **properties** - CSV file metadata
2. **pricing_data** - Time-series pricing records
3. **business_settings** - User business configuration

### Table Schemas

**properties**:

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fileName TEXT NOT NULL,
  fileSize INTEGER,
  uploadedAt TIMESTAMPTZ DEFAULT NOW(),
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  city TEXT,
  country TEXT,
  propertyType TEXT,
  metadata JSONB,

  CONSTRAINT unique_user_file UNIQUE(userId, fileName)
);

CREATE INDEX idx_properties_user ON properties(userId);
```

**pricing_data** (camelCase convention):

```sql
CREATE TABLE pricing_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propertyId UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core pricing data
  date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  occupancy DECIMAL(5,4) CHECK (occupancy >= 0 AND occupancy <= 1),
  bookings INTEGER DEFAULT 0,

  -- Temporal enrichment (camelCase!)
  dayOfWeek INTEGER CHECK (dayOfWeek >= 0 AND dayOfWeek <= 6),
  month INTEGER CHECK (month >= 1 AND month <= 12),
  isWeekend BOOLEAN,
  season TEXT CHECK (season IN ('Winter', 'Spring', 'Summer', 'Fall')),

  -- Weather enrichment (camelCase!)
  temperature DECIMAL(5,2),
  weatherCondition TEXT,
  precipitation DECIMAL(6,2),
  sunshineHours DECIMAL(5,2),

  -- Holiday enrichment
  isHoliday BOOLEAN DEFAULT FALSE,
  holidayName TEXT,

  -- Metadata
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  extraData JSONB,

  CONSTRAINT unique_property_date UNIQUE(propertyId, date)
);

CREATE INDEX idx_pricing_data_property ON pricing_data(propertyId);
CREATE INDEX idx_pricing_data_user ON pricing_data(userId);
CREATE INDEX idx_pricing_data_date ON pricing_data(date);
```

**business_settings**:

```sql
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business info
  propertyName TEXT,
  propertyType TEXT,
  city TEXT,
  country TEXT,

  -- Pricing config
  basePriceStrategy TEXT,
  minPrice DECIMAL(10,2),
  maxPrice DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',

  -- Preferences
  preferences JSONB,

  createdAt TIMESTAMPTZ DEFAULT NOW(),
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_settings_user ON business_settings(userId);
```

### Row-Level Security (RLS) Policies

**Why RLS?**

- Multi-tenant data isolation
- Users can only access their own data
- Enforced at database level (not just application)

**Properties RLS**:

```sql
-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Users can only see their own properties
CREATE POLICY "Users can view own properties"
  ON properties FOR SELECT
  USING (auth.uid() = userId);

-- Users can only insert their own properties
CREATE POLICY "Users can insert own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = userId);

-- Users can only update their own properties
CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = userId);

-- Users can only delete their own properties
CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE
  USING (auth.uid() = userId);
```

**Pricing Data RLS**:

```sql
ALTER TABLE pricing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pricing data"
  ON pricing_data FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert own pricing data"
  ON pricing_data FOR INSERT
  WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update own pricing data"
  ON pricing_data FOR UPDATE
  USING (auth.uid() = userId);

CREATE POLICY "Users can delete own pricing data"
  ON pricing_data FOR DELETE
  USING (auth.uid() = userId);
```

**Business Settings RLS**:

```sql
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON business_settings FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert own settings"
  ON business_settings FOR INSERT
  WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update own settings"
  ON business_settings FOR UPDATE
  USING (auth.uid() = userId);
```

### Backend Database Access Pattern

**Service Role vs. Authenticated Access**:

```typescript
// Backend uses SERVICE ROLE (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Admin access
)

// BUT manually filters by userId for security
app.get('/api/files', authenticateUser, async (req, res) => {
  const userId = req.userId // From JWT

  // Even though we use service role, we manually filter
  const { data } = await supabase.from('properties').select('*').eq('userId', userId) // ← Manual filtering

  res.json(data)
})
```

**Why Service Role?**

- Batch operations bypass RLS performance issues
- Background tasks don't have user context
- More control over complex queries

**Security Strategy**:

- Backend manually filters EVERY query by userId
- RLS provides defense-in-depth
- If backend has a bug, RLS still protects data

---

## External API Integrations

### Open-Meteo (Weather Data)

**API**: https://open-meteo.com/
**Type**: Historical weather data
**Auth**: No API key required (free)
**Rate Limit**: None specified

**Usage**:

```typescript
async function fetchHistoricalWeather(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
) {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?` +
    `latitude=${lat}&longitude=${lng}&` +
    `start_date=${startDate}&end_date=${endDate}&` +
    `daily=temperature_2m_mean,precipitation_sum,sunshine_duration,weathercode&` +
    `timezone=auto`

  const response = await fetch(url)
  return response.json()
}
```

**Response Format**:

```json
{
  "latitude": 43.7,
  "longitude": 7.26,
  "daily": {
    "time": ["2024-01-01", "2024-01-02", ...],
    "temperature_2m_mean": [12.5, 13.2, ...],
    "precipitation_sum": [0.0, 2.5, ...],
    "sunshine_duration": [28800, 25200, ...],
    "weathercode": [0, 61, ...]
  }
}
```

### OpenWeather (Current/Forecast)

**API**: https://openweathermap.org/
**Type**: Current weather + 5-day forecast
**Auth**: API key required (free tier: 60 calls/min)
**Rate Limit**: 60 calls/minute (free tier)

**Usage**:

```typescript
async function fetchCurrentWeather(lat: number, lng: number) {
  const url =
    `https://api.openweathermap.org/data/2.5/weather?` +
    `lat=${lat}&lon=${lng}&` +
    `appid=${process.env.OPENWEATHER_API_KEY}&` +
    `units=metric`

  const response = await fetch(url)
  return response.json()
}
```

### Nominatim (Geocoding)

**API**: https://nominatim.openstreetmap.org/
**Type**: Free geocoding (address ↔ coordinates)
**Auth**: No API key required
**Rate Limit**: 1 request/second

**Usage**:

```typescript
async function geocodeAddress(address: string) {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(address)}&` +
    `format=json&` +
    `limit=1`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Jengu/1.0', // Required by Nominatim
    },
  })

  return response.json()
}
```

### Anthropic Claude (AI Insights)

**API**: https://api.anthropic.com/
**Type**: Large Language Model (LLM)
**Auth**: API key required
**Model**: claude-sonnet-4-5-20250929
**Rate Limit**: Depends on tier

**Usage**:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function generateInsights(prompt: string) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  return message.content[0].text
}
```

### Calendarific (Holidays) - Currently Disabled

**API**: https://calendarific.com/
**Type**: Holiday data
**Auth**: API key required
**Status**: Not yet migrated to Supabase
**Future**: Will be re-enabled after migration

---

## Authentication & Security

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: User Registration                                    │
└──────────────────────────────────────────────────────────────┘

User fills registration form
         ↓
POST /auth/register (Frontend → Backend)
         ↓
Backend validates input
         ↓
supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      name: 'John Doe',
    },
  },
})
         ↓
Supabase creates user account
         ↓
Email verification sent (if enabled)
         ↓
User ID returned
         ↓
Frontend redirects to login

┌──────────────────────────────────────────────────────────────┐
│ STEP 2: User Login                                           │
└──────────────────────────────────────────────────────────────┘

User enters credentials
         ↓
POST /auth/login (Frontend → Backend)
         ↓
supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword',
})
         ↓
Supabase validates credentials
         ↓
Returns session object:
{
  access_token: 'eyJhbGc...',  // JWT
  refresh_token: 'v1.abc...',
  expires_in: 3600,
  user: {
    id: 'uuid',
    email: 'user@example.com',
    ...
  },
}
         ↓
Frontend stores tokens:
- localStorage.setItem('sb-access-token', access_token)
- localStorage.setItem('sb-refresh-token', refresh_token)
         ↓
Redirect to dashboard

┌──────────────────────────────────────────────────────────────┐
│ STEP 3: Authenticated Request                                │
└──────────────────────────────────────────────────────────────┘

User clicks "Upload File"
         ↓
Frontend prepares request
         ↓
Axios interceptor adds header:
Authorization: Bearer eyJhbGc...
         ↓
POST /api/files/upload (Frontend → Backend)
         ↓
authenticateUser middleware:
1. Extract token from header
2. Call supabase.auth.getUser(token)
3. Verify token signature
4. Check expiration
5. Attach req.userId
         ↓
Route handler executes:
- Has access to req.userId
- Filters queries by userId
         ↓
Response sent back
         ↓
Frontend updates UI

┌──────────────────────────────────────────────────────────────┐
│ STEP 4: Token Refresh (Automatic)                            │
└──────────────────────────────────────────────────────────────┘

Access token expires (1 hour)
         ↓
Frontend detects 401 response
         ↓
supabase.auth.refreshSession({
  refresh_token: stored_refresh_token,
})
         ↓
Supabase issues new access token
         ↓
Frontend stores new token
         ↓
Retry original request
```

### JWT Token Structure

**Token Contents**:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "iat": 1672531200,
  "exp": 1672534800
}
```

**Token Verification**:

- Signature validated by Supabase
- Expiration checked
- Role verified
- User existence confirmed

### Security Best Practices

**Backend Security**:

1. ✅ HTTPS in production (enforced by Supabase)
2. ✅ CORS configured for frontend origin only
3. ✅ Helmet middleware for security headers
4. ✅ Rate limiting on all endpoints
5. ✅ Input validation on all user data
6. ✅ SQL injection prevention (parameterized queries)
7. ✅ XSS prevention (React auto-escapes)
8. ✅ CSRF protection (stateless JWT, no cookies)

**Frontend Security**:

1. ✅ Tokens in localStorage (XSS risk mitigated by React)
2. ✅ No sensitive data in client code
3. ✅ Environment variables for API URLs
4. ✅ Automatic token refresh
5. ✅ Logout clears all tokens

**Database Security**:

1. ✅ Row-Level Security enabled
2. ✅ Service role never exposed to frontend
3. ✅ All queries filtered by userId
4. ✅ Foreign key constraints
5. ✅ Check constraints on data ranges

**Environment Variables** (.env):

```bash
# Never commit .env to git!

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...  # Public key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Secret, backend only

# APIs
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENWEATHER_API_KEY=abc123...

# Pricing Service
PRICING_SERVICE_URL=http://localhost:8000

# Optional
SENTRY_DSN=https://...  # Error tracking
```

---

## Feature Breakdown

### 1. CSV Upload & Data Management

**User Journey**:

1. Navigate to Data page
2. Click "Upload CSV"
3. Select file from computer
4. (Optional) Add metadata (property name, location, etc.)
5. Click "Upload"
6. See progress indicator
7. File appears in file list
8. View data preview table

**Technical Flow**:

- Frontend: FileUploader component → FormData → axios POST
- Backend: Multer receives file → Stream parse CSV → Batch insert to DB
- Database: pricing_data rows created with userId + propertyId
- Frontend: Refresh file list, show success message

**Code Locations**:

- Frontend: [frontend/src/pages/DataPage.tsx](../frontend/src/pages/DataPage.tsx)
- Backend: [backend/server.ts](../backend/server.ts) (POST /api/files/upload)
- Service: [backend/services/dataTransform.ts](../backend/services/dataTransform.ts)

### 2. Data Enrichment

**User Journey**:

1. From file list, click "Enrich" button
2. See enrichment progress (modal/toast)
3. Wait 5-10 seconds
4. See "Enrichment complete" message
5. View enriched data in table (new columns visible)

**Technical Flow**:

- Frontend: Click → POST /api/files/:id/enrich
- Backend: Enrichment pipeline starts
  - Temporal: Calculate dayOfWeek, season, etc.
  - Weather: Fetch from Open-Meteo, match by date
  - Holidays: (Disabled) Would fetch from Calendarific
- Database: Batch update all rows with enriched fields
- Frontend: Refetch data, show updated table

**Code Locations**:

- Frontend: [frontend/src/pages/DataPage.tsx](../frontend/src/pages/DataPage.tsx)
- Backend: [backend/server.ts](../backend/server.ts) (POST /api/files/:id/enrich)
- Service: [backend/services/enrichmentService.ts](../backend/services/enrichmentService.ts)

### 3. Analytics Dashboard

**User Journey**:

1. Navigate to Dashboard or Director Dashboard
2. See KPI cards (Revenue, Occupancy, Bookings, ADR)
3. View charts:
   - Pricing trends over time
   - Occupancy heatmap
   - Revenue breakdown
   - Demand forecast
   - Weather impact
   - Competitor comparison
4. Interact with charts (hover, click, filter)
5. Export data (future feature)

**Technical Flow**:

- Frontend: Component mounts → Zustand fetches data
- API calls to multiple analytics endpoints:
  - POST /api/analytics/summary
  - POST /api/analytics/weather-impact
  - POST /api/analytics/demand-forecast
  - POST /api/analytics/competitor-analysis
  - POST /api/analytics/feature-importance
- Backend: ML analytics service processes data
- Frontend: Recharts renders visualizations

**Code Locations**:

- Frontend: [frontend/src/pages/DirectorDashboard.tsx](../frontend/src/pages/DirectorDashboard.tsx)
- Backend: [backend/routes/analytics.ts](../backend/routes/analytics.ts)
- Service: [backend/services/mlAnalytics.ts](../backend/services/mlAnalytics.ts)

### 4. AI Insights

**User Journey**:

1. Navigate to Insights page
2. See quick suggestion buttons
3. OR type custom question in chat
4. Click "Send" or click suggestion
5. See loading indicator
6. AI response appears with:
   - Market sentiment
   - Key opportunities
   - Risks to watch
   - Strategic recommendations
7. Ask follow-up questions

**Technical Flow**:

- Frontend: User input → POST /api/assistant/message
- Backend: Prepare context (pricing data summary)
- Call Anthropic Claude API with prompt
- Claude generates insights (2-5 seconds)
- Backend returns formatted response
- Frontend displays in chat interface

**Code Locations**:

- Frontend: [frontend/src/pages/InsightsPage.tsx](../frontend/src/pages/InsightsPage.tsx)
- Backend: [backend/routes/assistant.ts](../backend/routes/assistant.ts)
- Service: [backend/services/marketSentiment.ts](../backend/services/marketSentiment.ts)

### 5. Dynamic Pricing

**User Journey**:

1. Navigate to Pricing page
2. Fill out quote form:
   - Stay date
   - Quote time (defaults to now)
   - Length of stay
   - Guest count
   - Room type
   - Refundable/non-refundable
   - Strategy toggles (aggressive/conservative)
3. Click "Get Price Quote"
4. See loading spinner
5. Price recommendation appears:
   - Recommended price (€300.30)
   - Price grid with 5 alternatives
   - Confidence interval (±10%)
   - Expected occupancy projection
   - Reasoning explanations
6. Copy price or select alternative

**Technical Flow**:

- Frontend: Form submission → POST /api/pricing/quote
- Backend: Prepare pricing context
  - Fetch property data
  - Get current inventory status
  - Fetch competitor prices (if available)
  - Extract weather/season context
- Backend → Python service: POST http://localhost:8000/score
- Python: Pricing algorithm calculates price
- Response chain: Python → Backend → Frontend
- Frontend: Display formatted results

**Code Locations**:

- Frontend: [frontend/src/pages/PricingPage.tsx](../frontend/src/pages/PricingPage.tsx)
- Backend: [backend/routes/pricing.ts](../backend/routes/pricing.ts)
- Python Service: [pricing-service/main.py](../pricing-service/main.py)
- Algorithm: [pricing-service/pricing_engine.py](../pricing-service/pricing_engine.py)

### 6. Business Settings

**User Journey**:

1. Navigate to Settings page
2. See current settings (or empty if first time)
3. Fill out:
   - Business Profile (name, type, location)
   - Property Details (amenities, capacity, etc.)
   - Pricing Strategy (base price, min/max, currency)
   - Integration Settings (API keys - future)
4. Click "Save Settings"
5. See success message
6. Settings applied across app

**Technical Flow**:

- Frontend: Load settings on mount → GET /api/settings
- User edits form
- Click Save → POST /api/settings
- Backend: Upsert to business_settings table
- Frontend: Update Zustand store
- Settings used in pricing calculations, analytics, etc.

**Code Locations**:

- Frontend: [frontend/src/pages/Settings.tsx](../frontend/src/pages/Settings.tsx)
- Backend: [backend/server.ts](../backend/server.ts) (settings routes)

---

## Development Workflow

### Local Development Setup

**Prerequisites**:

- Node.js 20+
- Python 3.11+
- pnpm (not npm)
- Git

**Initial Setup**:

```bash
# 1. Clone repository
git clone https://github.com/yourorg/jengu.git
cd jengu

# 2. Install dependencies (monorepo)
pnpm install

# 3. Setup backend
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials

# Setup database
node setup-database.js

# Test connection
node test-db.js

# 4. Setup pricing service
cd ../pricing-service
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# 5. Setup frontend
cd ../frontend
cp .env.example .env
# Edit .env with VITE_API_URL and VITE_SUPABASE_URL
```

**Running Development Servers**:

```bash
# Terminal 1: Backend
cd backend
pnpm run dev
# Server starts on http://localhost:3001

# Terminal 2: Frontend
cd frontend
pnpm run dev
# App opens on http://localhost:5173

# Terminal 3: Pricing Service
cd pricing-service
python main.py
# Service starts on http://localhost:8000
```

**Development Features**:

- ✅ Hot Module Replacement (HMR) in frontend (Vite)
- ✅ Auto-restart on backend changes (tsx watch)
- ✅ Auto-reload on Python changes (Uvicorn --reload)
- ✅ TypeScript type checking in real-time
- ✅ ESLint warnings in console
- ✅ Prettier formatting on save (if configured in editor)

### Code Quality Workflow

**Before Committing**:

```bash
# From project root
pnpm run check-all
# Runs: type-check + lint + format:check

# Fix issues automatically
pnpm run fix-all
# Runs: lint:fix + format
```

**Individual Checks**:

```bash
# Type check both workspaces
pnpm run type-check

# Type check frontend only
pnpm run type-check:frontend

# Type check backend only
pnpm run type-check:backend

# Lint check
pnpm run lint

# Lint fix
pnpm run lint:fix

# Format check (CI-friendly)
pnpm run format:check

# Format all files
pnpm run format
```

**Build Verification**:

```bash
# Frontend type check + build
cd frontend
pnpm run build:check

# Backend compile TypeScript
cd backend
pnpm run build

# Production preview
cd frontend
pnpm run preview
```

### Testing Strategy

**Current State**: No automated tests yet

**Future Testing Plan**:

1. **Unit Tests**
   - Frontend: Vitest + React Testing Library
   - Backend: Jest or Vitest
   - Python: pytest

2. **Integration Tests**
   - API endpoint tests
   - Database operations
   - External API mocks

3. **E2E Tests**
   - Playwright or Cypress
   - Critical user flows
   - Cross-browser testing

### Git Workflow

**Branch Strategy**:

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

**Commit Message Convention**:

```
feat: add dynamic pricing engine
fix: resolve CSV upload memory leak
docs: update architecture guide
refactor: extract analytics into service layer
chore: update dependencies
```

**Pull Request Process**:

1. Create feature branch from `develop`
2. Make changes, commit frequently
3. Run `pnpm run check-all` before pushing
4. Push to remote
5. Open PR to `develop`
6. Request review
7. Address feedback
8. Merge when approved

---

## Deployment Architecture

### Production Stack Options

**Option 1: Full Cloud Deployment**

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                              │
│                  Vercel / Netlify / Cloudflare                │
│                                                               │
│  - Static build deployed                                      │
│  - CDN distribution                                           │
│  - Automatic HTTPS                                            │
│  - Environment variables configured                           │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS/REST
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                         BACKEND API                           │
│               Railway / Render / Fly.io / AWS                 │
│                                                               │
│  - Docker container deployed                                  │
│  - Auto-scaling enabled                                       │
│  - Health checks configured                                   │
│  - Environment variables set                                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
    ┌──────────────┐  ┌────────────┐  ┌────────────────┐
    │  SUPABASE    │  │  PRICING   │  │ EXTERNAL APIs  │
    │  (Database   │  │  SERVICE   │  │                │
    │   + Auth)    │  │  (Python)  │  │ - Claude       │
    │              │  │            │  │ - Open-Meteo   │
    │ - Managed    │  │ Railway/   │  │ - OpenWeather  │
    │   PostgreSQL │  │ Render/    │  │ - Nominatim    │
    │ - Automatic  │  │ Lambda     │  │                │
    │   backups    │  │            │  │                │
    └──────────────┘  └────────────┘  └────────────────┘
```

**Option 2: Hybrid Deployment**

- Frontend: Vercel (free tier)
- Backend: VPS (DigitalOcean Droplet, $6/month)
- Pricing Service: Same VPS or AWS Lambda
- Database: Supabase (free tier or paid)

**Option 3: Self-Hosted**

- Frontend + Backend + Pricing: Single VPS
- Nginx reverse proxy
- PM2 process manager
- PostgreSQL on same server or Supabase
- Manual SSL certificate (Let's Encrypt)

### Environment Configuration

**Frontend (.env.production)**:

```bash
VITE_API_URL=https://api.jengu.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Backend (.env.production)**:

```bash
NODE_ENV=production
PORT=3001

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

ANTHROPIC_API_KEY=sk-ant-api03-...
OPENWEATHER_API_KEY=abc123...

PRICING_SERVICE_URL=https://pricing.jengu.com

FRONTEND_URL=https://jengu.com

SENTRY_DSN=https://...
```

**Pricing Service (.env.production)**:

```bash
LOG_LEVEL=INFO
```

### Docker Deployment

**Backend Dockerfile**:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

**Pricing Service Dockerfile** (already created):

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Docker Compose** (for local multi-service development):

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=development
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - PRICING_SERVICE_URL=http://pricing:8000
    depends_on:
      - pricing

  pricing:
    build: ./pricing-service
    ports:
      - '8000:8000'
    environment:
      - LOG_LEVEL=INFO

  frontend:
    build: ./frontend
    ports:
      - '5173:5173'
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_SUPABASE_URL=${SUPABASE_URL}
```

### CI/CD Pipeline (Future)

**GitHub Actions Example**:

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm run type-check
      - run: pnpm run lint
      - run: pnpm run test # when tests exist

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: cd frontend && pnpm run build
      - uses: vercel/action@v1 # or netlify, cloudflare
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: registry/jengu-backend:latest
      # Deploy to Railway/Render/etc.
```

---

## Code Quality & Standards

### TypeScript Configuration

**Shared Config** (tsconfig.json at root):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Why Strict Mode?**

- Catches errors at compile time, not runtime
- Forces explicit null/undefined handling
- Prevents implicit `any` types
- Improves IDE autocomplete
- Makes refactoring safer

### ESLint Configuration

**Flat Config** (eslint.config.js):

```javascript
import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tailwind from 'eslint-plugin-tailwindcss'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
      tailwindcss: tailwind,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'tailwindcss/classnames-order': 'warn',
    },
  },
]
```

### Prettier Configuration

**Config** (.prettierrc):

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

**Tailwind Plugin**: Automatically sorts Tailwind classes

### File Naming Conventions

**Frontend**:

- React components: `PascalCase.tsx` (e.g., `Dashboard.tsx`, `PricingPage.tsx`)
- Utilities/services: `camelCase.ts` (e.g., `api/client.ts`, `utils.ts`)
- Hooks: `use*.ts` (e.g., `useDataStore.ts`, `useAuth.ts`)
- Types: `types.ts` or `*.types.ts`

**Backend**:

- Route handlers: `camelCase.ts` (e.g., `pricing.ts`, `analytics.ts`)
- Services: `camelCase.ts` (e.g., `mlAnalytics.ts`, `enrichmentService.ts`)
- Main server: `server.ts`

**Python**:

- Modules: `snake_case.py` (e.g., `pricing_engine.py`, `main.py`)
- Classes: `PascalCase`
- Functions: `snake_case`

### Code Style Guidelines

**TypeScript/React**:

```typescript
// ✅ Good
export function PricingCard({ price, currency = 'EUR' }: Props) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await fetchPrice()
    } catch (error) {
      console.error('Failed to fetch price:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-bold">{formatPrice(price, currency)}</h3>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'Loading...' : 'Get Quote'}
      </button>
    </div>
  )
}

// ❌ Avoid
export function PricingCard(props: any) {  // Don't use 'any'
  const [loading, setLoading] = useState(false)

  const handleClick = () => {  // Missing error handling
    fetchPrice()
  }

  return <div className="p-6 bg-white shadow-sm rounded-lg border border-gray-200">  // Tailwind order
    <h3>{price}</h3>  // No formatting
    <button onClick={handleClick}>{loading ? 'Loading...' : 'Get Quote'}</button>
  </div>
}
```

**Python**:

```python
# ✅ Good
def calculate_price(
    base_price: float,
    season: str,
    occupancy_rate: float,
) -> dict[str, Any]:
    """
    Calculate dynamic price based on multiple factors.

    Args:
        base_price: Starting price before adjustments
        season: One of 'Winter', 'Spring', 'Summer', 'Fall'
        occupancy_rate: Current occupancy (0.0 to 1.0)

    Returns:
        Dictionary with price, confidence bands, and reasoning
    """
    seasonal_factor = SEASONAL_FACTORS.get(season, 1.0)
    demand_multiplier = 1.0 + (occupancy_rate * 0.5)

    final_price = base_price * seasonal_factor * demand_multiplier

    return {
        'price': round(final_price, 2),
        'factors': {
            'seasonal': seasonal_factor,
            'demand': demand_multiplier,
        },
    }

# ❌ Avoid
def calc_price(b, s, o):  # No type hints, unclear names
    f = SEASONAL_FACTORS.get(s, 1.0)
    m = 1.0 + (o * 0.5)
    return b * f * m  # No structure, no documentation
```

---

## Performance Characteristics

### Response Times (Development)

**Endpoints**:

- GET /health: ~2ms
- GET /api/files: ~50-100ms (depends on row count)
- GET /api/files/:id/data: ~100-500ms (depends on data size)
- POST /api/files/upload: ~2-10s (depends on file size)
- POST /api/files/:id/enrich: ~5-15s (weather API latency)
- POST /api/analytics/\*: ~5-20ms (statistical calculations)
- POST /api/analytics/ai-insights: ~2-5s (Claude API latency)
- POST /api/pricing/quote: ~10-50ms (Python service + network)

**Database Queries**:

- Simple SELECT: ~10-30ms
- Batch INSERT (1000 rows): ~200-500ms
- Batch UPDATE (1000 rows): ~300-700ms

**External APIs**:

- Open-Meteo (historical weather): ~500-2000ms
- OpenWeather (current): ~200-500ms
- Anthropic Claude: ~2000-5000ms
- Nominatim (geocoding): ~300-800ms

### Memory Usage

**Frontend**:

- Initial load: ~50-80 MB
- With large dataset (10k rows): ~150-200 MB
- Chart rendering: +20-50 MB

**Backend**:

- Idle: ~50 MB
- Processing CSV upload: +10-20 MB (streaming, not buffered)
- Peak during enrichment: ~100-150 MB

**Pricing Service**:

- Idle: ~30 MB
- Processing request: ~40 MB
- Peak: ~50 MB

### Scalability Considerations

**Current Limits**:

- CSV upload: 50 MB file size limit
- Pricing data: Tested with 10,000 rows per property
- Concurrent users: ~10-20 (not load tested)
- Rate limiting: 60 requests/minute per IP

**Bottlenecks**:

1. **Enrichment Pipeline**
   - Weather API rate limits
   - Solution: Cache weather data, batch requests

2. **Large Dataset Rendering**
   - Browser memory with 10k+ rows in table
   - Solution: Pagination, virtual scrolling

3. **Claude API Costs**
   - $0.003 per 1k tokens (input), $0.015 per 1k tokens (output)
   - Solution: Cache insights, limit requests

**Scaling Strategies**:

1. Add Redis for caching (weather, analytics)
2. Implement pagination for large datasets
3. Use React Query for server state management
4. Add database indexes for common queries
5. Deploy pricing service with auto-scaling
6. Add CDN for static assets
7. Implement request queuing for enrichment

---

## Troubleshooting Guide

### Common Issues

**1. ECONNREFUSED - Backend can't connect to pricing service**

_Symptoms_:

```
TypeError: fetch failed
caused by: AggregateError [ECONNREFUSED]
```

_Cause_: Pricing service not running

_Fix_:

```bash
cd pricing-service
python main.py
# Verify at http://localhost:8000/health
```

---

**2. "Invalid token" errors**

_Symptoms_:

- 401 Unauthorized responses
- Redirect to login page

_Cause_: Expired or missing JWT token

_Fix_:

1. Clear browser localStorage
2. Log out and log back in
3. Check token in DevTools → Application → Local Storage

---

**3. CSV upload fails**

_Symptoms_:

- Upload hangs
- "File too large" error
- "Invalid CSV format" error

_Fixes_:

- Check file size (max 50MB)
- Verify CSV has required columns: date, price, occupancy
- Check for special characters in CSV
- Try smaller file first to test

---

**4. Enrichment takes too long or fails**

_Symptoms_:

- Enrichment stuck at "Processing..."
- Timeout errors
- Partial enrichment

_Fixes_:

- Check backend logs for errors
- Verify internet connection (for weather API)
- Check property has valid latitude/longitude
- Reduce date range if dataset is very large

---

**5. Claude API errors**

_Symptoms_:

```
Claude API Error: {
  type: 'not_found_error',
  message: 'model: claude-3-5-sonnet-20241022'
}
```

_Cause_: Wrong model name

_Fix_:
Update to correct model: `claude-sonnet-4-5-20250929`

Files to check:

- [backend/routes/assistant.ts](../backend/routes/assistant.ts)
- [backend/services/marketSentiment.ts](../backend/services/marketSentiment.ts)

---

**6. "Database connection failed"**

_Symptoms_:

- Can't fetch data
- All API calls fail
- "Connection timeout" errors

_Fixes_:

1. Check `.env` has correct Supabase credentials
2. Verify Supabase project is active
3. Test connection:

```bash
cd backend
node test-db.js
```

4. Check Supabase dashboard for service status

---

**7. Frontend build errors**

_Symptoms_:

```
Error: Cannot find module '@/components/ui/Button'
Type error in file X
```

_Fixes_:

```bash
# Clean and reinstall
rm -rf node_modules
pnpm install

# Type check
pnpm run type-check:frontend

# Check for missing imports
```

---

**8. Port already in use**

_Symptoms_:

```
Error: listen EADDRINUSE :::3001
```

_Cause_: Another process using the port

_Fix_:

```bash
# Find and kill process
# macOS/Linux
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

---

### Debug Mode

**Backend Logging**:

```typescript
// Enable verbose logging
const logger = pino({
  level: process.env.LOG_LEVEL || 'debug', // Set to 'debug'
  transport: {
    target: 'pino-pretty', // Pretty print for development
  },
})
```

**Frontend Debugging**:

```typescript
// Add console logs in API calls
const fetchData = async () => {
  console.log('Fetching data...')
  const response = await api.get('/api/files')
  console.log('Response:', response.data)
}

// Use React DevTools
// Install extension: React Developer Tools
```

**Python Service Logging**:

```python
# Set LOG_LEVEL=DEBUG in .env
import logging
logging.basicConfig(level=logging.DEBUG)

# Add debug logs
logger.debug(f"Calculating price with params: {params}")
```

---

## Future Roadmap

### Planned Features

**Q1 2025**:

- [ ] Holiday enrichment migration to Supabase
- [ ] Competitor price scraping integration
- [ ] Email notifications for price alerts
- [ ] Export data to CSV/Excel
- [ ] Multi-property management dashboard

**Q2 2025**:

- [ ] Automated testing suite (unit + integration + E2E)
- [ ] React Query for server state management
- [ ] Redis caching for analytics
- [ ] Webhook integrations (PMS systems)
- [ ] Mobile-responsive design improvements

**Q3 2025**:

- [ ] ML model training from booking outcomes
- [ ] A/B testing framework for pricing
- [ ] Revenue optimization recommendations
- [ ] Custom report builder
- [ ] Multi-currency support

**Q4 2025**:

- [ ] Mobile app (React Native)
- [ ] Calendar integration (Google, iCal)
- [ ] Channel manager integration
- [ ] Team collaboration features
- [ ] White-label solution for agencies

### Technical Debt

**High Priority**:

1. Add automated tests (0% coverage currently)
2. Implement proper error boundaries in React
3. Add request ID tracking for debugging
4. Migrate from localStorage to secure token storage
5. Add database connection pooling

**Medium Priority**:

1. Extract route handlers from single server.ts file
2. Add API documentation (Swagger/OpenAPI)
3. Implement proper logging levels
4. Add health check for all services
5. Create admin dashboard for monitoring

**Low Priority**:

1. Add dark mode support
2. Internationalization (i18n)
3. Accessibility improvements (ARIA labels)
4. SEO optimization
5. Analytics integration (Plausible/Fathom)

---

## Appendix

### Glossary

**Terms**:

- **ADR**: Average Daily Rate (average price per night)
- **LOS**: Length of Stay
- **OCC**: Occupancy rate (% of rooms filled)
- **RevPAR**: Revenue Per Available Room (ADR × Occupancy)
- **RLS**: Row-Level Security (database access control)
- **JWT**: JSON Web Token (authentication)
- **SPA**: Single Page Application
- **SSR**: Server-Side Rendering (not used in this project)
- **CDN**: Content Delivery Network
- **CORS**: Cross-Origin Resource Sharing

### Acronyms

- **API**: Application Programming Interface
- **REST**: Representational State Transfer
- **HTTP**: Hypertext Transfer Protocol
- **HTTPS**: HTTP Secure
- **SQL**: Structured Query Language
- **JSON**: JavaScript Object Notation
- **CSV**: Comma-Separated Values
- **UI**: User Interface
- **UX**: User Experience
- **CI/CD**: Continuous Integration/Continuous Deployment
- **ENV**: Environment (variables)
- **DB**: Database

### Useful Commands Cheat Sheet

```bash
# Development
pnpm run dev                    # Start backend dev server
pnpm run dev                    # Start frontend dev server (from frontend/)
python main.py                  # Start pricing service (from pricing-service/)

# Code Quality
pnpm run check-all              # Type check + lint + format check
pnpm run fix-all                # Auto-fix lint + format issues
pnpm run type-check             # TypeScript type checking
pnpm run lint                   # ESLint check
pnpm run format                 # Prettier format

# Building
pnpm run build                  # Build frontend for production
pnpm run build                  # Compile backend TypeScript
pnpm run preview                # Preview frontend production build

# Database
node setup-database.js          # Initialize database schema
node test-db.js                 # Test database connection
node check-data-pipeline.js     # Audit data pipeline
node check-schema.js            # Verify database schema

# Docker
docker build -t jengu-backend ./backend
docker build -t jengu-pricing ./pricing-service
docker-compose up               # Start all services

# Git
git status                      # Check working tree status
git add .                       # Stage all changes
git commit -m "message"         # Commit changes
git push origin main            # Push to remote

# Dependencies
pnpm install                    # Install all dependencies
pnpm add <package>              # Add dependency
pnpm remove <package>           # Remove dependency
pnpm update                     # Update dependencies
```

---

## Summary

Jengu is a **full-stack TypeScript monorepo** with:

**Frontend**: React 18 + Vite + Tailwind + Zustand
**Backend**: Node.js + Express + TypeScript + Supabase
**Pricing**: Python + FastAPI + Multi-factor algorithm
**Database**: Supabase PostgreSQL with RLS
**AI**: Anthropic Claude for insights

**Key Features**:

1. CSV upload with streaming parser
2. Automated data enrichment (temporal + weather)
3. ML-powered analytics with 6 statistical endpoints
4. AI-generated insights via Claude
5. Dynamic pricing with multi-factor algorithm
6. Modern, responsive UI with V2 dashboard charts

**Architecture Highlights**:

- Microservices pattern (Node.js + Python)
- RESTful API design
- JWT authentication with Supabase
- Row-Level Security for multi-tenancy
- Monorepo with pnpm workspaces
- Type-safe with strict TypeScript

**Current Status**: ✅ Production Ready

- All core features operational
- Python pricing service deployed
- Complete data pipeline functional
- Claude API integrated
- Database schema verified
- Documentation complete

---

**Last Updated**: 2025-10-23
**Document Version**: 1.0.0
**Maintained By**: Development Team

For questions or updates, refer to:

- [CLAUDE.md](../CLAUDE.md) - Quick start guide
- [docs/developer/ARCHITECTURE.md](developer/ARCHITECTURE.md) - Detailed architecture
- [SYSTEM-STATUS.md](../SYSTEM-STATUS.md) - Current system health
