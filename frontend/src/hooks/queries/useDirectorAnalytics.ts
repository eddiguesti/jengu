import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api/client'
import type {
  RevenueSeries,
  OccupancyPace,
  AdrIndex,
  RevLeadHeatmap,
  ForecastActual,
  ElasticityCurve,
  PriceExplain,
} from '@/types/analytics'

// Helper to fetch data from files API
async function fetchFileData(fileId: string) {
  const response = await apiClient.get(`/files/${fileId}/data?limit=10000`)
  return response.data.data
}

/**
 * Fetch revenue series data (actual vs optimized)
 */
export function useRevenueSeries(fileId: string, enabled = true) {
  return useQuery({
    queryKey: ['director', 'revenue-series', fileId],
    queryFn: async () => {
      const fileData = await fetchFileData(fileId)
      const response = await apiClient.post('/analytics/revenue-series', { data: fileData })
      return response.data.data as RevenueSeries
    },
    enabled: !!fileId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch occupancy pace by lead buckets
 */
export function useOccupancyPace(fileId: string, enabled = true) {
  return useQuery({
    queryKey: ['director', 'occupancy-pace', fileId],
    queryFn: async () => {
      const fileData = await fetchFileData(fileId)
      const response = await apiClient.post('/analytics/occupancy-pace', { data: fileData })
      return response.data.data as OccupancyPace
    },
    enabled: !!fileId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch ADR index vs market
 */
export function useAdrIndex(fileId: string, enabled = true) {
  return useQuery({
    queryKey: ['director', 'adr-index', fileId],
    queryFn: async () => {
      const fileData = await fetchFileData(fileId)
      const response = await apiClient.post('/analytics/adr-index', { data: fileData })
      return response.data.data as AdrIndex
    },
    enabled: !!fileId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch revenue heatmap by lead × season
 */
export function useRevLeadHeatmap(fileId: string, enabled = true) {
  return useQuery({
    queryKey: ['director', 'rev-lead-heatmap', fileId],
    queryFn: async () => {
      const fileData = await fetchFileData(fileId)
      const response = await apiClient.post('/analytics/rev-lead-heatmap', { data: fileData })
      return response.data.data as RevLeadHeatmap
    },
    enabled: !!fileId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch forecast vs actual bookings
 */
export function useForecastActual(fileId: string, enabled = true) {
  return useQuery({
    queryKey: ['director', 'forecast-actual', fileId],
    queryFn: async () => {
      const fileData = await fetchFileData(fileId)
      const response = await apiClient.post('/analytics/forecast-actual', { data: fileData })
      return response.data.data as ForecastActual
    },
    enabled: !!fileId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch price elasticity curve
 */
export function useElasticityCurve(fileId: string, enabled = true) {
  return useQuery({
    queryKey: ['director', 'elasticity', fileId],
    queryFn: async () => {
      const fileData = await fetchFileData(fileId)
      const response = await apiClient.post('/analytics/elasticity', { data: fileData })
      return response.data.data as ElasticityCurve
    },
    enabled: !!fileId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch price explanation waterfall for a specific date
 */
export function usePriceExplain(fileId: string, date: string | null, enabled = true) {
  return useQuery({
    queryKey: ['director', 'price-explain', fileId, date],
    queryFn: async () => {
      const fileData = await fetchFileData(fileId)
      const response = await apiClient.post('/analytics/price-explain', { data: fileData, date })
      return response.data.data as PriceExplain
    },
    enabled: !!fileId && !!date && enabled,
    staleTime: 5 * 60 * 1000,
  })
}
