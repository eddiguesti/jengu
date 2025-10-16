# Deployment Guide - Jengu Dynamic Pricing Platform

Your app is ready to deploy! The production build is in the `dist/` folder.

## Quick Deploy Options

### Option 1: Netlify Drop (Easiest - 30 seconds)

1. Build your app (already done):

   ```bash
   npm run build
   ```

2. Go to: https://app.netlify.com/drop

3. Drag and drop the `dist/` folder onto the page

4. Get your live URL instantly!

---

### Option 2: Vercel CLI

1. Login to Vercel:

   ```bash
   vercel login
   ```

2. Deploy:

   ```bash
   vercel
   ```

3. Follow prompts (use defaults)

4. Get your live URL: `your-app.vercel.app`

---

### Option 3: Vercel GitHub Integration (Best for continuous deployment)

1. Push your code to GitHub

2. Go to [vercel.com](https://vercel.com) and sign up

3. Click "Add New Project" → "Import" your GitHub repo

4. Vercel auto-detects Vite configuration

5. Click "Deploy"

6. Every git push will automatically redeploy!

**Build Settings (auto-detected):**

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

---

### Option 4: Netlify GitHub Integration

1. Push code to GitHub

2. Go to [netlify.com](https://netlify.com) and sign up

3. "Add new site" → "Import an existing project"

4. Connect GitHub and select your repo

5. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`

6. Click "Deploy"

---

## Important Notes

### API Keys Security

⚠️ **IMPORTANT:** Your API keys are currently in the frontend code. For production, you should:

1. **Move API calls to a backend** (Node.js/Python server)
2. Store keys in backend environment variables
3. Frontend calls your backend, not external APIs directly

**Current API Keys in Frontend:**

- Anthropic Claude (Assistant)
- OpenWeatherMap (Weather data)
- Calendarific (Holidays)
- ScraperAPI (Competitor pricing)
- Mapbox (Geocoding)
- Makcorps (Hotel prices)

### Environment Variables

If deploying with GitHub integration:

1. In Vercel/Netlify dashboard, go to "Settings" → "Environment Variables"

2. Add these (replace with your actual keys):

   ```
   VITE_ANTHROPIC_API_KEY=your_key_here
   VITE_OPENWEATHER_API_KEY=your_key_here
   VITE_CALENDARIFIC_API_KEY=your_key_here
   VITE_SCRAPERAPI_KEY=your_key_here
   VITE_MAPBOX_TOKEN=your_key_here
   ```

3. Update your API service files to use:
   ```typescript
   const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || 'fallback_key'
   ```

---

## After Deployment

Your app will be live at a URL like:

- Vercel: `https://jengu-pricing.vercel.app`
- Netlify: `https://jengu-pricing.netlify.app`

### Custom Domain (Optional)

Both Vercel and Netlify support free custom domains:

1. Buy a domain (Namecheap, Google Domains, etc.)
2. In hosting dashboard: "Settings" → "Domains" → "Add custom domain"
3. Update your domain DNS settings (they provide instructions)

---

## Build Commands Reference

```bash
# Development server
npm run dev

# Production build (already done)
npm run build

# Preview production build locally
npm run preview

# Build with TypeScript checking (stricter)
npm run build:check
```

---

## Deployment Checklist

- [x] Production build created (`dist/` folder)
- [ ] Choose hosting platform (Netlify/Vercel)
- [ ] Deploy app
- [ ] Get live URL
- [ ] Test all features online
- [ ] (Optional) Set up custom domain
- [ ] (Recommended) Move API keys to backend server

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- Vite Deployment: https://vitejs.dev/guide/static-deploy.html

---

## Your App Stats

- **Bundle Size:** 295 KB (gzipped: 96 KB)
- **Build Time:** ~5 seconds
- **Pages:** 7 (Dashboard, Data, Pricing Engine, Insights, Competitor Monitor, Assistant, Settings)
- **Performance:** Optimized with code splitting and lazy loading
