#!/usr/bin/env tsx

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

async function checkSchema() {
  console.log('🔍 Checking actual database schema...\n')

  // Get one row to see the actual columns
  const { data, error } = await supabase.from('pricing_data').select('*').limit(1)

  if (error) {
    console.error('Error:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('No data found')
    return
  }

  const record = data[0]
  console.log('📋 Actual Database Columns:')
  console.log('='.repeat(60))

  Object.keys(record)
    .sort()
    .forEach(key => {
      const value = record[key]
      const type = value === null ? 'null' : typeof value
      console.log(
        `  ${key}: ${type} = ${value === null ? 'NULL' : JSON.stringify(value).substring(0, 50)}`
      )
    })

  console.log('\n' + '='.repeat(60))
  console.log('\n🔍 What the code expects vs what exists:\n')

  const expectedFields = {
    'property_id or propertyId': 'For linking to properties table',
    'rate or price': 'The price value',
    revenue: 'Calculated from rate * occupancy',
    day_of_week: 'Temporal enrichment',
    week_of_year: 'Temporal enrichment',
    weather_description: 'Weather enrichment',
  }

  Object.entries(expectedFields).forEach(([field, description]) => {
    const variants = field.split(' or ')
    const exists = variants.some(v => v in record)
    const icon = exists ? '✅' : '❌'
    const foundVariant = variants.find(v => v in record)
    console.log(`${icon} ${field}: ${description}`)
    if (foundVariant) {
      console.log(`     Found as: "${foundVariant}"`)
    }
  })
}

checkSchema()
