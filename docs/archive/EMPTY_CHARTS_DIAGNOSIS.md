# Empty Charts - Complete Diagnosis & Solution

## Current Status

Charts are showing as empty because the frontend is using **fallback preview data (5 rows)** instead of loading the full dataset (3972 rows) from the database.

## Root Cause Analysis

### Evidence from Browser Console:
```
❌ Error loading data from backend: Request failed with status code 401
⚠️ Using preview data (5 rows) as fallback
```

### Evidence from Backend Logs:
```
📊 Analytics Summary Request: Received 5 rows
'Dataset is small (5 rows). Recommend at least 30 rows for reliable analytics.'
'No weather data found. Weather-based insights will not be available.'
```

### The Problem Chain:

1. Frontend tries to fetch data: `GET /api/files/:fileId/data?limit=10000`
2. **Still getting 401 Unauthorized** (even after auth fix)
3. Frontend catches error and falls back to preview data (5 rows)
4. Analytics receives only 5 rows
5. Charts can't render meaningful data

## Possible Causes

### Cause 1: Token Expired or Invalid
**Symptoms**: 401 error even with Authorization header
**Solution**: Sign out and sign back in to get fresh token

### Cause 2: File ID Mismatch
**Symptoms**: 404 or 401 error
**Solution**: Verify file ID in `uploadedFiles` matches database

### Cause 3: RLS (Row Level Security) Policy
**Symptoms**: 401 or empty data
**Solution**: Check Supabase RLS policies on `pricing_data` table

### Cause 4: Wrong User ID
**Symptoms**: Data exists but not returned
**Solution**: Verify token's user ID matches file's user ID

## Diagnostic Steps

### Step 1: Check Browser Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Refresh Insights page
4. Find request to `/api/files/[id]/data?limit=10000`
5. Check:
   - **Request Headers**: Is `Authorization: Bearer [token]` present?
   - **Response**: What's the actual error message?
   - **Status Code**: 401 (auth), 404 (not found), or 500 (server error)?

### Step 2: Check Current Token

Open browser console and run:
```javascript
// Check if token exists
const token = await window.supabase.auth.getSession()
console.log('Token:', token.data.session?.access_token)

// Check user ID
console.log('User ID:', token.data.session?.user?.id)
```

### Step 3: Verify Data in Database

Go to Supabase Dashboard → SQL Editor and run:
```sql
-- Check if data exists
SELECT COUNT(*) FROM pricing_data;

-- Check specific property
SELECT COUNT(*) FROM pricing_data
WHERE "propertyId" = '084e0eac-2f89-4b7f-a155-4e9a0770ccad';

-- Check if user owns this property
SELECT * FROM properties
WHERE id = '084e0eac-2f89-4b7f-a155-4e9a0770ccad';
```

### Step 4: Test API Endpoint Directly

Use curl or Postman to test:
```bash
# Get your token from browser (see Step 2)
TOKEN="your-token-here"

# Test endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/files/084e0eac-2f89-4b7f-a155-4e9a0770ccad/data?limit=100"
```

Expected response:
```json
{
  "success": true,
  "data": [...], // Array of rows
  "total": 3972,
  "offset": 0,
  "limit": 100
}
```

## Solutions

### Solution A: Refresh Authentication

**Simplest fix - try this first**:

1. Go to Settings page
2. Click your profile (top right)
3. Sign out
4. Sign back in with same email
5. Navigate to Insights page
6. Charts should now load

### Solution B: Clear localStorage and Re-login

If Solution A doesn't work:

1. Open Developer Tools (F12)
2. Go to Application tab → Local Storage
3. Clear all items for `http://localhost:5174`
4. Refresh page
5. Sign in again
6. Upload CSV again
7. Check Insights

### Solution C: Fix RLS Policies

If data exists but isn't returned:

Go to Supabase Dashboard → Authentication → Policies

**For `pricing_data` table**:
```sql
-- Enable RLS
ALTER TABLE pricing_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own data
CREATE POLICY "Users can view own pricing data"
ON pricing_data FOR SELECT
USING (
  "propertyId" IN (
    SELECT id FROM properties WHERE "userId" = auth.uid()
  )
);
```

**For `properties` table**:
```sql
-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view own properties"
ON properties FOR SELECT
USING ("userId" = auth.uid());
```

### Solution D: Manual Data Fetch Test

Add this to Insights.tsx temporarily to debug:

```typescript
// Add this inside the Insights component
useEffect(() => {
  const debugDataFetch = async () => {
    try {
      const token = await getAccessToken();
      console.log('🔑 Token:', token ? 'EXISTS' : 'MISSING');

      if (!uploadedFiles || uploadedFiles.length === 0) {
        console.log('📁 No files uploaded');
        return;
      }

      const fileId = uploadedFiles[0].id;
      console.log('📄 File ID:', fileId);

      const response = await axios.get(
        `http://localhost:3001/api/files/${fileId}/data?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('✅ API Response:', {
        success: response.data.success,
        total: response.data.total,
        returned: response.data.data?.length,
        firstRow: response.data.data?.[0]
      });
    } catch (error) {
      console.error('❌ Debug fetch error:', error.response?.status, error.response?.data);
    }
  };

  debugDataFetch();
}, [uploadedFiles]);
```

This will log exactly what's happening.

## Expected Flow (When Working)

```
1. User logs in → Gets JWT token
2. Token stored in localStorage/session
3. User uploads CSV → 3972 rows saved to pricing_data table
4. User navigates to Insights
5. Frontend calls getAccessToken() → Returns valid token
6. Frontend requests: GET /api/files/:id/data?limit=10000
   Headers: { Authorization: "Bearer [token]" }
7. Backend verifies token → Checks user owns file
8. Backend returns: { success: true, data: [3972 rows], total: 3972 }
9. Frontend passes all 3972 rows to analytics
10. Charts render with full dataset
```

## Current Flow (Broken)

```
1. User logs in → Gets JWT token
2. Token stored in localStorage/session
3. User uploads CSV → 3972 rows saved to pricing_data table
4. User navigates to Insights
5. Frontend calls getAccessToken() → Returns token (maybe expired?)
6. Frontend requests: GET /api/files/:id/data?limit=10000
   Headers: { Authorization: "Bearer [token]" }
7. ❌ Backend returns 401 Unauthorized
8. Frontend catches error → Falls back to preview data (5 rows)
9. Frontend passes only 5 rows to analytics
10. ❌ Charts are empty (insufficient data)
```

## Quick Fix Steps

**Do this right now**:

1. **Sign out and sign back in** (refresh token)
2. **Go to Data page** - verify you see your uploaded file
3. **Click on the file** - check if you can see the preview
4. **Go to Insights page** - check browser console for errors
5. **Open Network tab** - check the `/api/files/:id/data` request
6. **Copy the response** - paste it here so I can see what's happening

## If Charts Are Still Empty After Sign Out/In

Please provide:
1. Browser console logs (full output)
2. Network tab screenshot showing the failed request
3. Response body from the failed request
4. Your Supabase project URL (from Settings page)

I'll create a targeted fix once I see the exact error.

## Summary

**The issue is**: Frontend is getting 401 error when fetching data, so it falls back to 5-row preview data instead of loading all 3972 rows from database.

**The fix is**: Likely just need to refresh authentication (sign out/in), but might need to check RLS policies or token expiration settings.

**Next step**: Sign out, sign back in, and check if charts load. If not, send me the browser console and network tab details.
