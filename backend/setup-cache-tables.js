#!/usr/bin/env node

/**
 * Setup Cache Tables Script
 * Creates weather_cache and holiday_cache tables in Supabase
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as fs from 'fs'

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

console.log('🗄️  Setting up cache tables...\n')

// Read SQL file
const sqlFilePath = path.join(__dirname, 'prisma', 'enrichment-cache-tables.sql')
const sql = fs.readFileSync(sqlFilePath, 'utf-8')

// Execute SQL
async function setupTables() {
  try {
    console.log('📝 Executing SQL from:', sqlFilePath)

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('CREATE POLICY')) {
        console.log('   ⏳', statement.substring(0, 50) + '...')
      }

      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })

      if (error && !error.message.includes('already exists')) {
        console.error('   ❌ Error:', error.message)
      }
    }

    console.log('\n✅ Cache tables setup complete!')
    console.log('\nVerifying tables...')

    // Verify tables exist
    const { data: weatherCache, error: weatherError } = await supabase
      .from('weather_cache')
      .select('*', { count: 'exact', head: true })

    const { data: holidayCache, error: holidayError } = await supabase
      .from('holiday_cache')
      .select('*', { count: 'exact', head: true })

    if (!weatherError) {
      console.log('✅ weather_cache table: Ready')
    } else {
      console.log('⚠️  weather_cache table: Not found (may need manual setup)')
    }

    if (!holidayError) {
      console.log('✅ holiday_cache table: Ready')
    } else {
      console.log('⚠️  holiday_cache table: Not found (may need manual setup)')
    }

    console.log('\n🎉 Setup complete!')
    console.log('\nIf tables were not created automatically, please:')
    console.log('1. Open Supabase Dashboard → SQL Editor')
    console.log('2. Copy contents of: backend/prisma/enrichment-cache-tables.sql')
    console.log('3. Paste and click "Run"')

  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
    console.log('\n📋 Manual setup required:')
    console.log('1. Open Supabase Dashboard → SQL Editor')
    console.log('2. Copy contents of: backend/prisma/enrichment-cache-tables.sql')
    console.log('3. Paste and click "Run"')
    process.exit(1)
  }
}

setupTables()
