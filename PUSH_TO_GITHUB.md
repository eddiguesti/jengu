# Push to GitHub - Ready-to-Run Commands

Copy and paste these commands to safely push your project to GitHub.

---

## ✅ Pre-Push Checklist

Before running any commands:

- [ ] You have a GitHub account (sign up at https://github.com/signup)
- [ ] Git is installed (`git --version` should work)
- [ ] You've reviewed that `.env` files contain API keys
- [ ] You understand `.env` files will NOT be pushed (protected by `.gitignore`)

---

## Step 1: Initialize Git Repository

Open a terminal in your project folder and run:

```bash
cd c:\Users\eddgu\travel-pricing
git init
```

**Expected output:**
```
Initialized empty Git repository in C:/Users/eddgu/travel-pricing/.git/
```

---

## Step 2: Verify Gitignore Protection

Check that sensitive files will be ignored:

```bash
git status
```

**Look for**:
- ✅ Should see `frontend/.env.example` (good!)
- ✅ Should see `backend/.env.example` (good!)
- ❌ Should NOT see `frontend/.env` (protected!)
- ❌ Should NOT see `backend/.env` (protected!)
- ❌ Should NOT see `node_modules/` (protected!)
- ❌ Should NOT see `.venv/` (protected!)

**If you see `frontend/.env` or `backend/.env` in the output, STOP and contact me!**

---

## Step 3: Stage All Files

```bash
git add .
```

This adds all files except those in `.gitignore`.

---

## Step 4: Verify What Will Be Committed

```bash
git status
```

**Safe files** (should be listed):
- ✅ All `.js`, `.ts`, `.tsx`, `.py` files
- ✅ `package.json`, `requirements.txt`
- ✅ `.env.example` files
- ✅ `README.md` and documentation
- ✅ `.gitignore`

**Dangerous files** (should NOT be listed):
- ❌ `frontend/.env`
- ❌ `backend/.env`
- ❌ `node_modules/`
- ❌ `.venv/`

---

## Step 5: Create Initial Commit

```bash
git commit -m "Initial commit: Jengu Dynamic Pricing Platform

- React + TypeScript frontend
- Express.js secure backend
- 8 API integrations (Anthropic, OpenWeather, Calendarific, Mapbox, ScraperAPI, Makcorps)
- Complete security implementation
- Full documentation"
```

**Expected output:**
```
[main (root-commit) abc1234] Initial commit: Jengu Dynamic Pricing Platform
 XX files changed, XXXX insertions(+)
 create mode 100644 ...
```

---

## Step 6: Create GitHub Repository

### Option A: Via GitHub Website (Recommended)

1. Go to https://github.com/new
2. **Repository name**: `jengu-pricing` (or your choice)
3. **Description**: "AI-powered dynamic pricing platform for hospitality"
4. **Visibility**:
   - ✅ **Private** (recommended for commercial projects)
   - ⚪ Public (only if you want to share publicly)
5. **IMPORTANT**:
   - ❌ DO NOT check "Add a README file"
   - ❌ DO NOT add .gitignore (you already have one)
   - ❌ DO NOT choose a license yet
6. Click **"Create repository"**

### Option B: Via GitHub CLI (Advanced)

```bash
# Install GitHub CLI first from: https://cli.github.com/

gh auth login
gh repo create jengu-pricing --private --source=. --remote=origin
```

---

## Step 7: Connect Local Repo to GitHub

After creating the repository on GitHub, you'll see a page with commands. Copy YOUR actual URL:

```bash
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/jengu-pricing.git

# Rename branch to main
git branch -M main
```

**Example** (if your username is "john"):
```bash
git remote add origin https://github.com/john/jengu-pricing.git
git branch -M main
```

---

## Step 8: Push to GitHub

```bash
git push -u origin main
```

**Expected output:**
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Delta compression using up to 8 threads
Compressing objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), X.XX MiB | X.XX MiB/s, done.
Total XX (delta XX), reused 0 (delta 0), pack-reused 0
To https://github.com/YOUR_USERNAME/jengu-pricing.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## Step 9: Verify on GitHub

1. Go to `https://github.com/YOUR_USERNAME/jengu-pricing`
2. **Check that you CAN see**:
   - ✅ `README.md`
   - ✅ `frontend/` folder
   - ✅ `backend/` folder
   - ✅ `.env.example` files
   - ✅ Documentation files
3. **Verify you CANNOT see**:
   - ❌ `frontend/.env`
   - ❌ `backend/.env`
   - ❌ `node_modules/`
   - ❌ `.venv/`

---

## 🔍 Security Verification

After pushing, run these searches on GitHub:

1. Click on your repository
2. Press `/` (slash) to open search
3. Search for these terms - **should return 0 results**:
   - `sk-ant-` (Anthropic API key prefix)
   - Your actual API keys
   - Any passwords

If you find any actual API keys, see "Emergency: Leaked Keys" section below.

---

## 🚨 Emergency: If You Leaked API Keys

**If you accidentally pushed `.env` files or API keys:**

### 1. Remove from Git Immediately

```bash
cd c:\Users\eddgu\travel-pricing

# Remove .env files from git history
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch frontend/.env backend/.env" --prune-empty --tag-name-filter cat -- --all

# Force push to overwrite GitHub history
git push origin --force --all
git push origin --force --tags
```

### 2. Rotate ALL API Keys IMMEDIATELY

Go to each service and generate new keys:

1. **Anthropic**: https://console.anthropic.com/ → API Keys → Delete old → Create new
2. **OpenWeatherMap**: https://home.openweathermap.org/api_keys → Delete → Create new
3. **Calendarific**: https://calendarific.com/account → API Keys → Regenerate
4. **ScraperAPI**: https://dashboard.scraperapi.com/ → Account → Regenerate API Key
5. **Mapbox**: https://account.mapbox.com/access-tokens/ → Revoke → Create new
6. **Makcorps**: Contact support (only 30 calls, limited key)

### 3. Update Local Files

Update `backend/.env` with new keys and restart your backend server.

---

## Future Updates (After Initial Push)

After you make changes to your code:

```bash
# Check what changed
git status

# Stage changes
git add .

# Commit with a message
git commit -m "Add new feature: competitor price alerts"

# Push to GitHub
git push
```

---

## Working with Branches

For adding new features:

```bash
# Create a new branch for a feature
git checkout -b feature/price-alerts

# Make your changes, then commit
git add .
git commit -m "Add price alert system"

# Push branch to GitHub
git push -u origin feature/price-alerts

# Later, merge into main via GitHub Pull Request
# Or locally:
git checkout main
git merge feature/price-alerts
git push
```

---

## Cloning Your Repo on Another Computer

To work on your project from another computer:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/jengu-pricing.git
cd jengu-pricing

# Setup backend
cd backend
npm install
cp .env.example .env
# IMPORTANT: Edit .env and add your API keys!
npm run dev

# Setup frontend (new terminal)
cd ../frontend
npm install
npm run dev
```

---

## Common Issues

### "Authentication failed"
- **Solution**: Use GitHub Personal Access Token
- Go to https://github.com/settings/tokens
- Generate new token (classic)
- Use token as password when pushing

### "Remote already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/jengu-pricing.git
```

### "Branch 'main' doesn't exist"
```bash
git branch -M main
```

### Accidentally committed wrong files
```bash
# Undo last commit (keeps changes)
git reset --soft HEAD~1

# Remove from staging
git reset HEAD frontend/.env

# Recommit without the file
git commit -m "Your message"
```

---

## Best Practices

### ✅ DO:
- Commit often with descriptive messages
- Pull before pushing: `git pull origin main`
- Use branches for new features
- Keep `.gitignore` updated
- Review `git status` before committing

### ❌ DON'T:
- Never commit `.env` files
- Never commit `node_modules/`
- Never force push to main (unless emergency)
- Don't commit large files (videos, databases)
- Don't commit sensitive customer data

---

## Quick Reference

```bash
# Daily workflow
git status              # Check what changed
git add .               # Stage all changes
git commit -m "msg"     # Commit with message
git push                # Push to GitHub

# Undo changes
git checkout -- file    # Discard local changes
git reset HEAD file     # Unstage file
git reset --soft HEAD~1 # Undo last commit

# Branching
git branch              # List branches
git checkout -b new     # Create new branch
git checkout main       # Switch to main
git merge feature       # Merge feature into current

# Remote
git remote -v           # Show remotes
git pull                # Fetch and merge
git fetch               # Fetch without merge
```

---

## Next Steps After Pushing

1. ✅ Add a nice README.md to your GitHub repo
2. ✅ Set up GitHub Actions for automatic deployments (optional)
3. ✅ Add collaborators: Settings → Collaborators
4. ✅ Enable branch protection: Settings → Branches
5. ✅ Deploy to production (see SECURITY_GUIDE.md)

---

## Need Help?

- **Git Basics**: https://docs.github.com/en/get-started/quickstart
- **Security**: See [SECURITY_GUIDE.md](SECURITY_GUIDE.md)
- **Deployment**: See [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md)

---

**You're ready to push!** 🚀

Just follow the steps above and your code will be safely on GitHub with all API keys protected.
