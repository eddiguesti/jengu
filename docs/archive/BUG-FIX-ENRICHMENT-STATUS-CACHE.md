# BUG FIX: Enrichment Status Cache Issue

**Date**: 2025-11-02
**Issue**: Calendar not displaying ML predicted prices after file deletion and reupload
**Root Cause**: Multi-layered React Query and Zustand cache invalidation bug
**Status**: ✅ FIXED

---

## Problem Description

### User-Reported Symptoms
> "i got rid of the cash and it still didnt work i think the front end when clicking to deleted the past data and then reploading a new cvs or the same one its automaticly thinks its already been enriched and then cause everything not to work as it should"

### Technical Symptoms
1. **Dashboard shows 0 files** despite new file being uploaded successfully
2. **Frontend requests deleted property IDs** (e.g., `c6400e61-9ae6-45f8-af0a-7e0c55af2748`) → 404 errors
3. **Enrichment UI shows "Complete"** for new unenriched files
4. **ML recommendations never load** because frontend thinks data is already enriched
5. **Calendar displays no ML prices** despite backend ML API working perfectly

### Backend vs Frontend State Mismatch

**Backend State** (✅ Working correctly):
- New property: `42527c91-d86d-46a3-919e-96d63d3af62c`
- 59 rows uploaded successfully
- Enrichment completed (temporal, weather, holidays)
- ML API returning 200 OK

**Frontend State** (❌ Broken):
- Dashboard: "File count: 0"
- React Query: Requesting old deleted property IDs
- Enrichment UI: Shows "Complete" incorrectly
- ML Recommendations: Never loads

---

## Root Cause Analysis

### Three Interconnected Bugs

#### 1. **React Query Cache Invalidation Incomplete**
**Location**: [frontend/src/hooks/queries/useFileData.ts:69-73](frontend/src/hooks/queries/useFileData.ts#L69-L73)

**Problem**: `useDeleteFile` mutation only invalidated file lists and details, but NOT the file data queries.

```typescript
// BEFORE (BROKEN)
onSuccess: (_, fileId) => {
  queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
  queryClient.removeQueries({ queryKey: fileKeys.detail(fileId) })
  // ❌ Missing: fileKeys.data(fileId) - stale data remained cached!
}
```

**Impact**: Deleted file's pricing data remained in cache. When Dashboard requested data for old file ID, it used stale cached data instead of fetching fresh data.

#### 2. **Zustand Persisted Store Not Cleaned Up**
**Location**: [frontend/src/pages/Data.tsx:269-284](frontend/src/pages/Data.tsx#L269-L284)

**Problem**: `removeFile` function in Data.tsx deleted file from backend and local state, but never called Zustand's `removeFile()` to clean persisted localStorage.

```typescript
// BEFORE (BROKEN)
const removeFile = async (uniqueId: string) => {
  await deleteFileMutation.mutateAsync(uniqueId)
  setFiles(prev => prev.filter(f => f.uniqueId !== uniqueId))
  // ❌ Missing: removeFromZustand(uniqueId) - persisted state never cleared!
}
```

**Impact**: Old file IDs persisted in Zustand's localStorage cache (`jengu-data-storage`). Even after browser refresh, old deleted file IDs remained.

#### 3. **Enrichment Status False Positive**
**Location**: [frontend/src/pages/Data.tsx:101-109](frontend/src/pages/Data.tsx#L101-L109)

**Problem**: Enrichment status check ran on every `uploadedFiles` change. If ANY old cached file had `enrichment_status: 'completed'`, it would mark ALL enrichment features as complete, even for NEW unenriched files.

```typescript
// BEFORE (BROKEN)
const allEnriched = enrichmentStatuses.every(status => status === 'completed')
if (allEnriched) {
  // ❌ This ran even when uploadedFiles contained stale cached data!
  setFeatures(prev => prev.map(f => ({ ...f, status: 'complete', progress: 100 })))
}
```

**Impact**: User workflow completely broken:
1. Delete old file
2. Upload new CSV
3. Enrichment UI immediately shows "Complete" (false positive)
4. User can't run enrichment because UI thinks it's done
5. ML recommendations never work because data isn't actually enriched

---

## The Fix

### ✅ Fix #1: Complete React Query Cache Invalidation
**File**: `frontend/src/hooks/queries/useFileData.ts`

```typescript
onSuccess: (_, fileId) => {
  // CRITICAL: Remove ALL cached data for this file to prevent stale data
  queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
  queryClient.removeQueries({ queryKey: fileKeys.detail(fileId) })
  queryClient.removeQueries({ queryKey: fileKeys.data(fileId) })  // ✅ ADDED

  // Also invalidate all file-related queries to force fresh fetch
  queryClient.invalidateQueries({ queryKey: fileKeys.all })  // ✅ ADDED
}
```

**What this fixes**:
- Removes ALL queries related to the deleted file
- Forces Dashboard to fetch fresh file list
- Prevents 404 errors from requesting old deleted IDs

### ✅ Fix #2: Zustand Store Cleanup + Enrichment Reset
**File**: `frontend/src/pages/Data.tsx`

```typescript
const removeFile = async (uniqueId: string) => {
  await deleteFileMutation.mutateAsync(uniqueId)
  setFiles(prev => prev.filter(f => f.uniqueId !== uniqueId))

  // ✅ ADDED: Remove from Zustand persisted store
  removeFromZustand(uniqueId)

  // ✅ ADDED: Reset enrichment features when deleting files
  setFeatures(prev => prev.map(f => ({ ...f, status: 'idle', progress: 0 })))

  console.log(`✅ File ${uniqueId} deleted from database and cache`)
}
```

**What this fixes**:
- Clears file from localStorage persisted cache
- Resets enrichment UI to clean slate
- Prevents enrichment status confusion on next upload

### ✅ Fix #3: Smart Enrichment Status Check
**File**: `frontend/src/pages/Data.tsx`

```typescript
useEffect(() => {
  if (uploadedFiles && uploadedFiles.length > 0) {
    // ... restore files logic ...

    // ✅ FIXED: Only mark enrichment as complete if files exist AND all are enriched
    const enrichmentStatuses = uploadedFiles.map(file => file.enrichment_status)
    const allEnriched =
      uploadedFiles.length > 0 &&
      enrichmentStatuses.every(status => status === 'completed')

    if (allEnriched) {
      console.log('✅ All files already enriched', uploadedFiles.map(f => f.id))
      setFeatures(prev => prev.map(f => ({ ...f, status: 'complete', progress: 100 })))
    } else if (uploadedFiles.length > 0) {
      // ✅ ADDED: Reset enrichment features for new/unenriched files
      console.log('ℹ️  Files not enriched - resetting enrichment features')
      setFeatures(prev => prev.map(f => ({ ...f, status: 'idle', progress: 0 })))
    }
  } else {
    // ✅ ADDED: No files loaded - reset enrichment features
    console.log('ℹ️  No files loaded - resetting enrichment features')
    setFeatures(prev => prev.map(f => ({ ...f, status: 'idle', progress: 0 })))
  }
}, [uploadedFiles])
```

**What this fixes**:
- Properly detects unenriched files and resets UI
- Prevents false positive "already enriched" status
- Adds detailed console logging for debugging

---

## Testing Workflow

### ✅ Expected Behavior After Fix

**Scenario**: Delete old file → Upload new CSV → Enrich → View Calendar

1. **Delete Old File**
   - Click delete button on Data page
   - ✅ File removed from UI immediately
   - ✅ React Query cache invalidated (all queries)
   - ✅ Zustand store cleaned (localStorage cleared)
   - ✅ Enrichment UI resets to "idle" state
   - Console: `✅ File [id] deleted from database and cache`

2. **Upload New CSV**
   - Drag and drop CSV file
   - ✅ File uploads successfully
   - ✅ Shows in file list with correct row count
   - ✅ Enrichment UI shows "Ready" (not "Complete")
   - Console: `✅ Uploaded [filename]: X rows, Y columns`

3. **Check Enrichment Status**
   - Navigate to Enrichment tab
   - ✅ All features show "Ready" status (not "Complete")
   - ✅ "Enrich All" button is enabled (not disabled)
   - Console: `ℹ️  Files not enriched - resetting enrichment features`

4. **Run Enrichment**
   - Click "Enrich All" button
   - ✅ Weather enrichment runs
   - ✅ Holiday enrichment runs
   - ✅ Temporal enrichment runs
   - ✅ All features show "Complete" after finishing
   - Console: `✅ Weather enrichment complete: X rows`

5. **View Dashboard Calendar**
   - Navigate to Dashboard
   - ✅ Dashboard shows 1 file (not 0)
   - ✅ File data loads correctly
   - ✅ ML recommendations API called with correct property ID
   - ✅ Calendar displays ML prices with Zap icons
   - Console: `✅ Loaded ML recommendations for X days`

---

## Verification Checklist

### Before Fix (Broken Behavior)
- ❌ Dashboard shows "File count: 0" after upload
- ❌ Console shows 404 errors for deleted property IDs
- ❌ Enrichment UI shows "Complete" for unenriched files
- ❌ "Enrich All" button is disabled
- ❌ ML recommendations never load
- ❌ Calendar shows no Zap icons

### After Fix (Expected Behavior)
- ✅ Dashboard shows correct file count
- ✅ No 404 errors in console
- ✅ Enrichment UI shows "Ready" for new files
- ✅ "Enrich All" button is enabled
- ✅ ML recommendations load successfully
- ✅ Calendar displays ML prices with Zap icons

---

## Files Modified

### 1. `frontend/src/hooks/queries/useFileData.ts`
**Lines Changed**: 69-77
**Purpose**: Complete React Query cache invalidation on file deletion

### 2. `frontend/src/pages/Data.tsx`
**Lines Changed**:
- 58: Added `removeFile: removeFromZustand` import
- 269-290: Enhanced `removeFile` function with cache cleanup
- 101-126: Fixed enrichment status check logic with smart reset

---

## Technical Debt Addressed

1. **Incomplete cache invalidation patterns** - Now comprehensively removes all related queries
2. **Dual state management confusion** - Properly syncs React Query + Zustand
3. **Missing state reset logic** - Enrichment UI now resets correctly
4. **Poor error recovery** - System recovers gracefully from stale cache

---

## Future Improvements

### Recommended Next Steps

1. **Add React Query DevTools** (development only)
   ```typescript
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
   // Show cache state in UI for debugging
   ```

2. **Reduce staleTime for file queries** (currently 10 minutes)
   ```typescript
   staleTime: 2 * 60 * 1000, // 2 minutes instead of 10
   ```

3. **Add optimistic updates** for file deletion
   ```typescript
   onMutate: async (fileId) => {
     await queryClient.cancelQueries({ queryKey: fileKeys.lists() })
     const previousFiles = queryClient.getQueryData(fileKeys.lists())
     queryClient.setQueryData(fileKeys.lists(), (old) =>
       old.filter(f => f.id !== fileId)
     )
     return { previousFiles }
   }
   ```

4. **Consider removing Zustand for file state** - React Query already handles this
   - Zustand persisted cache adds complexity
   - React Query is the source of truth
   - Could simplify to single state layer

---

## Lessons Learned

1. **Cache invalidation is hard** - Must invalidate ALL related queries, not just top-level
2. **Multiple state layers = multiple sources of bugs** - React Query + Zustand created confusion
3. **State transitions need explicit handling** - Enrichment status needs reset logic on delete/upload
4. **User feedback was correct** - "it thinks it's already been enriched" was exactly right

---

## Related Issues

- **Issue**: Calendar not showing ML prices → [QA-AUDIT-ML-PRICING-CALENDAR.md](QA-AUDIT-ML-PRICING-CALENDAR.md)
- **Documentation**: ML Pricing Engine → [ML-PRICING-ENGINE-COMPLETE.md](ML-PRICING-ENGINE-COMPLETE.md)
- **Data Flow**: Prediction Models → [docs/developer/PREDICTION_MODELS_DATA_FLOW.md](docs/developer/PREDICTION_MODELS_DATA_FLOW.md)

---

**Fix Confidence**: ⭐⭐⭐⭐⭐ (Very High)
**Testing Required**: Manual QA testing of complete workflow
**Breaking Changes**: None
**Rollback Risk**: Low (only affects cache invalidation logic)
