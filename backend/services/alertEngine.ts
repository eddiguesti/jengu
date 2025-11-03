/**
 * Smart Alerts Rule Engine
 * =========================
 * Evaluates alert rules and triggers notifications based on:
 *   - Competitor pricing changes
 *   - Demand fluctuations
 *   - Weather events
 *   - Upcoming holidays
 *   - Occupancy thresholds
 *
 * Features:
 *   - Rule-based evaluation
 *   - Alert scoring and prioritization
 *   - De-duplication and throttling
 *   - Quiet hours support
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ============================================================================
// Types
// ============================================================================

interface AlertRule {
  id: string
  userId: string
  propertyId: string
  name: string
  rule_type: string
  conditions: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  priority: number
  min_interval_hours: number
}

interface Alert {
  alertRuleId: string
  userId: string
  propertyId: string
  alertType: string
  severity: string
  priority: number
  title: string
  message: string
  data: any
  actionUrl?: string
}

interface EvaluationContext {
  property: any
  currentData: any
  historicalData: any
  competitorData?: any
  weatherData?: any
  holidayData?: any
}

// ============================================================================
// Alert Rule Evaluators
// ============================================================================

class AlertRuleEvaluator {
  /**
   * Evaluate competitor price spike rule
   */
  static async evaluateCompetitorPriceSpike(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<Alert | null> {
    const { threshold, timeframe = '7d' } = rule.conditions

    if (!context.competitorData) {
      return null
    }

    const currentMedian = context.competitorData.current_median
    const baselineMedian = context.competitorData.baseline_median

    if (!currentMedian || !baselineMedian) {
      return null
    }

    const changePercent = ((currentMedian - baselineMedian) / baselineMedian) * 100

    if (changePercent >= threshold) {
      return {
        alertRuleId: rule.id,
        userId: rule.userId,
        propertyId: rule.propertyId,
        alertType: rule.rule_type,
        severity: rule.severity,
        priority: rule.priority,
        title: `Competitor Prices Up ${changePercent.toFixed(1)}%`,
        message: `Competitor median price increased from $${baselineMedian.toFixed(2)} to $${currentMedian.toFixed(2)} (${changePercent.toFixed(1)}% increase over ${timeframe}). Consider adjusting your pricing.`,
        data: {
          current_value: currentMedian,
          previous_value: baselineMedian,
          change_percent: changePercent,
          threshold,
          timeframe,
        },
        actionUrl: `/properties/${rule.propertyId}/pricing`,
      }
    }

    return null
  }

  /**
   * Evaluate competitor price drop rule
   */
  static async evaluateCompetitorPriceDrop(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<Alert | null> {
    const { threshold, timeframe = '7d' } = rule.conditions

    if (!context.competitorData) {
      return null
    }

    const currentMedian = context.competitorData.current_median
    const baselineMedian = context.competitorData.baseline_median

    if (!currentMedian || !baselineMedian) {
      return null
    }

    const changePercent = ((currentMedian - baselineMedian) / baselineMedian) * 100

    if (changePercent <= -threshold) {
      return {
        alertRuleId: rule.id,
        userId: rule.userId,
        propertyId: rule.propertyId,
        alertType: rule.rule_type,
        severity: rule.severity,
        priority: rule.priority,
        title: `Competitor Prices Down ${Math.abs(changePercent).toFixed(1)}%`,
        message: `Competitor median price decreased from $${baselineMedian.toFixed(2)} to $${currentMedian.toFixed(2)} (${Math.abs(changePercent).toFixed(1)}% decrease over ${timeframe}). You may need to adjust to stay competitive.`,
        data: {
          current_value: currentMedian,
          previous_value: baselineMedian,
          change_percent: changePercent,
          threshold,
          timeframe,
        },
        actionUrl: `/properties/${rule.propertyId}/pricing`,
      }
    }

    return null
  }

  /**
   * Evaluate low occupancy rule
   */
  static async evaluateOccupancyLow(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<Alert | null> {
    const { threshold } = rule.conditions

    const occupancy = context.currentData?.occupancy || 0
    const occupancyPercent = occupancy * 100

    if (occupancyPercent < threshold) {
      return {
        alertRuleId: rule.id,
        userId: rule.userId,
        propertyId: rule.propertyId,
        alertType: rule.rule_type,
        severity: rule.severity,
        priority: rule.priority,
        title: `Low Occupancy Alert: ${occupancyPercent.toFixed(0)}%`,
        message: `Current occupancy is ${occupancyPercent.toFixed(0)}%, below your ${threshold}% threshold. Consider promotional pricing or targeted marketing.`,
        data: {
          current_value: occupancyPercent,
          threshold,
        },
        actionUrl: `/properties/${rule.propertyId}/dashboard`,
      }
    }

    return null
  }

  /**
   * Evaluate high occupancy rule
   */
  static async evaluateOccupancyHigh(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<Alert | null> {
    const { threshold } = rule.conditions

    const occupancy = context.currentData?.occupancy || 0
    const occupancyPercent = occupancy * 100

    if (occupancyPercent >= threshold) {
      return {
        alertRuleId: rule.id,
        userId: rule.userId,
        propertyId: rule.propertyId,
        alertType: rule.rule_type,
        severity: rule.severity,
        priority: rule.priority,
        title: `High Demand: ${occupancyPercent.toFixed(0)}% Occupied`,
        message: `Occupancy has reached ${occupancyPercent.toFixed(0)}%, above your ${threshold}% threshold. Consider increasing prices to maximize revenue.`,
        data: {
          current_value: occupancyPercent,
          threshold,
        },
        actionUrl: `/properties/${rule.propertyId}/pricing`,
      }
    }

    return null
  }

  /**
   * Evaluate demand surge rule
   */
  static async evaluateDemandSurge(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<Alert | null> {
    const { threshold, timeframe = '7d' } = rule.conditions

    const currentBookingRate = context.currentData?.booking_rate || 0
    const historicalBookingRate = context.historicalData?.avg_booking_rate || 0

    if (historicalBookingRate === 0) {
      return null
    }

    const changePercent =
      ((currentBookingRate - historicalBookingRate) / historicalBookingRate) * 100

    if (changePercent >= threshold) {
      return {
        alertRuleId: rule.id,
        userId: rule.userId,
        propertyId: rule.propertyId,
        alertType: rule.rule_type,
        severity: rule.severity,
        priority: rule.priority,
        title: `Demand Surge: +${changePercent.toFixed(0)}%`,
        message: `Booking rate increased ${changePercent.toFixed(1)}% compared to ${timeframe} average. Strong demand detected - consider raising prices.`,
        data: {
          current_value: currentBookingRate,
          previous_value: historicalBookingRate,
          change_percent: changePercent,
          threshold,
          timeframe,
        },
        actionUrl: `/properties/${rule.propertyId}/pricing`,
      }
    }

    return null
  }

  /**
   * Evaluate demand decline rule
   */
  static async evaluateDemandDecline(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<Alert | null> {
    const { threshold, timeframe = '7d' } = rule.conditions

    const currentBookingRate = context.currentData?.booking_rate || 0
    const historicalBookingRate = context.historicalData?.avg_booking_rate || 0

    if (historicalBookingRate === 0) {
      return null
    }

    const changePercent =
      ((currentBookingRate - historicalBookingRate) / historicalBookingRate) * 100

    if (changePercent <= -threshold) {
      return {
        alertRuleId: rule.id,
        userId: rule.userId,
        propertyId: rule.propertyId,
        alertType: rule.rule_type,
        severity: rule.severity,
        priority: rule.priority,
        title: `Demand Decline: ${Math.abs(changePercent).toFixed(0)}%`,
        message: `Booking rate decreased ${Math.abs(changePercent).toFixed(1)}% compared to ${timeframe} average. Consider promotions or price adjustments.`,
        data: {
          current_value: currentBookingRate,
          previous_value: historicalBookingRate,
          change_percent: changePercent,
          threshold,
          timeframe,
        },
        actionUrl: `/properties/${rule.propertyId}/pricing`,
      }
    }

    return null
  }

  /**
   * Evaluate weather event rule
   */
  static async evaluateWeatherEvent(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<Alert | null> {
    const { event_types, severity_min = 'moderate' } = rule.conditions

    if (!context.weatherData || !context.weatherData.upcoming_events) {
      return null
    }

    const severeEvents = context.weatherData.upcoming_events.filter(
      (event: any) => event_types.includes(event.type) && event.severity >= severity_min
    )

    if (severeEvents.length > 0) {
      const event = severeEvents[0]

      return {
        alertRuleId: rule.id,
        userId: rule.userId,
        propertyId: rule.propertyId,
        alertType: rule.rule_type,
        severity: rule.severity,
        priority: rule.priority,
        title: `Weather Alert: ${event.name}`,
        message: `${event.name} forecasted for ${event.date}. This may impact guest bookings. Monitor demand closely.`,
        data: {
          event_type: event.type,
          event_name: event.name,
          event_date: event.date,
          event_severity: event.severity,
        },
        actionUrl: `/properties/${rule.propertyId}/dashboard`,
      }
    }

    return null
  }

  /**
   * Evaluate upcoming holiday rule
   */
  static async evaluateHolidayUpcoming(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<Alert | null> {
    const { days_before = 7, holiday_types = ['national', 'regional'] } = rule.conditions

    if (!context.holidayData || !context.holidayData.upcoming_holidays) {
      return null
    }

    const upcomingHolidays = context.holidayData.upcoming_holidays.filter(
      (holiday: any) =>
        holiday_types.includes(holiday.type) &&
        holiday.days_until <= days_before &&
        holiday.days_until >= 0
    )

    if (upcomingHolidays.length > 0) {
      const holiday = upcomingHolidays[0]

      return {
        alertRuleId: rule.id,
        userId: rule.userId,
        propertyId: rule.propertyId,
        alertType: rule.rule_type,
        severity: rule.severity,
        priority: rule.priority,
        title: `Holiday Approaching: ${holiday.name}`,
        message: `${holiday.name} is in ${holiday.days_until} days (${holiday.date}). Ensure your pricing is optimized for increased demand.`,
        data: {
          holiday_name: holiday.name,
          holiday_date: holiday.date,
          days_until: holiday.days_until,
          holiday_type: holiday.type,
        },
        actionUrl: `/properties/${rule.propertyId}/pricing`,
      }
    }

    return null
  }

  /**
   * Evaluate price optimization opportunity
   */
  static async evaluatePriceOptimization(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<Alert | null> {
    const { min_opportunity_percent = 10 } = rule.conditions

    // This would integrate with ML pricing engine recommendations
    const recommendedPrice = context.currentData?.recommended_price
    const currentPrice = context.currentData?.current_price

    if (!recommendedPrice || !currentPrice) {
      return null
    }

    const opportunityPercent = ((recommendedPrice - currentPrice) / currentPrice) * 100

    if (Math.abs(opportunityPercent) >= min_opportunity_percent) {
      const action = opportunityPercent > 0 ? 'increase' : 'decrease'

      return {
        alertRuleId: rule.id,
        userId: rule.userId,
        propertyId: rule.propertyId,
        alertType: rule.rule_type,
        severity: rule.severity,
        priority: rule.priority,
        title: `Pricing Opportunity: ${Math.abs(opportunityPercent).toFixed(0)}% ${action}`,
        message: `Our ML model recommends ${action}ing your price from $${currentPrice.toFixed(2)} to $${recommendedPrice.toFixed(2)} (${Math.abs(opportunityPercent).toFixed(1)}% ${action}) for optimal revenue.`,
        data: {
          current_price: currentPrice,
          recommended_price: recommendedPrice,
          opportunity_percent: opportunityPercent,
          action,
        },
        actionUrl: `/properties/${rule.propertyId}/pricing?suggested=${recommendedPrice}`,
      }
    }

    return null
  }
}

// ============================================================================
// Alert Engine
// ============================================================================

export class AlertEngine {
  /**
   * Evaluate a single alert rule
   */
  static async evaluateRule(rule: AlertRule, context: EvaluationContext): Promise<Alert | null> {
    const startTime = Date.now()

    try {
      // Check if rule should be throttled
      const { data: throttleCheck } = await supabase.rpc('should_throttle_alert', {
        p_alert_rule_id: rule.id,
      })

      if (throttleCheck) {
        console.log(`⏸️  Rule ${rule.name} throttled (too soon since last trigger)`)
        return null
      }

      // Evaluate based on rule type
      let alert: Alert | null = null

      switch (rule.rule_type) {
        case 'competitor_price_spike':
          alert = await AlertRuleEvaluator.evaluateCompetitorPriceSpike(rule, context)
          break
        case 'competitor_price_drop':
          alert = await AlertRuleEvaluator.evaluateCompetitorPriceDrop(rule, context)
          break
        case 'occupancy_low':
          alert = await AlertRuleEvaluator.evaluateOccupancyLow(rule, context)
          break
        case 'occupancy_high':
          alert = await AlertRuleEvaluator.evaluateOccupancyHigh(rule, context)
          break
        case 'demand_surge':
          alert = await AlertRuleEvaluator.evaluateDemandSurge(rule, context)
          break
        case 'demand_decline':
          alert = await AlertRuleEvaluator.evaluateDemandDecline(rule, context)
          break
        case 'weather_event':
          alert = await AlertRuleEvaluator.evaluateWeatherEvent(rule, context)
          break
        case 'holiday_upcoming':
          alert = await AlertRuleEvaluator.evaluateHolidayUpcoming(rule, context)
          break
        case 'price_optimization':
          alert = await AlertRuleEvaluator.evaluatePriceOptimization(rule, context)
          break
        default:
          console.warn(`Unknown rule type: ${rule.rule_type}`)
      }

      const evaluationTime = Date.now() - startTime

      // Log evaluation
      await supabase.from('alert_evaluation_log').insert({
        alert_rule_id: rule.id,
        triggered: alert !== null,
        reason: alert ? 'Conditions met' : 'Conditions not met',
        evaluation_data: { context, alert },
        evaluation_time_ms: evaluationTime,
      })

      if (alert) {
        console.log(`✅ Alert triggered: ${alert.title} (${evaluationTime}ms)`)
      }

      return alert
    } catch (error) {
      console.error(`Error evaluating rule ${rule.name}:`, error)
      return null
    }
  }

  /**
   * Evaluate all rules for a property
   */
  static async evaluatePropertyRules(propertyId: string): Promise<Alert[]> {
    // Fetch active rules for this property
    const { data: rules, error } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('propertyId', propertyId)
      .eq('is_active', true)

    if (error || !rules) {
      console.error('Error fetching alert rules:', error)
      return []
    }

    // Build evaluation context
    const context = await this.buildEvaluationContext(propertyId)

    // Evaluate all rules
    const alerts: Alert[] = []

    for (const rule of rules) {
      const alert = await this.evaluateRule(rule, context)
      if (alert) {
        alerts.push(alert)
      }
    }

    return alerts
  }

  /**
   * Build evaluation context for a property
   */
  private static async buildEvaluationContext(propertyId: string): Promise<EvaluationContext> {
    // Fetch property data
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    // Fetch current pricing data (last 7 days)
    const { data: currentData } = await supabase
      .from('pricing_data')
      .select('*')
      .eq('propertyId', propertyId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false })
      .limit(7)

    // Fetch historical data (last 30 days for baseline)
    const { data: historicalData } = await supabase
      .from('pricing_data')
      .select('*')
      .eq('propertyId', propertyId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false })

    // Fetch competitor data (if available)
    const { data: competitorData } = await supabase
      .from('competitor_daily_prices')
      .select('*')
      .eq('property_id', propertyId)
      .order('scraped_at', { ascending: false })
      .limit(14)

    return {
      property,
      currentData: currentData?.[0] || {},
      historicalData: {
        avg_booking_rate:
          historicalData?.reduce((sum, d) => sum + (d.bookings || 0), 0) /
          (historicalData?.length || 1),
      },
      competitorData: competitorData
        ? {
            current_median: competitorData[0]?.price_p50,
            baseline_median:
              competitorData.slice(7).reduce((sum, d) => sum + d.price_p50, 0) /
              (competitorData.length - 7 || 1),
          }
        : undefined,
      // TODO: Add weather and holiday data
    }
  }

  /**
   * Create alert from triggered rule
   */
  static async createAlert(alert: Alert): Promise<string | null> {
    const { data, error } = await supabase
      .from('alert_history')
      .insert({
        alert_rule_id: alert.alertRuleId,
        userId: alert.userId,
        propertyId: alert.propertyId,
        alert_type: alert.alertType,
        severity: alert.severity,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        data: alert.data,
        action_url: alert.actionUrl,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating alert:', error)
      return null
    }

    // Update rule last_triggered_at and trigger_count
    await supabase
      .from('alert_rules')
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: supabase.raw('trigger_count + 1'),
      })
      .eq('id', alert.alertRuleId)

    return data?.id
  }
}

export default AlertEngine
