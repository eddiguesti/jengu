import { describe, it, expect, vi } from 'vitest'
import { asyncHandler, sendError, logError, ErrorTypes } from '../utils/errorHandler.js'
import { Request, Response, NextFunction } from 'express'

describe('Error Handler Utilities', () => {
  describe('asyncHandler', () => {
    it('should call next with error when async function rejects', async () => {
      const error = new Error('Test error')
      const asyncFn = vi.fn().mockRejectedValue(error)
      const handler = asyncHandler(asyncFn)

      const req = {} as Request
      const res = {} as Response
      const next = vi.fn() as NextFunction

      await handler(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })

    it('should not call next when async function resolves', async () => {
      const asyncFn = vi.fn().mockResolvedValue(undefined)
      const handler = asyncHandler(asyncFn)

      const req = {} as Request
      const res = {} as Response
      const next = vi.fn() as NextFunction

      await handler(req, res, next)

      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('sendError', () => {
    it('should send validation error with correct status code', () => {
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response

      sendError(res, 'VALIDATION', 'Invalid input')

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          message: 'Invalid input',
          timestamp: expect.any(String),
        })
      )
    })

    it('should send not found error with correct status code', () => {
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response

      sendError(res, 'NOT_FOUND', 'Resource not found')

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Resource Not Found',
          message: 'Resource not found',
          timestamp: expect.any(String),
        })
      )
    })

    it('should default to internal error for unknown error type', () => {
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response

      sendError(res, 'UNKNOWN_TYPE', 'Something went wrong')

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Something went wrong',
          timestamp: expect.any(String),
        })
      )
    })
  })

  describe('logError', () => {
    it('should log error with context metadata', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')
      const metadata = { userId: '123', fileId: '456' }

      logError(error, 'TEST_CONTEXT', metadata)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TEST_CONTEXT] Error:',
        expect.objectContaining({
          message: 'Test error',
          userId: '123',
          fileId: '456',
          timestamp: expect.any(String),
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('ErrorTypes', () => {
    it('should have correct error type configurations', () => {
      expect(ErrorTypes.VALIDATION).toEqual({
        error: 'Validation Error',
        statusCode: 400,
      })

      expect(ErrorTypes.AUTHENTICATION).toEqual({
        error: 'Authentication Error',
        statusCode: 401,
      })

      expect(ErrorTypes.NOT_FOUND).toEqual({
        error: 'Resource Not Found',
        statusCode: 404,
      })

      expect(ErrorTypes.INTERNAL).toEqual({
        error: 'Internal Server Error',
        statusCode: 500,
      })
    })
  })
})
