# Quick Start Guide - Jengu Dynamic Pricing Platform

Get your app running locally in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Your API keys ready

## Step-by-Step Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Configure Backend API Keys

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your API keys
# Use your favorite text editor (nano, vim, VS Code, etc.)
nano .env
```

**Required API Keys** (add to `.env`):
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENWEATHER_API_KEY=your-key-here
CALENDARIFIC_API_KEY=your-key-here
SCRAPERAPI_KEY=your-key-here
MAPBOX_TOKEN=pk.your-token-here
MAKCORPS_API_KEY=68ed86819d19968d101c2f43
```

Don't have API keys yet? See [Getting API Keys](#getting-api-keys) below.

### 3. Start Backend Server

```bash
npm run dev
```

You should see:
```
🚀 Jengu Backend API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port 3001
✅ Environment: development
```

Keep this terminal open!

### 4. Install Frontend Dependencies

**Open a new terminal:**

```bash
cd frontend
npm install
```

### 5. Configure Frontend

```bash
# Copy example environment file
cp .env.example .env
```

The defaults are fine for development. The frontend `.env` should look like:
```env
VITE_API_URL=http://localhost:3001/api
```

### 6. Start Frontend

```bash
npm run dev
```

You should see:
```
VITE v5.4.20 ready in 329 ms
➜  Local: http://localhost:5173/
```

### 7. Open Your Browser

Visit: **http://localhost:5173**

You should see the Jengu Dynamic Pricing dashboard!

---

## Verify Everything Works

### Test 1: Health Check

Open a third terminal:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

### Test 2: Navigate the App

In your browser:
1. ✅ Click through the navigation (Dashboard, Data, Pricing Engine, etc.)
2. ✅ Go to Settings and configure your business location
3. ✅ Try uploading data in the Data page
4. ✅ Test the AI Assistant

---

## Getting API Keys

### Free Trials & Credits

All these services offer free tiers:

| Service | Sign Up URL | Free Tier |
|---------|-------------|-----------|
| **Anthropic Claude** | https://console.anthropic.com/ | $5 credit |
| **OpenWeatherMap** | https://openweathermap.org/api | 1,000 calls/day |
| **Calendarific** | https://calendarific.com/signup | 1,000 calls/month |
| **Mapbox** | https://account.mapbox.com/auth/signup/ | 100k requests/month |
| **ScraperAPI** | https://www.scraperapi.com/signup | 5,000 calls |
| **Makcorps** | Pre-provided | 30 test calls |

### Quick Sign-Up Steps

1. Click the sign-up link
2. Create an account
3. Verify your email
4. Navigate to "API Keys" section
5. Copy the API key
6. Paste into `backend/.env`

---

## Common Issues

### "Cannot find module 'express'"
- **Fix**: Run `npm install` in the `backend` folder

### "EADDRINUSE: address already in use"
- **Fix**: Port 3001 or 5173 is already used
- **Solution**: Kill the process or change port in `.env`

### Frontend shows blank page
- **Fix**: Check browser console for errors
- **Solution**: Make sure backend is running on port 3001

### "API key invalid" errors
- **Fix**: Check your API keys in `backend/.env`
- **Solution**: Restart backend server after changing `.env`

---

## Next Steps

### For Development

- Read [backend/README.md](backend/README.md) for API documentation
- Read [SECURITY_GUIDE.md](SECURITY_GUIDE.md) for best practices
- Configure your business profile in Settings

### For Deployment

- Read [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md) for frontend deployment
- Read [SECURITY_GUIDE.md](SECURITY_GUIDE.md) for production setup
- Choose a hosting provider (Vercel, Railway, Netlify, Render)

---

## Development Commands

### Backend
```bash
cd backend
npm run dev      # Start with auto-reload
npm start        # Start in production mode
```

### Frontend
```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## Architecture Overview

```
┌──────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser    │ ──────> │   Backend    │ ──────> │ External    │
│ (React App)  │         │ (Express.js) │         │   APIs      │
│ Port 5173    │ <────── │  Port 3001   │ <────── │             │
└──────────────┘         └──────────────┘         └─────────────┘
                              ▲
                              │
                         .env file
                      (API keys stored
                         securely)
```

**Key Points**:
- Frontend never sees API keys
- All external API calls go through backend
- Rate limiting and CORS protection
- Easy to deploy separately

---

## Need Help?

- **Backend Issues**: Check [backend/README.md](backend/README.md)
- **Security Questions**: Check [SECURITY_GUIDE.md](SECURITY_GUIDE.md)
- **Deployment**: Check [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md)

---

**Happy Coding! 🚀**
