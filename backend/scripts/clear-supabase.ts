import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearAllData() {
  console.log('🗑️  Clearing all Supabase data...')

  // Delete pricing_data first (has foreign key to properties)
  const { error: pricingError } = await supabase
    .from('pricing_data')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (pricingError) {
    console.error('Error deleting pricing_data:', pricingError.message)
  } else {
    console.log('✅ Deleted all pricing_data records')
  }

  // Delete properties
  const { error: propertiesError } = await supabase
    .from('properties')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (propertiesError) {
    console.error('Error deleting properties:', propertiesError.message)
  } else {
    console.log('✅ Deleted all properties records')
  }

  console.log('🎉 All data cleared! You can now upload fresh CSV data.')
}

clearAllData()
