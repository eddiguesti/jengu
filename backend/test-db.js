import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

console.log('Testing Prisma connection...')

const timeout = setTimeout(() => {
  console.error('❌ Connection timeout after 5 seconds')
  process.exit(1)
}, 5000)

prisma.$queryRaw`SELECT 1`
  .then(() => {
    clearTimeout(timeout)
    console.log('✅ Connected to Prisma database successfully!')
    return prisma.$disconnect()
  })
  .then(() => {
    process.exit(0)
  })
  .catch(e => {
    clearTimeout(timeout)
    console.error('❌ Connection failed:', e.message)
    console.error('Full error:', e)
    process.exit(1)
  })
