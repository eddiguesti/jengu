# Task: Improve Frontend State Management

## Status
- **Priority**: High
- **Status**: Todo
- **Estimated Effort**: 2-3 days
- **Dependencies**: None

## Context

Currently, the frontend uses a mix of state management approaches without clear patterns:
- **Zustand** for some persistent client state (files metadata, business settings)
- **Context API** for auth (works well)
- **useState** for everything else
- **No server state caching** - all API data is fetched fresh on every component mount

This leads to:
- Redundant API calls (10,000 rows fetched multiple times)
- Duplicate state management (files stored in both local state and Zustand)
- No cache invalidation strategy
- Poor UX on slow connections (no background refetching, no optimistic updates)
- Inconsistent loading/error handling patterns

## Recommended Architecture

### Three-Layer State Management Pattern

#### 1. **TanStack Query (React Query)** - Server State
Use for ALL data from external sources (backend API, external APIs):
- CSV file data (rows)
- Analytics results
- Insights data
- Business settings (from API)
- Competitor pricing data
- Weather data
- Any other backend-fetched data

**Benefits:**
- Automatic caching, deduplication, background refetching
- Built-in loading/error states
- Optimistic updates
- Request deduplication (multiple components can request same data)
- Stale-while-revalidate pattern
- Automatic retry with exponential backoff

#### 2. **Zustand** - Global Client State
Use for client-side state that needs to be shared across components but doesn't come from server:
- UI preferences (theme, sidebar collapsed state)
- Multi-step form state (if needs to persist across navigation)
- Feature flags or client-side configuration
- Global modals/toast notifications state

**Keep current Zustand stores if they remain relevant:**
- `useDataStore` - Consider replacing with React Query (files metadata is server state)
- `useBusinessStore` - Consider replacing with React Query (business profile is server state)

#### 3. **useState** - Component-Local State
Use for state that is:
- Wholly owned by a single component
- Doesn't need to persist
- Pure UI state (toggle, input value, modal open/closed)

**Examples:**
- Form input values (controlled inputs)
- Dropdown open/closed state
- "Is dragging" state in file upload
- Accordion expanded/collapsed
- Tab selection (if not in URL)

### Keep Context API for Auth
`AuthContext` works well - no changes needed.

---

## Implementation Plan

### Phase 1: Setup React Query (1 day)

#### 1.1 Install Dependencies
```bash
cd frontend
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

#### 1.2 Configure Query Client
Create `frontend/src/lib/queryClient.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache time: Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      // Refetch on window focus (user comes back to tab)
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
  },
});
```

#### 1.3 Wrap App with QueryClientProvider
Update `frontend/src/main.tsx`:
```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

### Phase 2: Create React Query Hooks (1-2 days)

#### 2.1 File Data Hooks
Create `frontend/src/hooks/queries/useFileData.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService } from '@/lib/api/services/data';
import type { UploadedFile, PricingDataRow } from '@/types';

// Query keys
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (filters: string) => [...fileKeys.lists(), { filters }] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
  data: (id: string, limit?: number) => [...fileKeys.detail(id), 'data', limit] as const,
};

// Fetch all uploaded files metadata
export function useUploadedFiles() {
  return useQuery({
    queryKey: fileKeys.lists(),
    queryFn: async () => {
      const response = await dataService.getFiles();
      return response.data;
    },
  });
}

// Fetch file data (rows)
export function useFileData(fileId: string, limit: number = 10000) {
  return useQuery({
    queryKey: fileKeys.data(fileId, limit),
    queryFn: async () => {
      const response = await dataService.getFileData(fileId, limit);
      return response.data as PricingDataRow[];
    },
    enabled: !!fileId, // Only fetch if fileId exists
    staleTime: 10 * 60 * 1000, // CSV data rarely changes, cache for 10 min
  });
}

// Upload file mutation
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return dataService.uploadFile(formData);
    },
    onSuccess: () => {
      // Invalidate and refetch file list
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
    },
  });
}

// Delete file mutation
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => dataService.deleteFile(fileId),
    onSuccess: (_, fileId) => {
      // Remove file from cache
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.removeQueries({ queryKey: fileKeys.detail(fileId) });
    },
  });
}
```

#### 2.2 Analytics Hooks
Create `frontend/src/hooks/queries/useAnalytics.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api/services/analyticsService';
import type { MarketSentiment, DemandForecast, WeatherImpactAnalysis } from '@/types';

export const analyticsKeys = {
  all: ['analytics'] as const,
  sentiment: (fileId: string) => [...analyticsKeys.all, 'sentiment', fileId] as const,
  demand: (fileId: string) => [...analyticsKeys.all, 'demand', fileId] as const,
  weather: (fileId: string) => [...analyticsKeys.all, 'weather', fileId] as const,
  ai: (fileId: string) => [...analyticsKeys.all, 'ai', fileId] as const,
};

export function useMarketSentiment(fileId: string, data: any[]) {
  return useQuery({
    queryKey: analyticsKeys.sentiment(fileId),
    queryFn: async () => {
      const response = await analyticsService.analyzeMarketSentiment(fileId, data);
      return response.data as MarketSentiment;
    },
    enabled: !!fileId && data.length > 0,
    staleTime: 15 * 60 * 1000, // Analytics results stable, cache 15 min
  });
}

export function useDemandForecast(fileId: string, data: any[]) {
  return useQuery({
    queryKey: analyticsKeys.demand(fileId),
    queryFn: async () => {
      const response = await analyticsService.analyzeDemandPatterns(fileId, data);
      return response.data as DemandForecast;
    },
    enabled: !!fileId && data.length > 0,
    staleTime: 15 * 60 * 1000,
  });
}

export function useWeatherAnalysis(fileId: string, data: any[]) {
  return useQuery({
    queryKey: analyticsKeys.weather(fileId),
    queryFn: async () => {
      const response = await analyticsService.analyzeWeatherImpact(fileId, data);
      return response.data as WeatherImpactAnalysis;
    },
    enabled: !!fileId && data.length > 0,
    staleTime: 15 * 60 * 1000,
  });
}

export function useAIInsights(fileId: string, data: any[]) {
  return useQuery({
    queryKey: analyticsKeys.ai(fileId),
    queryFn: async () => {
      const response = await analyticsService.generateAIInsights(fileId, data);
      return response.data;
    },
    enabled: !!fileId && data.length > 0,
    staleTime: 30 * 60 * 1000, // AI insights expensive, cache 30 min
    retry: 1, // AI calls can fail, don't retry too much
  });
}
```

#### 2.3 Business Settings Hooks
Create `frontend/src/hooks/queries/useBusinessSettings.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useBusinessStore } from '@/store/useBusinessStore';
import type { BusinessProfile } from '@/types';

export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
};

export function useBusinessProfile() {
  const { setProfile } = useBusinessStore();

  return useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: async () => {
      const response = await apiClient.get('/settings');
      return response.data.settings as BusinessProfile;
    },
    // Sync with Zustand store for backwards compatibility
    onSuccess: (data) => {
      setProfile(data);
    },
  });
}

export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient();
  const { setProfile } = useBusinessStore();

  return useMutation({
    mutationFn: async (profile: Partial<BusinessProfile>) => {
      const response = await apiClient.post('/settings', profile);
      return response.data.settings as BusinessProfile;
    },
    // Optimistic update
    onMutate: async (newProfile) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: settingsKeys.profile() });

      // Snapshot previous value
      const previous = queryClient.getQueryData(settingsKeys.profile());

      // Optimistically update cache
      queryClient.setQueryData(settingsKeys.profile(), (old: BusinessProfile) => ({
        ...old,
        ...newProfile,
      }));

      return { previous };
    },
    // Rollback on error
    onError: (err, newProfile, context) => {
      queryClient.setQueryData(settingsKeys.profile(), context.previous);
    },
    // Refetch on success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
    // Sync with Zustand
    onSuccess: (data) => {
      setProfile(data);
    },
  });
}
```

---

### Phase 3: Refactor Components (1-2 days)

#### 3.1 Refactor Insights.tsx
**Before:**
```typescript
const [insights, setInsights] = useState<CombinedInsights | null>(null);
const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(null);
// ... etc

useEffect(() => {
  const fetchData = async () => {
    setIsLoadingAnalytics(true);
    try {
      const response = await axios.get(`${API_URL}/files/${fileId}/data?limit=10000`);
      // ... fetch and set state
    } catch (error) {
      // ...
    } finally {
      setIsLoadingAnalytics(false);
    }
  };
  fetchData();
}, [currentFileId]);
```

**After:**
```typescript
import { useFileData } from '@/hooks/queries/useFileData';
import { useMarketSentiment, useDemandForecast, useWeatherAnalysis, useAIInsights } from '@/hooks/queries/useAnalytics';

function Insights() {
  const { data: uploadedFiles } = useUploadedFiles();
  const currentFileId = uploadedFiles?.[0]?.id;

  // Fetch file data
  const { data: fileData = [], isLoading: isLoadingData } = useFileData(currentFileId || '');

  // Fetch analytics (these will wait until fileData is available)
  const { data: marketSentiment, isLoading: isLoadingSentiment } = useMarketSentiment(currentFileId || '', fileData);
  const { data: demandForecast, isLoading: isLoadingDemand } = useDemandForecast(currentFileId || '', fileData);
  const { data: weatherAnalysis, isLoading: isLoadingWeather } = useWeatherAnalysis(currentFileId || '', fileData);
  const { data: aiInsights, isLoading: isLoadingAI } = useAIInsights(currentFileId || '', fileData);

  const isLoading = isLoadingData || isLoadingSentiment || isLoadingDemand || isLoadingWeather;

  if (isLoading) return <LoadingSpinner />;
  if (!marketSentiment) return <NoDataPlaceholder />;

  return (
    <div>
      {/* Use marketSentiment, demandForecast, etc. directly */}
    </div>
  );
}
```

**Benefits:**
- No manual loading state management
- Automatic caching (won't refetch if navigating away and back)
- Background refetching when data becomes stale
- Built-in error handling
- Can use `isFetching` to show background refetch indicator

#### 3.2 Refactor Data.tsx
**Current issue:** Maintains duplicate `files` state

**Solution:** Remove local `files` state, use `useUploadedFiles()` query directly:

```typescript
import { useUploadedFiles, useUploadFile, useDeleteFile } from '@/hooks/queries/useFileData';

function Data() {
  const { data: uploadedFiles = [], isLoading } = useUploadedFiles();
  const uploadFileMutation = useUploadFile();
  const deleteFileMutation = useDeleteFile();

  // UI state only
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'enrichment'>('upload');

  const handleUpload = async (file: File) => {
    try {
      await uploadFileMutation.mutateAsync(file);
      toast.success('File uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const handleDelete = (fileId: string) => {
    deleteFileMutation.mutate(fileId);
  };

  return (
    <div>
      {uploadedFiles.map(file => (
        <FileCard key={file.id} file={file} onDelete={handleDelete} />
      ))}
    </div>
  );
}
```

#### 3.3 Refactor Settings.tsx
**Replace:** Manual form state + API calls
**With:** React Query mutation with optimistic updates

```typescript
import { useBusinessProfile, useUpdateBusinessProfile } from '@/hooks/queries/useBusinessSettings';

function Settings() {
  const { data: profile, isLoading } = useBusinessProfile();
  const updateProfile = useUpdateBusinessProfile();

  const [formData, setFormData] = useState<BusinessProfile | null>(null);

  // Initialize form with fetched data
  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  const handleSave = async () => {
    if (!formData) return;

    try {
      await updateProfile.mutateAsync(formData);
      toast.success('Settings saved!');
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <form>
      {/* Form fields */}
      <Button onClick={handleSave} disabled={updateProfile.isPending}>
        {updateProfile.isPending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

---

### Phase 4: Remove/Consolidate Zustand Stores

#### Decision Matrix

| Store | Current Use | Recommendation |
|-------|-------------|----------------|
| `useDataStore` | Files metadata + upload status | **Replace with React Query** - This is server state |
| `useBusinessStore` | Business profile settings | **Replace with React Query** - This is server state |
| Auth Context | Auth state + methods | **Keep** - Works well |

#### Migration Steps

1. **Keep Zustand stores temporarily** for backwards compatibility during migration
2. **Update hooks to sync both** React Query cache and Zustand stores
3. **Gradually remove Zustand dependencies** from components
4. **Delete Zustand stores** once all components migrated

**Example: Dual sync during migration**
```typescript
export function useUploadedFiles() {
  const { addFile } = useDataStore(); // Keep during migration

  return useQuery({
    queryKey: fileKeys.lists(),
    queryFn: fetchFiles,
    onSuccess: (data) => {
      // Sync with Zustand during migration phase
      data.forEach(file => addFile(file));
    },
  });
}
```

Once all components use React Query hooks, remove Zustand sync.

---

### Phase 5: Add Global Loading Indicator (Optional)

Use React Query's `useIsFetching` hook to show global loading indicator:

```typescript
import { useIsFetching } from '@tanstack/react-query';

function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();

  if (!isFetching) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse z-50">
      {/* Loading bar */}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] All pages load without errors
- [ ] File upload works and updates UI immediately
- [ ] File deletion removes from UI
- [ ] Settings save with optimistic updates (UI updates before server responds)
- [ ] Insights page doesn't refetch data when navigating away and back
- [ ] React Query DevTools shows cached queries
- [ ] Network tab shows reduced API calls (no duplicate requests)
- [ ] Error states display properly (disconnect network to test)
- [ ] Stale data refetches in background when threshold exceeded

---

## Performance Benefits Expected

### Before
- **Insights page load**: 4 API calls (file data + 3 analytics endpoints) = ~2-3 seconds
- **Navigate away and back**: 4 API calls again = ~2-3 seconds
- **Multiple tabs open**: Each tab makes separate requests

### After
- **First load**: 4 API calls = ~2-3 seconds (same)
- **Navigate away and back**: 0 API calls (instant load from cache)
- **Multiple tabs**: Shared cache, 1 set of requests total
- **Background refetch**: Happens after stale time, transparent to user

**Estimated improvement**: 60-80% reduction in API calls, 10x faster navigation

---

## Files to Create

```
frontend/src/
├── lib/
│   └── queryClient.ts                     # React Query config
├── hooks/
│   └── queries/
│       ├── useFileData.ts                 # File queries & mutations
│       ├── useAnalytics.ts                # Analytics queries
│       ├── useBusinessSettings.ts         # Settings queries & mutations
│       └── useCompetitor.ts               # Competitor data queries
```

## Files to Modify

```
frontend/src/
├── main.tsx                               # Add QueryClientProvider
├── pages/
│   ├── Insights.tsx                       # Replace useState with React Query
│   ├── Data.tsx                           # Remove duplicate state
│   ├── Settings.tsx                       # Add optimistic updates
│   ├── CompetitorMonitor.tsx              # Use React Query for API calls
│   └── Assistant.tsx                      # Consider persisting chat state
└── store/
    ├── useDataStore.ts                    # Mark as deprecated, plan to remove
    └── useBusinessStore.ts                # Mark as deprecated, plan to remove
```

---

## Success Criteria

✅ All server state managed by React Query
✅ No duplicate API calls for same data
✅ Optimistic updates on mutations
✅ Instant navigation (data cached)
✅ Background refetching when stale
✅ Clear separation: React Query (server) vs Zustand (client) vs useState (local)
✅ React Query DevTools installed and functional
✅ No Zustand stores for server state

---

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Practical React Query](https://tkdodo.eu/blog/practical-react-query) - Excellent blog series
- [Query Key Factory Pattern](https://tkdodo.eu/blog/effective-react-query-keys)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)

---

## Notes

- **Backwards compatibility**: Keep Zustand stores during migration, sync both sources
- **Gradual migration**: Can migrate page-by-page (start with Insights, then Data, then Settings)
- **TypeScript**: All hooks are fully typed, types inferred from API responses
- **DevTools**: React Query DevTools invaluable for debugging cache state
- **Persistence**: If need to persist React Query cache across page reloads, use `persistQueryClient` plugin (not recommended initially, localStorage sync can cause issues)
