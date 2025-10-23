/**
 * gRPC Pricing Client
 * High-performance binary protocol client with REST fallback
 *
 * Features:
 * - gRPC for low-latency communication
 * - Automatic fallback to REST on failure
 * - Feature flag controlled (ENABLE_GRPC)
 * - Connection pooling and keepalive
 * - Observability metrics
 */

import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const GRPC_ENABLED = process.env.ENABLE_GRPC === 'true'
const GRPC_HOST = process.env.PRICING_GRPC_HOST || 'localhost:50051'
const REST_URL = process.env.PRICING_SERVICE_URL || 'http://localhost:8000'

// Proto file path
const PROTO_PATH = path.join(__dirname, '../../../pricing-service/proto/pricing.proto')

// Load proto definition
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any
const pricingProto = protoDescriptor.pricing

// gRPC client instance
let grpcClient: any = null

/**
 * Initialize gRPC client
 */
export function initGrpcClient(): void {
  if (!GRPC_ENABLED) {
    logger.info('ℹ️  gRPC disabled, using REST fallback')
    return
  }

  try {
    grpcClient = new pricingProto.PricingService(
      GRPC_HOST,
      grpc.credentials.createInsecure(),
      {
        'grpc.keepalive_time_ms': 30000,
        'grpc.keepalive_timeout_ms': 10000,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.http2.max_pings_without_data': 0,
      }
    )

    logger.info(`✅ gRPC client initialized: ${GRPC_HOST}`)
  } catch (error) {
    logger.error('❌ Failed to initialize gRPC client:', error)
    grpcClient = null
  }
}

/**
 * Call gRPC with automatic REST fallback
 */
async function callWithFallback<T>(
  grpcMethod: string,
  request: any,
  restFallback: () => Promise<T>
): Promise<{ data: T; method: 'grpc' | 'rest'; latency: number }> {
  const startTime = Date.now()

  // Try gRPC first if enabled
  if (GRPC_ENABLED && grpcClient) {
    try {
      const result = await new Promise<T>((resolve, reject) => {
        grpcClient[grpcMethod](request, (error: Error | null, response: T) => {
          if (error) {
            reject(error)
          } else {
            resolve(response)
          }
        })
      })

      const latency = Date.now() - startTime
      logger.debug(`✅ gRPC ${grpcMethod}: ${latency}ms`)

      return { data: result, method: 'grpc', latency }
    } catch (error) {
      logger.warn(`⚠️  gRPC ${grpcMethod} failed, falling back to REST:`, error)
      // Fall through to REST
    }
  }

  // Fallback to REST
  const restStart = Date.now()
  const result = await restFallback()
  const latency = Date.now() - restStart

  logger.debug(`✅ REST fallback: ${latency}ms`)
  return { data: result, method: 'rest', latency }
}

/**
 * Get price quote via gRPC (with REST fallback)
 */
export async function getPriceQuote(request: {
  property_id: string
  stay_date: string
  product_type: string
  refundable: boolean
  los: number
  toggles: any
  capacity: number
  allowed_price_grid?: number[]
}): Promise<{
  price: number
  price_grid?: number[]
  conf_band?: { lower: number; upper: number }
  expected?: { occ_now?: number; occ_end_bucket?: number; revenue?: number }
  reasons?: string[]
  safety?: Record<string, any>
  _method?: 'grpc' | 'rest'
  _latency?: number
}> {
  const result = await callWithFallback(
    'GetPriceQuote',
    request,
    async () => {
      // REST fallback
      const response = await fetch(`${REST_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`REST /score error: ${response.status} ${errorText}`)
      }

      return await response.json()
    }
  )

  return {
    ...result.data,
    _method: result.method,
    _latency: result.latency,
  }
}

/**
 * Submit outcomes via gRPC (with REST fallback)
 */
export async function submitOutcomes(outcomes: Array<{
  property_id: string
  stay_date: string
  quoted_price: number
  booked: boolean
  final_price?: number
  timestamp: number
  metadata?: Record<string, string>
}>): Promise<{
  success: boolean
  processed: number
  message?: string
  _method?: 'grpc' | 'rest'
  _latency?: number
}> {
  const result = await callWithFallback(
    'SubmitOutcomes',
    { outcomes },
    async () => {
      // REST fallback
      const response = await fetch(`${REST_URL}/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outcomes),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`REST /learn error: ${response.status} ${errorText}`)
      }

      return await response.json()
    }
  )

  return {
    ...result.data,
    _method: result.method,
    _latency: result.latency,
  }
}

/**
 * Health check via gRPC
 */
export async function healthCheck(): Promise<{
  status: string
  version: string
  uptime_seconds: number
  method: 'grpc' | 'rest'
}> {
  if (GRPC_ENABLED && grpcClient) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        grpcClient.HealthCheck({}, (error: Error | null, response: any) => {
          if (error) {
            reject(error)
          } else {
            resolve(response)
          }
        })
      })

      return { ...result, method: 'grpc' }
    } catch (error) {
      logger.warn('gRPC health check failed:', error)
    }
  }

  // REST fallback
  const response = await fetch(`${REST_URL}/health`)
  const data = await response.json()
  return { ...data, method: 'rest' }
}

/**
 * Close gRPC client
 */
export function closeGrpcClient(): void {
  if (grpcClient) {
    grpcClient.close()
    grpcClient = null
    logger.info('🔒 gRPC client closed')
  }
}

// Initialize on module load
initGrpcClient()

export default {
  getPriceQuote,
  submitOutcomes,
  healthCheck,
  initGrpcClient,
  closeGrpcClient,
}
