/**
 * API Integration Tests
 * Tests backend endpoints with real data flow
 *
 * Run with: npx tsx backend/test/api-integration.test.ts
 */

import { createClient } from '@supabase/supabase-js'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

// Test user credentials (you'll need to create this user in Supabase)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@jengu.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test123456'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration?: number
}

const results: TestResult[] = []

/**
 * Helper to run a test and record results
 */
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now()
  try {
    await fn()
    results.push({ name, passed: true, duration: Date.now() - start })
    console.log(`✅ ${name}`)
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message, duration: Date.now() - start })
    console.error(`❌ ${name}`)
    console.error(`   Error: ${error.message}`)
  }
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('🧪 Starting API Integration Tests\n')
  console.log(`Backend: ${BACKEND_URL}`)
  console.log(`Supabase: ${SUPABASE_URL}\n`)

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  let authToken: string | null = null
  let userId: string | null = null
  let propertyId: string | null = null

  // Test 1: Authentication
  await test('Authentication - Sign in with email/password', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    if (error) throw new Error(`Auth failed: ${error.message}`)
    if (!data.session) throw new Error('No session returned')

    authToken = data.session.access_token
    userId = data.user.id

    if (!authToken) throw new Error('No auth token received')
  })

  if (!authToken) {
    console.error('\n⚠️  Authentication failed - skipping remaining tests')
    printResults()
    return
  }

  // Test 2: Health check
  await test('GET /api/health - Health check endpoint', async () => {
    const response = await fetch(`${BACKEND_URL}/api/health`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = (await response.json()) as { status: string }
    if (data.status !== 'ok') throw new Error('Health check failed')
  })

  // Test 3: Get uploaded files
  await test('GET /api/data/files - Fetch uploaded files', async () => {
    const response = await fetch(`${BACKEND_URL}/api/data/files`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = (await response.json()) as { files: Array<{ id: string }> }
    if (!Array.isArray(data.files)) throw new Error('Expected files array')

    // Use first property for subsequent tests
    if (data.files.length > 0) {
      propertyId = data.files[0].id
    }
  })

  if (!propertyId) {
    console.warn('\n⚠️  No properties found - upload a CSV file to run full test suite')
  }

  // Test 4: Pricing quote validation
  await test('POST /api/pricing/quote - Request pricing quote with validation', async () => {
    if (!propertyId) {
      console.log('   ⏭️  Skipped (no property available)')
      return
    }

    const quoteRequest = {
      propertyId,
      stayDate: '2025-01-15',
      product: {
        type: 'standard',
        refundable: false,
        los: 1,
      },
      toggles: {
        risk_mode: 'balanced',
        strategy_fill_vs_rate: 50,
        exploration_pct: 5,
      },
    }

    const response = await fetch(`${BACKEND_URL}/api/pricing/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(quoteRequest),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string }
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`)
    }

    const data = (await response.json()) as { quote_id?: string; recommended_price?: number }
    if (!data.quote_id) throw new Error('No quote_id in response')
    if (typeof data.recommended_price !== 'number')
      throw new Error('No recommended_price in response')
  })

  // Test 5: Pricing quote validation - invalid request
  await test('POST /api/pricing/quote - Reject invalid request (Zod validation)', async () => {
    const invalidRequest = {
      propertyId: '', // Invalid: empty string
      stayDate: 'invalid-date', // Invalid: wrong format
      product: {
        type: 'standard',
        refundable: false,
        los: -1, // Invalid: negative number
      },
    }

    const response = await fetch(`${BACKEND_URL}/api/pricing/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(invalidRequest),
    })

    // Should return 400 Bad Request
    if (response.status !== 400) {
      throw new Error(`Expected HTTP 400, got ${response.status}`)
    }

    const data = (await response.json()) as { error?: string }
    if (data.error !== 'VALIDATION_ERROR') {
      throw new Error('Expected VALIDATION_ERROR')
    }
  })

  // Test 6: Analytics endpoint
  await test('POST /api/analytics/revenue-series - Fetch revenue time series', async () => {
    if (!propertyId) {
      console.log('   ⏭️  Skipped (no property available)')
      return
    }

    const analyticsRequest = {
      propertyId,
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31',
      },
    }

    const response = await fetch(`${BACKEND_URL}/api/analytics/revenue-series`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(analyticsRequest),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string }
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`)
    }

    const data = (await response.json()) as { dates?: unknown[] }
    // Currently returns empty arrays (scaffolded endpoint)
    if (!Array.isArray(data.dates)) throw new Error('Expected dates array')
  })

  // Test 7: Database verification
  await test('Database - Verify RLS policies allow user access', async () => {
    if (!userId) throw new Error('No userId available')

    // Query properties table directly via Supabase client
    const { data, error } = await supabase.from('properties').select('*').limit(10)

    if (error) throw new Error(`RLS policy error: ${error.message}`)
    if (!Array.isArray(data)) throw new Error('Expected array response')
  })

  // Print results
  printResults()
}

/**
 * Print test results summary
 */
function printResults() {
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Results Summary')
  console.log('='.repeat(60))
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   • ${r.name}`)
        console.log(`     ${r.error}`)
      })
  }

  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0)
  console.log(`\n⏱️  Total Duration: ${totalDuration}ms`)

  if (failed === 0) {
    console.log('\n✅ All tests passed!')
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed`)
    process.exit(1)
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
