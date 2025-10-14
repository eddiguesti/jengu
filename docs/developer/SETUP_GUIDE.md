# Setup Guide - Jengu Dynamic Pricing Platform

> **Get your Jengu dashboard running in 5 minutes**

---

## 📋 Prerequisites

### Required Software

- **Python 3.12+**
- **Node.js 18+** and pnpm (recommended) or npm
- **Git** (for version control)

### Check Installations

```bash
# Python version
python --version
# Should show: Python 3.12.0+

# Node.js version
node --version
# Should show: v18+ or v20+

# pnpm version
pnpm --version
# Should show: 8+
```

---

## 🎯 Quick Start (Step-by-Step)

### Step 1: Install Python Dependencies

```bash
# Create virtual environment (if not exists)
python3 -m venv .venv

# Activate virtual environment
# Mac/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Install/verify Python packages
pip install --upgrade pip
pip install -r requirements.txt
```

**Verify installation:**
```bash
python -c "import pandas; import numpy; print('✓ Python packages OK')"
```

---

### Step 2: Install Node.js Dependencies

```bash
# Install all dependencies from project root (using pnpm workspaces)
pnpm install

# This will install dependencies for:
# - Root monorepo
# - frontend/ (React, Vite, Tailwind, etc.)
# - backend/ (Express, axios, cors, etc.)
```

**Expected output:**
```
Packages: +450
Progress: resolved 450, reused 420, downloaded 30, added 450, done
```

---

### Step 3: Configure Environment Variables

**Backend `.env`** (backend/.env):
```bash
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional API keys (add if you have them)
ANTHROPIC_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here
CALENDARIFIC_API_KEY=your_key_here
MAPBOX_TOKEN=your_token_here
```

**Frontend `.env`** (frontend/.env):
```bash
VITE_API_URL=http://localhost:3001
```

**No API keys needed for local development - the Node.js backend handles external API calls.**

---

### Step 4: Start the Node.js Backend

Open **Terminal 1**:

```bash
# Navigate to backend directory
cd backend

# Start the server
pnpm start
```

**Expected output:**
```
🚀 Jengu Backend API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port 3001
✅ Environment: development
✅ Frontend URL: http://localhost:5173
✅ Rate limit: 60 requests/minute
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Verify backend is running:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"...","environment":"development"}
```

---

### Step 5: Start the React Frontend

Open **Terminal 2** (new window/tab):

```bash
# Navigate to frontend directory
cd frontend

# Start development server
pnpm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in 423 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Access the dashboard:**
- Open browser: **http://localhost:5173**
- Navigate through the application

---

### Step 6: Explore the Dashboard 🎉

Navigate through the application:
1. **Dashboard** - View metrics and KPIs
2. **Data Upload** - Upload CSV/Excel files
3. **Enrichment** - Add weather and holiday data
4. **Insights** - Analyze correlations
5. **Competitors** - Track competitor pricing
6. **Optimize** - Price optimization tools

---

## 🔧 Development Workflow

### Running All Services

Use 2 terminals:

| Terminal | Command | Directory | URL |
|----------|---------|-----------|-----|
| 1 | `pnpm start` | `backend/` | http://localhost:3001 |
| 2 | `pnpm run dev` | `frontend/` | http://localhost:5173 |

### Alternative: Run Both at Once

From project root:
```bash
pnpm run dev
# Starts both backend and frontend concurrently
```

### Making Changes

**Frontend (React + Vite):**
- Edit files in `frontend/src/`
- Changes hot-reload automatically (HMR)
- Check browser console for errors

**Backend (Node.js Express):**
- Edit `backend/server.js`
- Server auto-restarts (nodemon)
- Check terminal for errors

**Python Library (Standalone):**
- Edit files in `core/`
- Run scripts manually: `python scripts/generate_secrets.py`
- Run tests: `pytest tests/`

---

## 📦 Build for Production

### Frontend (React + Vite)

```bash
cd frontend

# Build optimized production bundle
pnpm run build

# Preview production build locally
pnpm run preview
```

Output in `frontend/dist/`

### Backend (Node.js)

```bash
cd backend

# Start production server
NODE_ENV=production pnpm start
```

---

## 🐛 Troubleshooting

### Issue: "Port 5173 already in use"

**Solution:**
```bash
# Kill process on port 5173
# Mac/Linux:
lsof -ti:5173 | xargs kill -9
# Windows:
netstat -ano | findstr :5173
# Then: taskkill /PID <PID> /F

# Or use different port:
pnpm run dev -- --port 5174
```

---

### Issue: "Cannot connect to API"

**Checklist:**
- [ ] Is Node.js backend running? Check Terminal 1
- [ ] Is it on port 3001? Visit http://localhost:3001/health
- [ ] Check `frontend/.env` has correct `VITE_API_URL`
- [ ] CORS configured? Check `backend/server.js` for FRONTEND_URL

**Debug:**
```bash
# Check if port 3001 is in use
# Mac/Linux:
lsof -i :3001
# Windows:
netstat -ano | findstr :3001
```

---

### Issue: "Module not found" in React

**Solution:**
```bash
cd frontend
rm -rf node_modules
pnpm install
```

Or from root:
```bash
pnpm install
```

---

### Issue: Python import errors

**Solution:**
```bash
# Ensure virtual environment is activated
# Mac/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Check PYTHONPATH
export PYTHONPATH=.

# Reinstall dependencies
pip install -r requirements.txt
```

---

### Issue: "pnpm: command not found"

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm

# Or use npm instead:
npm install
cd backend && npm start
cd frontend && npm run dev
```

---

## 🧪 Testing

### Test Backend Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Test geocoding
curl "http://localhost:3001/api/geocoding/forward?address=Paris,France"

# Test holidays
curl "http://localhost:3001/api/holidays?country=FR&year=2024"
```

### Test Frontend Build

```bash
cd frontend
pnpm run build
# Should complete without errors
# Check: frontend/dist/ directory created
```

### Test Python Library

```bash
# Activate venv
source .venv/bin/activate

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=core --cov-report=html
```

---

## 📊 Monitoring

### Check Server Status

**Backend (Node.js):**
- Health: http://localhost:3001/health
- Logs: Check Terminal 1

**Frontend (React):**
- App: http://localhost:5173
- Logs: Check Terminal 2
- DevTools: Press F12 in browser

**Python Scripts:**
- Run manually from command line
- Check output in terminal

---

## 🔐 Security Checklist (Production)

Before deploying to production:

- [ ] Set `NODE_ENV=production` in backend
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Add all required API keys to environment variables
- [ ] Never commit `.env` files to git
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure rate limiting (adjust MAX_REQUESTS_PER_MINUTE)
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure firewall rules
- [ ] Regular dependency updates (`pnpm update`)

---

## 📚 Next Steps

After setup is complete:

1. **Explore the Dashboard**
   - View KPI cards
   - Check quick actions
   - Navigate between pages

2. **Upload Sample Data**
   - Go to Data Upload page
   - Upload CSV file
   - Review data preview

3. **Review the Architecture**
   - Read: [ARCHITECTURE.md](ARCHITECTURE.md)
   - Understand data flow
   - Review API endpoints

4. **Customize the Design**
   - Edit `frontend/tailwind.config.js` for colors
   - Modify components in `frontend/src/components/`
   - Add your branding

5. **Deploy to Production**
   - Frontend: Vercel, Netlify, Cloudflare Pages
   - Backend: Railway, Render, Fly.io
   - Configure domain and SSL

---

## 🎓 Learning Resources

### Documentation
- React: https://react.dev
- Vite: https://vitejs.dev
- Express.js: https://expressjs.com
- Tailwind: https://tailwindcss.com
- Framer Motion: https://www.framer.com/motion

### Tutorials
- React Hooks: https://react.dev/reference/react
- TypeScript: https://www.typescriptlang.org/docs
- Recharts: https://recharts.org

---

## 💬 Support

### Getting Help

1. **Check documentation**
   - [docs/README.md](../README.md) - Documentation overview
   - [docs/ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
   - [docs/SECURITY.md](SECURITY.md) - Security guide

2. **Common issues**
   - Review troubleshooting section above

3. **Development tips**
   - Use browser DevTools (F12)
   - Check terminal logs
   - Review error messages carefully

---

## ✅ Success Checklist

After following this guide, you should have:

- [x] Python virtual environment activated
- [x] All Python dependencies installed
- [x] Node.js dependencies installed (pnpm workspaces)
- [x] Node.js backend running on http://localhost:3001
- [x] React frontend running on http://localhost:5173
- [x] Dashboard accessible in browser
- [x] Navigation working between pages
- [x] No console errors

**🎉 Congratulations! Your Jengu pricing platform is ready!**

---

## 📞 Quick Commands Reference

```bash
# Activate Python env
# Mac/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Install all dependencies (from root)
pnpm install

# Start both backend & frontend (from root)
pnpm run dev

# Start backend only (from backend/)
cd backend && pnpm start

# Start frontend only (from frontend/)
cd frontend && pnpm run dev

# Run Python tests
pytest tests/

# Build frontend for production
cd frontend && pnpm run build

# Generate security keys
python scripts/generate_secrets.py
```

---

**Version:** 2.0.0
**Last Updated:** 2025-10-14
**Architecture:** React + Vite + Node.js Express + Python Library
