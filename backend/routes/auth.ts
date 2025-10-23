/**
 * Authentication Routes with httpOnly Cookie Strategy
 *
 * Implements secure authentication with:
 * - httpOnly cookies for token storage (XSS protection)
 * - Refresh token rotation (replay attack prevention)
 * - Structured logging with request IDs
 * - Secure cookie settings (Secure, SameSite)
 */

import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { logger } from '../middleware/logger.js'
import { z } from 'zod'

const router = Router()

// Cookie configuration
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax' as const, // CSRF protection
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 minutes for access token
}

const REFRESH_COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const, // Stricter for refresh token
  path: '/api/auth', // Limit scope to auth endpoints
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
}

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
})

/**
 * POST /api/auth/login
 * Authenticate user and set httpOnly cookies
 */
router.post('/login', async (req: Request, res: Response) => {
  const reqId = req.id // Request ID from middleware

  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body)

    logger.info({ reqId, email }, 'Login attempt')

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      logger.warn({ reqId, email, error: error.message }, 'Login failed - invalid credentials')
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    }

    if (!data.session || !data.user) {
      logger.error({ reqId, email }, 'Login failed - no session returned')
      return res.status(500).json({
        error: 'AUTH_ERROR',
        message: 'Authentication failed',
      })
    }

    // Set access token cookie
    res.cookie('access_token', data.session.access_token, COOKIE_CONFIG)

    // Set refresh token cookie (stricter settings)
    if (data.session.refresh_token) {
      res.cookie('refresh_token', data.session.refresh_token, REFRESH_COOKIE_CONFIG)
    }

    logger.info(
      {
        reqId,
        userId: data.user.id,
        email: data.user.email,
      },
      'Login successful'
    )

    // Return user profile (no tokens in response body)
    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        created_at: data.user.created_at,
      },
      session: {
        expires_at: data.session.expires_at,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ reqId, errors: error.errors }, 'Login validation failed')
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: error.errors,
      })
    }

    const err = error as Error
    logger.error({ reqId, error: err.message, stack: err.stack }, 'Login error')
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during login',
    })
  }
})

/**
 * POST /api/auth/signup
 * Register new user and set httpOnly cookies
 */
router.post('/signup', async (req: Request, res: Response) => {
  const reqId = req.id

  try {
    // Validate input
    const { email, password, name } = signupSchema.parse(req.body)

    logger.info({ reqId, email }, 'Signup attempt')

    // Create user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0], // Default name to email prefix
        },
      },
    })

    if (error) {
      logger.warn({ reqId, email, error: error.message }, 'Signup failed')
      return res.status(400).json({
        error: 'SIGNUP_ERROR',
        message: error.message,
      })
    }

    if (!data.user) {
      logger.error({ reqId, email }, 'Signup failed - no user returned')
      return res.status(500).json({
        error: 'AUTH_ERROR',
        message: 'User creation failed',
      })
    }

    // Set cookies if session is available (some configs require email confirmation)
    if (data.session) {
      res.cookie('access_token', data.session.access_token, COOKIE_CONFIG)

      if (data.session.refresh_token) {
        res.cookie('refresh_token', data.session.refresh_token, REFRESH_COOKIE_CONFIG)
      }
    }

    logger.info(
      {
        reqId,
        userId: data.user.id,
        email: data.user.email,
      },
      'Signup successful'
    )

    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        created_at: data.user.created_at,
      },
      message: data.session
        ? 'Account created successfully'
        : 'Account created - please check your email to confirm',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ reqId, errors: error.errors }, 'Signup validation failed')
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: error.errors,
      })
    }

    const err = error as Error
    logger.error({ reqId, error: err.message, stack: err.stack }, 'Signup error')
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during signup',
    })
  }
})

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token with rotation
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const reqId = req.id

  try {
    const refreshToken = req.cookies.refresh_token

    if (!refreshToken) {
      logger.warn({ reqId }, 'Refresh failed - no refresh token')
      return res.status(401).json({
        error: 'NO_REFRESH_TOKEN',
        message: 'No refresh token provided',
      })
    }

    logger.info({ reqId }, 'Token refresh attempt')

    // Refresh session with Supabase (rotates refresh token)
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error) {
      logger.warn({ reqId, error: error.message }, 'Refresh failed - invalid token')
      // Clear invalid cookies
      res.clearCookie('access_token', { path: '/' })
      res.clearCookie('refresh_token', { path: '/api/auth' })

      return res.status(401).json({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      })
    }

    if (!data.session || !data.user) {
      logger.error({ reqId }, 'Refresh failed - no session returned')
      return res.status(500).json({
        error: 'REFRESH_ERROR',
        message: 'Token refresh failed',
      })
    }

    // Set new access token cookie
    res.cookie('access_token', data.session.access_token, COOKIE_CONFIG)

    // Set new refresh token cookie (rotation)
    if (data.session.refresh_token) {
      res.cookie('refresh_token', data.session.refresh_token, REFRESH_COOKIE_CONFIG)
    }

    logger.info(
      {
        reqId,
        userId: data.user.id,
      },
      'Token refresh successful'
    )

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        expires_at: data.session.expires_at,
      },
    })
  } catch (error) {
    const err = error as Error
    logger.error({ reqId, error: err.message, stack: err.stack }, 'Refresh error')
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during token refresh',
    })
  }
})

/**
 * POST /api/auth/logout
 * Sign out user and clear cookies
 */
router.post('/logout', async (req: Request, res: Response) => {
  const reqId = req.id

  try {
    const accessToken = req.cookies.access_token

    logger.info({ reqId }, 'Logout attempt')

    // Sign out from Supabase if we have a token
    if (accessToken) {
      await supabase.auth.signOut()
    }

    // Clear all auth cookies
    res.clearCookie('access_token', { path: '/' })
    res.clearCookie('refresh_token', { path: '/api/auth' })

    logger.info({ reqId }, 'Logout successful')

    res.json({
      message: 'Logged out successfully',
    })
  } catch (error) {
    const err = error as Error
    logger.error({ reqId, error: err.message, stack: err.stack }, 'Logout error')

    // Clear cookies even on error
    res.clearCookie('access_token', { path: '/' })
    res.clearCookie('refresh_token', { path: '/api/auth' })

    res.status(500).json({
      error: 'LOGOUT_ERROR',
      message: 'An error occurred during logout',
    })
  }
})

/**
 * GET /api/auth/me
 * Get current authenticated user from cookie
 */
router.get('/me', async (req: Request, res: Response) => {
  const reqId = req.id

  try {
    const accessToken = req.cookies.access_token

    if (!accessToken) {
      return res.status(401).json({
        error: 'NO_TOKEN',
        message: 'Not authenticated',
      })
    }

    // Verify token and get user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      logger.warn({ reqId, error: error?.message }, 'Get user failed')
      res.clearCookie('access_token', { path: '/' })
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      })
    }

    logger.info({ reqId, userId: user.id }, 'Get user successful')

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    })
  } catch (error) {
    const err = error as Error
    logger.error({ reqId, error: err.message, stack: err.stack }, 'Get user error')
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred while fetching user',
    })
  }
})

export default router
