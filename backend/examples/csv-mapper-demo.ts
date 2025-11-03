/**
 * Universal CSV Mapper - Usage Examples
 * Shows how automatic column detection works with different CSV formats
 */

import {
  detectColumnMapping,
  mapRow,
  validateBatch,
  generateMappingReport,
} from '../services/universalCSVMapper.js'

// ============================================
// EXAMPLE 1: Standard English CSV
// ============================================
console.log('━'.repeat(60))
console.log('EXAMPLE 1: Standard English CSV')
console.log('━'.repeat(60))

const headers1 = ['Date', 'Accommodation', 'Price', 'Bookings']
const mapping1 = detectColumnMapping(headers1)

console.log(generateMappingReport(mapping1))
console.log('')

// Sample row
const row1 = {
  Date: '2024-06-01',
  Accommodation: 'Luxury Mobile Home',
  Price: '180.00',
  Bookings: '2',
}

const mapped1 = mapRow(row1, mapping1)
console.log('Mapped Row:', mapped1)
console.log('\n')

// ============================================
// EXAMPLE 2: Booking System Export (Different Column Names)
// ============================================
console.log('━'.repeat(60))
console.log('EXAMPLE 2: Booking System Export')
console.log('━'.repeat(60))

const headers2 = ['CheckIn', 'UnitType', 'NightlyRate', 'Guests', 'Channel', 'InternalCode']
const mapping2 = detectColumnMapping(headers2)

console.log(generateMappingReport(mapping2))
console.log('')

const row2 = {
  CheckIn: '01/06/2024',
  UnitType: 'Safari Tent',
  NightlyRate: '€90.00',
  Guests: '4',
  Channel: 'Booking.com',
  InternalCode: 'ST-001',
}

const mapped2 = mapRow(row2, mapping2)
console.log('Mapped Row:', mapped2)
console.log('Custom Data:', mapped2.custom_data) // Guests, Channel, InternalCode stored here!
console.log('\n')

// ============================================
// EXAMPLE 3: French CSV
// ============================================
console.log('━'.repeat(60))
console.log('EXAMPLE 3: French CSV')
console.log('━'.repeat(60))

const headers3 = ['Arrivée', 'Hébergement', 'Prix', 'Réservations']
const mapping3 = detectColumnMapping(headers3)

console.log(generateMappingReport(mapping3))
console.log('')

const row3 = {
  Arrivée: '01/06/2024',
  Hébergement: 'Mobil Home Premium',
  Prix: '180,00', // French uses comma as decimal separator
  Réservations: '3',
}

const mapped3 = mapRow(row3, mapping3)
console.log('Mapped Row:', mapped3)
console.log('\n')

// ============================================
// EXAMPLE 4: Weekly Rates CSV
// ============================================
console.log('━'.repeat(60))
console.log('EXAMPLE 4: Weekly Rates CSV')
console.log('━'.repeat(60))

const headers4 = ['Arrival', 'Accommodation Type', 'Weekly Rate', 'Occupancy %', 'Revenue']
const mapping4 = detectColumnMapping(headers4)

console.log(generateMappingReport(mapping4))
console.log('')

const row4 = {
  Arrival: '2024-06-01',
  'Accommodation Type': 'Chalet Premium',
  'Weekly Rate': '1200.00',
  'Occupancy %': '85.5',
  Revenue: '1200.00',
}

const mapped4 = mapRow(row4, mapping4)
console.log('Mapped Row:', mapped4)
console.log('\n')

// ============================================
// EXAMPLE 5: Batch Validation
// ============================================
console.log('━'.repeat(60))
console.log('EXAMPLE 5: Batch Validation')
console.log('━'.repeat(60))

const batchHeaders = ['Date', 'Accommodation', 'Price']
const batchMapping = detectColumnMapping(batchHeaders)

const batchRows = [
  { Date: '2024-06-01', Accommodation: 'Mobile Home', Price: '180' },
  { Date: 'invalid-date', Accommodation: 'Pitch', Price: '45' }, // Invalid!
  { Date: '2024-06-03', Accommodation: 'Safari Tent', Price: 'not-a-number' }, // Invalid!
  { Date: '2024-06-04', Accommodation: 'Yurt', Price: '120' },
]

const { valid, errors } = validateBatch(batchRows, batchMapping)

console.log(`✅ Valid rows: ${valid.length}/${batchRows.length}`)
console.log(`❌ Errors: ${errors.length}`)
console.log('')
console.log('Errors:')
errors.forEach((err) => {
  console.log(`   Row ${err.row}: ${err.error}`)
})
console.log('')

// ============================================
// EXAMPLE 6: Low Confidence Mapping (User Confirmation Needed)
// ============================================
console.log('━'.repeat(60))
console.log('EXAMPLE 6: Low Confidence Mapping')
console.log('━'.repeat(60))

const headers6 = ['Col1', 'Col2', 'Col3', 'Col4'] // Unclear column names!
const mapping6 = detectColumnMapping(headers6)

console.log(generateMappingReport(mapping6))
console.log('')
console.log('⚠️  Low confidence! User should manually map columns.')
console.log('\n')

// ============================================
// OUTPUT EXAMPLE
// ============================================
/*

Expected Output:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE 1: Standard English CSV
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CSV Column Mapping Report
══════════════════════════════════════════════════

✅ Core Fields:
   Date Column:          Date
   Accommodation Column: Accommodation
   Price Column:         Price

📝 Optional Fields:
   Bookings Column:      Bookings

⚠️  Unmapped Columns (will be stored as custom data):

✨ Confidence: 100%

Mapped Row: {
  date: 2024-06-01T00:00:00.000Z,
  accommodation_type: 'Luxury Mobile Home',
  price: 180,
  bookings_count: 2,
  custom_data: {}
}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE 2: Booking System Export
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CSV Column Mapping Report
══════════════════════════════════════════════════

✅ Core Fields:
   Date Column:          CheckIn
   Accommodation Column: UnitType
   Price Column:         NightlyRate

⚠️  Unmapped Columns (will be stored as custom data):
   • Guests
   • Channel
   • InternalCode

✨ Confidence: 100%

Mapped Row: {
  date: 2024-06-01T00:00:00.000Z,
  accommodation_type: 'Safari Tent',
  price: 90,
  custom_data: {
    Guests: '4',
    Channel: 'Booking.com',
    InternalCode: 'ST-001'
  }
}
Custom Data: { Guests: '4', Channel: 'Booking.com', InternalCode: 'ST-001' }

*/
