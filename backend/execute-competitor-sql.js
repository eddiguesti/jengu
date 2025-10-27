/**
 * Execute Competitor Tables SQL
 * Instructions for setting up the database tables
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL not found in .env')
  process.exit(1)
}

// Extract project ref from Supabase URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!projectRef) {
  console.error('❌ Could not parse project ref from SUPABASE_URL')
  process.exit(1)
}

console.log('🔧 Setting up Competitor Monitoring Tables\n')
console.log('═══════════════════════════════════════════════════════\n')
console.log('📋 INSTRUCTIONS:\n')
console.log('1. Open Supabase SQL Editor:')
console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`)
console.log('2. Copy the SQL from:')
console.log(`   ${join(__dirname, 'prisma', 'competitor-tables.sql')}\n`)
console.log('3. Paste into SQL Editor and click "Run"\n')
console.log('═══════════════════════════════════════════════════════\n')
console.log('✅ Tables that will be created:')
console.log('   • competitors - Monitored campsite data')
console.log('   • competitor_pricing - Daily price history')
console.log('   • RLS policies - User-level security')
console.log('   • Indexes - Performance optimization')
console.log('   • Views - Data aggregations\n')
console.log('💡 After running the SQL, the monitoring feature will be ready!\n')
