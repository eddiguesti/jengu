# 🔐 Setup Google OAuth Authentication

## Why Google OAuth?

✅ **One-click login** - Users sign in with existing Google account
✅ **No password to remember** - Google handles authentication
✅ **Faster signup** - No email confirmation needed
✅ **More secure** - Google's enterprise-grade security
✅ **Professional** - Used by Netflix, Spotify, Airbnb, etc.

---

## Quick Setup Guide

### Step 1: Enable Google Provider in Supabase

1. Go to: https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb
2. Click **Authentication** → **Providers**
3. Click **"Google"** in the list
4. Toggle **ON** "Enable Google provider"

---

### Step 2: Get Google OAuth Credentials

You need to create a Google OAuth app to get Client ID and Client Secret.

#### 2.1 Go to Google Cloud Console

**URL:** https://console.cloud.google.com/

#### 2.2 Create a New Project (or use existing)

1. Click project dropdown at top
2. Click **"New Project"**
3. Name: "Jengu Travel Pricing" (or whatever you want)
4. Click **"Create"**

#### 2.3 Enable Google OAuth API

1. In the search bar, type "OAuth consent screen"
2. Click **"OAuth consent screen"** from results
3. Select **"External"** (for public users)
4. Click **"Create"**

#### 2.4 Configure OAuth Consent Screen

**App Information:**

- App name: `Jengu Dynamic Pricing`
- User support email: `edd.guest@gmail.com` (your email)
- App logo: (optional - upload your logo)

**App Domain:**

- Application home page: `http://localhost:5174` (for development)
- Privacy policy: (optional for development)
- Terms of service: (optional for development)

**Authorized domains:**

- Add: `supabase.co`

**Developer contact:**

- Email: `edd.guest@gmail.com`

Click **"Save and Continue"**

#### 2.5 Add Scopes

Click **"Add or Remove Scopes"**

Select these scopes:

- ✅ `.../auth/userinfo.email`
- ✅ `.../auth/userinfo.profile`

Click **"Update"** → **"Save and Continue"**

#### 2.6 Add Test Users (Development Only)

Add your email as a test user:

- Email: `edd.guest@gmail.com`

Click **"Save and Continue"**

#### 2.7 Create OAuth Client ID

1. Go to **"Credentials"** (left sidebar)
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Jengu Web Client`

**Authorized JavaScript origins:**

```
http://localhost:5174
http://localhost:5173
https://geehtuuyyxhyissplfjb.supabase.co
```

**Authorized redirect URIs:**

```
https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback
http://localhost:5174/auth/callback
```

Click **"Create"**

#### 2.8 Copy Client ID and Client Secret

You'll see a popup with:

- **Client ID:** `1234567890-abcdefg.apps.googleusercontent.com`
- **Client Secret:** `GOCSPX-abc123xyz...`

**Copy both of these!**

---

### Step 3: Add Credentials to Supabase

1. Go back to Supabase: https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb/auth/providers
2. Click **"Google"** provider
3. Paste **Client ID** (from Google Cloud)
4. Paste **Client Secret** (from Google Cloud)
5. Click **"Save"**

---

### Step 4: Update Frontend Code

I'll update the Auth component to add a "Sign in with Google" button.

The button will use Supabase's built-in Google OAuth:

```typescript
const handleGoogleSignIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:5174',
    },
  })

  if (error) {
    console.error('Google sign-in error:', error)
  }
}
```

---

### Step 5: Test Google Sign-In

1. Go to: http://localhost:5174/login
2. Click **"Sign in with Google"** button
3. Choose your Google account
4. Grant permissions
5. Redirected back to app (logged in!) ✅

---

## What Users Will See

### Before (Email Only):

```
┌─────────────────────────┐
│   Email: [________]     │
│   Password: [________]  │
│   [Sign In]             │
└─────────────────────────┘
```

### After (Email + Google):

```
┌─────────────────────────┐
│  [🔵 Sign in with Google] │
│                          │
│  ─────── OR ────────     │
│                          │
│   Email: [________]     │
│   Password: [________]  │
│   [Sign In]             │
└─────────────────────────┘
```

---

## Benefits of Both Options

**Email/Password:**

- ✅ Works without Google account
- ✅ Full control over authentication
- ✅ Works in China (Google is blocked)

**Google OAuth:**

- ✅ One-click login (faster)
- ✅ No password to remember
- ✅ More secure (Google's security)
- ✅ Automatic profile info (name, photo)

---

## For Production (Later)

When deploying to production, you'll need to:

1. **Update Google OAuth settings:**
   - Add production domain to Authorized origins
   - Add production redirect URI

2. **Update Supabase:**
   - Add production URL to allowed redirect URLs

3. **Publish OAuth app:**
   - Submit for Google verification (if needed)
   - Move from "Testing" to "Production"

---

## Quick Start (Easiest Path)

**For now, I recommend:**

1. ✅ **Enable Email provider** first (5 seconds)
   - Click Email → Toggle ON → Save
   - Test signup/login immediately

2. ✅ **Add Google OAuth** later (10 minutes)
   - Follow this guide when ready
   - Adds Google sign-in as bonus feature

---

## Need Help?

I can help you:

- ✅ Set up Google OAuth credentials
- ✅ Add "Sign in with Google" button to UI
- ✅ Configure redirect URLs
- ✅ Test the integration
- ✅ Add other providers (GitHub, Facebook, etc.)

---

**Let me know if you want to enable Email only (quick) or Email + Google (better UX)!** 🚀
