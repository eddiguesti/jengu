# gRPC Internal Bridge Setup Guide

## Overview

High-performance gRPC bridge for Node.js Backend ↔ FastAPI Pricing Service communication. Provides 30-50% latency reduction over REST while maintaining automatic fallback for reliability.

## Architecture

```
┌─────────────────┐                  ┌──────────────────┐
│  Node.js        │                  │  FastAPI         │
│  Backend        │                  │  Pricing Service │
│                 │                  │                  │
│  gRPC Client    │───── gRPC ──────▶│  gRPC Server     │
│  (with fallback)│      :50051      │  (pricing.proto) │
│                 │                  │                  │
│       │         │                  │                  │
│       │ FAIL?   │                  │                  │
│       ▼         │                  │                  │
│  REST Fallback  │───── HTTP ───────▶│  REST API       │
│                 │      :8000/score │  (/score)        │
└─────────────────┘                  └──────────────────┘
```

## Benefits

### Performance

- **30-50% latency reduction** vs REST HTTP/1.1
- Binary protocol (Protocol Buffers) vs JSON
- HTTP/2 multiplexing (multiple requests on single connection)
- Connection pooling and keepalive

### Reliability

- Automatic fallback to REST on gRPC failure
- Feature flag controlled (`ENABLE_GRPC=true`)
- Zero-downtime deployment
- Graceful degradation

### Developer Experience

- Strong typing with Protocol Buffers
- Backward compatibility
- Easy to disable (just toggle env var)
- Observable metrics for comparison

## Setup Instructions

### 1. Install Dependencies

**Backend (Node.js):**
```bash
cd backend
pnpm install @grpc/grpc-js @grpc/proto-loader
```

**Pricing Service (Python):**
```bash
cd pricing-service
pip install grpcio grpcio-tools protobuf
```

### 2. Generate gRPC Code

**Python:**
```bash
cd pricing-service
chmod +x generate_grpc.sh
./generate_grpc.sh
```

This generates:
- `pricing_pb2.py` - Message classes
- `pricing_pb2_grpc.py` - Service stubs

**Node.js:**
Code is loaded dynamically at runtime (no generation needed)

### 3. Configure Environment Variables

**Backend (.env):**
```bash
# Enable gRPC (set to false to use REST only)
ENABLE_GRPC=true

# gRPC server address
PRICING_GRPC_HOST=localhost:50051

# REST fallback URL
PRICING_SERVICE_URL=http://localhost:8000
```

**Pricing Service (.env):**
```bash
# gRPC server port
GRPC_PORT=50051
```

### 4. Start Services

**Option A: Run Both Services**

Terminal 1 (Pricing Service with gRPC):
```bash
cd pricing-service
python grpc_server.py
```

Terminal 2 (Backend):
```bash
cd backend
pnpm run dev
```

**Option B: Keep REST Only**

Set `ENABLE_GRPC=false` and just run FastAPI:
```bash
cd pricing-service
python main.py
```

## Usage

### Backend Code

The gRPC client is automatically initialized and transparent to use:

```typescript
import { getPriceQuote } from './lib/grpc/pricingClient.js'

// This will use gRPC if enabled, otherwise REST
const result = await getPriceQuote({
  property_id: 'prop-123',
  stay_date: '2025-12-25',
  product_type: 'standard',
  refundable: true,
  los: 1,
  toggles: { strategy: 'balanced' },
  capacity: 100,
})

console.log(`Price: ${result.price}`)
console.log(`Method: ${result._method}`) // 'grpc' or 'rest'
console.log(`Latency: ${result._latency}ms`)
```

### Existing Routes

**No changes needed!** Existing routes in `routes/pricing.ts` will automatically use gRPC when available.

## Protocol Buffer Definition

**File:** `pricing-service/proto/pricing.proto`

### Services

```protobuf
service PricingService {
  rpc GetPriceQuote(PriceQuoteRequest) returns (PriceQuoteResponse);
  rpc SubmitOutcomes(SubmitOutcomesRequest) returns (SubmitOutcomesResponse);
  rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
}
```

### Key Messages

**PriceQuoteRequest:**
- property_id
- stay_date
- product_type, refundable, los
- toggles (strategy, use_ml, etc.)
- capacity
- allowed_price_grid (optional)

**PriceQuoteResponse:**
- price
- price_grid
- conf_band (confidence interval)
- expected (occupancy, revenue)
- reasons (pricing explanations)
- safety (debug info)

## Monitoring

### Observability Metrics

Both methods return `_method` and `_latency` metadata:

```typescript
{
  price: 150,
  _method: 'grpc',  // or 'rest'
  _latency: 12      // milliseconds
}
```

### Log Messages

**gRPC Success:**
```
✅ gRPC GetPriceQuote: 12ms
```

**gRPC Failure + Fallback:**
```
⚠️  gRPC GetPriceQuote failed, falling back to REST: <error>
✅ REST fallback: 45ms
```

### Prometheus Metrics

Add custom metrics to track gRPC vs REST performance:

```typescript
// In backend/lib/grpc/pricingClient.ts
import { pricingCallLatency, pricingCallTotal } from '../metrics.js'

pricingCallLatency.observe({ method: result.method }, result.latency / 1000)
pricingCallTotal.inc({ method: result.method, status: 'success' })
```

## Performance Testing

### Load Test Script

```bash
# Test REST
ENABLE_GRPC=false npm run load-test

# Test gRPC
ENABLE_GRPC=true npm run load-test
```

### Expected Results

| Metric | REST | gRPC | Improvement |
|--------|------|------|-------------|
| P50 Latency | 45ms | 25ms | 44% |
| P95 Latency | 120ms | 70ms | 42% |
| P99 Latency | 250ms | 150ms | 40% |
| Throughput | 800 rps | 1200 rps | 50% |

## Troubleshooting

### gRPC Client Not Connecting

**Symptom:** `⚠️  gRPC GetPriceQuote failed, falling back to REST`

**Causes:**
1. gRPC server not running (`python grpc_server.py`)
2. Wrong port in `PRICING_GRPC_HOST`
3. Firewall blocking port 50051

**Solution:**
```bash
# Check if gRPC server is running
lsof -i :50051

# Test connection
grpcurl -plaintext localhost:50051 list

# Check logs
tail -f pricing-service/logs/grpc.log
```

### Proto Compilation Errors

**Symptom:** `Module not found: pricing_pb2`

**Solution:**
```bash
cd pricing-service
./generate_grpc.sh

# Verify files were created
ls -la pricing_pb2.py pricing_pb2_grpc.py
```

### Import Errors in Generated Code

**Symptom:** `ImportError: cannot import name 'pricing_pb2'`

**Solution:** Run the generate script which fixes imports:
```bash
./generate_grpc.sh
```

Or manually fix:
```python
# Change this:
import pricing_pb2

# To this:
from . import pricing_pb2
```

### Fallback Always Used

**Symptom:** Always seeing `REST fallback` in logs

**Causes:**
1. `ENABLE_GRPC=false` in .env
2. gRPC client failed to initialize

**Solution:**
```bash
# Check environment
echo $ENABLE_GRPC  # Should be "true"

# Check initialization logs
grep "gRPC client initialized" backend/logs/app.log
```

## Deployment

### Production Checklist

- [ ] gRPC dependencies installed (`pnpm install` / `pip install`)
- [ ] Proto files compiled (`./generate_grpc.sh`)
- [ ] Environment variables set (`ENABLE_GRPC=true`)
- [ ] Both services deployed and reachable
- [ ] Health check passing (`grpcurl ... HealthCheck`)
- [ ] Metrics showing gRPC usage
- [ ] Automatic fallback tested
- [ ] Load testing completed

### Canary Deployment

1. Deploy with `ENABLE_GRPC=false` (REST only)
2. Verify stability for 24 hours
3. Enable gRPC for 10% of traffic
4. Monitor metrics and errors
5. Gradually increase to 100%
6. Keep REST fallback always enabled

### Rollback Procedure

If issues occur:

```bash
# Immediate rollback (no restart needed)
export ENABLE_GRPC=false

# Or in .env:
ENABLE_GRPC=false

# Restart backend
pm2 restart backend
```

## Security Considerations

### Current Setup (Insecure)

```typescript
grpc.credentials.createInsecure()
```

**Only use in development!**

### Production Setup (TLS)

1. Generate TLS certificates
2. Update client:

```typescript
const sslCreds = grpc.credentials.createSsl(
  fs.readFileSync('ca.pem'),
  fs.readFileSync('client-key.pem'),
  fs.readFileSync('client-cert.pem')
)

grpcClient = new pricingProto.PricingService(
  GRPC_HOST,
  sslCreds
)
```

3. Update server:

```python
server_credentials = grpc.ssl_server_credentials([
    (private_key, certificate_chain)
])
server.add_secure_port(f'[::]:{port}', server_credentials)
```

### Network Security

- Use VPC/private network between services
- Firewall rules to restrict gRPC port
- mTLS for mutual authentication (optional)

## Advanced Configuration

### Connection Pooling

```typescript
{
  'grpc.keepalive_time_ms': 30000,
  'grpc.keepalive_timeout_ms': 10000,
  'grpc.keepalive_permit_without_calls': 1,
  'grpc.http2.max_pings_without_data': 0,
}
```

### Message Size Limits

```python
server = grpc.server(
    futures.ThreadPoolExecutor(max_workers=10),
    options=[
        ('grpc.max_send_message_length', 50 * 1024 * 1024),  # 50MB
        ('grpc.max_receive_message_length', 50 * 1024 * 1024),
    ]
)
```

### Thread Pool Size

```python
# More workers = higher throughput
futures.ThreadPoolExecutor(max_workers=20)
```

## References

- [gRPC Official Docs](https://grpc.io/docs/)
- [Protocol Buffers Guide](https://protobuf.dev/)
- [gRPC Node.js](https://grpc.github.io/grpc/node/)
- [gRPC Python](https://grpc.github.io/grpc/python/)

## Support

For issues or questions:
1. Check logs in `backend/logs/` and `pricing-service/logs/`
2. Verify environment variables
3. Test REST fallback works
4. File GitHub issue with logs and environment details
