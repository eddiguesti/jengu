import { SupabaseClient } from '@supabase/supabase-js'

export interface BusinessSettings {
  id?: string
  userid: string
  business_name?: string
  property_type?: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  currency?: string
  timezone?: string
  updatedat?: string
}

export class BusinessSettingsRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByUserId(userId: string) {
    return await this.supabase
      .from('business_settings')
      .select('*')
      .eq('userid', userId)
      .single()
  }

  async create(settings: BusinessSettings) {
    return await this.supabase.from('business_settings').insert(settings).select().single()
  }

  async update(userId: string, updates: Partial<BusinessSettings>) {
    return await this.supabase
      .from('business_settings')
      .update({
        ...updates,
        updatedat: new Date().toISOString(),
      })
      .eq('userid', userId)
      .select()
      .single()
  }

  async upsert(settings: BusinessSettings) {
    const { data: existing } = await this.findByUserId(settings.userid)

    if (existing) {
      return await this.update(settings.userid, settings)
    } else {
      return await this.create(settings)
    }
  }
}
