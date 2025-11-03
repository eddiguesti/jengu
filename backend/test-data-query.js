// Quick test to check what data is in the database
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const propertyId = 'c6400e61-9ae6-45f8-af0a-7e0c55af2748'

console.log('🔍 Fetching data for property:', propertyId)

const { data, error } = await supabase
  .from('pricing_data')
  .select('*')
  .eq('propertyId', propertyId)
  .limit(3)

if (error) {
  console.error('❌ Error:', error)
} else {
  console.log(`\n✅ Found ${data.length} rows`)
  console.log('\n📊 Sample data (first row):')
  console.log(JSON.stringify(data[0], null, 2))

  console.log('\n📋 Available columns:')
  if (data[0]) {
    console.log(Object.keys(data[0]).join(', '))
  }
}

process.exit(0)
