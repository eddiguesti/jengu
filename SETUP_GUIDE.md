# 🚀 Setup Guide - Dynamic Pricing System

> **Get your premium Next.js + FastAPI dashboard running in 5 minutes**

---

## 📋 Prerequisites

### Required Software

- ✅ **Python 3.12+** (Already installed at: `Python 3.12.0`)
- ✅ **Node.js 18+** and npm
- ✅ **Git** (for version control)

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
# From project root (travel-pricing/)
.venv\Scripts\activate

# Install/verify Python packages
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install -r requirements.txt
```

**Verify installation:**
```bash
.venv\Scripts\python -c "import fastapi; import pandas; print('✓ Python packages OK')"
```

---

### Step 2: Install Node.js Dependencies

```bash
# Navigate to Next.js app
cd apps\web

# Install all dependencies
npm install

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

The `.env.local` file is already created. Verify it contains:

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=Dynamic Pricing Engine
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**No changes needed unless you want to use different ports.**

---

### Step 4: Start the FastAPI Backend

Open **Terminal 1** (or PowerShell):

```bash
# From project root
.venv\Scripts\python -m uvicorn apps.api.main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verify API is running:**
- Open browser: http://localhost:8000
- Should see: `{"message": "Dynamic Pricing API", "version": "1.0.0", ...}`
- API docs: http://localhost:8000/docs

---

### Step 5: Start the Next.js Frontend

Open **Terminal 2** (new window/tab):

```bash
# Navigate to Next.js app
cd apps\web

# Start development server
npm run dev
```

**Expected output:**
```
▲ Next.js 15.1.0
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.5s
```

**Access the dashboard:**
- Open browser: **http://localhost:3000**
- You'll be redirected to: http://localhost:3000/dashboard

---

### Step 6: Explore the Dashboard 🎉

1. **Dashboard** (`/dashboard`) - View metrics overview
2. **Optimize** (`/optimize`) - Interactive pricing optimization
   - Adjust sliders for weather, risk, competitor, elasticity
   - See real-time revenue curve updates
   - View recommended vs current price

---

## 🛠️ Optional: Run Streamlit UI (Alternative)

If you want to run the existing Streamlit UI alongside Next.js:

Open **Terminal 3**:

```bash
# From project root
.venv\Scripts\streamlit run apps\ui\streamlit_app.py --server.port=8502
```

Access at: http://localhost:8502

---

## 🔧 Development Workflow

### Running All Services

Use 3 terminals:

| Terminal | Command | URL |
|----------|---------|-----|
| 1 | `uvicorn apps.api.main:app --reload --port 8000` | http://localhost:8000 |
| 2 | `cd apps/web && npm run dev` | http://localhost:3000 |
| 3 (opt) | `streamlit run apps/ui/streamlit_app.py` | http://localhost:8502 |

### Making Changes

**Frontend (Next.js):**
- Edit files in `apps/web/src/`
- Changes hot-reload automatically
- Check browser console for errors

**Backend (FastAPI):**
- Edit `apps/api/main.py`
- Server reloads automatically (--reload flag)
- Check terminal for errors

**Core Engine:**
- Edit files in `core/`
- Restart FastAPI to see changes
- Run tests: `pytest tests/`

---

## 📦 Build for Production

### Next.js

```bash
cd apps\web

# Build optimized production bundle
npm run build

# Start production server
npm start
```

### FastAPI

```bash
# Production mode (no reload)
.venv\Scripts\python -m uvicorn apps.api.main:app --host 0.0.0.0 --port 8000
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
# Check what's running on port 8000
netstat -ano | findstr :8000
```

---

### Issue: "Module not found" in Next.js

**Solution:**
```bash
cd apps\web
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: Python import errors

**Solution:**
```bash
# Ensure virtual environment is activated
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
cd apps\web
npm install react-plotly.js plotly.js
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
cd apps\web
npm run build
# Should complete without errors
```

---

## 📊 Monitoring

### Check Server Status

**FastAPI:**
- Health: http://localhost:8000/api/v1/health
- Docs: http://localhost:8000/docs
- Logs: Check Terminal 1

**Next.js:**
- Status: http://localhost:3000
- Logs: Check Terminal 2

**Streamlit (optional):**
- Status: http://localhost:8502
- Logs: Check Terminal 3

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
   - Read: [ARCHITECTURE.md](ARCHITECTURE.md)
   - Understand data flow
   - Review API endpoints

3. **Customize the design**
   - Edit `apps/web/tailwind.config.ts` for colors
   - Modify components in `apps/web/src/components/`
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
   - [README.md](apps/web/README.md) - Frontend docs
   - [ARCHITECTURE.md](ARCHITECTURE.md) - System overview

2. **Common issues**
   - Review troubleshooting section above

3. **Development tips**
   - Use browser DevTools (F12)
   - Check terminal logs
   - Enable verbose logging

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
.venv\Scripts\activate

# Start FastAPI
.venv\Scripts\python -m uvicorn apps.api.main:app --reload --port 8000

# Start Next.js (from apps/web)
npm run dev

# Start Streamlit (optional)
.venv\Scripts\streamlit run apps\ui\streamlit_app.py

# Run tests
pytest tests/

# Build Next.js
cd apps\web && npm run build
```

---

**Version:** 1.0.0
**Last Updated:** 2025-10-11
**Platform:** Windows (PowerShell/CMD)
