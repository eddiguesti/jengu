/**
 * Alerts API Routes
 * ==================
 * Manage alert rules, view alert history, and update notification preferences.
 *
 * Endpoints:
 *   GET    /api/alerts              - List user's recent alerts
 *   GET    /api/alerts/:id          - Get alert details
 *   POST   /api/alerts/:id/dismiss  - Dismiss an alert
 *   POST   /api/alerts/:id/snooze   - Snooze an alert
 *   DELETE /api/alerts/:id          - Delete an alert
 *
 *   GET    /api/alerts/rules        - List user's alert rules
 *   POST   /api/alerts/rules        - Create alert rule
 *   PUT    /api/alerts/rules/:id    - Update alert rule
 *   DELETE /api/alerts/rules/:id    - Delete alert rule
 *
 *   GET    /api/alerts/settings     - Get user's alert settings
 *   PUT    /api/alerts/settings     - Update user's alert settings
 */

import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../lib/supabase.js'
import { AlertEngine } from '../services/alertEngine.js'

const router = Router()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ============================================================================
// Alert History Endpoints
// ============================================================================

/**
 * GET /api/alerts
 * List user's recent alerts
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { status, severity, propertyId, limit = 50, offset = 0 } = req.query

    let query = supabase
      .from('alert_history')
      .select(
        `
        *,
        alert_rule:alert_rules(name, rule_type),
        property:properties(name)
      `,
        { count: 'exact' }
      )
      .eq('userId', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (severity) {
      query = query.eq('severity', severity)
    }
    if (propertyId) {
      query = query.eq('propertyId', propertyId)
    }

    const { data: alerts, error, count } = await query

    if (error) {
      console.error('Error fetching alerts:', error)
      return res.status(500).json({ error: 'Failed to fetch alerts' })
    }

    return res.json({
      alerts,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    })
  } catch (error) {
    console.error('Error in GET /api/alerts:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/alerts/:id
 * Get alert details
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    const { data: alert, error } = await supabase
      .from('alert_history')
      .select(
        `
        *,
        alert_rule:alert_rules(name, rule_type, conditions),
        property:properties(name, address)
      `
      )
      .eq('id', id)
      .eq('userId', userId)
      .single()

    if (error || !alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    return res.json(alert)
  } catch (error) {
    console.error('Error in GET /api/alerts/:id:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/alerts/:id/dismiss
 * Dismiss an alert
 */
router.post('/:id/dismiss', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    // Verify alert belongs to user
    const { data: alert } = await supabase
      .from('alert_history')
      .select('id')
      .eq('id', id)
      .eq('userId', userId)
      .single()

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    // Update status
    const { error } = await supabase
      .from('alert_history')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error dismissing alert:', error)
      return res.status(500).json({ error: 'Failed to dismiss alert' })
    }

    return res.json({ success: true, message: 'Alert dismissed' })
  } catch (error) {
    console.error('Error in POST /api/alerts/:id/dismiss:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/alerts/:id/snooze
 * Snooze an alert
 */
router.post('/:id/snooze', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params
    const { hours = 24 } = req.body

    // Verify alert belongs to user
    const { data: alert } = await supabase
      .from('alert_history')
      .select('id')
      .eq('id', id)
      .eq('userId', userId)
      .single()

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    // Calculate snooze until time
    const snoozeUntil = new Date(Date.now() + Number(hours) * 60 * 60 * 1000)

    // Update status
    const { error } = await supabase
      .from('alert_history')
      .update({
        status: 'snoozed',
        snoozed_until: snoozeUntil.toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error snoozing alert:', error)
      return res.status(500).json({ error: 'Failed to snooze alert' })
    }

    return res.json({
      success: true,
      message: `Alert snoozed until ${snoozeUntil.toISOString()}`,
      snooze_until: snoozeUntil.toISOString(),
    })
  } catch (error) {
    console.error('Error in POST /api/alerts/:id/snooze:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/alerts/:id
 * Delete an alert
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    // Verify alert belongs to user
    const { data: alert } = await supabase
      .from('alert_history')
      .select('id')
      .eq('id', id)
      .eq('userId', userId)
      .single()

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    // Delete alert
    const { error } = await supabase.from('alert_history').delete().eq('id', id)

    if (error) {
      console.error('Error deleting alert:', error)
      return res.status(500).json({ error: 'Failed to delete alert' })
    }

    return res.json({ success: true, message: 'Alert deleted' })
  } catch (error) {
    console.error('Error in DELETE /api/alerts/:id:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================================
// Alert Rules Endpoints
// ============================================================================

/**
 * GET /api/alerts/rules
 * List user's alert rules
 */
router.get('/rules', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { propertyId, rule_type, is_active } = req.query

    let query = supabase
      .from('alert_rules')
      .select('*, property:properties(name)')
      .eq('userId', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (propertyId) {
      query = query.eq('propertyId', propertyId)
    }
    if (rule_type) {
      query = query.eq('rule_type', rule_type)
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    const { data: rules, error } = await query

    if (error) {
      console.error('Error fetching alert rules:', error)
      return res.status(500).json({ error: 'Failed to fetch alert rules' })
    }

    return res.json({ rules })
  } catch (error) {
    console.error('Error in GET /api/alerts/rules:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/alerts/rules
 * Create alert rule
 */
router.post('/rules', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { propertyId, name, rule_type, conditions, severity, min_interval_hours } = req.body

    // Validate required fields
    if (!propertyId || !name || !rule_type || !conditions || !severity) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Verify property belongs to user
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (!property) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Create rule
    const { data: rule, error } = await supabase
      .from('alert_rules')
      .insert({
        userId,
        propertyId,
        name,
        rule_type,
        conditions,
        severity,
        min_interval_hours: min_interval_hours || 24,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating alert rule:', error)
      return res.status(500).json({ error: 'Failed to create alert rule' })
    }

    return res.status(201).json({ rule })
  } catch (error) {
    console.error('Error in POST /api/alerts/rules:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /api/alerts/rules/:id
 * Update alert rule
 */
router.put('/rules/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params
    const { name, conditions, severity, min_interval_hours, is_active } = req.body

    // Verify rule belongs to user
    const { data: existingRule } = await supabase
      .from('alert_rules')
      .select('id')
      .eq('id', id)
      .eq('userId', userId)
      .single()

    if (!existingRule) {
      return res.status(404).json({ error: 'Alert rule not found' })
    }

    // Build update object
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (conditions !== undefined) updates.conditions = conditions
    if (severity !== undefined) updates.severity = severity
    if (min_interval_hours !== undefined) updates.min_interval_hours = min_interval_hours
    if (is_active !== undefined) updates.is_active = is_active

    // Update rule
    const { data: rule, error } = await supabase
      .from('alert_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating alert rule:', error)
      return res.status(500).json({ error: 'Failed to update alert rule' })
    }

    return res.json({ rule })
  } catch (error) {
    console.error('Error in PUT /api/alerts/rules/:id:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/alerts/rules/:id
 * Delete alert rule
 */
router.delete('/rules/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    // Verify rule belongs to user
    const { data: rule } = await supabase
      .from('alert_rules')
      .select('id')
      .eq('id', id)
      .eq('userId', userId)
      .single()

    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' })
    }

    // Delete rule
    const { error } = await supabase.from('alert_rules').delete().eq('id', id)

    if (error) {
      console.error('Error deleting alert rule:', error)
      return res.status(500).json({ error: 'Failed to delete alert rule' })
    }

    return res.json({ success: true, message: 'Alert rule deleted' })
  } catch (error) {
    console.error('Error in DELETE /api/alerts/rules/:id:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================================
// Alert Settings Endpoints
// ============================================================================

/**
 * GET /api/alerts/settings
 * Get user's alert settings
 */
router.get('/settings', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const { data: settings, error } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('userId', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching alert settings:', error)
      return res.status(500).json({ error: 'Failed to fetch alert settings' })
    }

    // Return default settings if none exist
    if (!settings) {
      return res.json({
        userId,
        email_enabled: true,
        email_frequency: 'daily',
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        min_severity: 'medium',
      })
    }

    return res.json(settings)
  } catch (error) {
    console.error('Error in GET /api/alerts/settings:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /api/alerts/settings
 * Update user's alert settings
 */
router.put('/settings', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { email_enabled, email_frequency, quiet_hours_start, quiet_hours_end, min_severity } =
      req.body

    // Build update object
    const updates: any = { userId }
    if (email_enabled !== undefined) updates.email_enabled = email_enabled
    if (email_frequency !== undefined) updates.email_frequency = email_frequency
    if (quiet_hours_start !== undefined) updates.quiet_hours_start = quiet_hours_start
    if (quiet_hours_end !== undefined) updates.quiet_hours_end = quiet_hours_end
    if (min_severity !== undefined) updates.min_severity = min_severity

    // Upsert settings
    const { data: settings, error } = await supabase
      .from('alert_settings')
      .upsert(updates, { onConflict: 'userId' })
      .select()
      .single()

    if (error) {
      console.error('Error updating alert settings:', error)
      return res.status(500).json({ error: 'Failed to update alert settings' })
    }

    return res.json(settings)
  } catch (error) {
    console.error('Error in PUT /api/alerts/settings:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================================================
// Utility Endpoints
// ============================================================================

/**
 * POST /api/alerts/test/:propertyId
 * Manually trigger alert evaluation for a property (for testing)
 */
router.post('/test/:propertyId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { propertyId } = req.params

    // Verify property belongs to user
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('userId', userId)
      .single()

    if (!property) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Run alert evaluation
    const alerts = await AlertEngine.evaluatePropertyRules(propertyId)

    // Create alert records
    const createdAlerts = []
    for (const alert of alerts) {
      const alertId = await AlertEngine.createAlert(alert)
      if (alertId) {
        createdAlerts.push({ id: alertId, ...alert })
      }
    }

    return res.json({
      success: true,
      message: `Evaluated ${alerts.length} triggered alerts`,
      alerts: createdAlerts,
    })
  } catch (error) {
    console.error('Error in POST /api/alerts/test/:propertyId:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
