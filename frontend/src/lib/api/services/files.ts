import apiClient from '../client'

export interface UploadedFile {
  id: string
  originalName: string
  name: string
  size: number
  rows: number
  columns: number
  uploadedAt: string
  uploaded_at?: string
  status: string
  enrichment_status?: 'none' | 'pending' | 'processing' | 'completed' | 'failed'
  enriched_at?: string
  preview?: unknown[]
  actualRows?: number
}

export interface FileDataResponse {
  success: boolean
  data: unknown[]
  pagination: {
    offset: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export interface FilesListResponse {
  success: boolean
  files: UploadedFile[]
}

// Namespace for files API
export const filesApi = {
  /**
   * Get list of all uploaded files
   */
  getFiles: async (): Promise<FilesListResponse> => {
    const response = await apiClient.get<FilesListResponse>('/files')
    return response.data
  },

  /**
   * Get single file details
   */
  getFile: async (fileId: string): Promise<{ data: UploadedFile }> => {
    const response = await apiClient.get<{ data: UploadedFile }>(`/files/${fileId}`)
    return response.data
  },

  /**
   * Get file data (pricing rows)
   */
  getFileData: async (fileId: string, limit: number = 10000): Promise<FileDataResponse> => {
    const response = await apiClient.get<FileDataResponse>(`/files/${fileId}/data`, {
      params: { limit },
    })
    return response.data
  },

  /**
   * Upload CSV file
   */
  uploadFile: async (formData: FormData) => {
    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Delete file
   */
  deleteFile: async (fileId: string): Promise<void> => {
    await apiClient.delete(`/files/${fileId}`)
  },

  /**
   * Enrich file data
   */
  enrichFile: async (
    fileId: string,
    location?: { latitude: number; longitude: number; country?: string }
  ) => {
    // Use extended timeout for enrichment (10 minutes for very large datasets)
    const response = await apiClient.post(`/files/${fileId}/enrich`, location || {}, {
      timeout: 600000, // 10 minutes
    })
    return response.data
  },
}

// Legacy exports for backward compatibility
export const getFiles = filesApi.getFiles
export const getFileData = filesApi.getFileData
export const uploadFile = filesApi.uploadFile
export const deleteFile = filesApi.deleteFile
export const enrichFile = filesApi.enrichFile
