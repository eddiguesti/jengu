/**
 * Bandit Service
 * Manages contextual bandit configuration, logging, and monitoring
 * Task 18: RL Contextual Bandit Pilot
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../middleware/logger.js'

export interface BanditConfig {
  id?: string
  propertyId: string
  userId: string
  enabled: boolean
  trafficPercentage: number // 0-100
  policyType: 'epsilon-greedy' | 'thompson-sampling'
  epsilon: number
  learningRate: number
  discountFactor: number
  minPrice: number
  maxPrice: number
  conservativeMode: boolean
  resetQValuesFrequency?: string
  lastResetAt?: string
}

export interface BanditAction {
  propertyId: string
  userId: string
  sessionId?: string
  stayDate: string
  quoteTime: string
  contextFeatures: Record<string, any>
  occupancyRate?: number
  leadDays?: number
  season?: string
  dayOfWeek?: number
  isWeekend?: boolean
  isHoliday?: boolean
  los?: number
  competitorP50?: number
  armId: string
  deltaPct: number
  basePrice: number
  finalPrice: number
  policy: 'explore' | 'exploit'
  epsilon: number
  qValues?: Record<string, number>
  armPulls?: Record<string, number>
  boundsApplied?: boolean
  conservativeMode?: boolean
  originalPrice?: number
}

export interface BanditReward {
  actionId?: string
  propertyId: string
  armId: string
  bookingMade: boolean
  actualRevenue: number
  reward: number
  stayDate?: string
  bookingDate?: string
  source?: 'actual' | 'simulated'
  notes?: string
}

export interface BanditPerformance {
  totalActions: number
  totalRewards: number
  avgReward: number
  conversionRate: number
  explorationRate: number
  bestArm: string
}

export class BanditService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get bandit configuration for a property
   */
  async getConfig(propertyId: string): Promise<BanditConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('bandit_config')
        .select('*')
        .eq('property_id', propertyId)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToConfig(data)
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting bandit config')
      return null
    }
  }

  /**
   * Create or update bandit configuration
   */
  async upsertConfig(config: BanditConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const configData = {
        property_id: config.propertyId,
        user_id: config.userId,
        enabled: config.enabled,
        traffic_percentage: config.trafficPercentage,
        policy_type: config.policyType,
        epsilon: config.epsilon,
        learning_rate: config.learningRate,
        discount_factor: config.discountFactor,
        min_price: config.minPrice,
        max_price: config.maxPrice,
        conservative_mode: config.conservativeMode,
        reset_q_values_frequency: config.resetQValuesFrequency,
      }

      const { error } = await this.supabase
        .from('bandit_config')
        .upsert(configData, {
          onConflict: 'property_id',
        })

      if (error) {
        logger.error({ err: error }, '❌ Failed to upsert bandit config')
        return { success: false, error: error.message }
      }

      logger.info(`✅ Upserted bandit config for property ${config.propertyId}`)
      return { success: true }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception upserting bandit config')
      return { success: false, error: String(error) }
    }
  }

  /**
   * Log bandit action (arm selection)
   */
  async logAction(action: BanditAction): Promise<{ success: boolean; actionId?: string; error?: string }> {
    try {
      const actionData = {
        property_id: action.propertyId,
        user_id: action.userId,
        session_id: action.sessionId,
        stay_date: action.stayDate,
        quote_time: action.quoteTime,
        context_features: action.contextFeatures,
        occupancy_rate: action.occupancyRate,
        lead_days: action.leadDays,
        season: action.season,
        day_of_week: action.dayOfWeek,
        is_weekend: action.isWeekend,
        is_holiday: action.isHoliday,
        los: action.los,
        competitor_p50: action.competitorP50,
        arm_id: action.armId,
        delta_pct: action.deltaPct,
        base_price: action.basePrice,
        final_price: action.finalPrice,
        policy: action.policy,
        epsilon: action.epsilon,
        q_values: action.qValues,
        arm_pulls: action.armPulls,
        bounds_applied: action.boundsApplied,
        conservative_mode: action.conservativeMode,
        original_price: action.originalPrice,
      }

      const { data, error } = await this.supabase
        .from('bandit_actions')
        .insert(actionData)
        .select('id')
        .single()

      if (error) {
        logger.error({ err: error }, '❌ Failed to log bandit action')
        return { success: false, error: error.message }
      }

      return { success: true, actionId: data.id }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception logging bandit action')
      return { success: false, error: String(error) }
    }
  }

  /**
   * Log bandit reward (outcome)
   */
  async logReward(reward: BanditReward): Promise<{ success: boolean; error?: string }> {
    try {
      const rewardData = {
        action_id: reward.actionId,
        property_id: reward.propertyId,
        arm_id: reward.armId,
        booking_made: reward.bookingMade,
        actual_revenue: reward.actualRevenue,
        reward: reward.reward,
        stay_date: reward.stayDate,
        booking_date: reward.bookingDate,
        source: reward.source || 'actual',
        notes: reward.notes,
      }

      const { error } = await this.supabase.from('bandit_rewards').insert(rewardData)

      if (error) {
        logger.error({ err: error }, '❌ Failed to log bandit reward')
        return { success: false, error: error.message }
      }

      logger.info(`💰 Logged bandit reward: ${reward.armId}, booking=${reward.bookingMade}, reward=${reward.reward}`)
      return { success: true }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception logging bandit reward')
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get bandit performance metrics
   */
  async getPerformance(propertyId: string, days: number = 7): Promise<BanditPerformance | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_bandit_performance', {
        p_property_id: propertyId,
        p_days: days,
      })

      if (error) {
        logger.error({ err: error }, '❌ Failed to get bandit performance')
        return null
      }

      if (!data || data.length === 0) {
        return null
      }

      const perf = data[0]
      return {
        totalActions: perf.total_actions,
        totalRewards: perf.total_rewards,
        avgReward: perf.avg_reward,
        conversionRate: perf.conversion_rate,
        explorationRate: perf.exploration_rate,
        bestArm: perf.best_arm,
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting bandit performance')
      return null
    }
  }

  /**
   * Get arm statistics
   */
  async getArmStatistics(propertyId: string, days: number = 30): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_arm_statistics', {
        p_property_id: propertyId,
        p_days: days,
      })

      if (error) {
        logger.error({ err: error }, '❌ Failed to get arm statistics')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ err: error }, '❌ Exception getting arm statistics')
      return []
    }
  }

  /**
   * Save bandit state snapshot
   */
  async saveSnapshot(
    propertyId: string,
    epsilon: number,
    learningRate: number,
    totalPulls: number,
    totalReward: number,
    explorationCount: number,
    exploitationCount: number,
    armStatistics: Record<string, any>,
    reason: string = 'manual'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const avgReward = totalPulls > 0 ? totalReward / totalPulls : 0
      const explorationRate = totalPulls > 0 ? explorationCount / totalPulls : 0

      // Find best arm
      let bestArmId = ''
      let bestQValue = -Infinity
      for (const [armId, stats] of Object.entries(armStatistics)) {
        if ((stats as any).q_value > bestQValue) {
          bestQValue = (stats as any).q_value
          bestArmId = armId
        }
      }

      const snapshotData = {
        property_id: propertyId,
        epsilon,
        learning_rate: learningRate,
        total_pulls: totalPulls,
        total_reward: totalReward,
        exploration_count: explorationCount,
        exploitation_count: exploitationCount,
        arm_statistics: armStatistics,
        avg_reward: avgReward,
        exploration_rate: explorationRate,
        best_arm_id: bestArmId,
        snapshot_reason: reason,
      }

      const { error } = await this.supabase.from('bandit_state_snapshots').insert(snapshotData)

      if (error) {
        logger.error({ err: error }, '❌ Failed to save bandit snapshot')
        return { success: false, error: error.message }
      }

      logger.info(`📸 Saved bandit snapshot for property ${propertyId} (reason: ${reason})`)
      return { success: true }
    } catch (error) {
      logger.error({ err: error }, '❌ Exception saving bandit snapshot')
      return { success: false, error: String(error) }
    }
  }

  /**
   * Check if bandit should be used for this request (based on traffic %)
   */
  shouldUseBandit(propertyId: string, config: BanditConfig): boolean {
    if (!config.enabled) {
      return false
    }

    // Hash property ID to get consistent random value
    let hash = 0
    for (let i = 0; i < propertyId.length; i++) {
      hash = (hash << 5) - hash + propertyId.charCodeAt(i)
      hash |= 0 // Convert to 32-bit integer
    }

    // Map hash to 0-100 range
    const randomPct = Math.abs(hash % 100)

    // Route to bandit if random < traffic percentage
    return randomPct < config.trafficPercentage
  }

  /**
   * Map database row to BanditConfig
   */
  private mapToConfig(row: any): BanditConfig {
    return {
      id: row.id,
      propertyId: row.property_id,
      userId: row.user_id,
      enabled: row.enabled,
      trafficPercentage: row.traffic_percentage,
      policyType: row.policy_type,
      epsilon: row.epsilon,
      learningRate: row.learning_rate,
      discountFactor: row.discount_factor,
      minPrice: row.min_price,
      maxPrice: row.max_price,
      conservativeMode: row.conservative_mode,
      resetQValuesFrequency: row.reset_q_values_frequency,
      lastResetAt: row.last_reset_at,
    }
  }
}
