/**
 * Alert Delivery Service
 * =======================
 * Handles email delivery for alerts using SendGrid or similar email provider.
 *
 * Features:
 *   - Single alert emails (immediate)
 *   - Daily digest emails (batch)
 *   - Template rendering with Mustache
 *   - Delivery tracking and retry logic
 *   - Email queue processing
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import Mustache from 'mustache';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Email configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL || 'alerts@jengu.app';
const FROM_NAME = process.env.ALERT_FROM_NAME || 'Jengu Alerts';
const BASE_URL = process.env.BASE_URL || 'https://app.jengu.com';

// Template paths
const TEMPLATE_DIR = path.join(__dirname, '../email-templates');
const DIGEST_TEMPLATE = 'alert-digest.html';
const SINGLE_ALERT_TEMPLATE = 'single-alert.html';

/**
 * Load and render email template
 */
async function renderTemplate(
  templateName: string,
  data: any
): Promise<string> {
  const templatePath = path.join(TEMPLATE_DIR, templateName);
  const template = await fs.readFile(templatePath, 'utf-8');

  // Add common variables
  const templateData = {
    ...data,
    baseUrl: BASE_URL,
    year: new Date().getFullYear(),
    date: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };

  return Mustache.render(template, templateData);
}

/**
 * Send email using SendGrid (or your preferred provider)
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn('⚠️  SendGrid API key not configured. Email not sent.');
      console.log('📧 Would send email:');
      console.log(`   To: ${params.to}`);
      console.log(`   Subject: ${params.subject}`);
      return { success: false, error: 'SendGrid not configured' };
    }

    // SendGrid API call
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
          },
        ],
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: params.subject,
        content: [
          {
            type: 'text/html',
            value: params.html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SendGrid API error:', errorText);
      return { success: false, error: errorText };
    }

    const messageId = response.headers.get('X-Message-Id') || 'unknown';
    console.log(`✅ Email sent successfully (${messageId})`);

    return { success: true, messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send single alert email
 */
export async function sendSingleAlert(alertId: string): Promise<boolean> {
  try {
    // Fetch alert details
    const { data: alert, error } = await supabase
      .from('alert_history')
      .select(
        `
        *,
        alert_rule:alert_rules(*),
        user:users(*),
        property:properties(*)
      `
      )
      .eq('id', alertId)
      .single();

    if (error || !alert) {
      console.error('❌ Failed to fetch alert:', error);
      return false;
    }

    // Get user email
    const userEmail = alert.user.email;
    if (!userEmail) {
      console.error('❌ No email address for user');
      return false;
    }

    // Format alert data for template
    const templateData = {
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      propertyName: alert.property.name,
      propertyId: alert.propertyId,
      alertId: alert.id,
      triggeredAt: new Date(alert.created_at).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }),
      actionUrl: alert.action_url,
      actionText: getActionText(alert.alert_type),
      hasData: alert.data && Object.keys(alert.data).length > 0,
      data: alert.data
        ? Object.entries(alert.data).map(([key, value]) => ({
            label: formatLabel(key),
            value: formatValue(value),
          }))
        : [],
      recommendations: getRecommendations(alert.alert_type, alert.data),
    };

    // Render template
    const html = await renderTemplate(SINGLE_ALERT_TEMPLATE, templateData);

    // Send email
    const emailSubject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const result = await sendEmail({
      to: userEmail,
      subject: emailSubject,
      html,
    });

    if (result.success) {
      // Update alert status
      await supabase
        .from('alert_history')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          delivery_metadata: {
            messageId: result.messageId,
            sentAt: new Date().toISOString(),
          },
        })
        .eq('id', alertId);

      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error sending single alert:', error);
    return false;
  }
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(userId: string): Promise<boolean> {
  try {
    // Fetch user details
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user || !user.email) {
      console.error('❌ No email address for user');
      return false;
    }

    // Fetch pending alerts from last 24 hours
    const { data: alerts } = await supabase
      .from('alert_history')
      .select(
        `
        *,
        property:properties(name)
      `
      )
      .eq('userId', userId)
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false });

    if (!alerts || alerts.length === 0) {
      console.log(`ℹ️  No pending alerts for user ${userId}`);
      return false;
    }

    // Calculate summary stats
    const severityCounts = {
      critical: alerts.filter((a) => a.severity === 'critical').length,
      high: alerts.filter((a) => a.severity === 'high').length,
      medium: alerts.filter((a) => a.severity === 'medium').length,
      low: alerts.filter((a) => a.severity === 'low').length,
    };

    const uniqueProperties = new Set(alerts.map((a) => a.propertyId));

    // Format alerts for template
    const formattedAlerts = alerts.map((alert) => ({
      ...alert,
      propertyName: alert.property.name,
      createdAt: new Date(alert.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }),
    }));

    // Render template
    const templateData = {
      alerts: formattedAlerts,
      totalAlerts: alerts.length,
      propertiesCount: uniqueProperties.size,
      criticalCount: severityCounts.critical,
      highCount: severityCounts.high,
      mediumCount: severityCounts.medium,
      lowCount: severityCounts.low,
    };

    const html = await renderTemplate(DIGEST_TEMPLATE, templateData);

    // Send email
    const emailSubject = `Daily Alert Digest: ${alerts.length} alerts across ${uniqueProperties.size} properties`;
    const result = await sendEmail({
      to: user.email,
      subject: emailSubject,
      html,
    });

    if (result.success) {
      // Mark alerts as sent
      const alertIds = alerts.map((a) => a.id);
      await supabase
        .from('alert_history')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .in('id', alertIds);

      console.log(`✅ Sent digest to ${user.email} (${alerts.length} alerts)`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error sending daily digest:', error);
    return false;
  }
}

/**
 * Process email queue
 * Called by scheduler or background worker
 */
export async function processEmailQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  console.log('📧 Processing email queue...');

  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    // Fetch pending emails from queue
    const { data: queuedEmails } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(50); // Process in batches

    if (!queuedEmails || queuedEmails.length === 0) {
      console.log('ℹ️  Email queue is empty');
      return { processed: 0, sent: 0, failed: 0 };
    }

    console.log(`📧 Processing ${queuedEmails.length} queued emails...`);

    for (const email of queuedEmails) {
      processed++;

      try {
        let success = false;

        if (email.email_type === 'alert_digest') {
          success = await sendDailyDigest(email.userId);
        } else if (email.email_type === 'single_alert' && email.metadata?.alertId) {
          success = await sendSingleAlert(email.metadata.alertId);
        }

        if (success) {
          sent++;
          await supabase
            .from('email_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', email.id);
        } else {
          failed++;
          await supabase
            .from('email_queue')
            .update({ status: 'failed', error: 'Delivery failed' })
            .eq('id', email.id);
        }
      } catch (error) {
        failed++;
        console.error(`❌ Error processing email ${email.id}:`, error);
        await supabase
          .from('email_queue')
          .update({ status: 'failed', error: String(error) })
          .eq('id', email.id);
      }
    }

    console.log(`✅ Email queue processed: ${sent} sent, ${failed} failed`);
    return { processed, sent, failed };
  } catch (error) {
    console.error('❌ Error processing email queue:', error);
    return { processed, sent, failed };
  }
}

/**
 * Helper: Get action text based on alert type
 */
function getActionText(alertType: string): string {
  const actionTexts: Record<string, string> = {
    competitor_price_spike: 'Review Pricing',
    competitor_price_drop: 'Adjust Pricing',
    occupancy_low: 'View Dashboard',
    occupancy_high: 'Optimize Pricing',
    demand_surge: 'Increase Prices',
    demand_decline: 'Review Strategy',
    weather_event: 'View Details',
    holiday_upcoming: 'Optimize Pricing',
    price_optimization: 'Apply Recommendation',
  };

  return actionTexts[alertType] || 'Take Action';
}

/**
 * Helper: Format data label for display
 */
function formatLabel(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper: Format data value for display
 */
function formatValue(value: any): string {
  if (typeof value === 'number') {
    // Format as currency if it looks like a price
    if (value > 10 && value < 10000) {
      return `$${value.toFixed(2)}`;
    }
    // Format with commas
    return value.toLocaleString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

/**
 * Helper: Get recommendations based on alert type
 */
function getRecommendations(alertType: string, data: any): string[] | null {
  const recommendations: Record<string, string[]> = {
    competitor_price_spike: [
      'Review your current pricing strategy',
      'Consider adjusting prices to match market conditions',
      'Monitor competitor pricing trends over the next week',
    ],
    competitor_price_drop: [
      'Evaluate if you should lower prices to stay competitive',
      'Check if competitors are running special promotions',
      'Consider highlighting your unique value propositions',
    ],
    occupancy_low: [
      'Review your pricing to ensure competitiveness',
      'Consider running promotional campaigns',
      'Increase marketing spend on high-conversion channels',
    ],
    occupancy_high: [
      'Consider increasing prices to maximize revenue',
      'Ensure you have adequate capacity for the surge',
      'Review your cancellation policies',
    ],
    demand_surge: [
      'Increase prices to capitalize on high demand',
      'Ensure your property is well-stocked and prepared',
      'Consider extending minimum stay requirements',
    ],
    demand_decline: [
      'Review pricing and promotional strategies',
      'Analyze competitor activity in your market',
      'Consider targeted marketing campaigns',
    ],
    price_optimization: [
      'Review the ML model\'s pricing recommendation',
      'Consider A/B testing the suggested price',
      'Monitor booking conversion rates closely',
    ],
  };

  return recommendations[alertType] || null;
}

export default {
  sendSingleAlert,
  sendDailyDigest,
  processEmailQueue,
};
