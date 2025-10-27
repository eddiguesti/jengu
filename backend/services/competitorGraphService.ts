/**
 * Competitor Graph Service
 * Builds similarity graph between properties and competitor hotels
 * Task 15: Competitor Graph & Neighborhood Index
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../middleware/logger.js'

export interface CompetitorHotel {
  id?: string
  name: string
  externalId?: string
  source: string
  location: {
    latitude: number
    longitude: number
    city?: string
    country?: string
    address?: string
  }
  starRating?: number
  reviewScore?: number
  reviewCount?: number
  amenities?: string[]
  amenityVector?: Record<string, number>
  propertyType?: string
  description?: string
  imageUrls?: string[]
}

export interface CompetitorRelationship {
  id?: string
  propertyId: string
  competitorHotelId: string
  geoSimilarity: number
  amenitySimilarity: number
  reviewSimilarity: number
  overallSimilarity: number
  distanceKm: number
  similarityRank?: number
  weights?: {
    geo: number
    amenity: number
    review: number
  }
}

export interface SimilarityWeights {
  geo: number // Geographic proximity weight
  amenity: number // Amenity overlap weight
  review: number // Review similarity weight
}

// Default similarity weights
const DEFAULT_WEIGHTS: SimilarityWeights = {
  geo: 0.4,
  amenity: 0.3,
  review: 0.3,
}

export class CompetitorGraphService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Store or update competitor hotel
   */
  async upsertCompetitorHotel(
    hotel: CompetitorHotel
  ): Promise<{ success: boolean; hotelId?: string; error?: string }> {
    try {
      const hotelData = {
        name: hotel.name,
        external_id: hotel.externalId,
        source: hotel.source,
        location: hotel.location,
        star_rating: hotel.starRating,
        review_score: hotel.reviewScore,
        review_count: hotel.reviewCount,
        amenities: hotel.amenities,
        amenity_vector: hotel.amenityVector,
        property_type: hotel.propertyType,
        description: hotel.description,
        image_urls: hotel.imageUrls,
        last_seen_at: new Date().toISOString(),
      }

      let result

      if (hotel.id) {
        // Update existing
        result = await this.supabase
          .from('competitor_hotels')
          .update(hotelData)
          .eq('id', hotel.id)
          .select('id')
          .single()
      } else if (hotel.externalId && hotel.source) {
        // Upsert by external_id + source
        result = await this.supabase
          .from('competitor_hotels')
          .upsert(
            { ...hotelData },
            {
              onConflict: 'external_id,source',
              ignoreDuplicates: false,
            }
          )
          .select('id')
          .single()
      } else {
        // Insert new
        result = await this.supabase
          .from('competitor_hotels')
          .insert(hotelData)
          .select('id')
          .single()
      }

      if (result.error) {
        logger.error({ err: result.error }, '❌ Failed to upsert competitor hotel')
        return { success: false, error: result.error.message }
      }

      return { success: true, hotelId: result.data.id }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception upserting competitor hotel')
      return { success: false, error: String(error) }
    }
  }

  /**
   * Build competitor graph for a property
   * Finds nearby hotels and calculates similarity scores
   */
  async buildCompetitorGraph(
    propertyId: string,
    propertyLocation: { latitude: number; longitude: number },
    propertyAttributes: {
      starRating?: number
      reviewScore?: number
      amenities?: string[]
    },
    options: {
      maxDistanceKm?: number
      maxCompetitors?: number
      weights?: SimilarityWeights
    } = {}
  ): Promise<{ success: boolean; relationshipsCreated: number; error?: string }> {
    try {
      const maxDistance = options.maxDistanceKm || 10 // km
      const maxCompetitors = options.maxCompetitors || 50
      const weights = options.weights || DEFAULT_WEIGHTS

      logger.info(`🔗 Building competitor graph for property ${propertyId} within ${maxDistance}km`)

      // Get nearby competitor hotels
      const nearbyHotels = await this.findNearbyHotels(
        propertyLocation.latitude,
        propertyLocation.longitude,
        maxDistance,
        maxCompetitors
      )

      if (nearbyHotels.length === 0) {
        logger.warn(`⚠️  No competitors found within ${maxDistance}km for property ${propertyId}`)
        return { success: true, relationshipsCreated: 0 }
      }

      logger.info(`📍 Found ${nearbyHotels.length} nearby competitors`)

      // Calculate property's amenity vector
      const propertyAmenityVector = this.buildAmenityVector(propertyAttributes.amenities || [])

      // Calculate similarities for each competitor
      const relationships: CompetitorRelationship[] = []

      for (const hotel of nearbyHotels) {
        const distanceKm = this.calculateHaversineDistance(
          propertyLocation.latitude,
          propertyLocation.longitude,
          hotel.location.latitude,
          hotel.location.longitude
        )

        const geoSimilarity = this.calculateGeoSimilarity(distanceKm, maxDistance)
        const amenitySimilarity = this.calculateAmenitySimilarity(
          propertyAmenityVector,
          hotel.amenity_vector || {}
        )
        const reviewSimilarity = this.calculateReviewSimilarity(
          propertyAttributes.reviewScore,
          propertyAttributes.starRating,
          hotel.review_score,
          hotel.star_rating
        )

        const overallSimilarity =
          geoSimilarity * weights.geo +
          amenitySimilarity * weights.amenity +
          reviewSimilarity * weights.review

        relationships.push({
          propertyId,
          competitorHotelId: hotel.id,
          geoSimilarity: Math.round(geoSimilarity * 10000) / 10000,
          amenitySimilarity: Math.round(amenitySimilarity * 10000) / 10000,
          reviewSimilarity: Math.round(reviewSimilarity * 10000) / 10000,
          overallSimilarity: Math.round(overallSimilarity * 10000) / 10000,
          distanceKm: Math.round(distanceKm * 100) / 100,
          weights,
        })
      }

      // Sort by overall similarity (descending)
      relationships.sort((a, b) => b.overallSimilarity - a.overallSimilarity)

      // Assign similarity ranks
      relationships.forEach((rel, index) => {
        rel.similarityRank = index + 1
      })

      // Store relationships in database
      const relationshipRows = relationships.map(rel => ({
        property_id: rel.propertyId,
        competitor_hotel_id: rel.competitorHotelId,
        geo_similarity: rel.geoSimilarity,
        amenity_similarity: rel.amenitySimilarity,
        review_similarity: rel.reviewSimilarity,
        overall_similarity: rel.overallSimilarity,
        distance_km: rel.distanceKm,
        similarity_rank: rel.similarityRank,
        weights: rel.weights,
        computed_at: new Date().toISOString(),
      }))

      // Delete existing relationships for this property
      await this.supabase.from('competitor_relationships').delete().eq('property_id', propertyId)

      // Insert new relationships
      const { error } = await this.supabase
        .from('competitor_relationships')
        .insert(relationshipRows)

      if (error) {
        logger.error({ err: error }, '❌ Failed to store competitor relationships')
        return { success: false, relationshipsCreated: 0, error: error.message }
      }

      logger.info(
        `✅ Created ${relationships.length} competitor relationships for property ${propertyId}`
      )

      return { success: true, relationshipsCreated: relationships.length }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception building competitor graph')
      return { success: false, relationshipsCreated: 0, error: String(error) }
    }
  }

  /**
   * Find nearby competitor hotels
   */
  private async findNearbyHotels(
    lat: number,
    lon: number,
    maxDistanceKm: number,
    limit: number
  ): Promise<any[]> {
    try {
      // Use bounding box for initial filtering (more efficient than calculating distance for all hotels)
      const latDelta = maxDistanceKm / 111 // Rough approximation: 1 degree latitude ≈ 111 km
      const lonDelta = maxDistanceKm / (111 * Math.cos((lat * Math.PI) / 180))

      const minLat = lat - latDelta
      const maxLat = lat + latDelta
      const minLon = lon - lonDelta
      const maxLon = lon + lonDelta

      // Query hotels within bounding box
      const { data, error } = await this.supabase
        .from('competitor_hotels')
        .select('*')
        .gte('location->>latitude', minLat.toString())
        .lte('location->>latitude', maxLat.toString())
        .gte('location->>longitude', minLon.toString())
        .lte('location->>longitude', maxLon.toString())
        .limit(limit * 2) // Get more than needed, we'll filter by exact distance

      if (error) {
        logger.error({ err: error }, '❌ Failed to query nearby hotels')
        return []
      }

      // Filter by exact distance and sort
      const hotelsWithDistance = (data || [])
        .map(hotel => {
          const location = hotel.location as any
          const distance = this.calculateHaversineDistance(
            lat,
            lon,
            parseFloat(location.latitude),
            parseFloat(location.longitude)
          )
          return { ...hotel, distance }
        })
        .filter(hotel => hotel.distance <= maxDistanceKm)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)

      return hotelsWithDistance
    } catch (error) {
      logger.error({ err: error }, '❌ Exception finding nearby hotels')
      return []
    }
  }

  /**
   * Calculate Haversine distance between two points (in km)
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Calculate geographic similarity (0-1, closer = higher)
   * Uses exponential decay function
   */
  private calculateGeoSimilarity(distanceKm: number, maxDistanceKm: number): number {
    if (distanceKm >= maxDistanceKm) return 0
    // Exponential decay: e^(-distance/scale)
    // Scale factor chosen so that at maxDistance/2, similarity is ~0.6
    const scale = maxDistanceKm / 3
    return Math.exp(-distanceKm / scale)
  }

  /**
   * Build amenity feature vector
   * Converts list of amenities to normalized vector
   */
  private buildAmenityVector(amenities: string[]): Record<string, number> {
    const vector: Record<string, number> = {}

    // Common amenity categories with weights
    const amenityWeights: Record<string, number> = {
      wifi: 1.0,
      'free wifi': 1.0,
      parking: 0.9,
      'free parking': 0.9,
      pool: 0.8,
      'swimming pool': 0.8,
      gym: 0.7,
      fitness: 0.7,
      spa: 0.8,
      restaurant: 0.7,
      bar: 0.6,
      'air conditioning': 0.8,
      'room service': 0.6,
      concierge: 0.5,
      'airport shuttle': 0.6,
      'pet friendly': 0.5,
      'pets allowed': 0.5,
      'business center': 0.5,
      'conference rooms': 0.5,
      kitchen: 0.7,
      kitchenette: 0.6,
      balcony: 0.6,
      'sea view': 0.7,
      'ocean view': 0.7,
      'mountain view': 0.6,
    }

    amenities.forEach(amenity => {
      const normalized = amenity.toLowerCase().trim()
      const weight = amenityWeights[normalized] || 0.5
      vector[normalized] = weight
    })

    return vector
  }

  /**
   * Calculate amenity similarity using cosine similarity
   */
  private calculateAmenitySimilarity(
    vector1: Record<string, number>,
    vector2: Record<string, number>
  ): number {
    const keys1 = Object.keys(vector1)
    const keys2 = Object.keys(vector2)

    if (keys1.length === 0 || keys2.length === 0) {
      // If no amenities, fall back to geo-only similarity
      return 0.5
    }

    // Calculate cosine similarity
    let dotProduct = 0
    let magnitude1 = 0
    let magnitude2 = 0

    const allKeys = new Set([...keys1, ...keys2])

    allKeys.forEach(key => {
      const val1 = vector1[key] || 0
      const val2 = vector2[key] || 0

      dotProduct += val1 * val2
      magnitude1 += val1 * val1
      magnitude2 += val2 * val2
    })

    if (magnitude1 === 0 || magnitude2 === 0) return 0

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2))
  }

  /**
   * Calculate review similarity based on star rating and review score
   */
  private calculateReviewSimilarity(
    reviewScore1?: number,
    starRating1?: number,
    reviewScore2?: number,
    starRating2?: number
  ): number {
    if (!reviewScore1 && !starRating1) return 0.5
    if (!reviewScore2 && !starRating2) return 0.5

    let similarities: number[] = []

    // Compare review scores (0-10 scale)
    if (reviewScore1 && reviewScore2) {
      const diff = Math.abs(reviewScore1 - reviewScore2)
      const scoreSimilarity = 1 - diff / 10
      similarities.push(scoreSimilarity)
    }

    // Compare star ratings (0-5 scale)
    if (starRating1 && starRating2) {
      const diff = Math.abs(starRating1 - starRating2)
      const ratingSimilarity = 1 - diff / 5
      similarities.push(ratingSimilarity)
    }

    if (similarities.length === 0) return 0.5

    // Return average
    return similarities.reduce((sum, val) => sum + val, 0) / similarities.length
  }

  /**
   * Get competitor relationships for a property
   */
  async getCompetitorRelationships(
    propertyId: string,
    options: {
      limit?: number
      minSimilarity?: number
    } = {}
  ): Promise<CompetitorRelationship[]> {
    try {
      let query = this.supabase
        .from('competitor_relationships')
        .select(
          `
          *,
          competitor_hotel:competitor_hotels(*)
        `
        )
        .eq('property_id', propertyId)
        .order('overall_similarity', { ascending: false })

      if (options.minSimilarity) {
        query = query.gte('overall_similarity', options.minSimilarity)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        logger.error({ err: error }, '❌ Failed to get competitor relationships')
        return []
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        propertyId: row.property_id,
        competitorHotelId: row.competitor_hotel_id,
        geoSimilarity: row.geo_similarity,
        amenitySimilarity: row.amenity_similarity,
        reviewSimilarity: row.review_similarity,
        overallSimilarity: row.overall_similarity,
        distanceKm: row.distance_km,
        similarityRank: row.similarity_rank,
        weights: row.weights,
      }))
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting competitor relationships')
      return []
    }
  }

  /**
   * Get top N most similar competitors with full hotel details
   */
  async getTopCompetitors(propertyId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_top_competitors', {
        p_property_id: propertyId,
        p_limit: limit,
      })

      if (error) {
        logger.error({ err: error }, '❌ Failed to get top competitors')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting top competitors')
      return []
    }
  }
}
