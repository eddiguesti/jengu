// src/test-scraper.ts

import { config } from 'dotenv'
import { SanaryCampingScraper } from './scrapers/SanaryCampingScraper'

// Load environment variables
config()

async function testScraper() {
  console.log('🧪 Testing Sanary Coastal Scraper\n')
  console.log('='.repeat(50))

  const startTime = Date.now()

  try {
    // Initialize scraper
    const scraper = new SanaryCampingScraper()
    console.log('✅ Scraper initialized\n')

    // Run the scraping
    console.log('🔍 Searching for campsites in Sanary-sur-Mer region...')
    console.log('   Coverage: 30km coastal radius')
    console.log('   Including: Bandol, Six-Fours, Saint-Cyr\n')

    const results = await scraper.scrapeAllCompetitors()

    // Analyze results
    console.log('\n' + '='.repeat(50))
    console.log('📊 RESULTS SUMMARY\n')
    console.log(`Total campsites found: ${results.length}`)

    // Group by location
    const byLocation: Record<string, number> = {}
    results.forEach(r => {
      const location = r.location || 'Unknown'
      byLocation[location] = (byLocation[location] || 0) + 1
    })

    console.log('\n📍 By Location:')
    Object.entries(byLocation)
      .sort((a, b) => b[1] - a[1])
      .forEach(([location, count]) => {
        console.log(`   ${location}: ${count} campsite(s)`)
      })

    // Group by source
    const bySource: Record<string, number> = {}
    results.forEach(r => {
      bySource[r.source] = (bySource[r.source] || 0) + 1
    })

    console.log('\n🌐 By Source:')
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`)
    })

    // Price analysis
    const pricesAvailable = results.filter(r => r.price !== null && r.price !== undefined)

    if (pricesAvailable.length > 0) {
      const prices = pricesAvailable.map(r => r.price as number)
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)

      console.log('\n💰 Price Analysis:')
      console.log(`   Prices found: ${pricesAvailable.length}/${results.length}`)
      console.log(`   Min: €${minPrice}`)
      console.log(`   Max: €${maxPrice}`)
      console.log(`   Average: €${avgPrice.toFixed(2)}`)

      // Price distribution
      const priceRanges = {
        '< €30': prices.filter(p => p < 30).length,
        '€30-50': prices.filter(p => p >= 30 && p < 50).length,
        '€50-70': prices.filter(p => p >= 50 && p < 70).length,
        '€70-100': prices.filter(p => p >= 70 && p < 100).length,
        '> €100': prices.filter(p => p >= 100).length,
      }

      console.log('\n📈 Price Distribution:')
      Object.entries(priceRanges).forEach(([range, count]) => {
        if (count > 0) {
          const percentage = ((count / prices.length) * 100).toFixed(1)
          console.log(`   ${range}: ${count} (${percentage}%)`)
        }
      })
    } else {
      console.log('\n⚠️ No prices found (might be off-season or need to check selectors)')
    }

    // Sample results
    console.log('\n📋 Sample Campsites (first 5):')
    console.log('-'.repeat(50))

    results.slice(0, 5).forEach((campsite, index) => {
      console.log(`\n${index + 1}. ${campsite.name}`)
      console.log(`   Location: ${campsite.location}`)
      console.log(`   Price: ${campsite.price ? `€${campsite.price}` : 'N/A'}`)
      console.log(`   Source: ${campsite.source}`)
      if (campsite.stars) console.log(`   Stars: ${'⭐'.repeat(campsite.stars)}`)
      if (campsite.url) console.log(`   URL: ${campsite.url}`)
    })

    // Execution time
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('\n' + '='.repeat(50))
    console.log(`✅ Scraping completed in ${executionTime} seconds\n`)

    // Save to file for inspection
    const fs = require('fs')
    const outputFile = `sanary-campsites-${new Date().toISOString().split('T')[0]}.json`
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2))
    console.log(`📁 Full results saved to: ${outputFile}`)
  } catch (error) {
    console.error('\n❌ Error during scraping:', error)
    process.exit(1)
  }
}

// Run the test
console.log('🚀 Starting Sanary-sur-Mer Campsite Scraper\n')
testScraper()
  .then(() => {
    console.log('\n✨ Test completed successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })
