# Dynamic Pricing System - Architecture Overview

> **React + Vite + Node.js Express + Python Analytics Library**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Frontend (Port 5173)                          │  │
│  │  - React 18+ with TypeScript                         │  │
│  │  - Vite build tool                                   │  │
│  │  - Tailwind CSS styling                              │  │
│  │  - Framer Motion animations                          │  │
│  │  - Recharts visualizations                           │  │
│  │  - Zustand state management                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS / REST API
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Node.js Express Backend (Port 3001)                 │  │
│  │  - API proxy for external services                   │  │
│  │  - Rate limiting & security                          │  │
│  │  - CORS configuration                                │  │
│  │  - External API integrations:                        │  │
│  │    • Anthropic Claude (AI assistant)                 │  │
│  │    • OpenWeatherMap (historical weather)             │  │
│  │    • Calendarific (holidays)                         │  │
│  │    • OpenStreetMap Nominatim (geocoding)             │  │
│  │    • Mapbox (geocoding fallback)                     │  │
│  │    • ScraperAPI (competitor data)                    │  │
│  │    • Makcorps (hotel pricing)                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   ANALYTICS LAYER                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Python Core Library (Standalone)                    │  │
│  │  - Used by scripts and analysis tools                │  │
│  │  - NOT a running service                             │  │
│  │  - Price optimization algorithms                     │  │
│  │  - Correlation analysis (Pearson, Spearman, MI)      │  │
│  │  - Data enrichment (weather, holidays)               │  │
│  │  - GLM modeling                                      │  │
│  │  - Business insights generation                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Storage                                              │  │
│  │  - JSON (config, profiles, cache)                    │  │
│  │  - Parquet (datasets, enriched data)                 │  │
│  │  - File system storage (no database yet)             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Directory Structure

```
jengu/
│
├── frontend/                     # React + Vite web application
│   ├── src/
│   │   ├── app/                 # Pages (App Router pattern)
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utils & API client
│   │   ├── stores/              # Zustand stores
│   │   └── types/               # TypeScript types
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                      # Node.js Express API proxy
│   ├── server.js                # Main server file
│   ├── package.json
│   └── .env.example
│
├── core/                         # Python analytics library (standalone)
│   ├── analytics/
│   │   ├── correlation.py       # Multi-method correlation
│   │   ├── enrichment.py        # Weather/temporal enrichment
│   │   └── insights.py          # Business insights
│   ├── connectors/
│   │   ├── weather.py           # Open-Meteo API
│   │   ├── holidays.py          # Holiday data
│   │   ├── makcorps.py          # Makcorps API
│   │   └── airbtics.py          # Airbtics API
│   ├── features/
│   │   ├── build.py             # Feature engineering
│   │   └── encoders.py          # Cyclical encoders
│   ├── modeling/
│   │   ├── demand_glm.py        # GLM demand modeling
│   │   └── elasticity_ols.py    # OLS elasticity
│   ├── optimize/
│   │   └── price_search.py      # Optimization algorithms
│   ├── models/
│   │   └── business_profile.py  # Business models
│   ├── services/
│   │   └── enrichment_pipeline.py # Data enrichment
│   └── utils/
│       ├── config.py            # Configuration
│       └── geocode.py           # Geocoding utils
│
├── scripts/                      # Utility scripts
│   ├── generate_secrets.py      # Security key generation
│   └── snapshot_competition.py  # Competitor data snapshot
│
├── data/                         # Data storage
│   ├── config/                  # Business profiles (JSON)
│   ├── enriched/                # Enriched datasets (Parquet)
│   ├── cache/                   # API caches
│   └── competitors/             # Competitor snapshots
│
├── tests/                        # Test suite
│   ├── unit/                    # Unit tests
│   └── integration/             # Integration tests
│
├── .venv/                        # Python virtual environment
├── requirements.txt              # Python dependencies
├── package.json                  # Monorepo scripts (pnpm workspaces)
├── pnpm-workspace.yaml           # Workspace configuration
└── README.md
```

---

## 🔄 Data Flow

### 1. **User Interaction (Frontend)**
```
User interacts with UI
    ↓
React state updates (Zustand)
    ↓
useEffect triggers API call
    ↓
Axios/Fetch POST to Node.js backend
```

### 2. **API Processing (Backend)**
```
Express receives request
    ↓
Rate limiting check
    ↓
CORS validation
    ↓
Proxies to external API (Anthropic, Weather, etc.)
    ↓
Returns response to frontend
```

### 3. **Analytics Processing (Standalone)**
```
User runs Python script manually
    ↓
Script imports core library
    ↓
Processes data with pandas/numpy
    ↓
Saves results to data/ directory
    ↓
Frontend can display saved results
```

---

## 🎯 Key Components

### Frontend (React + Vite)

| Component | Purpose | Tech |
|-----------|---------|------|
| `Sidebar` | Navigation with animated active states | Framer Motion |
| `Header` | Theme toggle, date range, property info | React Context |
| `Dashboard` | KPI cards and quick actions | Recharts |
| `DataUpload` | CSV/Excel file upload interface | React Dropzone |
| `Enrichment` | Data enrichment progress tracking | React |
| `Insights` | Correlation analysis visualization | Recharts |

### Backend (Node.js Express)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/assistant/message` | POST | Anthropic Claude AI assistant |
| `/api/weather/historical` | POST | Historical weather data |
| `/api/holidays` | GET | Holiday calendar data |
| `/api/geocoding/forward` | GET | Address → coordinates |
| `/api/geocoding/reverse` | GET | Coordinates → address |
| `/api/competitor/scrape` | POST | Competitor data scraping |
| `/api/hotels/search` | POST | Hotel search (Makcorps) |

### Core Library (Python)

| Module | Purpose | Tech |
|--------|---------|------|
| `correlation.py` | Discover price relationships | scipy, sklearn |
| `enrichment.py` | Add external data to bookings | pandas, requests |
| `insights.py` | Generate business recommendations | statsmodels |
| `price_search.py` | Optimize pricing | GLM, elasticity |
| `business_profile.py` | Manage business configurations | pydantic |

---

## 🔐 Security Architecture

### Frontend Security
- Environment variables in `.env` files (gitignored)
- No API keys in frontend code
- All sensitive operations through backend proxy

### Backend Security
- ✅ Rate limiting (60 req/min by default)
- ✅ CORS restrictions (only frontend origin)
- ✅ Input validation on all endpoints
- ✅ API keys stored in environment variables
- ✅ Error logging without exposing secrets

### Future Enhancements
- [ ] JWT authentication
- [ ] API key rotation
- [ ] Request logging & monitoring
- [ ] HTTPS enforcement in production

---

## 🚀 Deployment Strategy

### Development

```bash
# Terminal 1: Node.js Backend
cd backend
pnpm start                       # Port 3001

# Terminal 2: React Frontend
cd frontend
pnpm run dev                     # Port 5173

# Python scripts run manually:
source .venv/bin/activate
python scripts/generate_secrets.py
```

### Production

```
┌─────────────────┐
│  Vercel         │  ← React frontend (static)
└─────────────────┘
        ↓ API calls
┌─────────────────┐
│  Railway/Render │  ← Node.js backend
└─────────────────┘
        ↓ External APIs
┌─────────────────┐
│  Anthropic      │
│  OpenWeather    │  ← External services
│  Calendarific   │
│  etc.           │
└─────────────────┘
```

**Hosting Options:**
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Backend**: Railway, Render, Fly.io, AWS ECS
- **Storage**: S3, GCS, or PostgreSQL for future persistence

---

## 📊 Performance Optimizations

### Frontend
- ✅ Vite for fast builds and HMR
- ✅ Code splitting with React.lazy
- ✅ Debounced API calls
- ✅ Optimistic UI updates
- 🔜 Service Worker caching
- 🔜 Image optimization

### Backend
- ✅ In-memory rate limiting
- ✅ Streaming responses where applicable
- 🔜 Redis caching for API responses
- 🔜 Response compression

### Python Library
- ✅ NumPy vectorization
- ✅ Pandas optimizations
- ✅ Joblib caching for expensive operations
- 🔜 Multiprocessing for parallel analysis

---

## 🧪 Testing Strategy

### Frontend
```bash
cd frontend
pnpm test                        # Future: Vitest
pnpm run test:e2e                # Future: Playwright
```

### Backend
```bash
cd backend
pnpm test                        # Future: Jest/Vitest
```

### Python Library
```bash
pytest tests/                    # Unit tests
pytest --cov=core                # With coverage
```

---

## 📈 Scalability Considerations

### Horizontal Scaling
- Node.js backend can run multiple instances behind load balancer
- React frontend can be deployed to CDN edge locations
- Python scripts can be scheduled as cron jobs or cloud functions

### Vertical Scaling
- Optimize Node.js event loop performance
- Use worker threads for CPU-intensive tasks in Node.js
- Optimize Python with Cython for hot paths

### Data Volume
- Current: ~1000-10K bookings/property
- Target: 100K+ bookings across properties
- Solution: Migrate to PostgreSQL, add caching layer

---

## 🔧 Integration Points

### Current Integrations
1. **External APIs** (via Node.js backend)
   - Anthropic Claude
   - OpenWeatherMap
   - Calendarific
   - OpenStreetMap Nominatim
   - Mapbox
   - ScraperAPI
   - Makcorps

2. **Python Scripts** (standalone)
   - Security key generation
   - Competitor data snapshots
   - Manual data analysis

### Future Integrations
- [ ] PMS (Property Management System) connectors
- [ ] OTA (Online Travel Agency) APIs
- [ ] Payment processing
- [ ] Email notifications
- [ ] Slack/Teams alerts for price changes
- [ ] Webhook system for real-time updates

---

## 📝 Development Workflow

### Adding a New Feature

1. **Frontend Feature**
   ```bash
   cd frontend
   # Create component in src/components/
   # Add route in src/app/
   # Update types in src/types/
   # Test with pnpm run dev
   ```

2. **Backend Endpoint**
   ```javascript
   // Add route in backend/server.js
   app.post('/api/new-endpoint', async (req, res) => {
     // Proxy to external API
     // Add error handling
   });
   ```

3. **Python Analysis Script**
   ```python
   # Create script in scripts/
   # Import from core library
   from core.analytics import correlation
   # Process data
   # Save results to data/
   ```

---

## 🎓 Learning Resources

- **React**: https://react.dev
- **Vite**: https://vitejs.dev
- **Express.js**: https://expressjs.com
- **Tailwind CSS**: https://tailwindcss.com
- **Framer Motion**: https://www.framer.com/motion
- **Recharts**: https://recharts.org

---

## 📞 Support & Troubleshooting

### Common Issues

**"API connection refused"**
- Ensure Node.js backend is running on port 3001
- Check CORS configuration in backend/server.js

**"Module not found" in React**
- Run `pnpm install` in frontend directory
- Check import paths

**"CORS error"**
- Verify FRONTEND_URL in backend/.env matches your frontend URL
- Restart both servers

**"Python module not found"**
- Activate virtual environment: `source .venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`
- Set PYTHONPATH: `export PYTHONPATH=.`

---

## 🚀 Future Roadmap

### Phase 1: Current ✅
- [x] React + Node.js architecture
- [x] External API integrations
- [x] Python analytics library
- [x] Basic data upload and enrichment

### Phase 2: Enhanced Features 🔜
- [ ] Real-time data synchronization
- [ ] Advanced visualization dashboard
- [ ] Automated competitor tracking
- [ ] Email notifications

### Phase 3: Enterprise 🔜
- [ ] Multi-property support
- [ ] Role-based access control
- [ ] API webhooks
- [ ] White-label branding
- [ ] Database migration (PostgreSQL)

### Phase 4: AI & Automation 🔜
- [ ] Auto-pricing recommendations
- [ ] Anomaly detection
- [ ] Demand forecasting
- [ ] A/B testing framework

---

**Last Updated**: 2025-10-14
**Version**: 2.0.0
**Architecture**: React + Node.js + Python Library
