// IMPORTANT: Sentry must be imported FIRST before all other imports
import dotenv from 'dotenv'
dotenv.config() // Load env vars before Sentry init

import { initSentry } from './lib/sentry.js'
import * as Sentry from '@sentry/node'
initSentry() // Initialize Sentry error tracking

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'
import { requestLogger, logger } from './middleware/logger.js'
import { generalLimiter } from './middleware/rateLimiters.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import { generateOpenAPIDocument } from './lib/openapi/index.js'

// Import route modules
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import filesRouter from './routes/files.js'
import settingsRouter from './routes/settings.js'
import assistantRouter from './routes/assistant.js'
import weatherRouter from './routes/weather.js'
import geocodingRouter from './routes/geocoding.js'
import holidaysRouter from './routes/holidays.js'
import competitorRouter from './routes/competitor.js'
import analyticsRouter from './routes/analytics.js'
import pricingRouter from './routes/pricing.js'
import jobsRouter from './routes/jobs.js'
import metricsRouter from './routes/metrics.js'
import competitorDataRouter from './routes/competitorData.js'
import alertsRouter from './routes/alerts.js'
import neighborhoodIndexRouter from './routes/neighborhoodIndex.js'
import banditRouter from './routes/bandit.js'
import enrichmentRouter from './routes/enrichment.js'
import advancedPricingRouter from './routes/advancedPricing.js'
import chatRouter from './routes/chat.js'

const app = express()
const PORT = process.env.PORT || 3001

// Global middleware
app.use(requestIdMiddleware) // Generate request IDs and log requests
app.use(requestLogger) // Add request logging
app.use(
  cors({
    origin: (origin, callback) => {
      // In development, always allow both common Vite ports
      // In production, use FRONTEND_URL from env
      const allowedOrigins = process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL
        ? [process.env.FRONTEND_URL]
        : ['http://localhost:5173', 'http://localhost:5174']

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)
app.use(cookieParser()) // Parse cookies for auth
app.use(express.json({ limit: '10mb' }))
app.use(generalLimiter) // General rate limiting for all endpoints

// OpenAPI/Swagger documentation
const openAPIDocument = generateOpenAPIDocument()
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openAPIDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Jengu API Documentation',
  })
)

// Serve OpenAPI spec as JSON
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openAPIDocument)
})

// Mount route modules
app.use('/health', healthRouter)
app.use('/metrics', metricsRouter) // Prometheus metrics (no auth for scraping)
app.use('/api/auth', authRouter)
app.use('/api/files', filesRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/assistant', assistantRouter)
app.use('/api/weather', weatherRouter)
app.use('/api/geocoding', geocodingRouter)
app.use('/api/holidays', holidaysRouter)
app.use('/api/competitor', competitorRouter)
app.use('/api/hotels', competitorRouter) // hotels/search is in competitor router
app.use('/api/analytics', analyticsRouter)
app.use('/api/pricing', pricingRouter)
app.use('/api/pricing', advancedPricingRouter) // Advanced ML pricing engine
app.use('/api/jobs', jobsRouter)
app.use('/api/competitor-data', competitorDataRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/neighborhood-index', neighborhoodIndexRouter)
app.use('/api/bandit', banditRouter)
app.use('/api/enrichment', enrichmentRouter)
app.use('/api/chat', chatRouter) // OpenAI chatbot assistant

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Capture error in Sentry
  Sentry.captureException(err, {
    contexts: {
      request: {
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.body,
      },
    },
  })

  logger.error({ err }, 'Server Error')

  // Don't expose internal error details in production
  const errorMessage = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message

  res.status(500).json({
    error: 'Internal server error',
    message: errorMessage,
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

// Create HTTP server and attach Socket.IO
import { createServer } from 'http'
import { setupWebSocketServer } from './lib/socket/server.js'

const httpServer = createServer(app)
const io = setupWebSocketServer(httpServer)

// Make io available to routes if needed
app.set('io', io)

// Start server
httpServer.listen(PORT, () => {
  console.log(`
🚀 Jengu Backend API Server (Supabase + PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Database: Supabase PostgreSQL (REST API)
✅ Frontend URL: ${process.env.FRONTEND_URL}
✅ Rate limiting: Enhanced (endpoint-specific limits)
✅ WebSocket: Real-time job updates enabled
✅ Redis: Job queue enabled (BullMQ)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Available endpoints:
   📚 API Documentation:
   - GET  /docs (Swagger UI)
   - GET  /openapi.json (OpenAPI spec)

   🏥 Health Check & Monitoring:
   - GET  /health
   - GET  /metrics (Prometheus format)
   - GET  /metrics/json (JSON format)

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

   💰 Dynamic Pricing Engine:
   - POST /api/pricing/quote (get price quote)
   - POST /api/pricing/learn (submit outcomes for ML)
   - GET  /api/pricing/check-readiness

   📋 Job Queue (Async Processing):
   - GET  /api/jobs (list all jobs)
   - GET  /api/jobs/:id (get job status)
   - POST /api/jobs/:id/retry (retry failed job)
   - GET  /api/jobs/dlq/list (view dead letter queue)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
})
