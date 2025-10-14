# Deployment Guide - Jengu Dynamic Pricing Platform

This guide covers deploying the Jengu platform (React + Vite frontend + Node.js Express backend) to production.

---

## Architecture Overview

The Jengu platform consists of:
- **Frontend**: React + Vite (static site)
- **Backend**: Node.js Express (API proxy for external services)
- **Python Library**: Standalone analytics library (not deployed as a service)

---

## Deployment Options

###Option 1: Vercel + Railway (Recommended)

**Best for**: Quick deployment with minimal configuration

#### Frontend (React + Vite) → Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Build production bundle
cd frontend
pnpm run build

# 3. Deploy
vercel

# Follow prompts:
# - Connect to GitHub (recommended)
# - Configure project settings
# - Deploy
```

**Environment Variables** (add in Vercel dashboard):
```
VITE_API_URL=https://your-api.railway.app
```

**Output directory**: `dist`

#### Backend (Node.js) → Railway

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Initialize Railway project
railway login
railway init

# 3. Deploy Node.js backend
cd backend
railway up
```

**Environment Variables** (add in Railway dashboard):
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
ANTHROPIC_API_KEY=your_key
OPENWEATHER_API_KEY=your_key
CALENDARIFIC_API_KEY=your_key
MAPBOX_TOKEN=your_token
MAX_REQUESTS_PER_MINUTE=60
```

**Cost**: ~$5-10/month (Railway), Vercel free tier

---

### Option 2: Netlify + Render

**Alternative to Vercel + Railway**

#### Frontend → Netlify

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Build and deploy
cd frontend
pnpm run build
netlify deploy --prod --dir=dist
```

**Environment Variables**:
```
VITE_API_URL=https://your-api.render.com
```

#### Backend → Render

1. Connect GitHub repository to Render
2. Create new Web Service
3. Configure:
   - **Build Command**: `cd backend && pnpm install`
   - **Start Command**: `cd backend && pnpm start`
   - **Environment**: Node

**Cost**: ~$7/month (Render), Netlify free tier

---

### Option 3: Docker Compose (Self-Hosted)

**Best for**: Full control, custom infrastructure, on-premise deployment

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://backend:3001

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - FRONTEND_URL=http://localhost
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENWEATHER_API_KEY=${OPENWEATHER_API_KEY}
    volumes:
      - ./data:/app/data
```

#### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --prod

COPY . .

EXPOSE 3001
CMD ["pnpm", "start"]
```

#### Deploy

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Cost**: VPS hosting (DigitalOcean, Linode, Hetzner) ~$5-20/month

---

### Option 4: Static Hosting + Serverless

**Best for**: Low traffic, cost optimization

#### Frontend → Cloudflare Pages / GitHub Pages

```bash
# Build frontend
cd frontend
pnpm run build

# Deploy to Cloudflare Pages
# - Connect GitHub repo
# - Build command: pnpm run build
# - Output directory: dist
```

#### Backend → Fly.io / Railway

Fly.io offers excellent pricing for small apps:

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy backend
cd backend
fly launch
fly deploy
```

**Cost**: ~$3-5/month (Fly.io)

---

## Pre-Deployment Checklist

### Security
- [ ] Set secure environment variables for all API keys
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up CORS for production domains only (`FRONTEND_URL`)
- [ ] Enable rate limiting (configured in backend)
- [ ] Never commit `.env` files to git
- [ ] Review SECURITY.md for compliance requirements

### Performance
- [ ] Enable production build optimizations (Vite does this automatically)
- [ ] Configure CDN for static assets
- [ ] Optimize images (use WebP format)
- [ ] Test with Lighthouse for performance scores
- [ ] Configure log levels (set `NODE_ENV=production`)

### Monitoring
- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up log aggregation
- [ ] Configure alerting for errors and downtime

### Testing
- [ ] Test production build locally before deploying
- [ ] Verify all environment variables are set
- [ ] Test API endpoints from production frontend
- [ ] Check CORS configuration
- [ ] Verify SSL certificates

---

## Environment Variables

### Frontend (.env.production)

```bash
VITE_API_URL=https://api.yourdomain.com
```

### Backend (.env)

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://app.yourdomain.com

# External API Keys
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENWEATHER_API_KEY=your_openweather_key_here
CALENDARIFIC_API_KEY=your_calendarific_key_here
MAPBOX_TOKEN=your_mapbox_token_here
SCRAPERAPI_KEY=your_scraperapi_key_here
MAKCORPS_API_KEY=your_makcorps_key_here

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=60
```

---

## SSL/HTTPS Configuration

### Option 1: Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Auto-renewal (add to crontab)
0 0 1 * * certbot renew --quiet
```

### Option 2: Cloud Provider SSL

Most cloud providers offer automatic SSL:
- **Vercel**: Automatic SSL for all deployments
- **Netlify**: Automatic SSL for all sites
- **Railway**: Automatic SSL for custom domains
- **Cloudflare Pages**: Automatic SSL with Cloudflare proxy

---

## Custom Domain Setup

### Vercel (Frontend)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add custom domain: `app.yourdomain.com`
3. Configure DNS:
   ```
   Type: A
   Name: app
   Value: 76.76.21.21 (Vercel's IP)

   OR:

   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

### Railway (Backend)

1. Go to Railway Dashboard → Project → Settings
2. Add custom domain: `api.yourdomain.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: api
   Value: your-project.up.railway.app
   ```

---

## Monitoring & Logging

### Error Tracking: Sentry

```bash
# Install Sentry SDK
npm install @sentry/react @sentry/vite-plugin  # Frontend
npm install @sentry/node  # Backend
```

**Frontend Setup** (`frontend/src/main.tsx`):
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
});
```

**Backend Setup** (`backend/server.js`):
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Add to Express app
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Uptime Monitoring

Recommended free options:
- **UptimeRobot**: Monitor every 5 minutes (free)
- **StatusCake**: Monitor uptime and performance
- **Pingdom**: Basic uptime monitoring

---

## Backup Strategy

### Application Data Backups

```bash
# Backup data directory (if using file storage)
tar -czf data-backup-$(date +%Y%m%d).tar.gz data/
aws s3 cp data-backup-$(date +%Y%m%d).tar.gz s3://your-backups-bucket/
```

### Environment Variables Backup

Store environment variables securely:
- Use a password manager (1Password, LastPass)
- Keep encrypted backup in secure location
- Document all required variables

---

## Rollback Procedures

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Railway Rollback

- Go to Railway Dashboard → Deployments
- Click on previous successful deployment
- Click "Redeploy"

### Docker Rollback

```bash
# Tag previous version
docker tag jengu-backend:current jengu-backend:rollback

# Deploy previous version
docker-compose down
docker-compose up -d
```

---

## Troubleshooting

### Frontend Issues

```bash
# Check build logs
vercel logs

# Test production build locally
cd frontend
pnpm run build
pnpm run preview
```

### Backend Issues

```bash
# Check application logs
railway logs

# Test backend locally
cd backend
NODE_ENV=production pnpm start

# Check health endpoint
curl https://api.yourdomain.com/health
```

### CORS Issues

If you see CORS errors:
1. Check `FRONTEND_URL` in backend environment variables
2. Ensure it matches exactly (including protocol: https://)
3. Restart backend after changing environment variables

---

## Cost Optimization

### Recommended Free/Low-Cost Stack

**For hobby/personal projects:**
- Frontend: Vercel (Free tier)
- Backend: Railway ($5/month)
- Monitoring: UptimeRobot (Free)
- Error Tracking: Sentry (Free tier)

**Total: ~$5/month**

**For production:**
- Frontend: Vercel Pro ($20/month)
- Backend: Railway Pro ($20/month) or dedicated VPS ($10/month)
- Monitoring: Paid plan with better SLA
- Error Tracking: Sentry paid plan

**Total: ~$40-50/month**

---

## Performance Optimization

### Frontend

1. **Code Splitting**: Vite handles this automatically
2. **Image Optimization**: Use WebP format, lazy loading
3. **Bundle Analysis**:
   ```bash
   pnpm run build -- --analyze
   ```
4. **CDN**: Use Vercel's edge network or Cloudflare

### Backend

1. **Caching**: Implement Redis for frequent API calls
2. **Rate Limiting**: Already configured (60 req/min)
3. **Compression**: Enable gzip/brotli compression
4. **Monitoring**: Track response times

---

## Support & Resources

### Documentation
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

### Community
- Vercel Discord
- Railway Discord
- Vite Discord

---

## Quick Deployment Commands

```bash
# Build frontend locally
cd frontend && pnpm run build

# Test frontend production build
cd frontend && pnpm run preview

# Deploy frontend to Vercel
cd frontend && vercel --prod

# Deploy backend to Railway
cd backend && railway up

# Check backend health
curl https://your-api.railway.app/health

# View logs
vercel logs  # Frontend
railway logs  # Backend
```

---

**Last Updated**: 2025-10-14
**Version**: 2.0.0
**Architecture**: React + Vite + Node.js Express
