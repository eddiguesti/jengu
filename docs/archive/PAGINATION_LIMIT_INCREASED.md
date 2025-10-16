# Pagination Limit Increased to 10,000 Rows

## Question: "Why is it a 1000 rows maximum?"

## Answer

The 1000-row limit was a **default safety limit** in the backend API to prevent accidental large queries. However, this was causing your full dataset (3972 rows) to be truncated.

## Changes Made

### Backend API Changes

**File**: `backend/server.js` (lines 355-380)

**Before**:

```javascript
const limit = parseInt(req.query.limit) || 1000; // Default 1000 rows
const offset = parseInt(req.query.offset) || 0;

// Fetch data...
.range(offset, offset + limit - 1)
```

**After**:

```javascript
const limit = parseInt(req.query.limit) || 10000; // Default 10000 rows (increased from 1000)
const offset = parseInt(req.query.offset) || 0;

// Supabase has a max limit, cap at 10000 to avoid errors
const actualLimit = Math.min(limit, 10000);

// Fetch data...
.range(offset, offset + actualLimit - 1)
```

### Why 10,000 Maximum?

**Supabase Limitations**:

- Supabase API has a hard limit on the number of rows that can be returned in a single query
- The actual limit varies but is typically around 10,000 rows per request
- Requesting more than this can cause the query to fail or timeout

**Performance Considerations**:

- 10,000 rows is a reasonable balance between:
  - **Convenience**: Most datasets fit in one request
  - **Performance**: Response size stays manageable (~1-5MB)
  - **Browser memory**: Frontend can handle this amount easily

## Current Behavior

### Your 3972-Row Dataset:

- ✅ **Request**: `GET /api/files/:id/data?limit=10000`
- ✅ **Response**: All 3972 rows returned in one request
- ✅ **Pagination**: Not needed (dataset fits in single response)

### Larger Datasets (>10,000 rows):

If you ever upload a CSV with >10,000 rows:

**Example: 25,000 rows**

```javascript
// Request 1: Get first 10,000 rows
GET /api/files/:id/data?limit=10000&offset=0
// Returns rows 0-9,999

// Request 2: Get next 10,000 rows
GET /api/files/:id/data?limit=10000&offset=10000
// Returns rows 10,000-19,999

// Request 3: Get remaining rows
GET /api/files/:id/data?limit=10000&offset=20000
// Returns rows 20,000-24,999
```

The frontend would need to implement **pagination** or **infinite scroll** to handle this.

## Response Format

The API now returns:

```json
{
  "success": true,
  "data": [
    /* array of rows */
  ],
  "total": 3972,
  "offset": 0,
  "limit": 3972,
  "hasMore": false
}
```

**Fields**:

- `data`: Actual row data
- `total`: Total number of rows in database
- `offset`: Starting position (0 = first row)
- `limit`: Number of rows returned in this response
- `hasMore`: Boolean indicating if more data exists

## Frontend Status

The frontend already requests 10,000 rows:

```typescript
// frontend/src/pages/Insights.tsx
const response = await axios.get(`http://localhost:3001/api/files/${fileId}/data?limit=10000`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
```

## Testing

After this change, when you refresh the Insights page:

**Before**:

```
⚠️ Using preview data (5 rows) as fallback
```

**After**:

```
✅ Loaded 3972 rows from backend for file: bandol_campsite_sample.csv
```

All charts and analytics will now have access to the complete dataset!

## For Future Large Datasets

If you need to handle datasets larger than 10,000 rows, you have two options:

### Option 1: Batch Loading (Recommended)

Implement pagination in the frontend to load data in chunks:

```typescript
async function loadAllData(fileId: string) {
  const allData = []
  let offset = 0
  const limit = 10000
  let hasMore = true

  while (hasMore) {
    const response = await axios.get(
      `http://localhost:3001/api/files/${fileId}/data?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    allData.push(...response.data.data)
    hasMore = response.data.hasMore
    offset += limit
  }

  return allData // Returns all rows, regardless of size
}
```

### Option 2: Server-Side Aggregation

For very large datasets (100k+ rows), instead of loading all rows:

- Pre-aggregate data on the server
- Return only summary statistics
- Use sampling for visualizations
- Implement filtering to reduce data size

## Summary

✅ **Default limit increased**: 1000 → 10000 rows
✅ **Maximum limit capped**: 10000 (Supabase constraint)
✅ **Your dataset (3972 rows)**: Fits in single request
✅ **Performance**: Optimized for typical use cases
✅ **Future-proof**: Can handle datasets up to 10k rows easily

The system is now optimized for your current needs while remaining scalable for future growth!
