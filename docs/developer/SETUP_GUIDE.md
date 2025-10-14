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
# Should show: Python 3.12.0

# Node.js version
node --version
# Should show: v18+ or v20+

# npm version
npm --version
# Should show: 9+ or 10+
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
python -c "import fastapi; import pandas; print('✓ Python packages OK')"
```

---

### Step 2: Install Node.js Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install all dependencies (using pnpm recommended)
pnpm install
# OR: npm install

# This will install:
# - next, react, react-dom
# - framer-motion, plotly.js
# - tailwindcss, zustand, axios
# - TypeScript types
```

**Expected output:**
```
added 342 packages in 45s
✓ All dependencies installed
```

---

### Step 3: Configure Environment Variables

Create or verify `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=Jengu
NEXT_PUBLIC_APP_VERSION=2.0.0
```

**No changes needed for local development.**

---

### Step 4: Start the Node.js Backend

Open **Terminal 1**:

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not done)
pnpm install
# OR: npm install

# Start the server
pnpm start
# OR: npm start
```

**Expected output:**
```
Server listening on http://localhost:8000
```

**Verify backend is running:**
- Open browser: http://localhost:8000
- Should see API response or health check

---

### Step 5: Start the Next.js Frontend

Open **Terminal 2** (new window/tab):

```bash
# Navigate to frontend directory
cd frontend

# Start development server
pnpm run dev
# OR: npm run dev
```

**Expected output:**
```
▲ Next.js 15.1.0
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.5s
```

**Access the dashboard:**
- Open browser: **http://localhost:3000** or **http://localhost:5173**
- Navigate through the application

---

### Step 6: Explore the Dashboard 🎉

Navigate through the application:
1. **Dashboard** - View metrics and KPIs
2. **Data** - Upload and manage data
3. **Explore** - Analyze correlations
4. **Optimize** - Price optimization tools
5. **Insights** - AI-generated recommendations

---

## 🔧 Development Workflow

### Running All Services

Use 2 terminals:

| Terminal | Command | Directory | URL |
|----------|---------|-----------|-----|
| 1 | `pnpm start` | `backend/` | http://localhost:8000 |
| 2 | `pnpm run dev` | `frontend/` | http://localhost:3000 or 5173 |

### Making Changes

**Frontend (React/Next.js):**
- Edit files in `frontend/src/`
- Changes hot-reload automatically
- Check browser console for errors

**Backend (Node.js):**
- Edit `backend/server.js`
- Restart server to see changes
- Check terminal for errors

**Core Engine (Python):**
- Edit files in `core/`
- Changes take effect on next API call
- Run tests: `pytest tests/`

---

## 📦 Build for Production

### Frontend (Next.js)

```bash
cd frontend

# Build optimized production bundle
pnpm run build

# Start production server
pnpm start
```

### Backend (Node.js)

```bash
cd backend

# Start production server
NODE_ENV=production pnpm start
```

---

## 🐛 Troubleshooting

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Use different port
npm run dev -- -p 3001
```

Then update `.env.local` if needed.

---

### Issue: "Cannot connect to API"

**Checklist:**
- [ ] Is FastAPI running? Check Terminal 1
- [ ] Is it on port 8000? Visit http://localhost:8000
- [ ] Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- [ ] CORS configured? Check `apps/api/main.py` line 22-33

**Debug:**
```bash
# Mac/Linux:
lsof -i :8000
# Windows:
netstat -ano | findstr :8000
```

---

### Issue: "Module not found" in Next.js

**Solution:**
```bash
cd frontend
rm -rf node_modules pnpm-lock.yaml
pnpm install
# OR for npm:
rm -rf node_modules package-lock.json
npm install
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

# Reinstall dependencies
pip install -r requirements.txt
```

---

### Issue: Plotly charts not rendering

**Cause:** Plotly loaded dynamically (SSR disabled)

**Check:**
- Open browser DevTools Console
- Look for JavaScript errors
- Ensure `react-plotly.js` is installed: `npm list react-plotly.js`

**Fix:**
```bash
cd frontend
pnpm install react-plotly.js plotly.js
```

---

## 🧪 Testing

### Test FastAPI Endpoints

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Optimize endpoint
curl -X POST http://localhost:8000/api/v1/optimize \
  -H "Content-Type: application/json" \
  -d '{"weather_sensitivity": 0.5, "risk_level": 0.5}'
```

### Test Next.js Build

```bash
cd frontend
pnpm run build
# Should complete without errors
```

---

## 📊 Monitoring

### Check Server Status

**Backend (Node.js):**
- Status: http://localhost:8000
- Logs: Check Terminal 1

**Frontend (Next.js):**
- Status: http://localhost:3000 or 5173
- Logs: Check Terminal 2

---

## 🔐 Security Checklist (Production)

Before deploying to production:

- [ ] Change `allow_origins=["*"]` to specific domains
- [ ] Set up HTTPS/SSL certificates
- [ ] Add authentication (JWT, OAuth)
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Configure firewall rules
- [ ] Regular dependency updates

---

## 📚 Next Steps

After setup is complete:

1. **Explore the Optimize page**
   - Play with sliders
   - Watch revenue curve update
   - See AI recommendations

2. **Review the architecture**
   - Read: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
   - Understand data flow
   - Review API endpoints

3. **Customize the design**
   - Edit `frontend/tailwind.config.ts` for colors
   - Modify components in `frontend/src/components/`
   - Add your branding

4. **Add real data**
   - Upload CSV on `/data` page (coming soon)
   - Connect to database
   - Integrate with PMS/OTA APIs

5. **Deploy to production**
   - Choose hosting (Vercel, Railway, AWS)
   - Set up CI/CD pipeline
   - Configure domain and SSL

---

## 🎓 Learning Resources

### Documentation
- Next.js: https://nextjs.org/docs
- FastAPI: https://fastapi.tiangolo.com
- Tailwind: https://tailwindcss.com
- Framer Motion: https://www.framer.com/motion

### Tutorials
- Next.js App Router: https://nextjs.org/docs/app
- TypeScript: https://www.typescriptlang.org/docs
- Plotly.js: https://plotly.com/javascript

---

## 💬 Support

### Getting Help

1. **Check documentation**
   - [docs/README.md](README.md) - Documentation overview
   - [docs/ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
   - [docs/developer/](developer/) - Developer documentation

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
- [x] Node.js dependencies installed
- [x] FastAPI running on http://localhost:8000
- [x] Next.js running on http://localhost:3000
- [x] Dashboard accessible in browser
- [x] Optimize page with working sliders
- [x] Revenue curve chart rendering
- [x] No console errors

**🎉 Congratulations! Your premium pricing dashboard is ready!**

---

## 📞 Quick Commands Reference

```bash
# Activate Python env
# Mac/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Start Backend (from backend/)
pnpm start

# Start Frontend (from frontend/)
pnpm run dev

# Run Python tests
pytest tests/

# Build Frontend
cd frontend && pnpm run build
```

---

**Version:** 2.0.0
**Last Updated:** 2025-10-14
**Platform:** Cross-platform (Mac, Linux, Windows)
