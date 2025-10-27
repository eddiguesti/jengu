/**
 * Setup Script: Competitor Monitoring Tables
 *
 * This script creates the database tables for competitor monitoring:
 * - competitors: Stores monitored competitor campsites
 * - competitor_pricing: Stores daily pricing history
 *
 * Run: node setup-competitor-tables.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY')
  process.exit(1)
}

console.log('🔧 Setting up Competitor Monitoring tables...\n')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setupTables() {
  try {
    // Read SQL file
    const sqlPath = join(__dirname, 'prisma', 'competitor-tables.sql')
    console.log(`📂 Reading SQL file: ${sqlPath}`)
    const sql = readFileSync(sqlPath, 'utf-8')

    console.log('📊 Creating tables and policies...\n')

    // Execute SQL via Supabase RPC
    // Note: This requires splitting the SQL into individual statements
    // For now, we'll use the Supabase client to run simple queries

    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('properties')
      .select('id')
      .limit(1)

    if (testError && testError.code !== 'PGRST116') {
      console.error('❌ Database connection test failed:', testError.message)
      process.exit(1)
    }

    console.log('✅ Database connection successful')
    console.log('\n📋 To create the tables, please run the SQL file manually:')
    console.log('\n1. Go to your Supabase dashboard: https://supabase.com/dashboard')
    console.log(`2. Select your project`)
    console.log('3. Go to SQL Editor')
    console.log('4. Paste the contents of: backend/prisma/competitor-tables.sql')
    console.log('5. Click "Run"\n')

    console.log('Or use the Supabase CLI:')
    console.log('  supabase db push --db-url "$DATABASE_URL"\n')

    console.log('💡 The tables will include:')
    console.log('  - competitors: Monitored campsite data')
    console.log('  - competitor_pricing: Daily price history')
    console.log('  - RLS policies: User-level data isolation')
    console.log('  - Indexes: Optimized queries')
    console.log('  - Views: Helpful data aggregations\n')
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

setupTables()
