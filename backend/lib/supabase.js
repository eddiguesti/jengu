/**
 * Supabase Client Configuration
 *
 * This module provides Supabase client instances for:
 * - Backend operations (service role key - full access)
 * - Auth operations (anon key - user context)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

/**
 * Supabase client for backend operations
 * Uses service role key - bypasses Row Level Security (RLS)
 * Use this for admin operations, background jobs, etc.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Supabase client for authenticated user operations
 * Uses anon key - respects Row Level Security (RLS)
 * Use this for user-facing operations
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get user ID from JWT token
 * @param {string} token - JWT token from Authorization header
 * @returns {Promise<string|null>} User ID or null if invalid
 */
export async function getUserIdFromToken(token) {
  try {
    if (!token || !token.startsWith('Bearer ')) {
      return null;
    }

    const jwt = token.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(jwt);

    if (error || !user) {
      console.error('Token validation error:', error?.message);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('getUserIdFromToken error:', error.message);
    return null;
  }
}

/**
 * Middleware to authenticate requests
 * Extracts user ID from JWT token and attaches to request
 */
export function authenticateUser(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authorization token provided'
    });
  }

  getUserIdFromToken(token)
    .then(userId => {
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }

      req.userId = userId;
      next();
    })
    .catch(error => {
      console.error('Authentication middleware error:', error);
      res.status(500).json({
        error: 'Authentication failed',
        message: error.message
      });
    });
}

/**
 * Optional authentication middleware
 * Attaches user ID if token is present, but doesn't require it
 */
export function optionalAuth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    req.userId = null;
    return next();
  }

  getUserIdFromToken(token)
    .then(userId => {
      req.userId = userId;
      next();
    })
    .catch(error => {
      console.error('Optional auth error:', error);
      req.userId = null;
      next();
    });
}

export default {
  supabase,
  supabaseAdmin,
  getUserIdFromToken,
  authenticateUser,
  optionalAuth
};
