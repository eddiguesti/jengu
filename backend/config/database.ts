/**
 * Database Configuration with Read Replica Support
 * =================================================
 * Configures Supabase connections for:
 *   - Primary database (read/write)
 *   - Read replica (read-only, for analytics)
 *
 * Usage:
 *   import { getPrimaryClient, getReplicaClient } from './config/database';
 *
 *   // Write operations
 *   const data = await getPrimaryClient().from('pricing_data').insert({...});
 *
 *   // Analytics/read-heavy operations
 *   const stats = await getReplicaClient().from('pricing_data').select('*');
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Environment Variables
// ============================================================================

const PRIMARY_URL = process.env.SUPABASE_URL
const PRIMARY_ANON_KEY = process.env.SUPABASE_ANON_KEY
const PRIMARY_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Read replica configuration (optional)
const REPLICA_URL = process.env.SUPABASE_REPLICA_URL || PRIMARY_URL
const REPLICA_ANON_KEY = process.env.SUPABASE_REPLICA_ANON_KEY || PRIMARY_ANON_KEY
const REPLICA_SERVICE_KEY = process.env.SUPABASE_REPLICA_SERVICE_ROLE_KEY || PRIMARY_SERVICE_KEY

// Connection pool configuration (reserved for future use)

const _POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '10', 10)

const _POOL_TIMEOUT = parseInt(process.env.DB_POOL_TIMEOUT || '20000', 10)

// ============================================================================
// Client Instances
// ============================================================================

let primaryClient: SupabaseClient | null = null
let primaryServiceClient: SupabaseClient | null = null
let replicaClient: SupabaseClient | null = null
let replicaServiceClient: SupabaseClient | null = null

// ============================================================================
// Client Factories
// ============================================================================

/**
 * Get Primary Database Client (Read/Write)
 * Use for: INSERT, UPDATE, DELETE operations
 *
 * @param useServiceRole - Use service role key (bypasses RLS)
 * @returns Supabase client for primary database
 */
export function getPrimaryClient(useServiceRole = false): SupabaseClient {
  if (!PRIMARY_URL || !PRIMARY_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set')
  }

  if (useServiceRole) {
    if (!primaryServiceClient) {
      if (!PRIMARY_SERVICE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set for service role access')
      }

      primaryServiceClient = createClient(PRIMARY_URL, PRIMARY_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      })

      console.log('✅ Primary database service client initialized')
    }
    return primaryServiceClient
  }

  if (!primaryClient) {
    primaryClient = createClient(PRIMARY_URL, PRIMARY_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      db: {
        schema: 'public',
      },
    })

    console.log('✅ Primary database client initialized')
  }

  return primaryClient
}

/**
 * Get Read Replica Client (Read-Only)
 * Use for: SELECT operations, analytics, reporting
 *
 * Benefits:
 *   - Offloads read traffic from primary database
 *   - Improved performance for analytics queries
 *   - No replication lag impact on write operations
 *
 * @param useServiceRole - Use service role key (bypasses RLS)
 * @returns Supabase client for read replica
 */
export function getReplicaClient(useServiceRole = false): SupabaseClient {
  // If replica not configured, fall back to primary
  const isReplicaConfigured = REPLICA_URL && REPLICA_URL !== PRIMARY_URL

  if (!isReplicaConfigured) {
    console.warn('⚠️  Read replica not configured, using primary database')
    return getPrimaryClient(useServiceRole)
  }

  if (!REPLICA_ANON_KEY) {
    throw new Error('SUPABASE_REPLICA_ANON_KEY must be set')
  }

  if (useServiceRole) {
    if (!replicaServiceClient) {
      if (!REPLICA_SERVICE_KEY) {
        throw new Error('SUPABASE_REPLICA_SERVICE_ROLE_KEY must be set for service role access')
      }

      replicaServiceClient = createClient(REPLICA_URL, REPLICA_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      })

      console.log('✅ Read replica service client initialized')
    }
    return replicaServiceClient
  }

  if (!replicaClient) {
    replicaClient = createClient(REPLICA_URL, REPLICA_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      db: {
        schema: 'public',
      },
    })

    console.log('✅ Read replica client initialized')
  }

  return replicaClient
}

/**
 * Check if read replica is configured
 * @returns true if replica is configured and different from primary
 */
export function isReplicaConfigured(): boolean {
  return Boolean(REPLICA_URL && REPLICA_URL !== PRIMARY_URL)
}

/**
 * Get appropriate client for operation type
 * @param operation - 'read' or 'write'
 * @param useServiceRole - Use service role key
 * @returns Supabase client
 */
export function getClient(operation: 'read' | 'write', useServiceRole = false): SupabaseClient {
  if (operation === 'write') {
    return getPrimaryClient(useServiceRole)
  }

  // For read operations, use replica if configured
  return getReplicaClient(useServiceRole)
}

// ============================================================================
// Connection Health Checks
// ============================================================================

/**
 * Check primary database connection
 * @returns true if connected
 */
export async function checkPrimaryConnection(): Promise<boolean> {
  try {
    const client = getPrimaryClient(true)
    const { error } = await client.from('properties').select('count').limit(1)

    if (error) {
      console.error('❌ Primary database connection failed:', error.message)
      return false
    }

    console.log('✓ Primary database connection healthy')
    return true
  } catch (error) {
    console.error('❌ Primary database connection error:', error)
    return false
  }
}

/**
 * Check read replica connection
 * @returns true if connected
 */
export async function checkReplicaConnection(): Promise<boolean> {
  if (!isReplicaConfigured()) {
    console.log('ℹ️  Read replica not configured, skipping check')
    return true // Not an error
  }

  try {
    const client = getReplicaClient(true)
    const { error } = await client.from('properties').select('count').limit(1)

    if (error) {
      console.error('❌ Read replica connection failed:', error.message)
      return false
    }

    console.log('✓ Read replica connection healthy')
    return true
  } catch (error) {
    console.error('❌ Read replica connection error:', error)
    return false
  }
}

/**
 * Check replication lag (if replica configured)
 * @returns lag in seconds, or null if not applicable
 */
export async function checkReplicationLag(): Promise<number | null> {
  if (!isReplicaConfigured()) {
    return null
  }

  try {
    const primary = getPrimaryClient(true)
    const replica = getReplicaClient(true)

    // Insert a test record with current timestamp
    const testId = `lag-test-${Date.now()}`
    const { error: insertError } = await primary.from('pricing_quotes').insert({
      quote_id: testId,
      userId: '00000000-0000-0000-0000-000000000000',
      propertyId: 'test',
      stay_date: new Date(),
      lead_days: 0,
      product_type: 'test',
      refundable: false,
      los: 1,
      price_offered: 0,
      shown_to_user_bool: false,
    })

    if (insertError) {
      console.error('Failed to insert lag test record:', insertError)
      return null
    }

    // Wait and check replica
    await new Promise(resolve => setTimeout(resolve, 100))

    const startTime = Date.now()
    let found = false
    let lag = 0

    // Poll replica for up to 5 seconds
    while (!found && lag < 5000) {
      const { data } = await replica
        .from('pricing_quotes')
        .select('quote_id')
        .eq('quote_id', testId)
        .limit(1)

      if (data && data.length > 0) {
        found = true
        lag = Date.now() - startTime
      } else {
        await new Promise(resolve => setTimeout(resolve, 100))
        lag = Date.now() - startTime
      }
    }

    // Clean up test record
    await primary.from('pricing_quotes').delete().eq('quote_id', testId)

    if (found) {
      console.log(`✓ Replication lag: ${lag}ms`)
      return lag / 1000 // Return in seconds
    } else {
      console.warn('⚠️  Test record not found on replica within 5 seconds')
      return null
    }
  } catch (error) {
    console.error('Error checking replication lag:', error)
    return null
  }
}

/**
 * Run all health checks
 * @returns health status
 */
export async function runHealthChecks(): Promise<{
  primary: boolean
  replica: boolean
  replicationLag: number | null
}> {
  console.log('\n========================================')
  console.log('Database Health Checks')
  console.log('========================================\n')

  const [primary, replica, replicationLag] = await Promise.all([
    checkPrimaryConnection(),
    checkReplicaConnection(),
    checkReplicationLag(),
  ])

  console.log('\n========================================')
  console.log('Health Check Summary')
  console.log('========================================')
  console.log(`Primary:          ${primary ? '✓ Healthy' : '✗ Failed'}`)
  console.log(`Replica:          ${replica ? '✓ Healthy' : '✗ Failed'}`)
  console.log(
    `Replication Lag:  ${replicationLag !== null ? `${replicationLag.toFixed(3)}s` : 'N/A'}`
  )
  console.log('========================================\n')

  return {
    primary,
    replica,
    replicationLag,
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getPrimaryClient,
  getReplicaClient,
  getClient,
  isReplicaConfigured,
  checkPrimaryConnection,
  checkReplicaConnection,
  checkReplicationLag,
  runHealthChecks,
}
