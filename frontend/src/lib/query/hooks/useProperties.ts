/**
 * React Query hooks for properties/files API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { filesApi } from '../../api/services/files'

// Query keys for properties
export const propertiesKeys = {
  all: ['properties'] as const,
  lists: () => [...propertiesKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...propertiesKeys.lists(), filters] as const,
  details: () => [...propertiesKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertiesKeys.details(), id] as const,
  data: (id: string) => [...propertiesKeys.detail(id), 'data'] as const,
}

/**
 * Fetch all properties
 */
export function useProperties() {
  return useQuery({
    queryKey: propertiesKeys.lists(),
    queryFn: async () => {
      const response = await filesApi.getFiles()
      return response.files // FilesListResponse has 'files' property, not 'data'
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - properties list changes frequently
  })
}

/**
 * Fetch single property details
 */
export function useProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertiesKeys.detail(propertyId || ''),
    queryFn: async () => {
      if (!propertyId) throw new Error('Property ID is required')
      const response = await filesApi.getFile(propertyId)
      return response.data
    },
    enabled: !!propertyId, // Only fetch if propertyId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch property pricing data
 */
export function usePropertyData(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertiesKeys.data(propertyId || ''),
    queryFn: async () => {
      if (!propertyId) throw new Error('Property ID is required')
      const response = await filesApi.getFileData(propertyId)
      return response.data
    },
    enabled: !!propertyId,
    staleTime: 10 * 60 * 1000, // 10 minutes - pricing data changes less frequently
  })
}

/**
 * Upload new property
 */
export function useUploadProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { file: File; metadata: Record<string, unknown> }) => {
      const formData = new FormData()
      formData.append('file', data.file)
      formData.append('metadata', JSON.stringify(data.metadata))

      const response = await filesApi.uploadFile(formData)
      return response.data
    },
    onSuccess: () => {
      // Invalidate properties list to refetch
      queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() })
    },
  })
}

/**
 * Delete property
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (propertyId: string) => {
      await filesApi.deleteFile(propertyId) // Returns void
      return { success: true }
    },
    onSuccess: (_, propertyId) => {
      // Invalidate and remove from cache
      queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() })
      queryClient.removeQueries({ queryKey: propertiesKeys.detail(propertyId) })
      queryClient.removeQueries({ queryKey: propertiesKeys.data(propertyId) })
    },
  })
}
