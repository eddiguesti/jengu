# Deployment Guide - Jengu Dynamic Pricing Platform

This guide covers deploying the Jengu platform (Next.js frontend + FastAPI backend + Python engine) to production.

---

## Architecture Overview

The Jengu platform consists of:
- **Frontend**: Next.js 15 (React SPA)
- **Backend**: FastAPI (Python) for pricing engine
- **Optional**: Node.js Express proxy (if needed)

---

## Deployment Options

### Option 1: Vercel + Railway (Recommended)

**Best for**: Quick deployment with minimal configuration

#### Frontend (Next.js) → Vercel
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy from frontend directory
cd frontend
vercel

# 3. Follow prompts
# - Connect to GitHub (recommended)
# - Configure project settings
# - Deploy
```

**Environment Variables** (add in Vercel dashboard):
```
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api/v1
```

#### Backend (FastAPI) → Railway
```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Initialize Railway project
railway login
railway init

# 3. Deploy Python backend
railway up
```

**Environment Variables** (add in Railway dashboard):
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db  # If using DB
ALLOWED_ORIGINS=https://your-app.vercel.app
LOG_LEVEL=INFO
```

**Cost**: ~$5-10/month (Railway), Vercel free tier

---

### Option 2: Docker Compose (Self-Hosted)

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
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000/api/v1
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/jengu
      - ALLOWED_ORIGINS=http://localhost:3000
    depends_on:
      - db
    volumes:
      - ./data:/app/data

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=jengu
      - POSTGRES_USER=jengu_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

#### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

#### Backend Dockerfile
```dockerfile
# Dockerfile.backend
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
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

**Cost**: VPS hosting (DigitalOcean, AWS, etc.) ~$10-50/month

---

### Option 3: AWS (Enterprise)

**Best for**: Large scale, enterprise requirements, high availability

#### Frontend → AWS Amplify or S3 + CloudFront
```bash
# 1. Build production bundle
cd frontend
npm run build

# 2. Deploy to S3
aws s3 sync out/ s3://your-bucket-name/ --acl public-read

# 3. Configure CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name your-bucket.s3.amazonaws.com
```

#### Backend → AWS ECS or Lambda
```bash
# 1. Create ECR repository
aws ecr create-repository --repository-name jengu-backend

# 2. Build and push Docker image
docker build -t jengu-backend .
docker tag jengu-backend:latest $ECR_URL/jengu-backend:latest
docker push $ECR_URL/jengu-backend:latest

# 3. Deploy to ECS
aws ecs create-service --cluster jengu-cluster \
  --service-name jengu-backend \
  --task-definition jengu-backend:1 \
  --desired-count 2
```

**Cost**: Variable, typically $50-500+/month depending on usage

---

### Option 4: Google Cloud Platform

**Best for**: Global distribution, serverless options

#### Frontend → Firebase Hosting
```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Initialize Firebase
firebase login
firebase init hosting

# 3. Deploy
cd frontend
npm run build
firebase deploy --only hosting
```

#### Backend → Cloud Run
```bash
# 1. Build container
gcloud builds submit --tag gcr.io/PROJECT_ID/jengu-backend

# 2. Deploy to Cloud Run
gcloud run deploy jengu-backend \
  --image gcr.io/PROJECT_ID/jengu-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Cost**: Pay-per-use, typically $10-100/month

---

## Pre-Deployment Checklist

### Security
- [ ] Generate and set secure `SECRET_KEY` for JWT
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up CORS for production domains only
- [ ] Enable rate limiting
- [ ] Configure security headers
- [ ] Set up environment variables (never commit secrets)
- [ ] Review SECURITY.md for compliance requirements

### Performance
- [ ] Enable production build optimizations
- [ ] Configure CDN for static assets
- [ ] Set up caching (Redis recommended)
- [ ] Optimize database queries and indexes
- [ ] Configure log levels (avoid verbose in prod)

### Monitoring
- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure application monitoring (DataDog, New Relic)
- [ ] Set up uptime monitoring
- [ ] Configure alerting for errors and downtime
- [ ] Set up log aggregation

### Database
- [ ] Set up automated backups
- [ ] Configure connection pooling
- [ ] Set up read replicas (if needed)
- [ ] Test backup restoration
- [ ] Document recovery procedures

---

## Environment Variables

### Frontend (.env.production)
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_NAME=Jengu
NEXT_PUBLIC_ENVIRONMENT=production
```

### Backend (.env)
```bash
# Required
SECRET_KEY=your-secure-secret-key-here
DATABASE_URL=postgresql://user:pass@host:5432/jengu
ALLOWED_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com

# Optional
ENVIRONMENT=production
LOG_LEVEL=INFO
CACHE_DIR=/app/data/cache
ENABLE_API_DOCS=false  # Disable Swagger in production
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
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
Most cloud providers (Vercel, Railway, AWS) offer automatic SSL:
- **Vercel**: Automatic SSL for all deployments
- **Railway**: Automatic SSL for custom domains
- **AWS**: Use ACM (AWS Certificate Manager)
- **GCP**: Use Google-managed SSL certificates

---

## Custom Domain Setup

### Vercel (Frontend)
1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add custom domain: `app.yourdomain.com`
3. Configure DNS:
   ```
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

### Recommended Tools

#### Error Tracking: Sentry
```bash
# Install Sentry SDK
npm install @sentry/nextjs  # Frontend
pip install sentry-sdk[fastapi]  # Backend

# Configure (Next.js)
# sentry.client.config.js
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
});

# Configure (FastAPI)
# apps/api/main.py
import sentry_sdk
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("ENVIRONMENT"),
)
```

#### Application Monitoring
- **Frontend**: Vercel Analytics (built-in)
- **Backend**: Railway metrics or DataDog APM
- **Database**: PostgreSQL monitoring tools

#### Uptime Monitoring
- UptimeRobot (free)
- Pingdom
- StatusCake

---

## Backup Strategy

### Database Backups
```bash
# Automated daily backups (add to cron)
#!/bin/bash
# backup-db.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$TIMESTAMP.sql
aws s3 cp backup_$TIMESTAMP.sql s3://your-backups-bucket/
```

### Application Data Backups
```bash
# Backup data directory
tar -czf data-backup-$(date +%Y%m%d).tar.gz data/
aws s3 cp data-backup-$(date +%Y%m%d).tar.gz s3://your-backups-bucket/
```

### Retention Policy
- **Daily backups**: Keep 7 days
- **Weekly backups**: Keep 4 weeks
- **Monthly backups**: Keep 12 months

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
npm run build
npm start
```

### Backend Issues
```bash
# Check application logs
railway logs

# Test FastAPI locally
uvicorn apps.api.main:app --host 0.0.0.0 --port 8000

# Check health endpoint
curl https://api.yourdomain.com/api/v1/health
```

### Database Issues
```bash
# Check connection
pg_isready -h host -p 5432 -U user

# Monitor active connections
SELECT count(*) FROM pg_stat_activity;
```

---

## Cost Optimization

### Tips for Reducing Costs

1. **Use Free Tiers**
   - Vercel: Free for personal projects
   - Railway: $5 credit monthly
   - Supabase: Free PostgreSQL tier

2. **Optimize Resource Usage**
   - Enable caching to reduce API calls
   - Use serverless functions for sporadic workloads
   - Optimize database queries

3. **Monitor Usage**
   - Set up billing alerts
   - Review usage dashboards monthly
   - Scale down in non-peak hours

---

## Support & Resources

### Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

### Community
- Vercel Discord
- Railway Discord
- Next.js GitHub Discussions

---

**Last Updated**: 2025-10-14
**Version**: 2.0
