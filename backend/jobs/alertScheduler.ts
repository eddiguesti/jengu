/**
 * Alert Scheduler
 * ================
 * Nightly batch job that evaluates alert rules for all properties
 * and creates alert records for triggered alerts.
 *
 * Schedule: Runs daily at 2:00 AM (configurable)
 *
 * Features:
 *   - Batch evaluation of all active alert rules
 *   - Error recovery and retry logic
 *   - Performance tracking
 *   - Email digest scheduling
 */

import { CronJob } from 'cron';
import { createClient } from '@supabase/supabase-js';
import { AlertEngine } from '../services/alertEngine';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configurable schedule (default: 2:00 AM daily)
const CRON_SCHEDULE = process.env.ALERT_CRON_SCHEDULE || '0 2 * * *';
const BATCH_SIZE = parseInt(process.env.ALERT_BATCH_SIZE || '10', 10);
const ENABLE_EMAIL_DIGEST = process.env.ENABLE_EMAIL_DIGEST !== 'false';

/**
 * Run nightly alert evaluation for all properties
 */
async function runAlertEvaluation(): Promise<{
  success: boolean;
  stats: {
    propertiesEvaluated: number;
    rulesEvaluated: number;
    alertsCreated: number;
    errors: number;
    duration: number;
  };
}> {
  const startTime = Date.now();
  console.log('🌙 Starting nightly alert evaluation...');

  let propertiesEvaluated = 0;
  let rulesEvaluated = 0;
  let alertsCreated = 0;
  let errors = 0;

  try {
    // Get all properties with active alert rules
    const { data: activeRules } = await supabase
      .from('alert_rules')
      .select('propertyId, userId')
      .eq('is_active', true);

    if (!activeRules || activeRules.length === 0) {
      console.log('ℹ️  No active alert rules found');
      return {
        success: true,
        stats: {
          propertiesEvaluated: 0,
          rulesEvaluated: 0,
          alertsCreated: 0,
          errors: 0,
          duration: Date.now() - startTime,
        },
      };
    }

    // Get unique property IDs
    const propertyIds = Array.from(new Set(activeRules.map((r: any) => r.propertyId)));
    console.log(`📊 Found ${propertyIds.length} properties with active alert rules`);

    // Process properties in batches to avoid overwhelming the system
    for (let i = 0; i < propertyIds.length; i += BATCH_SIZE) {
      const batch = propertyIds.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (propertyId: string) => {
        try {
          // Evaluate all rules for this property
          const alerts = await AlertEngine.evaluatePropertyRules(propertyId);
          propertiesEvaluated++;

          // Get rule count for this property
          const { count: ruleCount } = await supabase
            .from('alert_rules')
            .select('*', { count: 'exact', head: true })
            .eq('propertyId', propertyId)
            .eq('is_active', true);

          rulesEvaluated += ruleCount || 0;

          // Create alert records for triggered alerts
          for (const alert of alerts) {
            const alertId = await AlertEngine.createAlert(alert);
            if (alertId) {
              alertsCreated++;
            }
          }

          console.log(
            `✅ Evaluated property ${propertyId}: ${ruleCount} rules, ${alerts.length} alerts`
          );
        } catch (error) {
          console.error(`❌ Error evaluating property ${propertyId}:`, error);
          errors++;
        }
      });

      // Wait for batch to complete before processing next batch
      await Promise.all(batchPromises);
    }

    const duration = Date.now() - startTime;
    console.log('');
    console.log('✅ Alert evaluation complete!');
    console.log(`   Properties evaluated: ${propertiesEvaluated}`);
    console.log(`   Rules evaluated: ${rulesEvaluated}`);
    console.log(`   Alerts created: ${alertsCreated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Duration: ${duration}ms`);

    // Log run summary
    await supabase.from('job_runs').insert({
      job_name: 'alert_evaluation',
      status: errors > 0 ? 'completed_with_errors' : 'success',
      stats: {
        propertiesEvaluated,
        rulesEvaluated,
        alertsCreated,
        errors,
        duration,
      },
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
    });

    return {
      success: true,
      stats: {
        propertiesEvaluated,
        rulesEvaluated,
        alertsCreated,
        errors,
        duration,
      },
    };
  } catch (error) {
    console.error('❌ Fatal error in alert evaluation:', error);
    errors++;

    // Log failed run
    await supabase.from('job_runs').insert({
      job_name: 'alert_evaluation',
      status: 'failed',
      error: String(error),
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
    });

    return {
      success: false,
      stats: {
        propertiesEvaluated,
        rulesEvaluated,
        alertsCreated,
        errors,
        duration: Date.now() - startTime,
      },
    };
  }
}

/**
 * Schedule email digest delivery for users with pending alerts
 */
async function scheduleEmailDigests(): Promise<void> {
  if (!ENABLE_EMAIL_DIGEST) {
    console.log('ℹ️  Email digests disabled');
    return;
  }

  try {
    console.log('📧 Scheduling email digests...');

    // Get users with pending alerts from last 24 hours
    const { data: usersWithAlerts } = await supabase
      .from('alert_history')
      .select('userId')
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('userId');

    if (!usersWithAlerts || usersWithAlerts.length === 0) {
      console.log('ℹ️  No pending alerts for email digest');
      return;
    }

    const uniqueUserIds = Array.from(new Set(usersWithAlerts.map((a: any) => a.userId)));
    console.log(`📧 Scheduling email digests for ${uniqueUserIds.length} users`);

    // Queue email digest jobs
    for (const userId of uniqueUserIds) {
      // Check user's alert settings
      const { data: settings } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('userId', userId)
        .single();

      // Skip if user has disabled email notifications
      if (settings && !settings.email_enabled) {
        console.log(`⏭️  Skipping user ${userId} (email disabled)`);
        continue;
      }

      // Check if we're in quiet hours
      const { data: quietHoursCheck } = await supabase.rpc('is_in_quiet_hours', {
        p_user_id: userId,
      });

      if (quietHoursCheck) {
        console.log(`⏭️  Skipping user ${userId} (quiet hours)`);
        continue;
      }

      // Queue email digest job (will be picked up by email delivery service)
      await supabase.from('email_queue').insert({
        userId,
        email_type: 'alert_digest',
        scheduled_at: new Date().toISOString(),
        status: 'pending',
      });

      console.log(`✅ Queued email digest for user ${userId}`);
    }

    console.log('✅ Email digest scheduling complete');
  } catch (error) {
    console.error('❌ Error scheduling email digests:', error);
  }
}

/**
 * Main scheduler function
 */
export async function startAlertScheduler(): Promise<void> {
  console.log('🚀 Starting Alert Scheduler...');
  console.log(`   Schedule: ${CRON_SCHEDULE}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Email digests: ${ENABLE_EMAIL_DIGEST ? 'enabled' : 'disabled'}`);
  console.log('');

  // Create cron job
  const job = new CronJob(
    CRON_SCHEDULE,
    async () => {
      console.log('');
      console.log('==================================================');
      console.log(`🕐 Alert Scheduler triggered at ${new Date().toISOString()}`);
      console.log('==================================================');
      console.log('');

      // Run alert evaluation
      const result = await runAlertEvaluation();

      // Schedule email digests if evaluation succeeded
      if (result.success) {
        await scheduleEmailDigests();
      }

      console.log('');
      console.log('==================================================');
      console.log('🏁 Alert Scheduler run complete');
      console.log('==================================================');
      console.log('');
    },
    null, // onComplete
    true, // start immediately
    'America/New_York' // timezone (adjust as needed)
  );

  console.log('✅ Alert Scheduler started successfully');
  console.log(`   Next run: ${job.nextDate().toISOString()}`);
}

/**
 * Stop the scheduler
 */
export function stopAlertScheduler(): void {
  console.log('🛑 Stopping Alert Scheduler...');
  // Implementation depends on how you store the cron job reference
}

/**
 * Manual trigger for testing
 */
export async function manualTrigger(): Promise<void> {
  console.log('🧪 Manual trigger of alert evaluation...');
  const result = await runAlertEvaluation();

  if (result.success) {
    await scheduleEmailDigests();
  }

  console.log('✅ Manual trigger complete');
}

// If this file is run directly, start the scheduler
if (require.main === module) {
  startAlertScheduler().catch((error) => {
    console.error('Failed to start alert scheduler:', error);
    process.exit(1);
  });
}

export default { startAlertScheduler, stopAlertScheduler, manualTrigger };
