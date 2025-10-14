import apiClient from '../client'

export interface UploadDataResponse {
  success: boolean
  message: string
  data_id: string
  rows: number
  columns: number
  preview: any[]
}

export interface DataStatusResponse {
  status: 'uploaded' | 'enriching' | 'complete' | 'error'
  progress: number
  message: string
}

// Upload booking data file
export const uploadData = async (file: File): Promise<UploadDataResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<UploadDataResponse>('/data/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

// Get data upload status
export const getDataStatus = async (dataId: string): Promise<DataStatusResponse> => {
  const response = await apiClient.get<DataStatusResponse>(`/data/status/${dataId}`)
  return response.data
}

// Get data preview
export const getDataPreview = async (dataId: string, limit: number = 10) => {
  const response = await apiClient.get(`/data/preview/${dataId}`, {
    params: { limit },
  })
  return response.data
}

// Delete uploaded data
export const deleteData = async (dataId: string): Promise<void> => {
  await apiClient.delete(`/data/${dataId}`)
}
