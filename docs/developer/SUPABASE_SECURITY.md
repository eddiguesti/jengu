# Supabase Security Guide

**Purpose**: Quick reference for secure Supabase usage patterns in Jengu. For AI agents and developers.

## Official Documentation References

Use Context7 to fetch Supabase docs before web search:

```
/supabase/supabase - Main Supabase documentation
/supabase/auth-js - Supabase Auth library (client-side)
/supabase/supabase-js - Supabase JavaScript client
```

Key topics to query:

- "Row Level Security" (RLS policies)
- "Service role key security"
- "JWT authentication"
- "Auth getUser"

## Security Model Overview

Jengu uses a **hybrid RLS approach**:

1. **RLS policies exist** on all tables (defense-in-depth)
2. **Backend bypasses RLS** using service role key (for batch operations)
3. **Manual filtering enforced** at application level by `userId`
4. **Frontend never queries database** - all data goes through authenticated API

## Key Configuration

### Backend (`/Users/danny/dev/jengu/backend/lib/supabase.ts`)

```typescript
// TWO clients - use the right one!

// 1. Service role (admin) - BYPASSES RLS
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 2. Anon key - RESPECTS RLS (used only for JWT validation)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

### Frontend (`/Users/danny/dev/jengu/frontend/src/lib/supabase.ts`)

```typescript
// Single client - ONLY for auth, never for database queries
export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
```

### Environment Variables

| Variable               | Location           | Purpose                        | Exposure Risk                |
| ---------------------- | ------------------ | ------------------------------ | ---------------------------- |
| `SUPABASE_SERVICE_KEY` | Backend only       | Admin operations, bypasses RLS | **NEVER expose to frontend** |
| `SUPABASE_ANON_KEY`    | Backend + Frontend | Auth validation, respects RLS  | Safe to expose               |
| `SUPABASE_URL`         | Backend + Frontend | Database endpoint              | Safe to expose               |

## Critical Security Pattern: Manual userId Filtering

**Every backend database query MUST filter by userId**:

```typescript
// ✅ CORRECT - Filtered by userId
const { data } = await supabaseAdmin.from('properties').select('*').eq('userId', req.userId) // REQUIRED!

// ❌ WRONG - Missing userId filter (security vulnerability!)
const { data } = await supabaseAdmin.from('properties').select('*')
```

### Why Manual Filtering?

Backend uses `supabaseAdmin` (service role) which **bypasses RLS**. This allows:

- Batch inserts (1000 rows at a time)
- Background jobs (enrichment, analytics)
- Admin operations

**YOU must ensure authorization** by filtering on `userId`.

## Authentication Flow

### Backend Middleware

```typescript
// All protected routes must use authenticateUser middleware
import { authenticateUser } from './lib/supabase.js'

app.post('/api/protected-route', authenticateUser, async (req, res) => {
  const userId = req.userId // Available after middleware

  // ALWAYS filter by userId in queries
  const { data } = await supabaseAdmin.from('table').select('*').eq('userId', userId)
})
```

**What the middleware does**:

1. Extracts JWT from `Authorization: Bearer <token>` header
2. Validates token using `supabase.auth.getUser(jwt)` (anon key client)
3. Sets `req.userId` from validated token
4. Returns 401 if invalid/missing token

### Frontend Auth

```typescript
// AuthContext manages session state
import { useAuth } from '@/contexts/AuthContext'

// Axios client auto-attaches JWT
import { apiClient } from '@/lib/api/client'

// All API calls automatically include Authorization header
const response = await apiClient.get('/api/protected-route')
```

## Common Database Operations

### Reading User Data

```typescript
// Single user's data
const { data: properties } = await supabaseAdmin.from('properties').select('*').eq('userId', userId)

// Data with ownership verification
const { data: property } = await supabaseAdmin
  .from('properties')
  .select('id, name')
  .eq('id', propertyId)
  .eq('userId', userId) // Verify ownership
  .single()

if (!property) {
  return res.status(403).json({ error: 'Forbidden' })
}
```

### Creating User Data

```typescript
// Always include userId when inserting
const { data, error } = await supabaseAdmin
  .from('properties')
  .insert({
    userId: req.userId, // REQUIRED
    name: 'Property Name',
    // ... other fields
  })
  .select()
  .single()
```

### Updating User Data

```typescript
// Two-step: verify ownership, then update
const { data: existing } = await supabaseAdmin
  .from('properties')
  .select('id')
  .eq('id', propertyId)
  .eq('userId', userId)
  .single()

if (!existing) {
  return res.status(403).json({ error: 'Forbidden' })
}

const { data, error } = await supabaseAdmin
  .from('properties')
  .update({ name: newName })
  .eq('id', propertyId)
  .eq('userId', userId) // Belt and suspenders
```

### Deleting User Data

```typescript
// Always filter by userId
const { error } = await supabaseAdmin
  .from('properties')
  .delete()
  .eq('id', propertyId)
  .eq('userId', userId)
```

## Batch Operations

### Batch Inserts (CSV Upload Pattern)

```typescript
const batchSize = 1000
for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, i + batchSize)

  const { error } = await supabaseAdmin.from('pricing_data').insert(batch)

  if (error) throw error
}
```

### Batch Updates (Enrichment Pattern)

```typescript
const updateBatchSize = 100
for (let i = 0; i < updates.length; i += updateBatchSize) {
  const batch = updates.slice(i, i + updateBatchSize)

  for (const record of batch) {
    await supabaseAdmin
      .from('pricing_data')
      .update(record)
      .eq('id', record.id)
      .eq('propertyId', propertyId) // Ownership implicit via propertyId
  }
}
```

**Note**: For enrichment, ownership is verified once at property level. Each pricing record belongs to a property owned by the user.

## Column Name Inconsistency Warning

**IMPORTANT**: Column naming is inconsistent across tables:

```typescript
// Most tables use camelCase
.eq('userId', userId)

// business_settings uses lowercase
.eq('userid', userId)  // Note: lowercase 'userid'
```

Always check table schema before writing queries.

## RLS Policies (Database Level)

All tables have RLS enabled with policies like:

```sql
-- Example: properties table
CREATE POLICY "Users can view own properties" ON properties
  FOR SELECT USING (auth.uid() = "userId");

-- Example: pricing_data (via join)
CREATE POLICY "Users can view own pricing data" ON pricing_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = pricing_data."propertyId"
      AND properties."userId" = auth.uid()
    )
  );
```

**These policies are a safety net**. Backend bypasses them but they prevent accidents.

## Common Vulnerabilities to Avoid

### 1. Missing userId Filter

```typescript
// ❌ VULNERABILITY - Returns all users' data
app.get('/api/files', authenticateUser, async (req, res) => {
  const { data } = await supabaseAdmin.from('properties').select('*')
  // Missing .eq('userId', req.userId)
})
```

### 2. Trusting Client-Provided IDs

```typescript
// ❌ VULNERABILITY - User could provide another user's ID
app.get('/api/files/:fileId', authenticateUser, async (req, res) => {
  const { fileId } = req.params

  const { data } = await supabaseAdmin.from('properties').select('*').eq('id', fileId)
  // Missing .eq('userId', req.userId)
})
```

### 3. Insufficient Ownership Verification

```typescript
// ❌ RISKY - Deletes pricing data without verifying property ownership
app.delete('/api/pricing/:id', authenticateUser, async (req, res) => {
  await supabaseAdmin.from('pricing_data').delete().eq('id', req.params.id)
  // Should verify pricing_data.propertyId belongs to req.userId
})
```

### 4. Frontend Database Queries

```typescript
// ❌ NEVER DO THIS in frontend
import { supabase } from '@/lib/supabase'

const { data } = await supabase.from('properties').select('*').eq('userId', user.id) // Even with filter, don't query from frontend!
```

**Always** go through authenticated backend API.

## Checklist for New Endpoints

When creating new backend endpoints:

- [ ] Add `authenticateUser` middleware to route
- [ ] Extract `userId` from `req.userId`
- [ ] Use `supabaseAdmin` for database queries
- [ ] **Filter ALL queries by `.eq('userId', userId)`**
- [ ] Verify ownership before mutations (update/delete)
- [ ] Return 403 Forbidden if ownership check fails
- [ ] Return 401 Unauthorized if auth fails
- [ ] Test with different users to verify isolation

## Testing Security

### Manual Tests

```bash
# Test 1: Access without token (should 401)
curl http://localhost:3001/api/files

# Test 2: Access with invalid token (should 401)
curl -H "Authorization: Bearer invalid-token" http://localhost:3001/api/files

# Test 3: Access with valid token (should 200)
curl -H "Authorization: Bearer <valid-jwt>" http://localhost:3001/api/files

# Test 4: Try accessing another user's resource (should 403 or empty)
curl -H "Authorization: Bearer <user1-jwt>" \
  http://localhost:3001/api/files/<user2-file-id>
```

### Integration Tests (Recommended)

```typescript
// Test that users cannot access each other's data
describe('Authorization', () => {
  it('should not allow user1 to access user2 data', async () => {
    const user1Token = await loginUser('user1@example.com')
    const user2FileId = await createFileAsUser2()

    const response = await request(app)
      .get(`/api/files/${user2FileId}`)
      .set('Authorization', `Bearer ${user1Token}`)

    expect(response.status).toBe(403)
  })
})
```

## Emergency: Finding Missing userId Filters

If you suspect missing filters, grep the codebase:

```bash
# Find all supabaseAdmin queries
grep -r "supabaseAdmin.from" backend/

# Look for queries without .eq('userId'
# Manual review needed - not all queries require userId filter
# (e.g., weather API calls, holiday lookups)
```

## Quick Reference

| Action               | Required Pattern                                       |
| -------------------- | ------------------------------------------------------ |
| **Read user data**   | `.eq('userId', userId)`                                |
| **Create user data** | Include `userId: req.userId` in insert                 |
| **Update user data** | Verify ownership first, then update with userId filter |
| **Delete user data** | Verify ownership first, then delete with userId filter |
| **Frontend auth**    | Use `useAuth()` hook, never query database directly    |
| **Backend auth**     | Use `authenticateUser` middleware, access `req.userId` |

## Additional Resources

- `backend/server.ts` - See existing route handlers for patterns
- `backend/lib/supabase.ts` - Client initialization and middleware
- `docs/developer/ARCHITECTURE.md` - Full system architecture
- Supabase Dashboard - View actual RLS policies and test queries

---

## httpOnly Cookie Authentication (Task2 - 2025-10-23)

### Overview

Jengu now uses **httpOnly cookies** for authentication, replacing localStorage token storage for enhanced security.

#### Security Benefits

1. **XSS Protection**: Tokens stored in httpOnly cookies cannot be accessed by JavaScript
2. **CSRF Protection**: SameSite cookie attributes prevent cross-site request forgery
3. **Refresh Token Rotation**: Each refresh generates a new refresh token, preventing replay attacks
4. **Structured Logging**: Request IDs enable request tracking across logs for debugging and security auditing

### Cookie Configuration

**Access Token** (short-lived, 15 minutes):

```javascript
{
  httpOnly: true,              // Not accessible via JavaScript
  secure: true,                // HTTPS only in production
  sameSite: 'lax',            // CSRF protection (allows top-level navigation)
  path: '/',
  maxAge: 15 * 60 * 1000      // 15 minutes
}
```

**Refresh Token** (long-lived, 7 days):

```javascript
{
  httpOnly: true,
  secure: true,
  sameSite: 'strict',         // Stricter CSRF protection
  path: '/api/auth',          // Limited scope to auth endpoints only
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}
```

### Auth Endpoints

#### POST /api/auth/login

Authenticates user and sets httpOnly cookies.

**Request**:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (cookies set automatically):

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "authenticated"
  },
  "session": {
    "expires_at": "2025-10-24T00:00:00Z"
  }
}
```

**Cookies Set**:

- `access_token=<jwt>` (HttpOnly, SameSite=Lax, 15min)
- `refresh_token=<refresh>` (HttpOnly, SameSite=Strict, 7 days, path=/api/auth)

#### POST /api/auth/refresh

Refreshes access token using refresh token with **rotation**.

**Request**: No body (refresh token from cookie)

**Response**:

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com"
  },
  "session": {
    "expires_at": "2025-10-24T00:15:00Z"
  }
}
```

**Cookies Set** (new tokens):

- `access_token=<new-jwt>` (HttpOnly, 15min)
- `refresh_token=<new-refresh>` (HttpOnly, **rotated**, 7 days)

**Important**: The old refresh token is invalidated. Replaying it will fail with 401.

#### POST /api/auth/logout

Clears all auth cookies and signs out.

**Request**: No body

**Response**:

```json
{
  "message": "Logged out successfully"
}
```

**Cookies Cleared**:

- `access_token` (Expires=Thu, 01 Jan 1970)
- `refresh_token` (Expires=Thu, 01 Jan 1970)

#### GET /api/auth/me

Returns current authenticated user from cookie.

**Request**: No body (access token from cookie)

**Response**:

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "authenticated"
  }
}
```

**Returns 401** if no token or invalid token.

### Request ID Middleware

Every request now includes a unique request ID for tracking.

**Request Object Extensions**:

```typescript
req.id // UUID v4 request ID
req.startTime // Timestamp when request started
req.userId // User ID (after authenticateUser middleware)
```

**Response Headers**:

```
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

**Structured Logs**:

```json
{
  "reqId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "method": "POST",
  "path": "/api/files/upload",
  "status": 200,
  "latencyMs": 1234,
  "message": "Request completed"
}
```

### Frontend Integration

#### Axios Configuration

```typescript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true, // REQUIRED: Send cookies with requests
})

// Auto-refresh on 401
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Refresh token (cookies updated automatically)
        await apiClient.post('/api/auth/refresh')

        // Retry original request with new token
        return apiClient.request(originalRequest)
      } catch (refreshError) {
        // Refresh failed - redirect to login
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)
```

#### Auth Context Updates

```typescript
// Login
const login = async (email: string, password: string) => {
  const response = await apiClient.post('/api/auth/login', { email, password })
  setUser(response.data.user)
  // Tokens are in cookies - no localStorage needed
}

// Logout
const logout = async () => {
  await apiClient.post('/api/auth/logout')
  setUser(null)
  // Cookies cleared automatically
}

// Check auth status
const checkAuth = async () => {
  try {
    const response = await apiClient.get('/api/auth/me')
    setUser(response.data.user)
  } catch (error) {
    setUser(null)
  }
}
```

### Backend Middleware Updates

The `authenticateUser` middleware now supports both cookies and headers:

```typescript
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  // Check for token in cookies first (new httpOnly cookie auth)
  const cookieToken = req.cookies?.access_token
  // Fall back to authorization header (legacy support)
  const headerToken = req.headers.authorization

  const token = cookieToken ? `Bearer ${cookieToken}` : headerToken

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No authorization token provided',
    })
    return
  }

  // Validate and set req.userId...
}
```

### Testing httpOnly Cookies

#### XSS Protection Test

```javascript
// In browser console, this should NOT work:
console.log(document.cookie) // Should NOT contain access_token or refresh_token

// httpOnly cookies are not accessible to JavaScript
```

#### CSRF Protection Test

```bash
# Cross-site requests should be blocked by SameSite attribute
curl -X POST http://localhost:3001/api/auth/refresh \
  --cookie "refresh_token=stolen-token" \
  --header "Origin: https://evil.com"
# Should fail due to SameSite=Strict
```

#### Refresh Token Rotation Test

```bash
# 1. Login and capture refresh token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 2. Refresh once (gets new refresh token)
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt \
  -c cookies2.txt

# 3. Try to use old refresh token (should fail with 401)
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt
# Should return 401 - old refresh token is invalidated
```

### Migration from localStorage

**Old Pattern** (Insecure):

```typescript
// DON'T DO THIS ANYMORE
localStorage.setItem('access_token', token)
const token = localStorage.getItem('access_token')
```

**New Pattern** (Secure):

```typescript
// Tokens are in httpOnly cookies - no localStorage needed
// Just make sure withCredentials: true in axios config
await apiClient.post('/api/auth/login', { email, password })
```

### Troubleshooting

#### Cookies Not Being Set

**Problem**: Login succeeds but cookies aren't set.

**Solution**: Ensure `withCredentials: true` in axios config:

```typescript
axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true, // REQUIRED
})
```

#### 401 on All Requests After Login

**Problem**: Backend returns 401 even after successful login.

**Solution**: Check that cookies are being sent:

```typescript
// In browser DevTools Network tab:
// Request Headers should include:
Cookie: access_token=...; refresh_token=...
```

#### CORS Errors with Cookies

**Problem**: CORS errors when sending credentials.

**Solution**: Backend must allow credentials in CORS config:

```typescript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // REQUIRED
  })
)
```

---

**Remember**: With great power (service role key) comes great responsibility (manual filtering)!
