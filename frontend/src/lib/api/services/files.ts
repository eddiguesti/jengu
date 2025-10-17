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
  enrichment_status?: 'none' | 'pending' | 'completed' | 'failed'
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

/**
 * Get list of all uploaded files
 */
export const getFiles = async (): Promise<FilesListResponse> => {
  const response = await apiClient.get<FilesListResponse>('/files')
  return response.data
}

/**
 * Get file data (pricing rows)
 */
export const getFileData = async (fileId: string, limit: number = 10000): Promise<FileDataResponse> => {
  const response = await apiClient.get<FileDataResponse>(`/files/${fileId}/data`, {
    params: { limit },
  })
  return response.data
}

/**
 * Upload CSV file
 */
export const uploadFile = async (formData: FormData) => {
  const response = await apiClient.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Delete file
 */
export const deleteFile = async (fileId: string): Promise<void> => {
  await apiClient.delete(`/files/${fileId}`)
}

/**
 * Enrich file data
 */
export const enrichFile = async (fileId: string, location: { latitude: number; longitude: number; country?: string }) => {
  const response = await apiClient.post(`/files/${fileId}/enrich`, location)
  return response.data
}
