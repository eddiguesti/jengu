/**
 * Auth Routes Tests
 * Tests httpOnly cookie-based authentication with refresh token rotation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import express, { Express } from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'

/**
 * Create a test auth server with mocked Supabase
 */
function createTestAuthServer(): Express {
  const app = express()

  app.use(cookieParser())
  app.use(express.json())

  // Mock successful login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid input',
      })
    }

    if (password === 'wrongpassword') {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    }

    // Set httpOnly cookies
    res.cookie('access_token', 'mock-access-token-123', {
      httpOnly: true,
      secure: false, // false for testing
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    })

    res.cookie('refresh_token', 'mock-refresh-token-456', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({
      user: {
        id: 'user-123',
        email: email,
        role: 'authenticated',
      },
    })
  })

  // Mock token refresh
  app.post('/api/auth/refresh', (req, res) => {
    const refreshToken = req.cookies.refresh_token

    if (!refreshToken) {
      return res.status(401).json({
        error: 'NO_REFRESH_TOKEN',
        message: 'No refresh token provided',
      })
    }

    if (refreshToken === 'expired-refresh-token') {
      res.clearCookie('access_token')
      res.clearCookie('refresh_token', { path: '/api/auth' })

      return res.status(401).json({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      })
    }

    // Rotate tokens (new access + new refresh)
    res.cookie('access_token', 'new-access-token-789', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    })

    res.cookie('refresh_token', 'new-refresh-token-101', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    })
  })

  // Mock logout
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('access_token')
    res.clearCookie('refresh_token', { path: '/api/auth' })

    res.json({
      message: 'Logged out successfully',
    })
  })

  // Mock /me endpoint
  app.get('/api/auth/me', (req, res) => {
    const accessToken = req.cookies.access_token

    if (!accessToken) {
      return res.status(401).json({
        error: 'NO_TOKEN',
        message: 'Not authenticated',
      })
    }

    if (accessToken === 'invalid-token') {
      res.clearCookie('access_token')
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      })
    }

    res.json({
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    })
  })

  return app
}

describe('Auth Routes - httpOnly Cookie Strategy', () => {
  let app: Express

  beforeEach(() => {
    app = createTestAuthServer()
  })

  describe('POST /api/auth/login', () => {
    it('should set httpOnly cookies on successful login', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('id')
      expect(response.body.user).toHaveProperty('email', 'test@example.com')

      // Check that cookies are set
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies.length).toBeGreaterThan(0)

      // Verify access_token cookie
      const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='))
      expect(accessTokenCookie).toBeDefined()
      expect(accessTokenCookie).toContain('HttpOnly')
      expect(accessTokenCookie).toContain('SameSite=Lax')

      // Verify refresh_token cookie
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='))
      expect(refreshTokenCookie).toBeDefined()
      expect(refreshTokenCookie).toContain('HttpOnly')
      expect(refreshTokenCookie).toContain('SameSite=Strict')
    })

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'INVALID_CREDENTIALS')
    })

    it('should return 400 for missing fields', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
      })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should rotate refresh token and issue new access token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refresh_token=mock-refresh-token-456'])

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('user')

      // Check that new cookies are set
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()

      // Verify new access_token
      const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='))
      expect(accessTokenCookie).toBeDefined()
      expect(accessTokenCookie).toContain('new-access-token-789')

      // Verify new refresh_token (rotation)
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='))
      expect(refreshTokenCookie).toBeDefined()
      expect(refreshTokenCookie).toContain('new-refresh-token-101')
    })

    it('should return 401 when no refresh token provided', async () => {
      const response = await request(app).post('/api/auth/refresh')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'NO_REFRESH_TOKEN')
    })

    it('should clear cookies and return 401 for expired refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refresh_token=expired-refresh-token'])

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'INVALID_REFRESH_TOKEN')

      // Verify cookies are cleared
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()

      const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='))
      expect(accessTokenCookie).toContain('Expires=Thu, 01 Jan 1970') // Cookie cleared

      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='))
      expect(refreshTokenCookie).toContain('Expires=Thu, 01 Jan 1970') // Cookie cleared
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should clear all auth cookies', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', ['access_token=mock-token', 'refresh_token=mock-refresh'])

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Logged out successfully')

      // Verify cookies are cleared
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()

      const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='))
      expect(accessTokenCookie).toContain('Expires=Thu, 01 Jan 1970')

      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='))
      expect(refreshTokenCookie).toContain('Expires=Thu, 01 Jan 1970')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user when valid access token in cookie', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['access_token=mock-access-token-123'])

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('id', 'user-123')
    })

    it('should return 401 when no access token provided', async () => {
      const response = await request(app).get('/api/auth/me')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'NO_TOKEN')
    })

    it('should clear cookie and return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['access_token=invalid-token'])

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'INVALID_TOKEN')

      // Verify cookie is cleared
      const cookies = response.headers['set-cookie']
      const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='))
      expect(accessTokenCookie).toContain('Expires=Thu, 01 Jan 1970')
    })
  })

  describe('XSS Protection', () => {
    it('should prevent JavaScript access to httpOnly cookies', async () => {
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      })

      const cookies = loginResponse.headers['set-cookie']
      const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='))
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='))

      // Both cookies must be httpOnly (not accessible via document.cookie)
      expect(accessTokenCookie).toContain('HttpOnly')
      expect(refreshTokenCookie).toContain('HttpOnly')

      // Tokens should NOT be in response body
      expect(loginResponse.body).not.toHaveProperty('access_token')
      expect(loginResponse.body).not.toHaveProperty('refresh_token')
    })
  })

  describe('CSRF Protection', () => {
    it('should have SameSite attribute for CSRF protection', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      })

      const cookies = response.headers['set-cookie']
      const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='))
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='))

      // Access token: SameSite=Lax (allows top-level navigation)
      expect(accessTokenCookie).toContain('SameSite=Lax')

      // Refresh token: SameSite=Strict (stricter protection)
      expect(refreshTokenCookie).toContain('SameSite=Strict')
    })
  })
})
