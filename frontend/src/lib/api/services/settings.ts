import apiClient from '../client'

export interface BusinessSettings {
  business_name?: string
  property_type?: 'hotel' | 'resort' | 'vacation_rental' | 'hostel' | 'other'
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  currency?: 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY' | 'AUD' | 'CAD' | 'AED'
  timezone?: string
}

export interface SettingsResponse {
  success: boolean
  settings: BusinessSettings
}

/**
 * Get business profile settings
 */
export const getBusinessSettings = async (): Promise<SettingsResponse> => {
  const response = await apiClient.get<SettingsResponse>('/settings')
  return response.data
}

/**
 * Update business profile settings
 */
export const updateBusinessSettings = async (
  settings: Partial<BusinessSettings>
): Promise<SettingsResponse> => {
  const response = await apiClient.post<SettingsResponse>('/settings', settings)
  return response.data
}
