import pino from 'pino'
import { pinoHttp } from 'pino-http'
import { IncomingMessage, ServerResponse } from 'http'

// Create pino logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})

// Create HTTP request logger middleware
export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 500 || err) {
      return 'error'
    } else if (res.statusCode >= 400) {
      return 'warn'
    } else if (res.statusCode >= 300) {
      return 'info'
    }
    return 'info'
  },
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} completed with ${res.statusCode}`
  },
  customErrorMessage: (_req: IncomingMessage, _res: ServerResponse, err: Error) => {
    return `Request error: ${err.message}`
  },
  serializers: {
    req: (req: IncomingMessage) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
      },
    }),
    res: (res: ServerResponse) => ({
      statusCode: res.statusCode,
    }),
  },
})
