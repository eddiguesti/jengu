/**
 * Competitor Data Storage Service
 * Handles storage and retrieval of competitor pricing data
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../middleware/logger.js'

export interface CompetitorDailyData {
  propertyId: string
  date: string // YYYY-MM-DD
  priceP10: number
  priceP50: number
  priceP90: number
  source: string
  competitorCount: number
  location?: {
    latitude: number
    longitude: number
    city?: string
    country?: string
  }
  searchParams?: {
    roomType?: string
    guests?: number
    searchRadiusKm?: number
  }
}

export interface CompetitorTarget {
  id?: string
  propertyId: string
  userId: string
  location: {
    latitude: number
    longitude: number
    city?: string
    country?: string
  }
  roomType?: string
  guests: number
  searchRadiusKm: number
  enabled: boolean
  scrapeFrequency: string
  lastScrapedAt?: string
  nextScrapeAt?: string
  priority: number
  notes?: string
}

export interface ScrapeLog {
  targetId: string
  propertyId: string
  dateRangeStart: string
  dateRangeEnd: string
  status: 'success' | 'partial' | 'failed'
  competitorsFound: number
  rowsInserted: number
  errorMessage?: string
  durationMs: number
  proxyUsed?: string
  userAgent?: string
}

export class CompetitorDataService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Store competitor daily pricing data (upsert)
   */
  async storeCompetitorData(data: CompetitorDailyData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('competitor_daily')
        .upsert(
          {
            property_id: data.propertyId,
            date: data.date,
            price_p10: data.priceP10,
            price_p50: data.priceP50,
            price_p90: data.priceP90,
            source: data.source,
            competitor_count: data.competitorCount,
            location: data.location,
            search_params: data.searchParams,
            scraped_at: new Date().toISOString(),
          },
          {
            onConflict: 'property_id,date', // Update if already exists
          }
        )

      if (error) {
        logger.error({ err: error }, '❌ Failed to store competitor data')
        return { success: false, error: error.message }
      }

      logger.info(`✅ Stored competitor data for property ${data.propertyId} on ${data.date}`)
      return { success: true }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception storing competitor data')
      return { success: false, error: String(error) }
    }
  }

  /**
   * Store multiple days of competitor data
   */
  async storeBulkCompetitorData(dataArray: CompetitorDailyData[]): Promise<{ success: boolean; inserted: number; error?: string }> {
    try {
      const rows = dataArray.map(data => ({
        property_id: data.propertyId,
        date: data.date,
        price_p10: data.priceP10,
        price_p50: data.priceP50,
        price_p90: data.priceP90,
        source: data.source,
        competitor_count: data.competitorCount,
        location: data.location,
        search_params: data.searchParams,
        scraped_at: new Date().toISOString(),
      }))

      const { error, count } = await this.supabase
        .from('competitor_daily')
        .upsert(rows, {
          onConflict: 'property_id,date',
        })

      if (error) {
        logger.error({ err: error }, '❌ Failed to store bulk competitor data')
        return { success: false, inserted: 0, error: error.message }
      }

      logger.info(`✅ Stored ${count || rows.length} competitor data rows`)
      return { success: true, inserted: count || rows.length }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception storing bulk competitor data')
      return { success: false, inserted: 0, error: String(error) }
    }
  }

  /**
   * Get competitor data for a property on a specific date
   */
  async getCompetitorData(propertyId: string, date: string): Promise<CompetitorDailyData | null> {
    try {
      const { data, error } = await this.supabase
        .from('competitor_daily')
        .select('*')
        .eq('property_id', propertyId)
        .eq('date', date)
        .order('scraped_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        return null
      }

      return {
        propertyId: data.property_id,
        date: data.date,
        priceP10: data.price_p10,
        priceP50: data.price_p50,
        priceP90: data.price_p90,
        source: data.source,
        competitorCount: data.competitor_count,
        location: data.location,
        searchParams: data.search_params,
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting competitor data')
      return null
    }
  }

  /**
   * Get competitor data range for a property
   */
  async getCompetitorDataRange(
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<CompetitorDailyData[]> {
    try {
      const { data, error } = await this.supabase
        .from('competitor_daily')
        .select('*')
        .eq('property_id', propertyId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) {
        logger.error({ err: error }, '❌ Failed to get competitor data range')
        return []
      }

      return (data || []).map(row => ({
        propertyId: row.property_id,
        date: row.date,
        priceP10: row.price_p10,
        priceP50: row.price_p50,
        priceP90: row.price_p90,
        source: row.source,
        competitorCount: row.competitor_count,
        location: row.location,
        searchParams: row.search_params,
      }))
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting competitor data range')
      return []
    }
  }

  /**
   * Create or update competitor scraping target
   */
  async upsertCompetitorTarget(target: CompetitorTarget): Promise<{ success: boolean; targetId?: string; error?: string }> {
    try {
      const targetData = {
        property_id: target.propertyId,
        user_id: target.userId,
        location: target.location,
        room_type: target.roomType || 'standard',
        guests: target.guests,
        search_radius_km: target.searchRadiusKm,
        enabled: target.enabled,
        scrape_frequency: target.scrapeFrequency,
        priority: target.priority,
        notes: target.notes,
      }

      if (target.id) {
        // Update existing
        const { error } = await this.supabase
          .from('competitor_targets')
          .update(targetData)
          .eq('id', target.id)

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, targetId: target.id }
      } else {
        // Insert new
        const { data, error } = await this.supabase
          .from('competitor_targets')
          .insert(targetData)
          .select('id')
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, targetId: data.id }
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception upserting competitor target')
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get next targets to scrape
   */
  async getNextScrapingTargets(limit: number = 10): Promise<CompetitorTarget[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_next_scraping_targets', { p_limit: limit })

      if (error) {
        logger.error({ err: error }, '❌ Failed to get scraping targets')
        return []
      }

      return (data || []).map((row: any) => ({
        id: row.target_id,
        propertyId: row.property_id,
        userId: row.user_id,
        location: row.location,
        roomType: row.room_type,
        guests: row.guests,
        searchRadiusKm: row.search_radius_km,
        enabled: true,
        scrapeFrequency: 'daily',
        priority: row.priority,
      }))
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting scraping targets')
      return []
    }
  }

  /**
   * Update target's next scrape time
   */
  async updateNextScrapeTime(targetId: string, nextScrapeAt: Date): Promise<void> {
    await this.supabase
      .from('competitor_targets')
      .update({
        last_scraped_at: new Date().toISOString(),
        next_scrape_at: nextScrapeAt.toISOString(),
      })
      .eq('id', targetId)
  }

  /**
   * Log scraping activity
   */
  async logScraping(log: ScrapeLog): Promise<void> {
    await this.supabase.from('competitor_scrape_log').insert({
      target_id: log.targetId,
      property_id: log.propertyId,
      date_range_start: log.dateRangeStart,
      date_range_end: log.dateRangeEnd,
      status: log.status,
      competitors_found: log.competitorsFound,
      rows_inserted: log.rowsInserted,
      error_message: log.errorMessage,
      duration_ms: log.durationMs,
      proxy_used: log.proxyUsed,
      user_agent: log.userAgent,
    })
  }

  /**
   * Get scraping history for a property
   */
  async getScrapeHistory(propertyId: string, limit: number = 50): Promise<ScrapeLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('competitor_scrape_log')
        .select('*')
        .eq('property_id', propertyId)
        .order('scraped_at', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error({ err: error }, '❌ Failed to get scrape history')
        return []
      }

      return (data || []).map((row: any) => ({
        targetId: row.target_id,
        propertyId: row.property_id,
        dateRangeStart: row.date_range_start,
        dateRangeEnd: row.date_range_end,
        status: row.status,
        competitorsFound: row.competitors_found,
        rowsInserted: row.rows_inserted,
        errorMessage: row.error_message,
        durationMs: row.duration_ms,
        proxyUsed: row.proxy_used,
        userAgent: row.user_agent,
      }))
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting scrape history')
      return []
    }
  }
}
