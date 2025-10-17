import { SupabaseClient } from '@supabase/supabase-js'
import { ParsedPricingData } from '../types/api.types.js'

export class PricingDataRepository {
  constructor(private supabase: SupabaseClient) {}

  async batchInsert(data: ParsedPricingData[]) {
    return await this.supabase.from('pricing_data').insert(data)
  }

  async findByPropertyId(
    propertyId: string,
    options?: {
      offset?: number
      limit?: number
      orderBy?: string
      ascending?: boolean
    }
  ) {
    const offset = options?.offset || 0
    const limit = options?.limit || 1000
    const orderBy = options?.orderBy || 'date'
    const ascending = options?.ascending !== false

    return await this.supabase
      .from('pricing_data')
      .select(
        'date, price, occupancy, bookings, temperature, precipitation, weatherCondition, sunshineHours, dayOfWeek, month, season, isWeekend, isHoliday, holidayName, extraData'
      )
      .eq('propertyId', propertyId)
      .order(orderBy, { ascending })
      .range(offset, offset + limit - 1)
  }

  async count(propertyId: string) {
    return await this.supabase
      .from('pricing_data')
      .select('*', { count: 'exact', head: true })
      .eq('propertyId', propertyId)
  }

  async deleteByPropertyId(propertyId: string) {
    return await this.supabase.from('pricing_data').delete().eq('propertyId', propertyId)
  }

  async findByDateRange(propertyId: string, startDate: string, endDate: string) {
    return await this.supabase
      .from('pricing_data')
      .select('*')
      .eq('propertyId', propertyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
  }
}
