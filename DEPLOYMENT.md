# 🚀 Deployment Guide - PriceLab Online

This guide will help you deploy your Dynamic Pricing Platform to the internet.

---

## Option 1: Streamlit Community Cloud (RECOMMENDED - FREE)

### Prerequisites
- GitHub account
- Git installed on your machine

### Steps

#### 1. Initialize Git Repository
```bash
cd c:/Users/eddgu/travel-pricing
git init
git add .
git commit -m "Initial commit - Dynamic Pricing Platform"
```

#### 2. Create GitHub Repository
1. Go to https://github.com/new
2. Name: `travel-pricing-platform` (or any name you like)
3. Description: "Dynamic Pricing Intelligence Platform"
4. Keep it **Public** (required for free Streamlit hosting) or **Private** (works too)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

#### 3. Push to GitHub
```bash
git remote add origin https://github.com/YOUR-USERNAME/travel-pricing-platform.git
git branch -M main
git push -u origin main
```

#### 4. Deploy on Streamlit Cloud
1. Go to https://share.streamlit.io
2. Click "Sign in with GitHub"
3. Authorize Streamlit
4. Click "New app"
5. Select:
   - Repository: `YOUR-USERNAME/travel-pricing-platform`
   - Branch: `main`
   - Main file path: `lime_app.py`
6. Click "Deploy!"

#### 5. Your App is Live! 🎉
You'll get a URL like: `https://your-app-name.streamlit.app`

**Note**: First deployment takes 3-5 minutes.

---

## Option 2: Railway (Modern Alternative)

### Cost: $5/month + usage

#### Steps
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `travel-pricing-platform` repo
5. Railway auto-detects Python and Streamlit
6. Add environment variables (if needed)
7. Deploy

**Your app URL**: `https://your-app.up.railway.app`

---

## Option 3: Heroku (Classic PaaS)

### Cost: Free tier available (with limitations)

#### Prerequisites
- Heroku account
- Heroku CLI installed

#### Additional Files Needed

Create `Procfile` in project root:
```
web: streamlit run lime_app.py --server.port=$PORT --server.headless=true
```

Create `runtime.txt`:
```
python-3.12.0
```

#### Deploy Steps
```bash
heroku login
heroku create your-pricing-app
git push heroku main
heroku open
```

---

## Option 4: Docker + VPS (DigitalOcean, AWS, etc.)

### Cost: $5-10/month

#### Create Dockerfile
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8501

CMD ["streamlit", "run", "lime_app.py", "--server.port=8501", "--server.headless=true"]
```

#### Build and Run
```bash
docker build -t pricing-app .
docker run -p 8501:8501 pricing-app
```

#### Deploy to DigitalOcean App Platform
1. Push to GitHub
2. Go to https://cloud.digitalocean.com/apps
3. Click "Create App" → Select GitHub repo
4. DigitalOcean auto-detects Dockerfile
5. Deploy (takes 5 minutes)

---

## Option 5: Ngrok (Quick Share - Testing Only)

### Cost: Free for temporary links

**Use this for quick demos, NOT production**

```bash
# Install ngrok
pip install pyngrok

# In a separate terminal, start ngrok
ngrok http 8503
```

You'll get a temporary URL like: `https://abc123.ngrok.io`

**Note**: This URL changes every time you restart ngrok. Free tier has limits.

---

## 🔒 Security Considerations

### Environment Variables
If you have API keys or secrets, **DO NOT** commit them to git.

Create `.streamlit/secrets.toml` (already in .gitignore):
```toml
# Add your secrets here
OPENAI_API_KEY = "your-key"
DATABASE_URL = "your-url"
```

In your code:
```python
import streamlit as st
api_key = st.secrets["OPENAI_API_KEY"]
```

On Streamlit Cloud:
- Go to app settings → Secrets
- Paste your secrets.toml content

---

## 📊 Performance Tips for Production

### 1. Enable Caching
Already implemented in your app with `@st.cache_data`

### 2. Optimize Data Loading
- Use Parquet files (already doing this ✓)
- Implement pagination for large datasets

### 3. Set Resource Limits
In `.streamlit/config.toml`:
```toml
[server]
maxUploadSize = 200
maxMessageSize = 200
```

### 4. Monitor Performance
- Streamlit Cloud: Built-in metrics dashboard
- Custom: Add logging with structlog (already in requirements ✓)

---

## 🎯 Recommended Choice

**For your use case (client demos, portfolio):**
👉 **Streamlit Community Cloud** - FREE, easy, auto-deploys

**For production with paying customers:**
👉 **Railway or DigitalOcean** - $5-10/month, more reliable

---

## 🆘 Troubleshooting

### Error: "ModuleNotFoundError"
- Check `requirements.txt` has all dependencies
- Redeploy on Streamlit Cloud

### App is slow
- Check data file sizes (keep under 200MB)
- Use caching aggressively
- Consider upgrading to paid tier

### Can't connect to database
- Add DATABASE_URL to secrets
- Ensure firewall allows Streamlit Cloud IPs

---

## 📝 Next Steps After Deployment

1. ✅ Test all features in production
2. ✅ Share link with stakeholders
3. ✅ Set up custom domain (optional)
4. ✅ Enable analytics (Streamlit has built-in)
5. ✅ Set up monitoring alerts

---

## 🔗 Useful Links

- Streamlit Cloud Docs: https://docs.streamlit.io/streamlit-community-cloud
- Railway Docs: https://docs.railway.app
- Heroku Streamlit Guide: https://devcenter.heroku.com/articles/getting-started-with-python

---

**Need help?** Check Streamlit Community Forum: https://discuss.streamlit.io
