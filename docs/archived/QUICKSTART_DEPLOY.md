# ⚡ Quick Deploy to Streamlit Cloud (5 Minutes)

## What You'll Get
A live, shareable URL like: `https://your-pricing-app.streamlit.app`

---

## Step-by-Step (Copy & Paste)

### 1. Open Terminal/Command Prompt

Navigate to your project:
```bash
cd c:/Users/eddgu/travel-pricing
```

### 2. Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit - PriceLab Dynamic Pricing Platform"
```

### 3. Create GitHub Repository

Go to: https://github.com/new

- **Name**: `pricelab-dynamic-pricing`
- **Description**: "Dynamic Pricing Intelligence Platform with ML"
- **Visibility**: Public (for free hosting) or Private (also works)
- **DO NOT** check any boxes (README, .gitignore, license)
- Click **"Create repository"**

### 4. Push to GitHub

**Replace `YOUR-USERNAME` with your GitHub username:**

```bash
git remote add origin https://github.com/YOUR-USERNAME/pricelab-dynamic-pricing.git
git branch -M main
git push -u origin main
```

Example:
```bash
git remote add origin https://github.com/johndoe/pricelab-dynamic-pricing.git
git branch -M main
git push -u origin main
```

### 5. Deploy on Streamlit Cloud

1. Go to: https://share.streamlit.io
2. Click **"Sign in with GitHub"**
3. Click **"New app"**
4. Fill in:
   - **Repository**: Select `YOUR-USERNAME/pricelab-dynamic-pricing`
   - **Branch**: `main`
   - **Main file path**: `lime_app.py`
5. Click **"Deploy!"**

### 6. Wait 3-5 Minutes ⏱️

Streamlit will:
- ✅ Install Python packages
- ✅ Build your app
- ✅ Assign you a URL

### 7. Get Your Live URL! 🎉

You'll receive a URL like:
```
https://pricelab-dynamic-pricing-abc123.streamlit.app
```

**Share this URL** with anyone - no login required for viewers!

---

## Troubleshooting

### "Git not recognized"
Install Git: https://git-scm.com/download/win

### "Permission denied (publickey)"
Run:
```bash
git remote set-url origin https://github.com/YOUR-USERNAME/pricelab-dynamic-pricing.git
```
Then push again.

### "File too large"
The `.gitignore` file should prevent this. If you still see errors:
```bash
git rm --cached data/cache/*.parquet
git commit -m "Remove large files"
git push
```

### App crashes on Streamlit Cloud
Check logs in the Streamlit Cloud dashboard. Common issues:
- Missing dependencies (add to `requirements.txt`)
- Hardcoded file paths (use relative paths)

---

## Custom Domain (Optional)

Want `pricing.yourdomain.com` instead of `.streamlit.app`?

1. Go to your Streamlit app settings
2. Click "Custom domain"
3. Add your domain
4. Update DNS CNAME record at your domain registrar

---

## Alternative: Quick Share with Ngrok (Testing)

Don't want to use GitHub? Use Ngrok for temporary sharing:

```bash
# Keep your local app running on port 8503
# In another terminal:
pip install pyngrok
ngrok http 8503
```

You'll get a temporary URL like: `https://abc123.ngrok.io`

**Note**: This URL expires when you close ngrok. Not for production.

---

## What's Included

Your deployment package includes:

✅ `.gitignore` - Excludes unnecessary files
✅ `requirements.txt` - All Python dependencies
✅ `.streamlit/config.toml` - Streamlit theme settings
✅ `Procfile` - For Heroku deployment (if needed)
✅ `runtime.txt` - Python version specification

---

## Need Help?

Check the full guide: `DEPLOYMENT.md`

Or ask on Streamlit Community: https://discuss.streamlit.io

---

**Estimated Time**: 5-10 minutes
**Cost**: FREE (Streamlit Community Cloud)
**Traffic Limit**: Up to 1GB bandwidth/month (plenty for demos)
