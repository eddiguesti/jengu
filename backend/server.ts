import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { rateLimit, RATE_LIMIT } from './middleware/rateLimit.js'
import { requestLogger, logger } from './middleware/logger.js'

// Load environment variables
dotenv.config()

// Import route modules
import healthRouter from './routes/health.js'
import filesRouter from './routes/files.js'
import settingsRouter from './routes/settings.js'
import assistantRouter from './routes/assistant.js'
import weatherRouter from './routes/weather.js'
import geocodingRouter from './routes/geocoding.js'
import holidaysRouter from './routes/holidays.js'
import competitorRouter from './routes/competitor.js'
import analyticsRouter from './routes/analytics.js'

const app = express()
const PORT = process.env.PORT || 3001

// Global middleware
app.use(requestLogger) // Add request logging
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', process.env.FRONTEND_URL].filter(
      (url): url is string => Boolean(url)
    ),
    credentials: true,
  })
)
app.use(express.json({ limit: '10mb' }))
app.use(rateLimit)

// Mount route modules
app.use('/health', healthRouter)
app.use('/api/files', filesRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/assistant', assistantRouter)
app.use('/api/weather', weatherRouter)
app.use('/api/geocoding', geocodingRouter)
app.use('/api/holidays', holidaysRouter)
app.use('/api/competitor', competitorRouter)
app.use('/api/hotels', competitorRouter) // hotels/search is in competitor router
app.use('/api/analytics', analyticsRouter)

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Server Error')
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  })
})

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Graceful shutdown handler
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...')
  process.exit(0)
})

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Jengu Backend API Server (Supabase + PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Database: Supabase PostgreSQL (REST API)
✅ Frontend URL: ${process.env.FRONTEND_URL}
✅ Rate limit: ${RATE_LIMIT} requests/minute
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Available endpoints:
   - GET  /health

   📁 File Management (Supabase):
   - POST   /api/files/upload (streaming + batch inserts)
   - GET    /api/files
   - GET    /api/files/:fileId/data (paginated)
   - DELETE /api/files/:fileId
   - POST   /api/files/:fileId/enrich

   🤖 AI Assistant:
   - POST /api/assistant/message
   - POST /api/assistant/quick-suggestion
   - POST /api/assistant/analyze-pricing
   - POST /api/assistant/pricing-recommendations

   🌤️  Weather & Location:
   - POST /api/weather/historical (Open-Meteo - FREE)
   - GET  /api/weather/current (OpenWeather - FREE)
   - GET  /api/weather/forecast (OpenWeather - FREE)
   - GET  /api/holidays
   - GET  /api/geocoding/forward
   - GET  /api/geocoding/reverse
   - GET  /api/geocoding/search

   🏨 Competitor Data:
   - POST /api/competitor/scrape
   - POST /api/hotels/search

   📊 ML Analytics & AI Insights:
   - POST /api/analytics/summary
   - POST /api/analytics/weather-impact
   - POST /api/analytics/demand-forecast
   - POST /api/analytics/competitor-analysis
   - POST /api/analytics/feature-importance
   - POST /api/analytics/market-sentiment
   - POST /api/analytics/ai-insights (Claude-powered)
   - POST /api/analytics/pricing-recommendations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
})
