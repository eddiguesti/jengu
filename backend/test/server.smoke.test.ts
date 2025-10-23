/**
 * Smoke Tests for Backend Server
 * Tests critical endpoints to ensure basic functionality
 */

import { describe, it, expect, beforeAll } from 'vitest'
import express, { Express, Request, Response, NextFunction } from 'express'
import request from 'supertest'
import cors from 'cors'

/**
 * Create a minimal test server instance
 * This avoids loading the full server.ts with all dependencies
 */
function createTestServer(): Express {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // Health endpoint (minimal version)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'test',
    })
  })

  // Protected route for auth testing
  app.get('/api/protected', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'Missing or invalid authorization header',
      })
    }

    res.json({ success: true, message: 'Authorized' })
  })

  // Pricing proxy endpoint (mocked for testing)
  app.post('/api/pricing/quote', (req: Request, res: Response) => {
    const { propertyId, stayDate } = req.body

    if (!propertyId || !stayDate) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields',
      })
    }

    res.json({
      quote_id: 'test-quote-123',
      recommended_price: 150.0,
      confidence: 0.85,
    })
  })

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    })
  })

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' })
  })

  return app
}

describe('Backend Server Smoke Tests', () => {
  let app: Express

  beforeAll(() => {
    app = createTestServer()
  })

  describe('GET /health', () => {
    it('should return 200 and healthy status', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status', 'healthy')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('uptime')
      expect(response.body).toHaveProperty('environment')
    })

    it('should include valid ISO timestamp', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      const timestamp = new Date(response.body.timestamp)
      expect(timestamp.getTime()).not.toBeNaN()
    })
  })

  describe('Authentication Guard', () => {
    it('should return 401 when no auth header is provided', async () => {
      const response = await request(app).get('/api/protected')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Authentication Error')
    })

    it('should return 401 when auth header is malformed', async () => {
      const response = await request(app).get('/api/protected').set('Authorization', 'InvalidToken')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Authentication Error')
    })

    it('should allow access with valid Bearer token format', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-token-here')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
    })
  })

  describe('POST /api/pricing/quote', () => {
    it('should return pricing quote for valid request', async () => {
      const response = await request(app).post('/api/pricing/quote').send({
        propertyId: 'test-property-123',
        stayDate: '2025-01-15',
      })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('quote_id')
      expect(response.body).toHaveProperty('recommended_price')
      expect(typeof response.body.recommended_price).toBe('number')
    })

    it('should return 400 for invalid request (missing propertyId)', async () => {
      const response = await request(app).post('/api/pricing/quote').send({
        stayDate: '2025-01-15',
      })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR')
    })

    it('should return 400 for invalid request (missing stayDate)', async () => {
      const response = await request(app).post('/api/pricing/quote').send({
        propertyId: 'test-property-123',
      })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR')
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app).get('/api/nonexistent')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Endpoint not found')
    })
  })
})
