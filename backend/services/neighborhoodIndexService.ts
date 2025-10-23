/**
 * Neighborhood Competitive Index Service
 * Computes daily competitive positioning index
 * Task 15: Competitor Graph & Neighborhood Index
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../middleware/logger.js'
import { CompetitorDataService } from './competitorDataService.js'

export interface NeighborhoodIndex {
  propertyId: string
  date: string
  priceCompetitivenessScore: number // 0-100
  valueScore: number // 0-100
  positioningScore: number // 0-100
  overallIndex: number // 0-100
  propertyPrice?: number
  neighborhoodMedianPrice?: number
  pricePercentile?: number
  competitorsAnalyzed: number
  avgCompetitorRating?: number
  propertyRating?: number
  indexChange1d?: number
  indexChange7d?: number
  indexChange30d?: number
  marketPosition: 'ultra-premium' | 'premium' | 'mid-market' | 'budget' | 'unknown'
  competitiveAdvantage: string[]
  competitiveWeakness: string[]
  weights?: {
    price: number
    value: number
    positioning: number
  }
}

const DEFAULT_INDEX_WEIGHTS = {
  price: 0.4,
  value: 0.35,
  positioning: 0.25,
}

export class NeighborhoodIndexService {
  private competitorDataService: CompetitorDataService

  constructor(private supabase: SupabaseClient) {
    this.competitorDataService = new CompetitorDataService(supabase)
  }

  /**
   * Compute neighborhood competitive index for a property on a specific date
   */
  async computeNeighborhoodIndex(
    propertyId: string,
    date: string,
    propertyPrice?: number,
    propertyAttributes?: {
      reviewScore?: number
      starRating?: number
      amenities?: string[]
    }
  ): Promise<{ success: boolean; index?: NeighborhoodIndex; error?: string }> {
    try {
      logger.info(`📊 Computing neighborhood index for property ${propertyId} on ${date}`)

      // Get competitor relationships
      const { data: relationships, error: relError } = await this.supabase
        .from('competitor_relationships')
        .select(
          `
          *,
          competitor_hotel:competitor_hotels(*)
        `
        )
        .eq('property_id', propertyId)
        .order('overall_similarity', { ascending: false })
        .limit(20) // Top 20 competitors

      if (relError || !relationships || relationships.length === 0) {
        logger.warn(`⚠️  No competitor relationships found for property ${propertyId}`)
        return {
          success: false,
          error: 'No competitor relationships found. Please build competitor graph first.',
        }
      }

      // Get competitor pricing data for the date
      const competitorIds = relationships.map((r: any) => r.competitor_hotel_id)
      const { data: competitorPricing, error: pricingError } = await this.supabase
        .from('competitor_daily')
        .select('*')
        .in('competitor_hotel_id', competitorIds)
        .eq('date', date)

      // Extract competitor prices
      const competitorPrices: number[] = []
      const competitorRatings: number[] = []

      relationships.forEach((rel: any) => {
        const hotel = rel.competitor_hotel
        if (hotel) {
          // Get price from competitor_daily if available
          const pricing = (competitorPricing || []).find(
            (p: any) => p.competitor_hotel_id === hotel.id
          )
          if (pricing) {
            competitorPrices.push(pricing.price_p50) // Use median price
          }

          // Collect ratings
          if (hotel.review_score) {
            competitorRatings.push(hotel.review_score)
          }
        }
      })

      if (competitorPrices.length === 0) {
        logger.warn(`⚠️  No competitor pricing data found for date ${date}`)
      }

      // Calculate metrics
      const avgCompetitorRating =
        competitorRatings.length > 0
          ? competitorRatings.reduce((sum, r) => sum + r, 0) / competitorRatings.length
          : undefined

      const neighborhoodMedianPrice =
        competitorPrices.length > 0 ? this.calculateMedian(competitorPrices) : undefined

      const pricePercentile =
        propertyPrice && neighborhoodMedianPrice
          ? this.calculatePercentile(propertyPrice, competitorPrices)
          : undefined

      // Calculate component scores
      const priceCompetitivenessScore = this.calculatePriceCompetitiveness(
        propertyPrice,
        competitorPrices
      )

      const valueScore = this.calculateValueScore(
        propertyPrice,
        propertyAttributes?.reviewScore,
        neighborhoodMedianPrice,
        avgCompetitorRating
      )

      const positioningScore = this.calculatePositioningScore(
        relationships.length,
        relationships[0]?.overall_similarity || 0
      )

      // Calculate overall index (weighted average)
      const overallIndex =
        priceCompetitivenessScore * DEFAULT_INDEX_WEIGHTS.price +
        valueScore * DEFAULT_INDEX_WEIGHTS.value +
        positioningScore * DEFAULT_INDEX_WEIGHTS.positioning

      // Determine market position
      const marketPosition = this.determineMarketPosition(pricePercentile, propertyAttributes?.starRating)

      // Identify competitive advantages and weaknesses
      const { advantages, weaknesses } = this.identifyCompetitiveFactors(
        priceCompetitivenessScore,
        valueScore,
        positioningScore,
        propertyPrice,
        neighborhoodMedianPrice,
        propertyAttributes?.reviewScore,
        avgCompetitorRating
      )

      // Calculate trend changes
      const { indexChange1d, indexChange7d, indexChange30d } = await this.calculateIndexChanges(
        propertyId,
        date,
        overallIndex
      )

      const index: NeighborhoodIndex = {
        propertyId,
        date,
        priceCompetitivenessScore: Math.round(priceCompetitivenessScore * 100) / 100,
        valueScore: Math.round(valueScore * 100) / 100,
        positioningScore: Math.round(positioningScore * 100) / 100,
        overallIndex: Math.round(overallIndex * 100) / 100,
        propertyPrice,
        neighborhoodMedianPrice:
          neighborhoodMedianPrice !== undefined
            ? Math.round(neighborhoodMedianPrice * 100) / 100
            : undefined,
        pricePercentile:
          pricePercentile !== undefined ? Math.round(pricePercentile * 100) / 100 : undefined,
        competitorsAnalyzed: relationships.length,
        avgCompetitorRating:
          avgCompetitorRating !== undefined
            ? Math.round(avgCompetitorRating * 10) / 10
            : undefined,
        propertyRating: propertyAttributes?.reviewScore,
        indexChange1d,
        indexChange7d,
        indexChange30d,
        marketPosition,
        competitiveAdvantage: advantages,
        competitiveWeakness: weaknesses,
        weights: DEFAULT_INDEX_WEIGHTS,
      }

      // Store index in database
      await this.storeNeighborhoodIndex(index)

      logger.info(
        `✅ Computed neighborhood index for property ${propertyId}: ${overallIndex.toFixed(1)}/100 (${marketPosition})`
      )

      return { success: true, index }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception computing neighborhood index')
      return { success: false, error: String(error) }
    }
  }

  /**
   * Calculate price competitiveness score (0-100)
   * Higher score = more competitive (lower) price
   */
  private calculatePriceCompetitiveness(
    propertyPrice?: number,
    competitorPrices: number[] = []
  ): number {
    if (!propertyPrice || competitorPrices.length === 0) {
      return 50 // Neutral score if no data
    }

    const avgCompetitorPrice = competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length

    // Calculate relative price position
    // If our price is lower, score is higher (more competitive)
    const priceDiff = avgCompetitorPrice - propertyPrice
    const percentDiff = priceDiff / avgCompetitorPrice

    // Map to 0-100 scale
    // -30% (much cheaper) = 100, 0% (same) = 50, +30% (much more expensive) = 0
    const score = 50 + percentDiff * 150

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate value score (0-100)
   * Considers price vs quality trade-off
   */
  private calculateValueScore(
    propertyPrice?: number,
    propertyRating?: number,
    avgCompetitorPrice?: number,
    avgCompetitorRating?: number
  ): number {
    if (!propertyPrice || !propertyRating || !avgCompetitorPrice || !avgCompetitorRating) {
      return 50 // Neutral if insufficient data
    }

    // Calculate relative quality (normalized to 0-1)
    const relativeQuality = propertyRating / 10 // Assuming 0-10 scale
    const avgRelativeQuality = avgCompetitorRating / 10

    // Calculate relative price (normalized to 0-1)
    const relativePrice = propertyPrice / avgCompetitorPrice

    // Value = Quality / Price (higher is better)
    const propertyValue = relativeQuality / relativePrice
    const competitorValue = avgRelativeQuality / 1.0 // Normalized

    // Compare values
    const valueDiff = propertyValue - competitorValue
    const percentValueDiff = valueDiff / competitorValue

    // Map to 0-100 scale
    const score = 50 + percentValueDiff * 100

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate positioning score (0-100)
   * Based on number of similar competitors and similarity strength
   */
  private calculatePositioningScore(competitorCount: number, topSimilarity: number): number {
    // More competitors = better positioning (more market presence)
    const countScore = Math.min(competitorCount / 20, 1) * 50 // 20+ competitors = max 50 points

    // Higher top similarity = better positioning (well-matched competitors)
    const similarityScore = topSimilarity * 50 // Max 50 points

    return countScore + similarityScore
  }

  /**
   * Determine market position based on price percentile and star rating
   */
  private determineMarketPosition(
    pricePercentile?: number,
    starRating?: number
  ): 'ultra-premium' | 'premium' | 'mid-market' | 'budget' | 'unknown' {
    if (pricePercentile === undefined) return 'unknown'

    if (pricePercentile >= 90) {
      return starRating && starRating >= 4.5 ? 'ultra-premium' : 'premium'
    } else if (pricePercentile >= 65) {
      return 'premium'
    } else if (pricePercentile >= 35) {
      return 'mid-market'
    } else {
      return 'budget'
    }
  }

  /**
   * Identify competitive advantages and weaknesses
   */
  private identifyCompetitiveFactors(
    priceScore: number,
    valueScore: number,
    positioningScore: number,
    propertyPrice?: number,
    avgPrice?: number,
    propertyRating?: number,
    avgRating?: number
  ): { advantages: string[]; weaknesses: string[] } {
    const advantages: string[] = []
    const weaknesses: string[] = []

    // Price advantages/weaknesses
    if (priceScore >= 70) {
      advantages.push('competitive_pricing')
    } else if (priceScore <= 30) {
      weaknesses.push('premium_pricing')
    }

    // Value advantages/weaknesses
    if (valueScore >= 70) {
      advantages.push('excellent_value')
    } else if (valueScore <= 30) {
      weaknesses.push('poor_value_perception')
    }

    // Rating advantages/weaknesses
    if (propertyRating && avgRating) {
      if (propertyRating >= avgRating + 1) {
        advantages.push('superior_reviews')
      } else if (propertyRating <= avgRating - 1) {
        weaknesses.push('below_average_reviews')
      }
    }

    // Positioning advantages/weaknesses
    if (positioningScore >= 70) {
      advantages.push('strong_market_presence')
    } else if (positioningScore <= 30) {
      weaknesses.push('limited_competitive_set')
    }

    return { advantages, weaknesses }
  }

  /**
   * Calculate index changes over time
   */
  private async calculateIndexChanges(
    propertyId: string,
    currentDate: string,
    currentIndex: number
  ): Promise<{ indexChange1d?: number; indexChange7d?: number; indexChange30d?: number }> {
    try {
      const date = new Date(currentDate)

      // Get historical indexes
      const [index1d, index7d, index30d] = await Promise.all([
        this.getHistoricalIndex(propertyId, new Date(date.getTime() - 24 * 60 * 60 * 1000)),
        this.getHistoricalIndex(propertyId, new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000)),
        this.getHistoricalIndex(propertyId, new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000)),
      ])

      return {
        indexChange1d: index1d ? Math.round((currentIndex - index1d) * 100) / 100 : undefined,
        indexChange7d: index7d ? Math.round((currentIndex - index7d) * 100) / 100 : undefined,
        indexChange30d: index30d ? Math.round((currentIndex - index30d) * 100) / 100 : undefined,
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception calculating index changes')
      return {}
    }
  }

  /**
   * Get historical index for a specific date
   */
  private async getHistoricalIndex(propertyId: string, date: Date): Promise<number | null> {
    try {
      const dateStr = date.toISOString().split('T')[0]

      const { data, error } = await this.supabase
        .from('neighborhood_competitive_index')
        .select('overall_index')
        .eq('property_id', propertyId)
        .eq('date', dateStr)
        .single()

      if (error || !data) return null

      return data.overall_index
    } catch (error) {
      return null
    }
  }

  /**
   * Store neighborhood index in database
   */
  private async storeNeighborhoodIndex(index: NeighborhoodIndex): Promise<void> {
    try {
      const { error } = await this.supabase.from('neighborhood_competitive_index').upsert(
        {
          property_id: index.propertyId,
          date: index.date,
          price_competitiveness_score: index.priceCompetitivenessScore,
          value_score: index.valueScore,
          positioning_score: index.positioningScore,
          overall_index: index.overallIndex,
          property_price: index.propertyPrice,
          neighborhood_median_price: index.neighborhoodMedianPrice,
          price_percentile: index.pricePercentile,
          competitors_analyzed: index.competitorsAnalyzed,
          avg_competitor_rating: index.avgCompetitorRating,
          property_rating: index.propertyRating,
          index_change_1d: index.indexChange1d,
          index_change_7d: index.indexChange7d,
          index_change_30d: index.indexChange30d,
          market_position: index.marketPosition,
          competitive_advantage: index.competitiveAdvantage,
          competitive_weakness: index.competitiveWeakness,
          algorithm_version: '1.0',
          weights: index.weights,
          computed_at: new Date().toISOString(),
        },
        {
          onConflict: 'property_id,date',
        }
      )

      if (error) {
        logger.error({ err: error }, '❌ Failed to store neighborhood index')
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception storing neighborhood index')
    }
  }

  /**
   * Get latest neighborhood index for a property
   */
  async getLatestIndex(propertyId: string): Promise<NeighborhoodIndex | null> {
    try {
      const { data, error } = await this.supabase
        .from('neighborhood_competitive_index')
        .select('*')
        .eq('property_id', propertyId)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      return this.mapToNeighborhoodIndex(data)
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting latest index')
      return null
    }
  }

  /**
   * Get neighborhood index trend
   */
  async getIndexTrend(
    propertyId: string,
    days: number = 30
  ): Promise<NeighborhoodIndex[]> {
    try {
      const { data, error } = await this.supabase
        .from('neighborhood_competitive_index')
        .select('*')
        .eq('property_id', propertyId)
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        logger.error({ err: error }, '❌ Failed to get index trend')
        return []
      }

      return (data || []).map(row => this.mapToNeighborhoodIndex(row))
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting index trend')
      return []
    }
  }

  /**
   * Map database row to NeighborhoodIndex
   */
  private mapToNeighborhoodIndex(row: any): NeighborhoodIndex {
    return {
      propertyId: row.property_id,
      date: row.date,
      priceCompetitivenessScore: row.price_competitiveness_score,
      valueScore: row.value_score,
      positioningScore: row.positioning_score,
      overallIndex: row.overall_index,
      propertyPrice: row.property_price,
      neighborhoodMedianPrice: row.neighborhood_median_price,
      pricePercentile: row.price_percentile,
      competitorsAnalyzed: row.competitors_analyzed,
      avgCompetitorRating: row.avg_competitor_rating,
      propertyRating: row.property_rating,
      indexChange1d: row.index_change_1d,
      indexChange7d: row.index_change_7d,
      indexChange30d: row.index_change_30d,
      marketPosition: row.market_position,
      competitiveAdvantage: row.competitive_advantage || [],
      competitiveWeakness: row.competitive_weakness || [],
      weights: row.weights,
    }
  }

  /**
   * Calculate median of an array
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0

    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    } else {
      return sorted[mid]
    }
  }

  /**
   * Calculate percentile rank of a value in a dataset
   */
  private calculatePercentile(value: number, dataset: number[]): number {
    if (dataset.length === 0) return 50

    const sorted = [...dataset].sort((a, b) => a - b)
    const countBelow = sorted.filter(v => v < value).length

    return (countBelow / sorted.length) * 100
  }
}
