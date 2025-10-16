/**
 * Extend Express Request with custom properties
 */

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export {}
