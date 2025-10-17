import { SupabaseClient } from '@supabase/supabase-js'

export class PropertiesRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(propertyData: {
    id: string
    name: string
    originalName: string
    size: number
    rows: number
    columns: number
    status: string
    userId: string
  }) {
    return await this.supabase.from('properties').insert(propertyData).select().single()
  }

  async findById(id: string, userId: string) {
    return await this.supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .single()
  }

  async findByUserId(userId: string) {
    return await this.supabase
      .from('properties')
      .select(
        'id, originalName, size, rows, columns, uploadedAt, status, enrichmentstatus, enrichedat'
      )
      .eq('userId', userId)
      .order('uploadedAt', { ascending: false })
  }

  async update(id: string, updates: Record<string, unknown>) {
    return await this.supabase.from('properties').update(updates).eq('id', id)
  }

  async delete(id: string) {
    return await this.supabase.from('properties').delete().eq('id', id)
  }

  async updateEnrichmentStatus(
    id: string,
    status: 'completed' | 'failed',
    error?: string
  ) {
    const updates: Record<string, unknown> = {
      enrichmentstatus: status,
    }

    if (status === 'completed') {
      updates.enrichedat = new Date().toISOString()
    } else if (error) {
      updates.enrichmenterror = error
    }

    return await this.supabase.from('properties').update(updates).eq('id', id)
  }
}
