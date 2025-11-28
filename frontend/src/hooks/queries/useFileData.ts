import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as filesService from '@/lib/api/services/files'
import { toast } from '@/stores/useToastStore'

// Query keys factory
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (filters?: string) => [...fileKeys.lists(), { filters }] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
  data: (id: string, limit?: number) => [...fileKeys.detail(id), 'data', limit] as const,
}

/**
 * Fetch all uploaded files metadata
 */
export function useUploadedFiles() {
  return useQuery({
    queryKey: fileKeys.lists(),
    queryFn: async () => {
      const response = await filesService.getFiles()
      return response.files || []
    },
  })
}

/**
 * Fetch file data (pricing rows)
 */
export function useFileData(fileId: string, limit: number = 10000) {
  return useQuery({
    queryKey: fileKeys.data(fileId, limit),
    queryFn: async () => {
      const response = await filesService.getFileData(fileId, limit)
      return response.data || []
    },
    enabled: !!fileId, // Only fetch if fileId exists
    staleTime: 10 * 60 * 1000, // CSV data rarely changes, cache for 10 min
  })
}

/**
 * Upload file mutation
 */
export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return filesService.uploadFile(formData)
    },
    onSuccess: response => {
      // Invalidate and refetch file list
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })

      // Show toast notification about background enrichment
      if (response?.file) {
        toast.success(
          'Upload successful!',
          `${response.file.rows?.toLocaleString() || 'Your'} rows uploaded. Weather & holiday data will be added in the background.`
        )
      }
    },
    onError: (error: Error) => {
      toast.error('Upload failed', error.message || 'Please try again')
    },
  })
}

/**
 * Delete file mutation
 */
export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fileId: string) => filesService.deleteFile(fileId),
    onSuccess: (_, fileId) => {
      // CRITICAL: Remove ALL cached data for this file to prevent stale data
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
      queryClient.removeQueries({ queryKey: fileKeys.detail(fileId) })
      queryClient.removeQueries({ queryKey: fileKeys.data(fileId) })

      // Also invalidate all file-related queries to force fresh fetch
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

/**
 * Enrich file with weather/holiday data
 */
export function useEnrichFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      fileId,
      latitude,
      longitude,
      country,
    }: {
      fileId: string
      latitude: number
      longitude: number
      country: string
    }) => {
      return filesService.enrichFile(fileId, { latitude, longitude, country })
    },
    onSuccess: (response, variables) => {
      // Invalidate the specific file's data
      queryClient.invalidateQueries({ queryKey: fileKeys.data(variables.fileId) })
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(variables.fileId) })
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })

      // Show toast based on enrichment status
      if (response?.status === 'queued') {
        toast.info(
          'Enrichment started',
          'Weather & holiday data is being added in the background. You can keep working!'
        )
      } else if (response?.status === 'completed') {
        toast.success('Enrichment complete!', 'Weather & holiday data has been added to your file.')
      }
    },
    onError: (error: Error) => {
      toast.error('Enrichment failed', error.message || 'Please try again')
    },
  })
}
