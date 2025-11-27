import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import * as settingsService from '@/lib/api/services/settings'
import { useBusinessStore } from '@/stores/useBusinessStore'

// Re-export service types
export type { BusinessSettings } from '@/lib/api/services/settings'

// Query keys factory
export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
}

/**
 * Transform flat API response to nested Zustand format
 */
function transformToZustandFormat(settings: settingsService.BusinessSettings) {
  return {
    business_name: settings.business_name || '',
    property_type: settings.property_type || ('hotel' as const),
    location: {
      city: settings.city || '',
      country: settings.country || '',
      latitude: settings.latitude || 0,
      longitude: settings.longitude || 0,
    },
    currency: settings.currency || ('USD' as const),
    timezone: settings.timezone || '',
  }
}

/**
 * Fetch business profile settings
 */
export function useBusinessProfile() {
  const { setProfile } = useBusinessStore()

  const query = useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: async () => {
      const response = await settingsService.getBusinessSettings()
      return response.settings
    },
  })

  // Sync with Zustand store for backwards compatibility during migration
  // Using useEffect instead of deprecated onSuccess callback
  useEffect(() => {
    if (query.data) {
      const zustandFormat = transformToZustandFormat(query.data)
      setProfile(zustandFormat)
    }
  }, [query.data, setProfile])

  return query
}

/**
 * Update business profile mutation with optimistic updates
 */
export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient()
  const { setProfile } = useBusinessStore()

  const mutation = useMutation({
    mutationFn: async (profile: Partial<settingsService.BusinessSettings>) => {
      const response = await settingsService.updateBusinessSettings(profile)
      return response.settings
    },
    // Optimistic update
    onMutate: async newProfile => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: settingsKeys.profile() })

      // Snapshot previous value
      const previous = queryClient.getQueryData(settingsKeys.profile())

      // Optimistically update cache
      queryClient.setQueryData(
        settingsKeys.profile(),
        (old: settingsService.BusinessSettings | undefined) => ({
          ...old,
          ...newProfile,
        })
      )

      return { previous }
    },
    // Rollback on error
    onError: (_err, _newProfile, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.profile(), context.previous)
      }
    },
    // Refetch on success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() })
    },
  })

  // Sync with Zustand using useEffect instead of deprecated onSuccess
  useEffect(() => {
    if (mutation.data) {
      const zustandFormat = transformToZustandFormat(mutation.data)
      setProfile(zustandFormat)
    }
  }, [mutation.data, setProfile])

  return mutation
}
