/**
 * Generate OpenAPI specification file
 * Run with: npx tsx scripts/generate-openapi.ts
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Import the OpenAPI generator
// Note: We need to import all route files to register their paths
import '../routes/health.js'
import '../routes/files.js'
import '../routes/analytics.js'

import { generateOpenAPIDocument } from '../lib/openapi/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputPath = path.join(__dirname, '..', 'openapi.json')

// Generate the OpenAPI document
const openAPIDocument = generateOpenAPIDocument()

// Write to file
fs.writeFileSync(outputPath, JSON.stringify(openAPIDocument, null, 2), 'utf-8')

console.log('✅ OpenAPI specification generated successfully!')
console.log(`📄 File location: ${outputPath}`)
console.log(`📊 Total endpoints: ${Object.keys(openAPIDocument.paths || {}).length}`)
console.log('\n📚 View documentation at: http://localhost:3001/docs')
console.log('🔍 View JSON spec at: http://localhost:3001/openapi.json')
