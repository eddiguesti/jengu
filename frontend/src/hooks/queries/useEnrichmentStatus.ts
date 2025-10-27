/**
 * React Query hook for enrichment status polling
 */
import { useQuery } from '@tanstack/react-query'
import { enrichmentApi } from '@/lib/api/services/enrichment'

export function useEnrichmentStatus(propertyId: string, enabled = true) {
  return useQuery({
    queryKey: ['enrichment-status', propertyId],
    queryFn: () => enrichmentApi.getStatus(propertyId),
    enabled: enabled && !!propertyId,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (file deleted/not found)
      if (error?.response?.status === 404) return false
      return failureCount < 3
    },
    refetchInterval: query => {
      // Poll every 2 seconds if pending/running, stop if complete/error
      const data = query.state.data
      if (!data) return 2000
      return data.status === 'pending' || data.status === 'running' ? 2000 : false
    },
    staleTime: 1000,
  })
}
