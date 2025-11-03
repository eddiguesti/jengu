# Redis Configuration Guide

**Last Updated**: 2025-11-03
**Purpose**: Redis configuration, eviction policies, and best practices

---

## Overview

The Jengu platform uses Redis for two primary purposes:

1. **Job Queue Management** - BullMQ job queues for background processing
2. **Chat Context Caching** - Caching user context for chatbot performance

---

## Environment Configuration

### Local Development

```bash
# .env file
REDIS_URL=redis://localhost:6379
```

### Production (Upstash or Redis Cloud)

```bash
# .env file
REDIS_URL=redis://:password@hostname:port
```

---

## Eviction Policy

### Recommended: `allkeys-lru`

**Why this policy?**

- **Automatic Memory Management**: Redis automatically evicts least-recently-used keys when memory limit is reached
- **Mixed Workloads**: Works well for both persistent queues and temporary caches
- **Safe for Production**: Prevents OOM errors without manual intervention

### Setting the Eviction Policy

**On Upstash:**

1. Go to Upstash Dashboard → Your Redis Instance
2. Navigate to "Configuration" tab
3. Set `maxmemory-policy` to `allkeys-lru`
4. Set `maxmemory` to appropriate limit (e.g., 100MB for free tier)

**On Redis Cloud:**

1. Database Configuration → Advanced Options
2. Set Eviction Policy: `allkeys-lru`
3. Set Memory Limit: 100MB - 1GB depending on tier

**Local Redis (redis.conf):**

```conf
maxmemory 100mb
maxmemory-policy allkeys-lru
```

**Or via redis-cli:**

```bash
redis-cli CONFIG SET maxmemory 100mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG REWRITE  # Make changes persistent
```

---

## Eviction Policy Options

| Policy         | Description                                             | Use Case                                    |
| -------------- | ------------------------------------------------------- | ------------------------------------------- |
| `allkeys-lru`  | ✅ **Recommended** - Evict any key, least recently used | Mixed persistent + cache workloads          |
| `volatile-lru` | Evict only keys with TTL, LRU                           | When you want to protect persistent data    |
| `allkeys-lfu`  | Evict any key, least frequently used                    | Workloads with clear hot/cold data patterns |
| `volatile-lfu` | Evict keys with TTL, LFU                                | TTL-based caching with frequency awareness  |
| `noeviction`   | ❌ Return errors when memory full                       | Dev/test only - not safe for production     |

**Why NOT `noeviction`?**

- Causes OOM errors in production
- Breaks chat endpoint when cache fills up
- Requires manual memory management

---

## Memory Usage by Component

### BullMQ Job Queues

- **Enrichment Queue**: ~5-10KB per job, short-lived (processed immediately)
- **Pricing Queue**: ~2-5KB per job, transient
- **Alert Queue**: ~1-3KB per job, low volume
- Total: ~10-50MB under normal load

### Chat Context Cache

- **Per User**: ~2-10KB per cached context
- **TTL**: 5 minutes (auto-expires)
- **Expected Usage**: 100 active users × 5KB = 500KB
- Total: ~1-5MB under normal load

### Total Expected Usage

- **Light Load** (10 users): ~15-20MB
- **Moderate Load** (100 users): ~20-60MB
- **Heavy Load** (1000 users): ~50-150MB

---

## Cache Key Patterns

### Chat Context Cache

```
chat:context:{userId}
TTL: 300 seconds (5 minutes)
Size: ~2-10KB per key
```

### BullMQ Queues

```
bull:enrichment:{jobId}
bull:pricing:{jobId}
bull:alerts:{jobId}
TTL: Managed by BullMQ (auto-cleaned after completion)
```

---

## Monitoring Redis

### Check Memory Usage

```bash
redis-cli INFO memory
```

**Key Metrics:**

- `used_memory_human` - Total memory used
- `maxmemory_human` - Memory limit
- `evicted_keys` - Number of evicted keys (should be low)
- `expired_keys` - Number of expired keys (normal)

### Check Eviction Stats

```bash
redis-cli INFO stats | grep evicted
```

**Healthy System:**

- `evicted_keys`: 0-100/hour (occasional)
- If evictions are high, increase memory limit

### Monitor Cache Hit Rate

```bash
# For chat context cache
redis-cli --scan --pattern "chat:context:*" | wc -l
```

---

## Best Practices

### 1. Always Set TTL on Cache Keys

```typescript
// ✅ Good - Auto-expires after 5 minutes
await redis.setex('chat:context:123', 300, data)

// ❌ Bad - Never expires, wastes memory
await redis.set('chat:context:123', data)
```

### 2. Use Descriptive Key Prefixes

```typescript
// ✅ Good - Easy to identify and manage
chat: context: {
  userId
}
bull: enrichment: {
  jobId
}

// ❌ Bad - Hard to debug
user_123
job_456
```

### 3. Monitor Eviction Rates

If `evicted_keys` > 1000/hour:

- Increase Redis memory limit, OR
- Reduce cache TTL, OR
- Optimize data size

### 4. Handle Cache Misses Gracefully

```typescript
// ✅ Good - Fallback to database if cache miss
const cached = await getCachedUserContext(userId)
if (!cached) {
  const fresh = await fetchFromDatabase(userId)
  await setCachedUserContext(userId, fresh)
  return fresh
}
return cached
```

### 5. Invalidate Cache on Data Changes

```typescript
// When user uploads new data
await invalidateUserContext(userId)

// When enrichment completes
await invalidateUserContext(userId)
```

---

## Troubleshooting

### Issue: "OOM command not allowed when used memory > 'maxmemory'"

**Cause**: Redis memory full, eviction policy is `noeviction`

**Fix:**

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Issue: High eviction rate

**Cause**: Too much data, not enough memory

**Fix:**

1. Increase `maxmemory` limit
2. Reduce cache TTL (e.g., 3 minutes instead of 5)
3. Audit large keys: `redis-cli --bigkeys`

### Issue: Chat context always cache miss

**Cause**: TTL too short or eviction too aggressive

**Check:**

```bash
# See how long keys survive
redis-cli --scan --pattern "chat:context:*"
redis-cli TTL chat:context:USER_ID
```

**Fix:**

- Increase cache TTL to 10 minutes
- Increase maxmemory limit

---

## Production Checklist

- [ ] Set `maxmemory-policy` to `allkeys-lru`
- [ ] Set `maxmemory` to appropriate limit (100MB minimum)
- [ ] Enable persistence (AOF or RDB) if using for job queues
- [ ] Monitor `evicted_keys` metric
- [ ] Set up alerts for high memory usage (>80%)
- [ ] Test cache invalidation on data upload/enrichment
- [ ] Verify chat context caching reduces DB queries

---

## References

- [Redis Eviction Policies](https://redis.io/docs/manual/eviction/)
- [Redis Memory Optimization](https://redis.io/docs/manual/optimization/memory-optimization/)
- [BullMQ Best Practices](https://docs.bullmq.io/guide/best-practices)
- [Upstash Documentation](https://upstash.com/docs/redis)

---

**Configuration Status**: ✅ Complete

- Chat context caching implemented in `backend/services/chatContextCache.ts`
- Redis connection configured in `backend/lib/queue/connection.ts`
- Chat routes updated to use caching in `backend/routes/chat.ts`
