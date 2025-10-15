# 🔧 Fix Google 404 Error - Complete Guide

## The Error:

**Google 404: The requested URL was not found on this server**

This means Google couldn't find the OAuth configuration. There are a few possible issues.

---

## ✅ Fix #1: Add Your Email as Test User (MOST COMMON)

Since your OAuth app is in "Testing" mode, you MUST add your email as a test user.

### Go to Google Cloud Console:
**URL:** https://console.cloud.google.com/apis/credentials/consent

### Steps:
1. Scroll down to **"Test users"** section
2. Click **"+ ADD USERS"**
3. Enter your email: `restaurantlasavane@campasun.eu` (the one you tried to sign in with)
4. Click **"Save"**
5. Also add: `edd.guest@gmail.com` (if different)

---

## ✅ Fix #2: Verify Redirect URIs in Web Application OAuth Client

### Go to Credentials:
**URL:** https://console.cloud.google.com/apis/credentials

### Find Your WEB APPLICATION Client:
- **NOT** the Desktop client (Jengu)
- Look for the **Web application** client
- Client ID should start with: `2657374221-eq0fi10l38h8rf4cbbo8l1ci5edc9bed...`

### Click on It and Verify These Settings:

**Authorized JavaScript origins:**
```
http://localhost:5174
https://geehtuuyyxhyissplfjb.supabase.co
```

**Authorized redirect URIs:**
```
https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback
```

**IMPORTANT:**
- ✅ Must be `https://` (not `http://`)
- ✅ Must be exact: `https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback`
- ✅ No trailing slash
- ❌ Do NOT use localhost callback URLs (those won't work with Supabase)

Click **"Save"**

---

## ✅ Fix #3: Double-Check Supabase Has Correct Credentials

### Go to Supabase:
**URL:** https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb/auth/providers

### Click "Google" and verify:

**Client IDs:**
```
2657374221-eq0fi10l38h8rf4cbbo8l1ci5edc9bed.apps.googleusercontent.com
```

**Client Secret:**
```
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
```

**Callback URL (for OAuth):** Should show:
```
https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback
```

Click **"Save"** if you made any changes.

---

## ✅ Fix #4: Publishing Status (Check This)

### Go to OAuth Consent Screen:
**URL:** https://console.cloud.google.com/apis/credentials/consent

### Check Publishing Status:

**If it says "Testing":**
- ✅ This is NORMAL for development
- ⚠️ You MUST add test users (see Fix #1 above)
- Only test users can sign in

**If you want anyone to sign in:**
- Click **"PUBLISH APP"**
- This will allow any Google user to sign in
- May require verification for production use

---

## ✅ Fix #5: Wait 5 Minutes

Google can take a few minutes to propagate OAuth changes.

After making changes:
1. Wait 5 minutes
2. Clear your browser cache
3. Try signing in again

---

## Complete Checklist:

### Google Cloud Console - OAuth Consent Screen:
- [ ] App name: "Jengu Dynamic Pricing" (or similar)
- [ ] User support email: Your email
- [ ] Developer contact: Your email
- [ ] Test users added: `restaurantlasavane@campasun.eu` and `edd.guest@gmail.com`
- [ ] Scopes added: `userinfo.email` and `userinfo.profile`

### Google Cloud Console - Credentials (Web Application):
- [ ] Application type: **Web application** (NOT Desktop!)
- [ ] Authorized JavaScript origins:
  - [ ] `http://localhost:5174`
  - [ ] `https://geehtuuyyxhyissplfjb.supabase.co`
- [ ] Authorized redirect URIs:
  - [ ] `https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback`
- [ ] Clicked "Save"

### Supabase Dashboard - Google Provider:
- [ ] Client ID: `2657374221-eq0fi10l38h8rf4cbbo8l1ci5edc9bed.apps.googleusercontent.com`
- [ ] Client Secret: `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`
- [ ] Clicked "Save"

---

## Step-by-Step Test:

1. **Add yourself as test user** in Google Cloud Console
2. **Wait 2-3 minutes**
3. **Clear browser cache** (Ctrl + Shift + Delete)
4. **Go to:** http://localhost:5174/login
5. **Click** "Continue with Google"
6. **Select your Google account:** restaurantlasavane@campasun.eu
7. **It should work!** ✅

---

## If Still Getting 404:

### Check the URL you're being redirected to:

When you click "Continue with Google", look at the URL in the browser. It should look like:

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=2657374221-eq0fi10l38h8rf4cbbo8l1ci5edc9bed...
```

If you see a different `client_id`, that means Supabase has the wrong Client ID.

---

## Alternative: Try Email Authentication Instead

If Google OAuth continues to have issues, you can use email authentication (which is already enabled):

1. Go to: http://localhost:5174/signup
2. Enter your email and password
3. Click "Create Account"
4. Logged in immediately! ✅

Then come back to fix Google OAuth later.

---

## Common Mistakes:

❌ **Using Desktop OAuth client instead of Web application**
- Desktop clients don't have redirect URIs
- Must use Web application type

❌ **Not adding test users**
- If app is in "Testing" mode, ONLY test users can sign in
- Must add your email to test users list

❌ **Wrong redirect URI**
- Must be: `https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback`
- NOT: `http://localhost:5174/auth/callback`

❌ **Using old credentials**
- Make sure Supabase has the NEW web application credentials
- Not the old Desktop credentials

---

## Quick Fix Summary:

**Most likely cause:** You need to add your email as a test user.

**Quick fix:**
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Scroll to "Test users"
3. Click "+ ADD USERS"
4. Add: `restaurantlasavane@campasun.eu`
5. Click "Save"
6. Wait 2 minutes
7. Try signing in again

**That should fix it!** 🚀
