# 🔧 Fix Google OAuth Redirect URI Mismatch Error

## The Error You're Seeing:

```
Access blocked: Jengu Dynamic's request is invalid
Error 400: redirect_uri_mismatch
```

## What This Means:

Google is blocking the sign-in because the **redirect URL** in your Google Cloud Console doesn't match the **redirect URL** that Supabase is using.

---

## Quick Fix - Update Google Cloud Console

### Step 1: Go to Google Cloud Console

**URL:** https://console.cloud.google.com/apis/credentials

### Step 2: Find Your OAuth Client

1. You should see your OAuth 2.0 Client ID:
   - Name: Something like "Web client" or "Jengu Web Client"
   - Client ID: `2657374221-sc4p014khvt11cfnaq0bshcv7prq82tv.apps.googleusercontent.com`

2. **Click on it** to edit

### Step 3: Add the Correct Redirect URI

Scroll down to **"Authorized redirect URIs"** section.

**Add this EXACT URL:**

```
https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback
```

**Important Notes:**

- ✅ Use `https://` (not `http://`)
- ✅ Must end with `/auth/v1/callback`
- ✅ No trailing slash after `callback`
- ✅ Copy it exactly as shown above

### Step 4: Remove Any Incorrect URLs

If you see any of these, **DELETE THEM**:

- ❌ `http://localhost:5174/auth/callback` (wrong - this is for local testing, not needed)
- ❌ `http://localhost:5173/auth/callback` (wrong)
- ❌ Any URL without `supabase.co` (wrong)

**Keep ONLY:**

- ✅ `https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback`

### Step 5: Save

Click **"Save"** at the bottom of the page.

---

## Visual Guide

Your "Authorized redirect URIs" section should look like this:

```
Authorized redirect URIs
┌────────────────────────────────────────────────────────────────┐
│ https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback  [X]│
├────────────────────────────────────────────────────────────────┤
│ + ADD URI                                                       │
└────────────────────────────────────────────────────────────────┘
```

---

## Also Check: Authorized JavaScript Origins (Optional)

While you're there, also check **"Authorized JavaScript origins"**.

**Add these URLs:**

```
http://localhost:5174
https://geehtuuyyxhyissplfjb.supabase.co
```

This tells Google where your app is hosted.

---

## After Saving

### Wait 1-2 Minutes

Google takes a minute or two to update the settings.

### Test Again

1. Go to: http://localhost:5174/login
2. Click **"Continue with Google"**
3. It should work now! ✅

---

## If It Still Doesn't Work

### Double-Check Your Supabase Settings

1. Go to: https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb/auth/providers
2. Click **"Google"**
3. Verify:
   - **Client ID:** `2657374221-sc4p014khvt11cfnaq0bshcv7prq82tv.apps.googleusercontent.com`
   - **Client Secret:** `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`
   - **Callback URL (for OAuth):** Should show `https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback`

### Check Google Cloud Console Again

Make sure you're editing the **correct** OAuth client:

- The one with Client ID: `2657374221-sc4p014khvt11cfnaq0bshcv7prq82tv.apps.googleusercontent.com`
- Not a different OAuth client (if you have multiple)

---

## Common Mistakes

### ❌ Wrong Redirect URI:

```
http://localhost:5174/auth/callback  ← WRONG (localhost)
http://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback  ← WRONG (http instead of https)
https://geehtuuyyxhyissplfjb.supabase.co/auth/callback  ← WRONG (missing /v1/)
https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback/  ← WRONG (trailing slash)
```

### ✅ Correct Redirect URI:

```
https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback
```

---

## Complete Google Cloud Console Settings

Here's what your OAuth client should look like:

### Application type:

```
Web application
```

### Name:

```
Jengu Web Client (or whatever you named it)
```

### Authorized JavaScript origins:

```
http://localhost:5174
https://geehtuuyyxhyissplfjb.supabase.co
```

### Authorized redirect URIs:

```
https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback
```

---

## Quick Copy-Paste

**For Authorized redirect URIs, add this EXACT URL:**

```
https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback
```

**For Authorized JavaScript origins, add these:**

```
http://localhost:5174
https://geehtuuyyxhyissplfjb.supabase.co
```

---

## Step-by-Step Summary

1. ✅ Go to: https://console.cloud.google.com/apis/credentials
2. ✅ Click on your OAuth client (2657374221-...)
3. ✅ Add redirect URI: `https://geehtuuyyxhyissplfjb.supabase.co/auth/v1/callback`
4. ✅ Add JavaScript origins: `http://localhost:5174` and `https://geehtuuyyxhyissplfjb.supabase.co`
5. ✅ Click "Save"
6. ✅ Wait 1-2 minutes
7. ✅ Test again: http://localhost:5174/login

---

**After you fix this, Google sign-in will work perfectly!** 🚀
