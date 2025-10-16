/**
 * Setup Database Script
 * Creates tables and RLS policies in Supabase via API
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

console.log('🚀 Starting Supabase Database Setup...\n')

async function executeSql(sql, description) {
  try {
    console.log(`⏳ ${description}...`)
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // Try alternative method using Supabase REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      })

      if (!response.ok) {
        throw new Error(`Failed to execute SQL: ${error?.message || response.statusText}`)
      }
    }

    console.log(`✅ ${description} - Success\n`)
    return true
  } catch (error) {
    console.error(`❌ ${description} - Failed:`, error.message)
    return false
  }
}

async function setupDatabase() {
  // Read SQL files
  const createTablesSql = fs.readFileSync(
    path.join(__dirname, 'prisma', 'create-tables.sql'),
    'utf-8'
  )

  const rlsPoliciesSql = fs.readFileSync(
    path.join(__dirname, 'prisma', 'supabase-rls-policies.sql'),
    'utf-8'
  )

  console.log('📋 Step 1: Creating Tables\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Split SQL into individual statements
  const tableStatements = createTablesSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'))

  for (const statement of tableStatements) {
    const description = statement.includes('CREATE TABLE')
      ? `Creating table: ${statement.match(/CREATE TABLE.+?"(\w+)"/)?.[1]}`
      : statement.includes('CREATE INDEX')
        ? `Creating index: ${statement.match(/CREATE INDEX.+?"(\w+)"/)?.[1]}`
        : 'Executing statement'

    await executeSql(statement, description)
  }

  console.log('\n📋 Step 2: Setting up Row-Level Security\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Split RLS SQL into individual statements
  const rlsStatements = rlsPoliciesSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.includes('VERIFICATION'))

  for (const statement of rlsStatements) {
    const description = statement.includes('ENABLE ROW LEVEL')
      ? `Enabling RLS on table`
      : statement.includes('CREATE POLICY')
        ? `Creating policy: ${statement.match(/CREATE POLICY "([^"]+)"/)?.[1]}`
        : statement.includes('CREATE FUNCTION')
          ? 'Creating user sync function'
          : statement.includes('CREATE TRIGGER')
            ? 'Creating auth trigger'
            : 'Executing statement'

    await executeSql(statement, description)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Database Setup Complete!\n')
  console.log('Next steps:')
  console.log('1. Start backend: cd backend && pnpm run dev')
  console.log('2. Start frontend: cd frontend && pnpm run dev')
  console.log('3. Open http://localhost:5173 and create an account\n')
}

// Alternative method: Direct SQL execution via fetch
async function setupDatabaseDirect() {
  console.log('📋 Using Direct SQL Execution Method\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Read SQL files
  const createTablesSql = fs.readFileSync(
    path.join(__dirname, 'prisma', 'create-tables.sql'),
    'utf-8'
  )

  const rlsPoliciesSql = fs.readFileSync(
    path.join(__dirname, 'prisma', 'supabase-rls-policies.sql'),
    'utf-8'
  )

  console.log('⏳ Creating tables...')

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ query: createTablesSql }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    console.log('✅ Tables created successfully\n')
    console.log('⏳ Setting up Row-Level Security...')

    const rlsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ query: rlsPoliciesSql }),
    })

    if (!rlsResponse.ok) {
      throw new Error(`HTTP ${rlsResponse.status}: ${await rlsResponse.text()}`)
    }

    console.log('✅ RLS policies created successfully\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Database Setup Complete!\n')
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.log('\n⚠️  Please run the SQL manually in Supabase SQL Editor:')
    console.log('1. Go to: https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb/sql/new')
    console.log('2. Copy backend/prisma/create-tables.sql and run it')
    console.log('3. Copy backend/prisma/supabase-rls-policies.sql and run it\n')
    process.exit(1)
  }
}

// Run setup
console.log('Note: Supabase may require manual SQL execution via dashboard.\n')
console.log('If this script fails, please run the SQL files manually at:')
console.log('https://supabase.com/dashboard/project/geehtuuyyxhyissplfjb/sql/new\n')

setupDatabaseDirect()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Setup error:', error)
    process.exit(1)
  })
