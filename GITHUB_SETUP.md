# GitHub Setup Guide - Safe Repository Push

Complete step-by-step guide to safely push your Jengu Dynamic Pricing Platform to GitHub without exposing API keys.

---

## ⚠️ CRITICAL SECURITY CHECKS

Before pushing to GitHub, verify these files are **gitignored**:

- [ ] `frontend/.env` (contains API keys)
- [ ] `backend/.env` (contains API keys)
- [ ] `frontend/node_modules/`
- [ ] `backend/node_modules/`
- [ ] `.venv/` (Python virtual environment)
- [ ] `frontend/dist/` (build output)

---

## Step-by-Step Instructions

### 1. Verify Gitignore Protection

Check that `.env` files will be ignored:

```bash
cd c:\Users\eddgu\travel-pricing

# Check if .env files are properly ignored
git check-ignore frontend/.env backend/.env
```

**Expected output:**
```
frontend/.env
backend/.env
```

If you see these paths, you're safe! ✅

### 2. Initialize Git Repository

```bash
# Initialize git (if not already done)
git init

# Check current status
git status
```

**⚠️ WARNING**: If you see `frontend/.env` or `backend/.env` in the list, **STOP!** Do NOT proceed. Contact me for help.

### 3. Verify No API Keys in Tracked Files

Search for potential API keys in tracked files:

```bash
# Make sure no API keys are in code
git grep -i "sk-ant-" 2>nul
git grep -i "api_key.*=" 2>nul
```

If any results show actual API keys (not placeholders), you need to remove them first.

### 4. Stage All Files

```bash
# Add all files (gitignore will protect .env files)
git add .

# Verify what will be committed
git status
```

**Verify these files are NOT staged:**
- ❌ `frontend/.env`
- ❌ `backend/.env`
- ❌ `node_modules/`
- ❌ `.venv/`

**These files SHOULD be staged:**
- ✅ `frontend/.env.example`
- ✅ `backend/.env.example`
- ✅ `README.md`
- ✅ All `.js`, `.ts`, `.tsx`, `.py` files
- ✅ `package.json`, `requirements.txt`

### 5. Create Initial Commit

```bash
git commit -m "Initial commit: Jengu Dynamic Pricing Platform

- React + Vite frontend with TypeScript
- Express.js secure backend API
- 8 external API integrations (Anthropic, OpenWeather, etc.)
- Complete security implementation with environment variables
- Full documentation and deployment guides"
```

### 6. Create GitHub Repository

**Option A: Via GitHub Website**

1. Go to https://github.com/new
2. Repository name: `jengu-pricing` (or your choice)
3. Description: "Dynamic pricing platform for hospitality businesses"
4. **Keep it Private** (recommended if you have any concerns)
5. **DO NOT** initialize with README (you already have one)
6. Click "Create repository"

**Option B: Via GitHub CLI**

```bash
# Install GitHub CLI if not already installed
# Download from: https://cli.github.com/

# Login
gh auth login

# Create repository
gh repo create jengu-pricing --private --source=. --remote=origin
```

### 7. Connect to GitHub

Copy the commands from GitHub (after creating the repo):

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/jengu-pricing.git

# Rename branch to main (if needed)
git branch -M main
```

### 8. Push to GitHub

```bash
# Push to GitHub
git push -u origin main
```

### 9. Verify on GitHub

1. Go to your repository: `https://github.com/YOUR_USERNAME/jengu-pricing`
2. Check that `.env` files are **NOT visible**
3. Verify `.env.example` files **ARE visible**
4. Check that documentation is present

---

## ✅ Post-Push Verification Checklist

After pushing, verify security:

- [ ] Visit your GitHub repo
- [ ] Search for "sk-ant-" (should find 0 results)
- [ ] Search for "ANTHROPIC_API_KEY" (should only find in `.env.example`)
- [ ] Verify `.env` files are not visible
- [ ] Check `node_modules/` is not uploaded
- [ ] Verify `.venv/` is not uploaded

---

## 🚨 If You Accidentally Pushed API Keys

**If you realize you pushed `.env` files or API keys:**

### 1. Remove from Git History Immediately

```bash
# Remove the sensitive file from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch frontend/.env backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to overwrite GitHub history
git push origin --force --all
```

### 2. Rotate ALL API Keys

- **Anthropic**: https://console.anthropic.com/ → Delete old key, create new
- **OpenWeather**: https://home.openweathermap.org/api_keys → Revoke, create new
- **Calendarific**: https://calendarific.com/account → Generate new key
- **ScraperAPI**: https://dashboard.scraperapi.com/ → Regenerate key
- **Mapbox**: https://account.mapbox.com/access-tokens/ → Revoke, create new

### 3. Update Local `.env` Files

Update `frontend/.env` and `backend/.env` with new keys.

---

## Repository Structure on GitHub

Your repository should look like this:

```
jengu-pricing/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── .env.example          ✅ Visible
│   ├── .env.production       ✅ Visible
│   └── .env                  ❌ Hidden (gitignored)
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example          ✅ Visible
│   └── .env                  ❌ Hidden (gitignored)
├── .gitignore                ✅ Visible
├── README.md                 ✅ Visible
├── QUICK_START.md            ✅ Visible
├── SECURITY_GUIDE.md         ✅ Visible
└── GITHUB_SETUP.md           ✅ Visible
```

---

## Creating a Good README

Create a main README.md for your repository:

```markdown
# Jengu Dynamic Pricing Platform

AI-powered dynamic pricing platform for hospitality businesses.

## Features

- 📊 Real-time pricing optimization
- 🤖 AI assistant powered by Anthropic Claude
- 🌤️ Weather data integration
- 📅 Holiday and event tracking
- 🏨 Competitor price monitoring
- 🔒 Secure API key management

## Quick Start

See [QUICK_START.md](QUICK_START.md) for detailed setup instructions.

## Documentation

- [Quick Start Guide](QUICK_START.md) - Get started in 5 minutes
- [Security Guide](SECURITY_GUIDE.md) - Secure deployment
- [Backend API Docs](backend/README.md) - API documentation
- [Frontend Deployment](frontend/DEPLOYMENT.md) - Deploy frontend

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- Recharts

### Backend
- Node.js + Express
- Secure API proxy
- Rate limiting
- CORS protection

### APIs
- Anthropic Claude (AI)
- OpenWeatherMap (Weather)
- Calendarific (Holidays)
- Mapbox (Geocoding)
- ScraperAPI (Competitor data)
- Makcorps (Hotel prices)

## Security

All API keys are stored securely in environment variables on the backend. The frontend never has access to API keys. See [SECURITY_GUIDE.md](SECURITY_GUIDE.md) for details.

## License

MIT
```

---

## Cloning the Repository (For Team Members)

If others want to clone and run your project:

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/jengu-pricing.git
cd jengu-pricing

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env and add API keys
npm run dev

# Frontend setup (new terminal)
cd ../frontend
npm install
npm run dev
```

---

## Branch Strategy (Optional)

For team development:

```bash
# Create development branch
git checkout -b develop

# Create feature branches
git checkout -b feature/new-pricing-model

# Merge back when done
git checkout develop
git merge feature/new-pricing-model
git push origin develop
```

---

## GitHub Actions (Optional)

You can add automatic deployments with GitHub Actions. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm install && npm run build
      # Add deployment steps here

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm install
      # Add deployment steps here
```

---

## Protecting Sensitive Data

### What to NEVER commit:
- ❌ API keys
- ❌ Database passwords
- ❌ Private keys
- ❌ Customer data
- ❌ `.env` files

### What's safe to commit:
- ✅ Source code
- ✅ `.env.example` templates
- ✅ Documentation
- ✅ Configuration files (without secrets)
- ✅ Tests

---

## Getting Help

- **Git Issues**: https://docs.github.com/en/get-started
- **Security Concerns**: Review [SECURITY_GUIDE.md](SECURITY_GUIDE.md)
- **Deployment**: See [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md)

---

## Final Checklist Before Push

- [ ] `.gitignore` is configured
- [ ] Tested `git check-ignore frontend/.env backend/.env`
- [ ] Reviewed `git status` output
- [ ] No API keys in tracked files
- [ ] Documentation is complete
- [ ] README.md is informative
- [ ] `.env.example` files are up to date
- [ ] Ready to push!

---

**Remember**: Once something is pushed to GitHub, assume it's public forever (even if you delete it). Always double-check before pushing!
