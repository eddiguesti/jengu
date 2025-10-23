/**
 * Express Request type extensions
 * Adds custom properties to Express Request object
 */

declare global {
  namespace Express {
    interface Request {
      id: string
      userId?: string
      startTime: number
    }
  }
}

export {}
