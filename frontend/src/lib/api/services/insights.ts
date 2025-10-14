import apiClient from '../client'

export interface InsightsFilters {
  date_range?: string
  weather_filter?: string
}

export interface WeatherImpactData {
  weather: string
  avgPrice: number
  bookings: number
  occupancy: number
}

export interface OccupancyByDayData {
  day: string
  occupancy: number
  price: number
}

export interface InsightsResponse {
  weather_impact: WeatherImpactData[]
  occupancy_by_day: OccupancyByDayData[]
  correlation_data: any[]
  competitor_data: any[]
  key_insights: {
    weather_impact_percentage: number
    peak_occupancy_day: string
    competitor_position: number
  }
}

// Get insights data
export const getInsights = async (
  dataId: string,
  filters?: InsightsFilters
): Promise<InsightsResponse> => {
  const response = await apiClient.get<InsightsResponse>(`/insights/${dataId}`, {
    params: filters,
  })
  return response.data
}

// Get weather correlation data
export const getWeatherCorrelation = async (dataId: string) => {
  const response = await apiClient.get(`/insights/${dataId}/weather-correlation`)
  return response.data
}

// Get competitor comparison
export const getCompetitorComparison = async (dataId: string) => {
  const response = await apiClient.get(`/insights/${dataId}/competitor-comparison`)
  return response.data
}
