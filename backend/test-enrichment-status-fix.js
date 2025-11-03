#!/usr/bin/env node

/**
 * Test Enrichment Status Fix
 * Verifies that the endpoint works with both property ID and job ID
 */

import dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') })

const BACKEND_URL = 'http://localhost:3001'

// You'll need to get a valid auth token from your app
// Option 1: Log in via frontend and copy token from localStorage
// Option 2: Use Supabase client to get token programmatically

async function testEnrichmentStatusEndpoint() {
  console.log('🧪 Testing Enrichment Status Endpoint Fix\n')

  // Test 1: Property ID (UUID format)
  const propertyId = 'bbf67c1f-974d-43b4-81e8-e9a834ceefe1'

  console.log(`Test 1: Request with Property ID`)
  console.log(`URL: ${BACKEND_URL}/api/enrichment/status/${propertyId}`)
  console.log(`Expected: Should find latest job OR return "already enriched"`)
  console.log(`Status: ⏳ Manual testing required (needs auth token)\n`)

  // Test 2: Job ID (with enrich- prefix)
  const jobId = 'enrich-bbf67c1f-974d-43b4-81e8-e9a834ceefe1-1761995750431'

  console.log(`Test 2: Request with Job ID`)
  console.log(`URL: ${BACKEND_URL}/api/enrichment/status/${jobId}`)
  console.log(`Expected: Should return job status directly`)
  console.log(`Status: ⏳ Manual testing required (needs auth token)\n`)

  console.log('📝 Manual Test Steps:')
  console.log('1. Log in to frontend (http://localhost:5173)')
  console.log('2. Open DevTools → Application → Local Storage')
  console.log('3. Copy the auth token')
  console.log('4. Run these curl commands:\n')

  console.log(`# Test with property ID:`)
  console.log(`curl -H "Authorization: Bearer YOUR_TOKEN" \\`)
  console.log(`  ${BACKEND_URL}/api/enrichment/status/${propertyId}\n`)

  console.log(`# Test with job ID:`)
  console.log(`curl -H "Authorization: Bearer YOUR_TOKEN" \\`)
  console.log(`  ${BACKEND_URL}/api/enrichment/status/${jobId}\n`)

  console.log('✅ Expected Results:')
  console.log('- Property ID: Should return { status: "complete", progress: 100, message: "Data already enriched" }')
  console.log('- Job ID: Should return detailed job status OR 404 if job expired\n')

  console.log('🔍 Check Backend Logs:')
  console.log('Look for:')
  console.log('  📊 Checking enrichment status for: bbf67c1f-...')
  console.log('  🔍 Not a job ID, searching for latest job for property: bbf67c1f-...')
  console.log('  ✅ Found latest job: enrich-bbf67c1f-...')
  console.log('  OR')
  console.log('  ✅ Data already enriched (returning complete status)\n')

  console.log('💡 Tip: Upload a new CSV to test real-time job tracking!')
}

testEnrichmentStatusEndpoint()
