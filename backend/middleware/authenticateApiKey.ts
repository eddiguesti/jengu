/**
 * API Key Authentication Middleware
 * ==================================
 * Authenticates requests using workspace-scoped API keys
 * for partner integrations.
 *
 * Features:
 *   - API key validation and verification
 *   - Role-based access control
 *   - Scope-based permissions
 *   - IP allowlisting
 *   - Usage tracking
 *
 * Usage:
 *   app.get('/api/public/pricing/quote', authenticateApiKey('pricing:read'), handler);
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Extend Express Request to include API key metadata
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        userId: string;
        role: 'read_only' | 'read_write' | 'admin';
        scopes: string[];
        quotas: {
          perMinute: number;
          perHour: number;
          perDay: number;
        };
      };
    }
  }
}

/**
 * Hash API key using SHA-256 (same as database)
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Extract API key from request headers
 * Supports multiple formats:
 *   - Authorization: Bearer jen_live_abc123...
 *   - Authorization: jen_live_abc123...
 *   - X-API-Key: jen_live_abc123...
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // Bearer token format
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Check if it's an API key (starts with jen_)
      if (token.startsWith('jen_')) {
        return token;
      }
    }
    // Direct API key format
    else if (authHeader.startsWith('jen_')) {
      return authHeader;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'] as string;
  if (apiKeyHeader && apiKeyHeader.startsWith('jen_')) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Verify API key exists and is valid
 */
async function verifyApiKey(keyHash: string): Promise<{
  isValid: boolean;
  keyId?: string;
  userId?: string;
  role?: string;
  scopes?: string[];
  quotaPerMinute?: number;
  quotaPerHour?: number;
  quotaPerDay?: number;
} | null> {
  try {
    const { data, error } = await supabase.rpc('is_api_key_valid', {
      key_hash: keyHash,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      isValid: result.is_valid,
      keyId: result.key_id,
      userId: result.user_id,
      role: result.role,
      scopes: result.scopes,
      quotaPerMinute: result.quota_per_minute,
      quotaPerHour: result.quota_per_hour,
      quotaPerDay: result.quota_per_day,
    };
  } catch (error) {
    console.error('Error verifying API key:', error);
    return null;
  }
}

/**
 * Check if API key has required scope
 */
function hasScope(apiKeyScopes: string[], requiredScope: string): boolean {
  // Admin scope grants all permissions
  if (apiKeyScopes.includes('admin:*')) {
    return true;
  }

  // Check exact scope match
  if (apiKeyScopes.includes(requiredScope)) {
    return true;
  }

  // Check wildcard scope (e.g., pricing:* grants pricing:read and pricing:write)
  const [resource] = requiredScope.split(':');
  if (apiKeyScopes.includes(`${resource}:*`)) {
    return true;
  }

  return false;
}

/**
 * Check IP allowlist
 */
async function checkIpAllowlist(keyId: string, requestIp: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('allowed_ips')
      .eq('id', keyId)
      .single();

    if (error || !data) {
      return false;
    }

    // If no IP restrictions, allow all
    if (!data.allowed_ips || data.allowed_ips.length === 0) {
      return true;
    }

    // Check if request IP is in allowlist
    return data.allowed_ips.includes(requestIp);
  } catch (error) {
    console.error('Error checking IP allowlist:', error);
    return false;
  }
}

/**
 * Track API key usage for analytics and billing
 */
async function trackUsage(
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress: string,
  errorType?: string
): Promise<void> {
  try {
    await supabase.rpc('track_api_key_usage', {
      p_api_key_id: keyId,
      p_endpoint: endpoint,
      p_method: method,
      p_status_code: statusCode,
      p_response_time_ms: responseTimeMs,
      p_ip_address: ipAddress,
      p_error_type: errorType,
    });
  } catch (error) {
    // Don't fail request if tracking fails
    console.error('Error tracking API key usage:', error);
  }
}

/**
 * API Key Authentication Middleware
 *
 * @param requiredScope - Optional scope required for this endpoint
 * @returns Express middleware function
 *
 * @example
 * // Require pricing:read scope
 * app.get('/api/public/pricing/quote', authenticateApiKey('pricing:read'), handler);
 *
 * // No specific scope (just valid key)
 * app.get('/api/public/health', authenticateApiKey(), handler);
 */
export function authenticateApiKey(requiredScope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      // Extract API key from request
      const apiKey = extractApiKey(req);

      if (!apiKey) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'API key is required. Include in Authorization header or X-API-Key header.',
        });
      }

      // Hash the API key
      const keyHash = hashApiKey(apiKey);

      // Verify API key
      const verification = await verifyApiKey(keyHash);

      if (!verification || !verification.isValid) {
        // Track failed authentication
        await trackUsage(
          'unknown',
          req.path,
          req.method,
          401,
          Date.now() - startTime,
          req.ip || 'unknown',
          'INVALID_API_KEY'
        );

        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Invalid or expired API key.',
        });
      }

      // Check IP allowlist
      const ipAllowed = await checkIpAllowlist(verification.keyId!, req.ip || '');
      if (!ipAllowed) {
        await trackUsage(
          verification.keyId!,
          req.path,
          req.method,
          403,
          Date.now() - startTime,
          req.ip || 'unknown',
          'IP_NOT_ALLOWED'
        );

        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Your IP address is not allowed to use this API key.',
        });
      }

      // Check scope permissions
      if (requiredScope && !hasScope(verification.scopes || [], requiredScope)) {
        await trackUsage(
          verification.keyId!,
          req.path,
          req.method,
          403,
          Date.now() - startTime,
          req.ip || 'unknown',
          'INSUFFICIENT_SCOPE'
        );

        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `This API key does not have the required scope: ${requiredScope}`,
        });
      }

      // Attach API key metadata to request
      req.apiKey = {
        id: verification.keyId!,
        userId: verification.userId!,
        role: verification.role as any,
        scopes: verification.scopes || [],
        quotas: {
          perMinute: verification.quotaPerMinute || 60,
          perHour: verification.quotaPerHour || 1000,
          perDay: verification.quotaPerDay || 10000,
        },
      };

      // Also attach userId for compatibility with existing auth middleware
      (req as any).userId = verification.userId;

      // Track successful authentication (async, don't wait)
      trackUsage(
        verification.keyId!,
        req.path,
        req.method,
        200, // Will be updated by response tracking
        Date.now() - startTime,
        req.ip || 'unknown'
      );

      next();
    } catch (error) {
      console.error('Error in API key authentication:', error);

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while authenticating your API key.',
      });
    }
  };
}

/**
 * Flexible authentication middleware
 * Accepts either JWT (for user sessions) or API key (for integrations)
 */
export function authenticateFlexible(requiredScope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check if request has API key
    const apiKey = extractApiKey(req);

    if (apiKey) {
      // Use API key authentication
      return authenticateApiKey(requiredScope)(req, res, next);
    }

    // Check if request has JWT token (existing user authentication)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && !authHeader.substring(7).startsWith('jen_')) {
      // Use existing JWT authentication middleware
      const { authenticateUser } = require('./authenticateUser');
      return authenticateUser(req, res, next);
    }

    // No authentication provided
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Provide either a JWT token or API key.',
    });
  };
}

/**
 * Response tracking middleware
 * Tracks response status and timing for API key requests
 */
export function trackApiKeyResponse() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return next();
    }

    const startTime = Date.now();

    // Override res.send to track response
    const originalSend = res.send;
    res.send = function (data: any): Response {
      const responseTime = Date.now() - startTime;

      // Track usage (async, don't wait)
      trackUsage(
        req.apiKey!.id,
        req.path,
        req.method,
        res.statusCode,
        responseTime,
        req.ip || 'unknown',
        res.statusCode >= 400 ? 'ERROR' : undefined
      );

      return originalSend.call(this, data);
    };

    next();
  };
}

export default authenticateApiKey;
