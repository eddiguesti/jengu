# Required API Keys and Configuration

Complete guide to all external API keys and configuration needed for full platform functionality.

**Last Updated**: 2025-10-24

---

## Quick Reference

| Service | Required For | Priority | Monthly Cost | Sign-up Link |
|---------|--------------|----------|--------------|--------------|
| **Supabase** | Database, Auth, Storage | ⚠️ CRITICAL | Free tier available | [supabase.com](https://supabase.com) |
| **Anthropic Claude** | AI Insights & Recommendations | 🔥 HIGH | Pay-per-use (~$20-50) | [console.anthropic.com](https://console.anthropic.com) |
| **Open-Meteo** | Historical Weather Data | 🔥 HIGH | FREE (no key needed) | No signup required |
| **OpenWeather** | Current/Forecast Weather | 🟡 MEDIUM | Free tier: 1000 calls/day | [openweathermap.org/api](https://openweathermap.org/api) |
| **SendGrid** | Email Alerts & Notifications | 🟡 MEDIUM | Free tier: 100 emails/day | [sendgrid.com](https://sendgrid.com) |
| **Redis Cloud** | Caching & Job Queue | 🔥 HIGH | Free tier: 30MB | [redis.com/try-free](https://redis.com/try-free) |
| **Sentry** | Error Tracking | 🟢 OPTIONAL | Free tier: 5K errors/month | [sentry.io](https://sentry.io) |
| **Calendarific** | Holiday Data | 🟢 OPTIONAL | Disabled (needs migration) | [calendarific.com](https://calendarific.com) |
| **Twilio** | SMS Alerts | 🟢 OPTIONAL | Pay-per-use | [twilio.com](https://twilio.com) |
| **Makcorps** | Competitor Price Scraping | 🟡 MEDIUM | $49-199/month | [makcorps.com](https://makcorps.com) |

**Priority Legend:**
- ⚠️ **CRITICAL** - Platform will not work without this
- 🔥 **HIGH** - Core features require this
- 🟡 **MEDIUM** - Important features, but platform functions without it
- 🟢 **OPTIONAL** - Nice-to-have, can be enabled later

---

## Environment Configuration

### Backend (.env)

Create `backend/.env` with the following variables:

```bash
# ==============================================
# CRITICAL - REQUIRED FOR PLATFORM TO FUNCTION
# ==============================================

# Supabase (Database + Authentication)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Port Configuration
PORT=3001

# ==============================================
# HIGH PRIORITY - CORE FEATURES
# ==============================================

# Anthropic Claude API (AI Insights)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Redis (Caching + Job Queue)
REDIS_URL=redis://localhost:6379
# OR for Redis Cloud:
# REDIS_URL=redis://default:password@redis-12345.cloud.redislabs.com:12345

# ==============================================
# MEDIUM PRIORITY - IMPORTANT FEATURES
# ==============================================

# OpenWeather API (Current/Forecast Weather)
OPENWEATHER_API_KEY=your_openweather_key_here

# SendGrid (Email Alerts)
SENDGRID_API_KEY=SG.your_sendgrid_key_here
SENDGRID_FROM_EMAIL=alerts@yourdomain.com
SENDGRID_FROM_NAME=Jengu Pricing Alerts

# Makcorps (Competitor Scraping)
MAKCORPS_API_KEY=your_makcorps_key_here

# ==============================================
# OPTIONAL - CAN BE ENABLED LATER
# ==============================================

# Sentry (Error Tracking)
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
SENTRY_ENVIRONMENT=production

# Twilio (SMS Alerts)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Calendarific (Holidays - DISABLED, needs Supabase migration)
# CALENDARIFIC_API_KEY=your_calendarific_key_here
# HOLIDAYS_ENABLED=false

# Feature Flags
ENABLE_SMART_ALERTS=true
ENABLE_RL_BANDIT=false  # Set to true after pilot testing
BANDIT_TRAFFIC_PERCENTAGE=5.0  # Start with 5% traffic

# ==============================================
# NOTES & CONFIGURATION DEFAULTS
# ==============================================

# Open-Meteo (Free Historical Weather)
# No API key required - uses public API
# Endpoint: https://archive-api.open-meteo.com/v1/archive

# Background Workers
# Workers auto-start with backend server (BullMQ)
# Configure via Redis connection
```

### Frontend (.env)

Create `frontend/.env` with:

```bash
# Supabase (Frontend - Public Keys Only)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Backend API URL
VITE_API_URL=http://localhost:3001

# Optional: Sentry (Frontend Error Tracking)
# VITE_SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
```

### Pricing Service (.env)

Create `pricing-service/.env` with:

```bash
# Backend API Connection
BACKEND_API_URL=http://localhost:3001

# Sentry (Error Tracking)
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
SENTRY_ENVIRONMENT=production

# Port Configuration
PORT=8000

# LightGBM Model Path
MODEL_PATH=./models/elasticity_model.txt

# Reinforcement Learning
BANDIT_ENABLED=false
BANDIT_EPSILON=0.1
```

---

## Detailed Service Setup

### 1. Supabase (CRITICAL)

**Purpose**: PostgreSQL database, authentication, and row-level security

**Setup Steps**:
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and keys from Settings > API
3. Run database migrations:
   ```bash
   cd backend
   node setup-database.js
   ```
4. Verify connection:
   ```bash
   node test-db.js
   ```

**Free Tier Limits**:
- 500MB database
- 1GB file storage
- 50,000 monthly active users
- Unlimited API requests

**Cost**: Free tier is sufficient for most use cases. Pro plan ($25/month) adds more storage.

---

### 2. Anthropic Claude API (HIGH)

**Purpose**: AI-powered market insights and pricing recommendations

**Features Using This**:
- `/api/insights` - Market sentiment analysis
- `/api/analytics/insights/:id` - Property-specific recommendations
- Natural language explanations for pricing decisions

**Setup Steps**:
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add payment method
3. Generate an API key
4. Add to `backend/.env`: `ANTHROPIC_API_KEY=sk-ant-api03-...`

**Model Used**: Claude 3.5 Sonnet

**Estimated Cost**:
- Input: $3 per million tokens
- Output: $15 per million tokens
- Average: $20-50/month for moderate usage (100-200 insights/day)

**Free Alternative**: Platform works without this, but AI insights will be disabled

---

### 3. Redis (HIGH)

**Purpose**: Caching layer + BullMQ job queue for background workers

**Used For**:
- Weather data caching (10x speedup)
- Holiday data caching
- Background job queue (enrichment, competitor scraping, ML retraining)
- Rate limiting

**Setup Options**:

**Option A: Local Redis (Development)**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Windows (WSL or Docker)
docker run -d -p 6379:6379 redis:alpine
```

**Option B: Redis Cloud (Production)**
1. Visit [redis.com/try-free](https://redis.com/try-free)
2. Create a free database (30MB)
3. Copy connection URL: `redis://default:password@host:port`
4. Add to `backend/.env`: `REDIS_URL=redis://...`

**Free Tier**: 30MB, sufficient for caching + job queue

**Estimated Cost**: Free tier sufficient, or $5-10/month for 250MB

**Verification**:
```bash
# Check Redis connection
redis-cli ping
# Expected output: PONG
```

---

### 4. OpenWeather API (MEDIUM)

**Purpose**: Current weather and 5-day forecast data

**Used For**:
- Real-time weather enrichment
- Forecast-based pricing adjustments
- Weather impact analysis

**Setup Steps**:
1. Visit [openweathermap.org/api](https://openweathermap.org/api)
2. Sign up for free account
3. Generate API key (takes ~10 minutes to activate)
4. Add to `backend/.env`: `OPENWEATHER_API_KEY=your_key_here`

**Free Tier**: 1,000 calls/day (sufficient for 10-20 properties)

**Estimated Cost**: Free tier sufficient, or $40/month for 100,000 calls

**Note**: Open-Meteo (free, no key) is used for historical data. OpenWeather is only for current/forecast.

---

### 5. SendGrid (MEDIUM)

**Purpose**: Email delivery for smart alerts and notifications

**Used For**:
- Alert emails (price drops, revenue anomalies)
- Daily digest emails
- User notification preferences

**Setup Steps**:
1. Visit [sendgrid.com](https://sendgrid.com) and create account
2. Go to Settings > API Keys > Create API Key
3. Add to `backend/.env`:
   ```bash
   SENDGRID_API_KEY=SG.your_key_here
   SENDGRID_FROM_EMAIL=alerts@yourdomain.com
   SENDGRID_FROM_NAME=Jengu Pricing
   ```
4. Verify sender email in SendGrid dashboard

**Free Tier**: 100 emails/day (sufficient for 5-10 users)

**Estimated Cost**: Free tier sufficient, or $15/month for 40,000 emails

**Alternative**: Set `ENABLE_SMART_ALERTS=false` to disable email alerts

---

### 6. Makcorps (MEDIUM)

**Purpose**: Competitor hotel price scraping and market data

**Used For**:
- `/api/competitor-data/scrape` - Fetch competitor prices
- Neighborhood competitive index calculation
- Market positioning analysis

**Setup Steps**:
1. Visit [makcorps.com](https://makcorps.com) and create account
2. Subscribe to Hotel API plan ($49-199/month)
3. Add to `backend/.env`: `MAKCORPS_API_KEY=your_key_here`

**API Endpoints Used**:
- `GET /hotels/search` - Search hotels by city
- `GET /hotels/{id}/pricing` - Get historical pricing

**Estimated Cost**: $49/month (Basic) to $199/month (Professional)

**Alternative**: Manual competitor data entry or use ScraperAPI directly

---

### 7. Sentry (OPTIONAL)

**Purpose**: Error tracking and performance monitoring

**Used For**:
- Backend error tracking
- Frontend error tracking
- Pricing service error tracking
- Performance metrics

**Setup Steps**:
1. Visit [sentry.io](https://sentry.io) and create account
2. Create 3 projects: `jengu-backend`, `jengu-frontend`, `jengu-pricing`
3. Copy DSN for each project
4. Add to respective `.env` files:
   ```bash
   # Backend
   SENTRY_DSN=https://...@sentry.io/backend_project_id

   # Frontend
   VITE_SENTRY_DSN=https://...@sentry.io/frontend_project_id

   # Pricing Service
   SENTRY_DSN=https://...@sentry.io/pricing_project_id
   ```

**Free Tier**: 5,000 errors/month, 10,000 performance units/month

**Estimated Cost**: Free tier sufficient for development, $26/month for production

---

### 8. Twilio (OPTIONAL)

**Purpose**: SMS alerts for critical notifications

**Used For**:
- High-priority alerts (e.g., revenue drops >20%)
- User-configured SMS preferences

**Setup Steps**:
1. Visit [twilio.com](https://twilio.com) and create account
2. Get free trial phone number
3. Note Account SID, Auth Token, and Phone Number
4. Add to `backend/.env`:
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

**Free Trial**: $15 credit (sufficient for testing)

**Estimated Cost**: $0.0075/SMS (~$7.50 for 1,000 messages)

**Alternative**: Email-only alerts (SendGrid)

---

### 9. Calendarific (DISABLED - Migration Required)

**Purpose**: Holiday data enrichment

**Status**: ⚠️ DISABLED - Requires Supabase migration from Prisma

**Used For** (when enabled):
- Holiday enrichment for pricing data
- Holiday impact analysis
- Seasonal demand forecasting

**Current Issue**: Function `enrichWithHolidays()` uses Prisma, but app uses Supabase

**To Enable**:
1. Migrate `enrichWithHolidays()` in `backend/services/enrichmentService.ts` to Supabase
2. Sign up at [calendarific.com](https://calendarific.com)
3. Add to `backend/.env`:
   ```bash
   CALENDARIFIC_API_KEY=your_key_here
   HOLIDAYS_ENABLED=true
   ```

**Free Tier**: 1,000 requests/month

---

## Minimum Viable Configuration

To get the platform running with core features:

### Backend `.env` (Minimum)
```bash
# REQUIRED
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
PORT=3001

# HIGHLY RECOMMENDED
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional (features work without these)
OPENWEATHER_API_KEY=your_key
SENDGRID_API_KEY=SG.your_key
```

### Frontend `.env` (Minimum)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001
```

### Pricing Service `.env` (Minimum)
```bash
BACKEND_API_URL=http://localhost:3001
PORT=8000
```

---

## Cost Summary

### Development (Free)
- Supabase: FREE
- Redis: Local (FREE)
- Open-Meteo: FREE
- OpenWeather: FREE tier
- SendGrid: FREE tier
- Sentry: FREE tier
- **Total: $0/month**

### Production (Minimum)
- Supabase: FREE or $25/month
- Redis Cloud: $5-10/month
- Anthropic Claude: $20-50/month (usage-based)
- OpenWeather: FREE or $40/month
- SendGrid: FREE or $15/month
- Makcorps: $49/month
- Sentry: FREE or $26/month
- **Total: $55-220/month** depending on features

---

## Verification Checklist

After adding API keys, verify each service:

```bash
# 1. Backend health check
curl http://localhost:3001/api/health

# Expected output:
# {
#   "status": "OK",
#   "timestamp": "2025-10-24T...",
#   "services": {
#     "database": "connected",
#     "redis": "connected",
#     "anthropic": "configured",
#     "openweather": "configured"
#   }
# }

# 2. Frontend loads without errors
# Open http://localhost:5173 and check console

# 3. Pricing service health
curl http://localhost:8000/health

# 4. Test Redis connection
redis-cli ping
# Expected: PONG

# 5. Test database connection
cd backend && node test-db.js
```

---

## Troubleshooting

### "Redis connection failed"
- Check if Redis is running: `redis-cli ping`
- Verify `REDIS_URL` in `.env`
- For Redis Cloud, check firewall/IP whitelist

### "Supabase authentication failed"
- Verify `SUPABASE_URL` and keys in `.env`
- Check Supabase project status in dashboard
- Ensure RLS policies are created: `node setup-database.js`

### "Anthropic API rate limit"
- Check usage in [console.anthropic.com](https://console.anthropic.com)
- Verify payment method is active
- Consider caching AI insights

### "OpenWeather API invalid key"
- Keys take ~10 minutes to activate after creation
- Check key status in OpenWeather dashboard
- Verify key is not restricted by IP/domain

---

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use different keys for dev/staging/prod**
3. **Rotate API keys every 90 days**
4. **Monitor API usage** for unusual spikes
5. **Use environment variables** in production (Vercel, Railway, etc.)
6. **Restrict Supabase service role key** - Only use in backend, never frontend
7. **Enable Sentry** for production to catch API errors early

---

## Support Resources

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Anthropic Docs**: [docs.anthropic.com](https://docs.anthropic.com)
- **Redis Docs**: [redis.io/docs](https://redis.io/docs)
- **SendGrid Docs**: [docs.sendgrid.com](https://docs.sendgrid.com)
- **OpenWeather Docs**: [openweathermap.org/api](https://openweathermap.org/api)

---

**Questions or issues?** Check the [troubleshooting section](#troubleshooting) or create an issue in the repository.
