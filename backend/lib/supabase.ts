/**
 * Supabase Client Configuration
 *
 * This module provides Supabase client instances for:
 * - Backend operations (service role key - full access)
 * - Auth operations (anon key - user context)
 */

import { createClient } from '@supabase/supabase-js'
import type { Request, Response, NextFunction } from 'express'
import type { Database } from '../types/database.types.js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

/**
 * Supabase client for backend operations
 * Uses service role key - bypasses Row Level Security (RLS)
 * Use this for admin operations, background jobs, etc.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Supabase client for authenticated user operations
 * Uses anon key - respects Row Level Security (RLS)
 * Use this for user-facing operations
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Get user ID from JWT token
 */
export async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    if (!token || !token.startsWith('Bearer ')) {
      return null
    }

    const jwt = token.replace('Bearer ', '')
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(jwt)

    if (error || !user) {
      console.error('Token validation error:', error?.message)
      return null
    }

    return user.id
  } catch (error) {
    const err = error as Error
    console.error('getUserIdFromToken error:', err.message)
    return null
  }
}

/**
 * Middleware to authenticate requests
 * Extracts user ID from JWT token (cookie or header) and attaches to request
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  // Check for token in cookies first (new httpOnly cookie auth)
  const cookieToken = req.cookies?.access_token
  // Fall back to authorization header (legacy support)
  const headerToken = req.headers.authorization

  const token = cookieToken ? `Bearer ${cookieToken}` : headerToken

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No authorization token provided',
    })
    return
  }

  getUserIdFromToken(token)
    .then(userId => {
      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        })
        return
      }

      req.userId = userId
      next()
    })
    .catch(error => {
      const err = error as Error
      console.error('Authentication middleware error:', err)
      res.status(500).json({
        error: 'Authentication failed',
        message: err.message,
      })
    })
}

/**
 * Optional authentication middleware
 * Attaches user ID if token is present, but doesn't require it
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers.authorization

  if (!token) {
    req.userId = undefined
    next()
    return
  }

  getUserIdFromToken(token)
    .then(userId => {
      req.userId = userId ?? undefined
      next()
    })
    .catch(error => {
      const err = error as Error
      console.error('Optional auth error:', err)
      req.userId = undefined
      next()
    })
}

export default {
  supabase,
  supabaseAdmin,
  getUserIdFromToken,
  authenticateUser,
  optionalAuth,
}
