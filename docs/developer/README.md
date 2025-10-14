# Developer Documentation

Welcome to the Jengu Dynamic Pricing Intelligence Platform developer documentation.

## Quick Links

- [Architecture Overview](../../ARCHITECTURE.md) - System architecture and technology stack
- [Setup Guide](../../SETUP_GUIDE.md) - Get started with local development
- [Security](../../SECURITY.md) - Security configuration and best practices
- [Deployment](../../DEPLOYMENT.md) - Production deployment guide

## Project Overview

Jengu is a Dynamic Pricing Intelligence Platform for hospitality businesses, providing:

- **Data Enrichment**: Auto-fetches weather, holidays, and temporal features
- **Correlation Analysis**: Multi-method analysis (Pearson, Spearman, Mutual Information, ANOVA)
- **Demand Modeling**: GLM-based demand prediction
- **Price Optimization**: Revenue-maximizing price recommendations
- **Modern UI**: React SPA with Next.js + interactive dashboards

## Technology Stack

### Frontend
- **React 18** with Next.js 15 (App Router)
- **TypeScript** for type safety
- **Tailwind CSS** with shadcn/ui components
- **Framer Motion** for animations
- **Plotly.js** & Recharts for data visualization
- **Zustand** for state management

### Backend
- **Node.js + Express** (API proxy layer)
- **Python 3.12** (core pricing engine)
- **FastAPI** (REST API)
- **PostgreSQL** (optional, for persistence)

### Core Engine
- **Pandas, NumPy, SciPy** for data processing
- **scikit-learn** for ML models
- **statsmodels** for statistical analysis (GLM, OLS)
- **joblib** for caching

### External APIs
- **Open-Meteo** for geocoding and weather data
- **python-holidays** for holiday calendars (190+ countries)

## Project Structure

```
jengu/
├── frontend/              # React + Next.js web application
├── backend/               # Node.js Express API proxy
├── core/                  # Python pricing engine
│   ├── analysis/         # Correlation & insights
│   ├── connectors/       # External data sources
│   ├── features/         # Feature engineering
│   ├── models/           # Data models
│   ├── modeling/         # ML models (GLM, elasticity)
│   ├── optimize/         # Price optimization
│   ├── services/         # Business services
│   └── utils/            # Utilities
├── data/                  # Data storage
│   ├── config/           # Business profiles (JSON)
│   ├── enriched/         # Enriched datasets (Parquet)
│   └── cache/            # API caches
├── tests/                 # Test suite
└── docs/                  # Documentation
    ├── developer/        # Developer docs (current)
    └── archived/         # Historical documentation
```

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.12+
- Git

### Quick Setup

```bash
# 1. Install Python dependencies
python3 -m venv .venv
source .venv/bin/activate  # Mac/Linux
# OR: .venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 2. Install Node.js backend
cd backend
pnpm install

# 3. Install React frontend
cd ../frontend
pnpm install
```

### Running the Application

```bash
# Terminal 1: Node.js Backend (API proxy)
cd backend
pnpm start
# Runs on http://localhost:8000

# Terminal 2: React Frontend
cd frontend
pnpm run dev
# Runs on http://localhost:3000 or 5173
```

For detailed setup instructions, see [SETUP_GUIDE.md](../../SETUP_GUIDE.md).

## Development Workflow

### Making Changes

1. **Frontend (React/Next.js)**
   - Edit files in `frontend/src/`
   - Hot reload is enabled
   - Check browser console for errors

2. **Backend (Node.js)**
   - Edit `backend/server.js`
   - Restart server to see changes

3. **Core Engine (Python)**
   - Edit files in `core/`
   - Changes take effect on next API call
   - Run tests: `pytest tests/`

### Code Style

- **Python**: PEP 8, snake_case, type hints, Google-style docstrings
- **TypeScript**: Prettier, camelCase, interface definitions
- **React**: Functional components, hooks, TypeScript

### Testing

```bash
# Python tests
pytest tests/ -v

# Type checking
mypy core/ apps/

# Frontend tests (if configured)
cd frontend
pnpm test
```

## Core Concepts

### Data Enrichment Pipeline

The enrichment pipeline automatically adds external data to your bookings:

1. **Weather Data** - Temperature, precipitation, wind from Open-Meteo
2. **Holidays** - Holiday calendars for 190+ countries
3. **Temporal Features** - Day of week, month, season, cyclical encoding

### Correlation Engine

Multi-method correlation analysis to discover price drivers:

- **Pearson** - Linear relationships
- **Spearman** - Monotonic relationships
- **Mutual Information** - Non-linear dependencies
- **ANOVA** - Categorical variable significance
- **Lag Analysis** - Time-delayed correlations

### Demand Modeling

GLM (Generalized Linear Model) with Poisson/Negative Binomial distributions for demand prediction.

### Price Optimization

Grid search over price range to find revenue-maximizing price point using demand model and elasticity estimates.

## API Documentation

### FastAPI (Python)

Interactive API documentation available at:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

### Node.js Backend

The Node.js backend acts as a proxy layer between the React frontend and Python FastAPI.

## Configuration

### Environment Variables

Create `.env` files for configuration:

**Backend (.env)**
```bash
PORT=8000
PYTHON_API_URL=http://localhost:8001
```

**Frontend (.env.local)**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Python (.env)**
```bash
PYTHONPATH=.
LOG_LEVEL=INFO
CACHE_DIR=data/cache
```

## Troubleshooting

### Common Issues

**"Cannot connect to API"**
- Ensure both Node.js and Python backends are running
- Check CORS configuration in FastAPI

**"Module not found"**
- Activate Python virtual environment
- Run `pip install -r requirements.txt`
- For Node: run `pnpm install`

**Charts not rendering**
- Check browser console for errors
- Verify Plotly.js is installed: `pnpm list plotly.js`

See [SETUP_GUIDE.md](../../SETUP_GUIDE.md) for more troubleshooting tips.

## Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes
3. Write/update tests
4. Ensure all tests pass: `pytest tests/`
5. Commit with conventional commits: `feat: add amazing feature`
6. Push and create a Pull Request

## Additional Resources

- [Architecture Deep Dive](../../ARCHITECTURE.md)
- [Security Guide](../../SECURITY.md)
- [Deployment Guide](../../DEPLOYMENT.md)
- [Historical Documentation](../archived/) - Past implementation notes

## Support

For questions or issues:
- Check documentation in `/docs`
- Review GitHub Issues
- Contact the development team

---

**Last Updated**: 2025-10-14
**Version**: 2.0
