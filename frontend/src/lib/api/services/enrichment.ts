import apiClient from '../client'

export interface EnrichmentRequest {
  data_id: string
  features: ('weather' | 'holidays' | 'temporal')[]
}

export interface EnrichmentResponse {
  success: boolean
  job_id: string
  message: string
}

export interface EnrichmentStatusResponse {
  status: 'pending' | 'running' | 'complete' | 'error'
  progress: number
  current_feature?: string
  message: string
  completed_features: string[]
}

// Start enrichment process
export const startEnrichment = async (request: EnrichmentRequest): Promise<EnrichmentResponse> => {
  const response = await apiClient.post<EnrichmentResponse>('/enrichment/start', request)
  return response.data
}

// Get enrichment job status
export const getEnrichmentStatus = async (jobId: string): Promise<EnrichmentStatusResponse> => {
  const response = await apiClient.get<EnrichmentStatusResponse>(`/enrichment/status/${jobId}`)
  return response.data
}

// Cancel enrichment job
export const cancelEnrichment = async (jobId: string): Promise<void> => {
  await apiClient.post(`/enrichment/cancel/${jobId}`)
}

// Export as enrichmentApi object for consistency
export const enrichmentApi = {
  start: startEnrichment,
  getStatus: getEnrichmentStatus,
  cancel: cancelEnrichment,
}
