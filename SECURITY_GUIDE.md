# Security & Deployment Guide

Complete guide for securing your API keys and deploying the Jengu Dynamic Pricing Platform to production.

## Table of Contents

1. [Current Setup](#current-setup)
2. [Security Architecture](#security-architecture)
3. [Environment Variables Setup](#environment-variables-setup)
4. [Development Workflow](#development-workflow)
5. [Production Deployment](#production-deployment)
6. [Security Checklist](#security-checklist)

---

## Current Setup

### File Structure

```
travel-pricing/
├── frontend/                    # React + Vite frontend
│   ├── src/
│   ├── .env                     # Dev API keys (gitignored)
│   ├── .env.production          # Production config (no API keys!)
│   └── .gitignore               # Prevents committing .env
├── backend/                     # Express API server
│   ├── server.js                # API proxy server
│   ├── .env                     # Server API keys (gitignored)
│   ├── .env.example             # Template for setup
│   └── .gitignore               # Prevents committing .env
└── SECURITY_GUIDE.md            # This file
```

### What's Protected

✅ **API Keys**: Stored only in backend `.env` file
✅ **Git**: `.env` files are gitignored (never committed)
✅ **CORS**: Frontend can only call its own backend
✅ **Rate Limiting**: 60 requests/minute per IP
✅ **Environment Separation**: Different configs for dev/production

---

## Security Architecture

### OLD (Insecure) Architecture ❌

```
┌─────────┐         Direct API Calls          ┌──────────────┐
│ Browser │ ────────(API keys exposed!)──────>│ External APIs│
│ (React) │                                   │ (Anthropic,  │
└─────────┘                                   │  OpenWeather)│
                                              └──────────────┘
```

**Problem**: API keys visible in browser Network tab!

### NEW (Secure) Architecture ✅

```
┌─────────┐      ┌──────────┐      ┌──────────────┐
│ Browser │ ───> │ Backend  │ ───> │ External APIs│
│ (React) │      │ (Express)│      │ (Anthropic,  │
└─────────┘      │ + .env   │      │  OpenWeather)│
                 └──────────┘      └──────────────┘
```

**Benefits**:
- API keys never leave the server
- Browser only sees backend responses
- Rate limiting and logging centralized
- Can rotate keys without frontend changes

---

## Environment Variables Setup

### Backend Setup (Required)

1. **Copy the example file**:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` with your API keys**:
   ```env
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # Replace these with your actual API keys!
   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
   OPENWEATHER_API_KEY=your_openweather_key_here
   CALENDARIFIC_API_KEY=your_calendarific_key_here
   SCRAPERAPI_KEY=your_scraperapi_key_here
   MAPBOX_TOKEN=pk.your_mapbox_token_here
   MAKCORPS_API_KEY=68ed86819d19968d101c2f43

   MAX_REQUESTS_PER_MINUTE=60
   ```

3. **Verify `.gitignore` includes `.env`**:
   ```bash
   cat .gitignore  # Should include ".env"
   ```

### Frontend Setup (Optional for Dev)

1. **Copy the example file**:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. **Edit `.env` for development**:
   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_ENABLE_AI_ASSISTANT=true
   VITE_ENABLE_COMPETITOR_PRICING=true
   VITE_ENABLE_WEATHER_DATA=true
   VITE_ENABLE_HOLIDAYS=true
   VITE_ENABLE_GEOCODING=true
   VITE_ENABLE_MAKCORPS=true
   ```

**Note**: Frontend `.env` should NOT contain API keys in production!

---

## Development Workflow

### Start Both Servers

**Terminal 1 - Backend**:
```bash
cd backend
npm install  # First time only
npm run dev  # Starts on port 3001
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm install  # First time only
npm run dev  # Starts on port 5173
```

Visit: http://localhost:5173

### How It Works

1. User interacts with React app (port 5173)
2. Frontend calls `http://localhost:3001/api/*`
3. Backend proxy forwards to external APIs using server-side keys
4. Response sent back to frontend
5. User never sees API keys!

---

## Production Deployment

### Option 1: Vercel (Frontend) + Railway (Backend)

#### Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `/backend`
5. Add environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.vercel.app
   ANTHROPIC_API_KEY=sk-ant-...
   OPENWEATHER_API_KEY=...
   CALENDARIFIC_API_KEY=...
   SCRAPERAPI_KEY=...
   MAPBOX_TOKEN=...
   MAKCORPS_API_KEY=68ed86819d19968d101c2f43
   ```
6. Deploy! You'll get a URL like: `https://jengu-backend.up.railway.app`

#### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Add New Project" → Import your GitHub repo
3. Set root directory to `/frontend`
4. Add environment variable in Vercel dashboard:
   ```
   VITE_API_URL=https://jengu-backend.up.railway.app/api
   ```
5. Deploy! You'll get a URL like: `https://jengu-pricing.vercel.app`

6. **Update backend CORS**: Go back to Railway and update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://jengu-pricing.vercel.app
   ```

---

### Option 2: Netlify (Frontend) + Render (Backend)

#### Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables (same as Railway above)
6. Deploy! You'll get a URL like: `https://jengu-api.onrender.com`

#### Deploy Frontend to Netlify

1. Go to [netlify.com](https://netlify.com) and sign up
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub and select your repo
4. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Add environment variable:
   ```
   VITE_API_URL=https://jengu-api.onrender.com/api
   ```
6. Deploy! You'll get a URL like: `https://jengu-pricing.netlify.app`

7. **Update backend CORS**: Go back to Render and update `FRONTEND_URL`

---

### Option 3: Single VPS (AWS, DigitalOcean, etc.)

For hosting both frontend and backend on one server:

```bash
# SSH into your server
ssh user@your-server.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx
sudo apt-get install nginx

# Clone repository
git clone https://github.com/yourusername/travel-pricing.git
cd travel-pricing

# Setup backend
cd backend
npm install
nano .env  # Add your API keys
npm install -g pm2
pm2 start server.js --name jengu-api
pm2 startup
pm2 save

# Setup frontend
cd ../frontend
npm install
npm run build  # Creates dist/ folder

# Configure nginx
sudo nano /etc/nginx/sites-available/jengu
```

**Nginx config**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (static files)
    location / {
        root /path/to/travel-pricing/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/jengu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install SSL certificate (optional but recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Security Checklist

### Before Deployment ✅

- [ ] All API keys in backend `.env` (not frontend)
- [ ] `.env` files in `.gitignore`
- [ ] Never committed `.env` to git (check: `git log --all --full-history -- '*/.env'`)
- [ ] `FRONTEND_URL` set correctly in backend
- [ ] `VITE_API_URL` pointing to production backend
- [ ] HTTPS enabled on both frontend and backend
- [ ] CORS configured to only allow your frontend
- [ ] Rate limiting enabled
- [ ] Different `.env` values for dev vs production

### After Deployment ✅

- [ ] Test all API endpoints work
- [ ] Verify API keys not visible in browser Network tab
- [ ] Check CORS blocks unauthorized origins
- [ ] Monitor server logs for errors
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Enable monitoring (UptimeRobot, Datadog)
- [ ] Backup `.env` file securely (1Password, Bitwarden)

### API Key Rotation

When rotating API keys:
1. Get new API key from provider
2. Update backend `.env` (or hosting dashboard env vars)
3. Restart backend server
4. Verify app still works
5. Revoke old API key

---

## Getting API Keys

### Anthropic Claude
- Website: https://console.anthropic.com/
- Free tier: $5 credit
- Pricing: $3 per million input tokens

### OpenWeatherMap
- Website: https://openweathermap.org/api
- Free tier: 1,000 calls/day
- Pricing: $40/month for 100,000 calls

### Calendarific
- Website: https://calendarific.com/
- Free tier: 1,000 calls/month
- Pricing: $15/month for 10,000 calls

### Mapbox
- Website: https://www.mapbox.com/
- Free tier: 100,000 requests/month
- Pricing: Pay-as-you-go after free tier

### ScraperAPI
- Website: https://www.scraperapi.com/
- Free tier: 5,000 calls
- Pricing: $49/month for 100,000 calls

### Makcorps
- Website: https://makcorps.com/
- API key: `68ed86819d19968d101c2f43`
- Note: Limited to 30 test calls

---

## Common Issues

### "CORS error" in production
- **Cause**: Backend `FRONTEND_URL` doesn't match actual frontend URL
- **Fix**: Update `FRONTEND_URL` in backend env vars, restart server

### "API key invalid"
- **Cause**: Wrong key or not set in environment
- **Fix**: Double-check `.env` file, restart server after changes

### Frontend can't reach backend
- **Cause**: `VITE_API_URL` pointing to wrong URL
- **Fix**: Update `VITE_API_URL`, rebuild frontend (`npm run build`)

### "Rate limit exceeded"
- **Cause**: Too many requests
- **Fix**: Increase `MAX_REQUESTS_PER_MINUTE` in backend `.env`

---

## Need Help?

- Backend issues: Check [backend/README.md](backend/README.md)
- Frontend deployment: Check [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md)
- General questions: Open an issue on GitHub

---

**Remember**: API keys are like passwords. Never commit them to git, never expose them in frontend code, and rotate them regularly!
