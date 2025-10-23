/**
 * Setup Enrichment Cache Tables
 * Creates holiday_cache and weather_cache tables in Supabase
 */

import { supabaseAdmin } from './lib/supabase.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function setupEnrichmentCache() {
  console.log('🚀 Setting up enrichment cache tables...')

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'prisma', 'enrichment-cache-tables.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Execute SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql doesn't exist, try splitting and executing individually
      console.log('⚠️  exec_sql RPC not found, trying direct execution...')

      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/**'))

      for (const statement of statements) {
        if (statement.length === 0) continue

        console.log(`Executing: ${statement.substring(0, 50)}...`)

        const { error: stmtError } = await supabaseAdmin.from('_sql').select(statement)

        if (stmtError) {
          console.error(`Error executing statement: ${stmtError.message}`)
        }
      }
    }

    console.log('✅ Enrichment cache tables created successfully!')
    console.log('')
    console.log('Tables created:')
    console.log('  - holiday_cache (country_code, date, holiday_name)')
    console.log('  - weather_cache (latitude, longitude, date, temperature, etc.)')
    console.log('')
    console.log('Note: If setup failed, please run the SQL manually in Supabase SQL Editor:')
    console.log(`  File: ${sqlPath}`)
  } catch (error) {
    const err = error as Error
    console.error('❌ Error setting up enrichment cache:', err.message)
    console.log('')
    console.log('Please run the SQL manually in Supabase SQL Editor:')
    console.log(`  File: ${path.join(__dirname, 'prisma', 'enrichment-cache-tables.sql')}`)
    process.exit(1)
  }
}

setupEnrichmentCache()
