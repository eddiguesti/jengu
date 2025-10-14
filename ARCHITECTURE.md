# Dynamic Pricing System - Architecture Overview

> **Premium Next.js + FastAPI + Python Engine**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Next.js 15 Frontend (Port 3000)                     │  │
│  │  - React 18+ with TypeScript                         │  │
│  │  - Tailwind CSS + shadcn/ui                          │  │
│  │  - Framer Motion animations                          │  │
│  │  - Plotly.js charts                                  │  │
│  │  - Zustand state management                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS / REST API
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FastAPI Backend (Port 8000)                         │  │
│  │  - RESTful endpoints                                 │  │
│  │  - Pydantic validation                               │  │
│  │  - CORS enabled                                      │  │
│  │  - Auto-generated OpenAPI docs                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   CORE ENGINE LAYER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Python Pricing Engine                               │  │
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
│  │  External APIs                                        │  │
│  │  - Open-Meteo (weather data)                         │  │
│  │  - python-holidays (holiday data)                    │  │
│  │                                                       │  │
│  │  Storage (Future)                                    │  │
│  │  - PostgreSQL / SQLite                               │  │
│  │  - CSV/Excel upload storage                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Directory Structure

```
travel-pricing/
│
├── apps/                          # Application layer
│   ├── web/                       # Next.js frontend (NEW)
│   │   ├── src/
│   │   │   ├── app/              # Pages (App Router)
│   │   │   ├── components/       # React components
│   │   │   ├── lib/              # Utils & API client
│   │   │   ├── stores/           # Zustand stores
│   │   │   └── types/            # TypeScript types
│   │   ├── package.json
│   │   ├── tailwind.config.ts
│   │   └── next.config.ts
│   │
│   ├── api/                       # FastAPI backend (UPDATED)
│   │   ├── main.py               # API endpoints
│   │   └── requirements.txt
│   │
│   └── ui/                        # Streamlit app (EXISTING)
│       ├── streamlit_app.py
│       ├── premium_components.py
│       └── premium_styles.py
│
├── core/                          # Business logic (EXISTING)
│   ├── analytics/
│   │   ├── correlation.py        # Multi-method correlation
│   │   ├── enrichment.py         # Weather/temporal enrichment
│   │   └── insights.py           # Business insights
│   ├── connectors/
│   │   ├── weather.py            # Open-Meteo API
│   │   └── holidays.py           # Holiday data
│   ├── optimize/
│   │   └── price_search.py       # Optimization algorithms
│   └── policies/
│       └── policy.py             # Pricing policies
│
├── .venv/                         # Python virtual environment
├── requirements.txt               # Python dependencies
└── README.md
```

---

## 🔄 Data Flow

### 1. **User Interaction (Frontend)**
```
User adjusts sliders
    ↓
Zustand store updates
    ↓
useEffect triggers API call
    ↓
Axios POST to /api/v1/optimize
```

### 2. **API Processing (Backend)**
```
FastAPI receives request
    ↓
Pydantic validates payload
    ↓
Calls core pricing engine
    ↓
Generates revenue curve
    ↓
Returns OptimizationResponse
```

### 3. **Visualization (Frontend)**
```
Axios receives response
    ↓
React state updates
    ↓
Framer Motion animates transition
    ↓
Plotly renders interactive chart
```

---

## 🎯 Key Components

### Frontend (Next.js)

| Component | Purpose | Tech |
|-----------|---------|------|
| `Sidebar` | Navigation with animated active states | Framer Motion |
| `Header` | Theme toggle, date range, property info | Zustand |
| `RevenueCurveChart` | Interactive revenue visualization | Plotly.js |
| `Slider` | Parameter controls with live updates | Custom component |
| `Card` | Metric display with gradients | shadcn/ui |

### Backend (FastAPI)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/optimize` | POST | Get pricing recommendations |
| `/api/v1/metrics` | GET | Dashboard metrics |
| `/api/v1/health` | GET | Service health check |
| `/docs` | GET | Interactive API docs |

### Core Engine (Python)

| Module | Purpose | Tech |
|--------|---------|------|
| `correlation.py` | Discover price-weather relationships | scipy, sklearn |
| `enrichment.py` | Add external data to bookings | Open-Meteo API |
| `insights.py` | Generate business recommendations | statsmodels |
| `price_search.py` | Optimize pricing | GLM, elasticity |

---

## 🔐 Security & CORS

### CORS Configuration (FastAPI)
```python
allow_origins=[
    "http://localhost:3000",      # Next.js dev
    "http://127.0.0.1:3000",
    "http://localhost:8502",      # Streamlit
]
```

### Environment Variables
- **Frontend**: `.env.local` (Next.js)
- **Backend**: `core/utils/config.py` (Python)

### Future Security Enhancements
- [ ] JWT authentication
- [ ] API key management
- [ ] Rate limiting
- [ ] HTTPS in production

---

## 🚀 Deployment Strategy

### Development
```bash
# Terminal 1: FastAPI
.venv/Scripts/python -m uvicorn apps.api.main:app --reload --port 8000

# Terminal 2: Next.js
cd apps/web && npm run dev

# Terminal 3 (Optional): Streamlit
.venv/Scripts/streamlit run apps/ui/streamlit_app.py --server.port=8502
```

### Production (Future)

```
┌─────────────────┐
│  Vercel / AWS   │  ← Next.js frontend
└─────────────────┘
        ↓
┌─────────────────┐
│  Railway / GCP  │  ← FastAPI backend
└─────────────────┘
        ↓
┌─────────────────┐
│  PostgreSQL DB  │  ← Persistent storage
└─────────────────┘
```

**Tech Stack Options:**
- **Frontend**: Vercel, Netlify, AWS Amplify
- **Backend**: Railway, Render, Google Cloud Run, AWS ECS
- **Database**: Supabase, Railway Postgres, AWS RDS
- **Monitoring**: Sentry, DataDog, LogRocket

---

## 📊 Performance Optimizations

### Frontend
- ✅ Dynamic imports for Plotly (reduces bundle size)
- ✅ Framer Motion lazy loading
- ✅ React.memo for chart components
- ✅ Debounced slider updates
- 🔜 Image optimization with next/image
- 🔜 Route prefetching

### Backend
- ✅ Pydantic response models (fast serialization)
- ✅ Async FastAPI (non-blocking I/O)
- 🔜 Redis caching for frequent queries
- 🔜 Background tasks for heavy computations

### Core Engine
- ✅ NumPy vectorization
- ✅ Pandas optimizations
- 🔜 Multiprocessing for parallel correlation analysis
- 🔜 Pre-computed weather data cache

---

## 🧪 Testing Strategy

### Frontend (Next.js)
```bash
# Unit tests (future)
npm run test

# E2E tests (future)
npm run test:e2e
```

### Backend (FastAPI)
```bash
# Pytest (future)
pytest apps/api/tests/
```

### Core Engine (Python)
```bash
# Existing tests
pytest tests/
```

---

## 📈 Scalability Considerations

### Horizontal Scaling
- FastAPI can run multiple instances behind load balancer
- Next.js can be deployed to CDN edge locations
- Python workers can process jobs from queue (Celery/RQ)

### Vertical Scaling
- Optimize NumPy operations
- Use GPU for ML models (future)
- Database indexing for fast queries

### Data Volume
- Current: ~1000 bookings/property
- Target: 100K+ bookings across properties
- Solution: Database partitioning, caching layer

---

## 🔧 Integration Points

### Existing Systems
1. **Streamlit UI** (port 8502) - Coexists with Next.js
2. **Core Python Engine** - Shared by both UIs
3. **Weather API** - Rate-limited, cached responses
4. **Holiday API** - Static data, updated annually

### Future Integrations
- [ ] PMS (Property Management System) connectors
- [ ] OTA (Online Travel Agency) APIs
- [ ] Payment processing
- [ ] Email notifications
- [ ] Slack/Teams alerts for price changes

---

## 📝 Development Workflow

### Adding New Features

1. **Frontend Feature**
   ```bash
   cd apps/web
   # Create component in src/components/
   # Add to page in src/app/
   # Update types in src/types/
   ```

2. **Backend Endpoint**
   ```python
   # Add route in apps/api/main.py
   # Define Pydantic models
   # Call core engine functions
   # Update API docs
   ```

3. **Core Algorithm**
   ```python
   # Implement in core/
   # Add unit tests
   # Update documentation
   # Expose via API
   ```

---

## 🎓 Learning Resources

- **Next.js**: https://nextjs.org/docs
- **FastAPI**: https://fastapi.tiangolo.com
- **Framer Motion**: https://www.framer.com/motion
- **Tailwind CSS**: https://tailwindcss.com
- **Plotly**: https://plotly.com/javascript

---

## 📞 Support & Troubleshooting

### Common Issues

**"API connection refused"**
- Ensure FastAPI is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

**"Module not found" in Next.js**
- Run `npm install`
- Check import paths use `@/` alias

**"CORS error"**
- Verify `allow_origins` in FastAPI CORS config
- Restart both servers

---

## 🚀 Future Roadmap

### Phase 1: MVP ✅
- [x] Next.js + FastAPI architecture
- [x] Optimize page with interactive sliders
- [x] Revenue curve visualization
- [x] Dark/light theme

### Phase 2: Data Management 🔜
- [ ] CSV/Excel upload on `/data` page
- [ ] Data preview and validation
- [ ] Historical data storage
- [ ] Export functionality

### Phase 3: Advanced Analytics 🔜
- [ ] Correlation explorer page
- [ ] Weather impact visualization
- [ ] Competitor analysis dashboard
- [ ] A/B testing framework

### Phase 4: AI & Automation 🔜
- [ ] Auto-pricing (set and forget)
- [ ] Anomaly detection
- [ ] Demand forecasting
- [ ] Email reports

### Phase 5: Enterprise 🔜
- [ ] Multi-property support
- [ ] Role-based access control
- [ ] API webhooks
- [ ] White-label branding

---

**Last Updated**: 2025-10-11
**Version**: 1.0.0
**Maintainers**: Dynamic Pricing Team
