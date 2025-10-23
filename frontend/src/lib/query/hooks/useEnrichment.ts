/**
 * React Query hooks for enrichment progress tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { filesApi } from '../../api/services/files'
import { propertiesKeys } from './useProperties'

export interface EnrichmentProgress {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  stage?: 'temporal' | 'weather' | 'holidays'
  progress?: number // 0-100
  message?: string
  error?: string
}

/**
 * Trigger enrichment for a property
 */
export function useEnrichProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      propertyId: string
      location?: { latitude: number; longitude: number; country?: string }
    }) => {
      const response = await filesApi.enrichFile(params.propertyId, params.location)
      return response
    },
    onMutate: async params => {
      // Optimistically update the property status
      await queryClient.cancelQueries({ queryKey: propertiesKeys.detail(params.propertyId) })

      const previousProperty = queryClient.getQueryData(propertiesKeys.detail(params.propertyId))

      queryClient.setQueryData(propertiesKeys.detail(params.propertyId), (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: {
            ...old.data,
            enrichment_status: 'pending',
          },
        }
      })

      return { previousProperty }
    },
    onError: (_err, params, context) => {
      // Rollback on error
      if (context?.previousProperty) {
        queryClient.setQueryData(propertiesKeys.detail(params.propertyId), context.previousProperty)
      }
    },
    onSuccess: (_data, params) => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: propertiesKeys.detail(params.propertyId) })
      queryClient.invalidateQueries({ queryKey: propertiesKeys.data(params.propertyId) })
    },
  })
}

/**
 * Poll for enrichment status
 * Uses React Query's refetch interval for real-time updates
 */
export function useEnrichmentStatus(propertyId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: [...propertiesKeys.detail(propertyId || ''), 'enrichment-status'],
    queryFn: async () => {
      if (!propertyId) throw new Error('Property ID is required')
      const response = await filesApi.getFile(propertyId)
      return {
        status: response.data.enrichment_status || 'none',
        enrichedAt: response.data.enriched_at,
      }
    },
    enabled: !!propertyId && enabled,
    refetchInterval: query => {
      // Poll every 2 seconds if enrichment is in progress, otherwise don't poll
      const data = query.state.data
      if (data && data.status === 'pending') {
        return 2000 // 2 seconds
      }
      return false // Stop polling
    },
    staleTime: 0, // Always consider stale for real-time updates
  })
}

/**
 * Check if enrichment is needed for a property
 */
export function useIsEnrichmentNeeded(propertyId: string | undefined) {
  return useQuery({
    queryKey: [...propertiesKeys.detail(propertyId || ''), 'needs-enrichment'],
    queryFn: async () => {
      if (!propertyId) throw new Error('Property ID is required')
      const response = await filesApi.getFile(propertyId)

      // Enrichment is needed if status is 'none' or 'failed'
      const status = response.data.enrichment_status || 'none'
      return {
        needed: status === 'none' || status === 'failed',
        status,
      }
    },
    enabled: !!propertyId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}
