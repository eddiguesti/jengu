# 🚀 Travel Pricing Platform - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
# Install pnpm globally (if not installed)
npm install -g pnpm

# Install all dependencies
cd travel-pricing
pnpm install
```

### 2. Start Development Servers

#### Option A: Start Both Servers (Recommended)
```bash
# Use the startup script
./start.sh
```

#### Option B: Start Manually
```bash
# Terminal 1 - Backend
cd backend
pnpm run dev

# Terminal 2 - Frontend
cd frontend
pnpm run dev
```

### 3. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

## Features

### Core Features
✅ **ML Analytics** - Statistical analysis with ML algorithms
✅ **AI Insights** - Claude 3.5 Sonnet integration
✅ **Market Sentiment** - 0-100 scoring system
✅ **Data Management** - CSV upload with persistence
✅ **Weather & Holidays** - Auto-enrichment
✅ **Competitor Monitoring** - Price tracking

### Pages
- **Dashboard** - Overview and key metrics
- **Data Management** - Upload and enrich data
- **Insights** - ML analytics and AI insights
- **Pricing Engine** - Optimize prices
- **Competitor Monitor** - Track competitors
- **Settings** - Business configuration

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (dev server)
- Tailwind CSS
- Framer Motion (animations)
- Recharts (visualizations)
- Zustand (state management)
- Axios (HTTP client)

### Backend
- Node.js + Express
- ML Analytics (custom algorithms)
- Claude AI integration
- Weather APIs (Open-Meteo)
- CORS enabled

---

## Project Structure

```
travel-pricing/
├── backend/
│   ├── server.js           # Main Express server
│   ├── services/
│   │   ├── mlAnalytics.js  # ML algorithms
│   │   └── marketSentiment.js  # Sentiment + AI
│   ├── package.json
│   └── pnpm-lock.yaml
│
├── frontend/
│   ├── src/
│   │   ├── pages/          # React pages
│   │   ├── components/     # Reusable components
│   │   ├── lib/            # Services & utilities
│   │   └── store/          # Zustand stores
│   ├── package.json
│   └── pnpm-lock.yaml
│
├── pnpm-workspace.yaml     # Monorepo config
├── README.md               # Main documentation
├── start.sh                # Startup script
└── SETUP_GUIDE.md          # This file
```

---

## Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
ANTHROPIC_API_KEY=your_key_here
```

### Frontend
Uses environment variables from Vite:
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)

---

## Common Commands

### Install Dependencies
```bash
pnpm install                # Install all
pnpm install --filter backend   # Backend only
pnpm install --filter frontend  # Frontend only
```

### Development
```bash
pnpm --filter backend run dev
pnpm --filter frontend run dev
```

### Build for Production
```bash
cd frontend
pnpm run build
pnpm run preview  # Preview production build
```

### Update Dependencies
```bash
pnpm update                 # Update all
pnpm update axios           # Update specific package
pnpm update --latest        # Update to latest (including major)
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill all node processes
taskkill /F /IM node.exe    # Windows
killall node                # Mac/Linux
```

### pnpm Not Found
```bash
npm install -g pnpm
```

### Module Not Found Errors
```bash
# Clean install
rm -rf node_modules backend/node_modules frontend/node_modules
rm backend/pnpm-lock.yaml frontend/pnpm-lock.yaml
pnpm install
```

### CORS Errors
- Backend must be running on port 3001
- Frontend connects to http://localhost:3001
- Check backend console for error messages

---

## API Endpoints

### Health Check
```
GET /health
```

### ML Analytics
```
POST /api/analytics/summary
POST /api/analytics/weather-impact
POST /api/analytics/demand-forecast
POST /api/analytics/market-sentiment
POST /api/analytics/ai-insights
POST /api/analytics/pricing-recommendations
```

### Data Services
```
POST /api/weather/historical
GET  /api/weather/current
GET  /api/holidays
GET  /api/geocoding/forward
POST /api/competitor/scrape
```

---

## Development Tips

1. **Use pnpm workspaces** - Install from root when possible
2. **Keep servers running** - Vite HMR updates instantly
3. **Check console** - Browser console shows all errors
4. **Backend logs** - Terminal shows API request logs
5. **Data persistence** - Uses localStorage (survives refresh)

---

## Next Steps

1. ✅ Configure business location in Settings
2. ✅ Upload CSV data in Data Management
3. ✅ Generate ML analytics on Insights page
4. ✅ View AI-powered recommendations
5. ✅ Monitor competitors
6. ✅ Optimize pricing strategy

---

**Need Help?** Check the main README.md or documentation files.
