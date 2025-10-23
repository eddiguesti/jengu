#!/usr/bin/env tsx

/**
 * Complete Data Pipeline Audit
 *
 * This script checks every stage of the data pipeline:
 * 1. File upload and storage
 * 2. Enrichment (temporal, weather, holidays)
 * 3. Data retrieval and transformation
 * 4. Analytics endpoints
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function auditDataPipeline() {
  console.log('🔍 COMPLETE DATA PIPELINE AUDIT\n')
  console.log('='.repeat(80))

  // 1. Check Properties (uploaded files)
  console.log('\n📁 STEP 1: File Upload & Storage')
  console.log('-'.repeat(80))

  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (propError) {
    console.error('❌ Error fetching properties:', propError.message)
  } else {
    console.log(`✅ Found ${properties?.length || 0} file(s) in database`)

    if (properties && properties.length > 0) {
      properties.forEach((prop, idx) => {
        console.log(`\n   File #${idx + 1}:`)
        console.log(`   - ID: ${prop.id}`)
        console.log(`   - Name: ${prop.file_name}`)
        console.log(`   - User ID: ${prop.user_id}`)
        console.log(`   - Status: ${prop.status}`)
        console.log(`   - Location: ${prop.location_name} (${prop.latitude}, ${prop.longitude})`)
        console.log(`   - Country: ${prop.country_code}`)
        console.log(`   - Uploaded: ${new Date(prop.created_at).toLocaleString()}`)
        console.log(`   - Enriched: ${prop.enriched ? '✅ Yes' : '❌ No'}`)
      })
    }
  }

  // 2. Check Pricing Data (actual records)
  console.log('\n\n💰 STEP 2: Pricing Data Records')
  console.log('-'.repeat(80))

  const {
    data: pricingData,
    error: pricingError,
    count,
  } = await supabase.from('pricing_data').select('*', { count: 'exact' }).limit(5)

  if (pricingError) {
    console.error('❌ Error fetching pricing data:', pricingError.message)
  } else {
    console.log(`✅ Total pricing records: ${count}`)

    if (pricingData && pricingData.length > 0) {
      console.log(`\n   Showing first ${pricingData.length} records:`)

      pricingData.forEach((record, idx) => {
        console.log(`\n   Record #${idx + 1}:`)
        console.log(`   - Property ID: ${record.property_id}`)
        console.log(`   - Date: ${record.date}`)
        console.log(`   - Rate: €${record.rate}`)
        console.log(`   - Occupancy: ${record.occupancy}%`)
        console.log(`   - Revenue: €${record.revenue}`)

        // Check enrichment fields
        console.log(`   - Enrichment:`)
        console.log(`     - Day of Week: ${record.day_of_week || 'missing'}`)
        console.log(`     - Month: ${record.month || 'missing'}`)
        console.log(`     - Week of Year: ${record.week_of_year || 'missing'}`)
        console.log(
          `     - Temperature: ${record.temperature ? record.temperature + '°C' : 'missing'}`
        )
        console.log(`     - Weather: ${record.weather_description || 'missing'}`)
        console.log(`     - Is Holiday: ${record.is_holiday ? 'Yes' : 'No'}`)
        console.log(`     - Holiday Name: ${record.holiday_name || 'N/A'}`)
      })

      // Check for enrichment completeness
      const enrichedCount = pricingData.filter(r => r.day_of_week && r.temperature).length
      const enrichmentRate = (enrichedCount / pricingData.length) * 100

      console.log(`\n   📊 Enrichment Status:`)
      console.log(
        `   - ${enrichedCount}/${pricingData.length} records enriched (${enrichmentRate.toFixed(0)}%)`
      )

      if (enrichmentRate < 100) {
        console.log(`   ⚠️  Some records are missing enrichment data`)
      } else {
        console.log(`   ✅ All sampled records are fully enriched`)
      }
    }
  }

  // 3. Check data quality
  console.log('\n\n🔬 STEP 3: Data Quality Check')
  console.log('-'.repeat(80))

  if (pricingData && pricingData.length > 0) {
    // Check for required fields
    const requiredFields = ['date', 'rate', 'occupancy', 'revenue', 'property_id']
    const missingFields = new Set<string>()

    pricingData.forEach(record => {
      requiredFields.forEach(field => {
        if (record[field] === null || record[field] === undefined) {
          missingFields.add(field)
        }
      })
    })

    if (missingFields.size === 0) {
      console.log('✅ All required fields present')
    } else {
      console.log(`❌ Missing fields: ${Array.from(missingFields).join(', ')}`)
    }

    // Check data types
    const rates = pricingData.map(r => r.rate).filter(r => r !== null)
    const occupancies = pricingData.map(r => r.occupancy).filter(o => o !== null)

    console.log(`\n   📈 Value Ranges:`)
    console.log(`   - Rates: €${Math.min(...rates)} - €${Math.max(...rates)}`)
    console.log(`   - Occupancy: ${Math.min(...occupancies)}% - ${Math.max(...occupancies)}%`)

    // Check for outliers
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
    const avgOccupancy = occupancies.reduce((a, b) => a + b, 0) / occupancies.length

    console.log(`   - Average Rate: €${avgRate.toFixed(2)}`)
    console.log(`   - Average Occupancy: ${avgOccupancy.toFixed(1)}%`)
  }

  // 4. Check enrichment completeness across all data
  console.log('\n\n🌤️  STEP 4: Enrichment Completeness')
  console.log('-'.repeat(80))

  const { data: enrichmentStats } = await supabase
    .from('pricing_data')
    .select('day_of_week, temperature, weather_description, is_holiday')
    .not('day_of_week', 'is', null)

  const { count: totalCount } = await supabase
    .from('pricing_data')
    .select('*', { count: 'exact', head: true })

  const enrichedRecords = enrichmentStats?.length || 0
  const totalRecords = totalCount || 0
  const enrichmentPercentage = totalRecords > 0 ? (enrichedRecords / totalRecords) * 100 : 0

  console.log(
    `   Temporal Enrichment: ${enrichedRecords}/${totalRecords} records (${enrichmentPercentage.toFixed(1)}%)`
  )

  if (enrichmentPercentage >= 100) {
    console.log(`   ✅ Full temporal enrichment`)
  } else if (enrichmentPercentage >= 80) {
    console.log(`   ⚠️  Partial temporal enrichment`)
  } else {
    console.log(`   ❌ Low temporal enrichment coverage`)
  }

  // Check weather enrichment
  const { count: weatherCount } = await supabase
    .from('pricing_data')
    .select('*', { count: 'exact', head: true })
    .not('temperature', 'is', null)

  const weatherPercentage = totalRecords > 0 ? ((weatherCount || 0) / totalRecords) * 100 : 0
  console.log(
    `   Weather Enrichment: ${weatherCount}/${totalRecords} records (${weatherPercentage.toFixed(1)}%)`
  )

  if (weatherPercentage >= 100) {
    console.log(`   ✅ Full weather enrichment`)
  } else if (weatherPercentage >= 80) {
    console.log(`   ⚠️  Partial weather enrichment`)
  } else {
    console.log(`   ❌ Low weather enrichment coverage`)
  }

  // 5. Check business settings
  console.log('\n\n⚙️  STEP 5: Business Settings')
  console.log('-'.repeat(80))

  const { data: settings, error: settingsError } = await supabase
    .from('business_settings')
    .select('*')

  if (settingsError) {
    console.error('❌ Error fetching business settings:', settingsError.message)
  } else if (!settings || settings.length === 0) {
    console.log('⚠️  No business settings configured')
  } else {
    console.log(`✅ Found ${settings.length} business profile(s)`)
    settings.forEach((setting, idx) => {
      console.log(`\n   Profile #${idx + 1}:`)
      console.log(`   - User ID: ${setting.user_id}`)
      console.log(`   - Business Type: ${setting.business_type || 'Not set'}`)
      console.log(`   - Property Type: ${setting.property_type || 'Not set'}`)
      console.log(`   - Room Count: ${setting.room_count || 'Not set'}`)
      console.log(`   - Target Occupancy: ${setting.target_occupancy || 'Not set'}%`)
    })
  }

  // 6. Summary
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 PIPELINE HEALTH SUMMARY')
  console.log('='.repeat(80))

  const checks = [
    { name: 'File Upload', status: properties && properties.length > 0 },
    { name: 'Pricing Data', status: totalRecords && totalRecords > 0 },
    { name: 'Temporal Enrichment', status: enrichmentPercentage >= 80 },
    { name: 'Weather Enrichment', status: weatherPercentage >= 80 },
  ]

  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌'
    const status = check.status ? 'PASS' : 'FAIL'
    console.log(`${icon} ${check.name}: ${status}`)
  })

  const passedChecks = checks.filter(c => c.status).length
  const totalChecks = checks.length
  const healthScore = (passedChecks / totalChecks) * 100

  console.log(
    `\n🎯 Overall Health Score: ${healthScore.toFixed(0)}% (${passedChecks}/${totalChecks} checks passed)`
  )

  if (healthScore === 100) {
    console.log('✅ All systems operational!')
  } else if (healthScore >= 75) {
    console.log('⚠️  System mostly operational with minor issues')
  } else {
    console.log('❌ System has significant issues requiring attention')
  }

  console.log('\n' + '='.repeat(80))
}

// Run the audit
auditDataPipeline().catch(console.error)
