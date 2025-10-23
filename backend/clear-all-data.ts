#!/usr/bin/env tsx

/**
 * Clear All Data from Supabase
 *
 * This script deletes ALL data from the database tables:
 * - pricing_data (all pricing records)
 * - properties (all uploaded files)
 * - business_settings (all business profiles)
 *
 * WARNING: This is destructive and cannot be undone!
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function clearAllData() {
  console.log('🗑️  Starting database cleanup...\n')

  try {
    // 1. Delete all pricing_data (child records first due to foreign keys)
    console.log('1️⃣  Deleting all pricing data...')
    const { error: pricingError, count: pricingCount } = await supabase
      .from('pricing_data')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using dummy condition)

    if (pricingError) {
      console.error('   ❌ Error deleting pricing_data:', pricingError.message)
    } else {
      console.log(`   ✅ Deleted ${pricingCount ?? 'all'} pricing records`)
    }

    // 2. Delete all properties
    console.log('\n2️⃣  Deleting all properties (uploaded files)...')
    const { error: propertiesError, count: propertiesCount } = await supabase
      .from('properties')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (propertiesError) {
      console.error('   ❌ Error deleting properties:', propertiesError.message)
    } else {
      console.log(`   ✅ Deleted ${propertiesCount ?? 'all'} property records`)
    }

    // 3. Delete all business_settings
    console.log('\n3️⃣  Deleting all business settings...')
    const { error: settingsError, count: settingsCount } = await supabase
      .from('business_settings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (settingsError) {
      console.error('   ❌ Error deleting business_settings:', settingsError.message)
    } else {
      console.log(`   ✅ Deleted ${settingsCount ?? 'all'} business setting records`)
    }

    // 4. Verify tables are empty
    console.log('\n4️⃣  Verifying cleanup...')

    const { count: remainingPricing } = await supabase
      .from('pricing_data')
      .select('*', { count: 'exact', head: true })

    const { count: remainingProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })

    const { count: remainingSettings } = await supabase
      .from('business_settings')
      .select('*', { count: 'exact', head: true })

    console.log(`   pricing_data: ${remainingPricing ?? 0} rows`)
    console.log(`   properties: ${remainingProperties ?? 0} rows`)
    console.log(`   business_settings: ${remainingSettings ?? 0} rows`)

    if (
      (remainingPricing ?? 0) === 0 &&
      (remainingProperties ?? 0) === 0 &&
      (remainingSettings ?? 0) === 0
    ) {
      console.log('\n✅ Database successfully cleared!')
      console.log('   All tables are now empty and ready for fresh data.')
    } else {
      console.log('\n⚠️  Some data may still remain. Check table counts above.')
    }

    console.log('\n🎯 Next steps:')
    console.log('   1. Log out and log back in to the app')
    console.log('   2. Upload your CSV file')
    console.log('   3. Test the enrichment process')
  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the cleanup
clearAllData()
