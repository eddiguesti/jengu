const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function cleanupOldFiles() {
  const userId = '9af9a99c-8fe6-4d7a-ae73-fd37faa00b09'

  console.log('Checking for files in database...')

  const { data: files, error } = await supabase
    .from('properties')
    .select('*')
    .eq('userId', userId)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${files.length} files in database:`)
  files.forEach(f => {
    const name = f.name || f.filename || 'unknown'
    console.log(`  - ${name} (${f.id.substring(0, 8)}...) - enrichment: ${f.enrichment_status || 'none'}`)
  })

  // Delete the OLD problematic files
  const filesToDelete = [
    '42527c91-d86d-46a3-919e-96d63d3af62c',
    '8a26473c-f293-4b09-8ac6-2383c3fa88e3',
  ]

  for (const fileId of filesToDelete) {
    const fileExists = files.find(f => f.id === fileId)
    if (fileExists) {
      console.log(`\nDeleting old file: ${fileId.substring(0, 8)}...`)

      // Delete pricing data first
      const { count, error: dataError } = await supabase
        .from('pricing_data')
        .delete()
        .eq('propertyId', fileId)

      if (dataError) console.error(`  Error deleting pricing_data:`, dataError.message)
      else console.log(`  Deleted ${count || 0} pricing_data rows`)

      // Delete property
      const { error: propError } = await supabase.from('properties').delete().eq('id', fileId)

      if (propError) console.error(`  Error deleting property:`, propError.message)
      else console.log(`  Deleted property`)
    } else {
      console.log(`\nFile ${fileId.substring(0, 8)}... not found in database (already deleted)`)
    }
  }

  console.log('\nCleanup complete!')

  // Show remaining files
  const { data: remainingFiles } = await supabase
    .from('properties')
    .select('*')
    .eq('userId', userId)

  console.log(`\nRemaining files: ${remainingFiles.length}`)
  remainingFiles.forEach(f => {
    const name = f.name || f.filename || 'unknown'
    console.log(`  - ${name} (${f.id.substring(0, 8)}...)`)
  })
}

cleanupOldFiles().catch(console.error)
