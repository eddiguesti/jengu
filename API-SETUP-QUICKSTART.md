# API Setup Quick Start Guide

**Last Updated**: October 24, 2025

This guide will help you set up all the API keys needed to run the Jengu pricing platform.

---

## Priority Order (Do These First)

### 1. ⚠️ Supabase (CRITICAL - Already Configured)
✅ **Already have**: `SUPABASE_URL` in `.env.example`
- URL: `https://geehtuuyyxhyissplfjb.supabase.co`
- **Action**: Get your `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_KEY` from Supabase dashboard
- **Where**: [Supabase Dashboard](https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb/settings/api)

### 2. 🔥 Anthropic Claude (HIGH - For AI Insights)
- **What**: AI-powered pricing recommendations and market insights
- **Cost**: ~$20-50/month (pay-per-use)
- **Sign up**: [console.anthropic.com](https://console.anthropic.com)
- **Steps**:
  1. Create account
  2. Add payment method
  3. Create API key
  4. Copy key to `backend/.env`: `ANTHROPIC_API_KEY=sk-ant-api03-...`

### 3. 🔥 Redis (HIGH - For Caching & Jobs)
- **What**: Caching layer + background job queue
- **Cost**: FREE (local) or $5-10/month (cloud)

**Option A: Local (Development)**
```bash
# macOS
brew install redis
brew services start redis

# Windows (Docker)
docker run -d -p 6379:6379 redis:alpine

# Test connection
redis-cli ping
# Should return: PONG
```

**Option B: Redis Cloud (Production)**
1. Visit [redis.com/try-free](https://redis.com/try-free)
2. Create free database (30MB)
3. Copy connection URL
4. Add to `backend/.env`: `REDIS_URL=redis://default:password@host:port`

---

## Medium Priority (Important Features)

### 4. 🟡 OpenWeather (Weather Data)
- **What**: Current/forecast weather data
- **Cost**: FREE tier (1,000 calls/day)
- **Sign up**: [openweathermap.org/api](https://openweathermap.org/api)
- **Steps**:
  1. Create account
  2. Go to API Keys section
  3. Generate key (takes ~10 min to activate)
  4. Add to `backend/.env`: `OPENWEATHER_API_KEY=your_key`

### 5. 🟡 SendGrid (Email Alerts)
- **What**: Email delivery for smart alerts
- **Cost**: FREE tier (100 emails/day)
- **Sign up**: [sendgrid.com](https://sendgrid.com)
- **Steps**:
  1. Create account
  2. Settings → API Keys → Create API Key
  3. Add to `backend/.env`:
     ```bash
     SENDGRID_API_KEY=SG.your_key_here
     ALERT_FROM_EMAIL=alerts@yourdomain.com
     ALERT_FROM_NAME=Jengu Pricing Alerts
     ```
  4. Verify sender email in SendGrid dashboard

### 6. 🟡 Makcorps (Competitor Scraping)
- **What**: Competitor hotel price data
- **Cost**: $49-199/month
- **Sign up**: [makcorps.com](https://makcorps.com)
- **Steps**:
  1. Create account
  2. Subscribe to Hotel API plan
  3. Copy API key
  4. Add to `backend/.env`: `MAKCORPS_API_KEY=your_key`

---

## Optional (Enable Later)

### 7. 🟢 Sentry (Error Tracking)
- **What**: Production error monitoring
- **Cost**: FREE tier (5K errors/month)
- **Sign up**: [sentry.io](https://sentry.io)
- **Steps**:
  1. Create account
  2. Create 3 projects: `jengu-backend`, `jengu-frontend`, `jengu-pricing`
  3. Copy DSN for each
  4. Add to respective `.env` files:
     ```bash
     # backend/.env
     SENTRY_DSN=https://...@sentry.io/backend_id

     # frontend/.env
     VITE_SENTRY_DSN=https://...@sentry.io/frontend_id

     # pricing-service/.env
     SENTRY_DSN=https://...@sentry.io/pricing_id
     ```

### 8. 🟢 Twilio (SMS Alerts)
- **What**: SMS notifications (optional)
- **Cost**: $0.0075 per SMS (~$7.50 for 1,000)
- **Sign up**: [twilio.com](https://twilio.com)
- **Steps**:
  1. Create account (get $15 free trial)
  2. Get phone number
  3. Copy Account SID, Auth Token, Phone Number
  4. Add to `backend/.env`:
     ```bash
     TWILIO_ACCOUNT_SID=ACxxxxxxxx
     TWILIO_AUTH_TOKEN=your_token
     TWILIO_PHONE_NUMBER=+1234567890
     ```

---

## Free APIs (No Signup Needed)

### ✅ Open-Meteo (Historical Weather)
- **What**: Historical weather data
- **Cost**: FREE
- **No API key needed** - uses public API
- Endpoint: `https://archive-api.open-meteo.com/v1/archive`

---

## Environment File Setup

### Step 1: Copy Example Files

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env

# Pricing Service
cp pricing-service/.env.example pricing-service/.env
```

### Step 2: Fill in Backend `.env`

```bash
# ========================================
# CRITICAL (Required to start)
# ========================================
SUPABASE_URL=https://geehtuuyyxhyissplfjb.supabase.co
SUPABASE_ANON_KEY=<GET FROM SUPABASE DASHBOARD>
SUPABASE_SERVICE_KEY=<GET FROM SUPABASE DASHBOARD>
PORT=3001

# ========================================
# HIGH PRIORITY (Core features)
# ========================================
ANTHROPIC_API_KEY=<GET FROM ANTHROPIC>
REDIS_URL=redis://localhost:6379  # Or Redis Cloud URL

# ========================================
# MEDIUM PRIORITY (Important features)
# ========================================
OPENWEATHER_API_KEY=<GET FROM OPENWEATHER>
SENDGRID_API_KEY=<GET FROM SENDGRID>
ALERT_FROM_EMAIL=alerts@yourdomain.com
MAKCORPS_API_KEY=<GET FROM MAKCORPS>

# ========================================
# OPTIONAL (Can skip for now)
# ========================================
SENTRY_DSN=<GET FROM SENTRY>
TWILIO_ACCOUNT_SID=<GET FROM TWILIO>
TWILIO_AUTH_TOKEN=<GET FROM TWILIO>
TWILIO_PHONE_NUMBER=<GET FROM TWILIO>
```

### Step 3: Fill in Frontend `.env`

```bash
VITE_SUPABASE_URL=https://geehtuuyyxhyissplfjb.supabase.co
VITE_SUPABASE_ANON_KEY=<SAME AS BACKEND ANON KEY>
VITE_API_URL=http://localhost:3001
```

### Step 4: Fill in Pricing Service `.env`

```bash
# Basic Config
HOST=0.0.0.0
PORT=8000
BACKEND_API_URL=http://localhost:3001

# Supabase (same as backend)
SUPABASE_URL=https://geehtuuyyxhyissplfjb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<SAME AS BACKEND SERVICE KEY>

# Optional
SENTRY_DSN=<GET FROM SENTRY IF USING>
```

---

## Verification Checklist

After setting up APIs, verify everything works:

### 1. Check Backend Health
```bash
cd backend
pnpm run dev

# In another terminal:
curl http://localhost:3001/api/health

# Expected output:
# {
#   "status": "OK",
#   "services": {
#     "database": "connected",
#     "redis": "connected",
#     "anthropic": "configured"
#   }
# }
```

### 2. Check Redis
```bash
redis-cli ping
# Expected: PONG
```

### 3. Check Frontend
```bash
cd frontend
pnpm run dev

# Open http://localhost:5173
# Should load without errors
```

### 4. Check Pricing Service
```bash
cd pricing-service
python main.py

# In another terminal:
curl http://localhost:8000/health

# Expected: {"status": "healthy"}
```

---

## Troubleshooting

### "Supabase connection failed"
- Go to [Supabase Dashboard](https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb/settings/api)
- Copy **anon key** and **service_role key**
- Make sure URL is: `https://geehtuuyyxhyissplfjb.supabase.co`

### "Redis connection refused"
- Check if Redis is running: `redis-cli ping`
- If using Docker: `docker ps` (should see redis container)
- If using Redis Cloud: Check connection URL and firewall settings

### "Anthropic API invalid key"
- Verify key starts with `sk-ant-api03-`
- Check you've added payment method in Anthropic dashboard
- Wait a few minutes after creating key

### "OpenWeather API 401 Unauthorized"
- Keys take ~10 minutes to activate after creation
- Check key status in OpenWeather dashboard
- Verify no typos in `.env` file

---

## Cost Summary

### Minimum to Start (Development)
- Supabase: **FREE**
- Redis (local): **FREE**
- Open-Meteo: **FREE**
- Anthropic: **~$20-50/month** (only cost)
- **Total: $20-50/month**

### Full Production Setup
- Supabase: **$25/month** (or FREE)
- Redis Cloud: **$5-10/month**
- Anthropic: **$20-50/month**
- OpenWeather: **FREE** or $40/month
- SendGrid: **FREE** or $15/month
- Makcorps: **$49/month**
- Sentry: **FREE** or $26/month
- **Total: $55-220/month**

---

## Next Steps

1. ✅ Set up Supabase keys (CRITICAL)
2. ✅ Start local Redis or sign up for Redis Cloud
3. ✅ Get Anthropic API key
4. ✅ Test backend with `pnpm run dev`
5. ⏭️ Add OpenWeather, SendGrid as needed
6. ⏭️ Enable Sentry for production monitoring

**Full documentation**: See [docs/API-KEYS-REQUIRED.md](docs/API-KEYS-REQUIRED.md) for detailed setup instructions.
