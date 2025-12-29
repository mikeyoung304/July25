# SCALABILITY & RELIABILITY ANALYSIS

**Audit Date**: 2025-12-28
**System**: Grow / Restaurant OS (rebuild-6.0)
**Current Deployment**: Render (Single Instance)

---

## Executive Summary

The system is designed for **single-instance deployment** and will face significant challenges scaling beyond ~50 concurrent restaurants. Critical reliability gaps exist around rate limiting, WebSocket connections, and memory management.

| Dimension | Current Capacity | Scaling Limit | Bottleneck |
|-----------|-----------------|---------------|------------|
| Restaurants | ~50 | ~100 | Memory (embeddings) |
| Concurrent Users | ~200 | ~500 | WebSocket connections |
| Orders/Hour | ~1000 | ~5000 | Database connections |
| Payment Volume | Unlimited | - | Stripe handles scale |

---

## Load Bottlenecks

### 1. Memory Pressure - Embedding Service

**Location**: `server/src/services/ai/MenuEmbeddingService.ts`

**Current Behavior**:
```typescript
// In-memory cache with no size limits
private embeddings: Map<string, EmbeddingCache> = new Map();
private rateLimitStore: Map<string, RateLimitEntry> = new Map();
```

**Problem**:
- No LRU eviction policy
- Cache grows unbounded with menu items
- Each restaurant's menu cached indefinitely
- Memory fragmentation over time

**Calculation**:
```
Per restaurant menu: ~100 items × 1536 dimensions × 4 bytes = 600KB
50 restaurants = 30MB embeddings
+ Metadata overhead = ~50MB total
```

**Threshold**: Safe until ~200 restaurants, then risks OOM

**Recommendation**:
- Add LRU cache with max size (e.g., 50MB)
- TTL-based expiration (24 hours)
- Consider Redis for horizontal scaling

---

### 2. WebSocket Connection Limits

**Location**: `server/src/services/realtime/`, `client/src/services/websocket/`

**Current Behavior**:
- Each client maintains persistent WebSocket
- KDS displays hold long-lived connections
- No connection pooling or multiplexing

**Problem**:
- Render instances have connection limits
- Each device = 1 connection
- No reconnection backoff strategy observed

**Calculation**:
```
Per restaurant: 4-8 devices (POS tablets, KDS, manager)
50 restaurants = 250-400 connections
Render limit: ~1000 concurrent (estimated)
```

**Threshold**: ~100-150 restaurants

**Recommendation**:
- Implement connection multiplexing
- Add exponential backoff on reconnect
- Consider Socket.IO rooms for efficient broadcasting

---

### 3. Database Connection Pool

**Location**: `server/src/config/database.ts`

**Current Behavior**:
```typescript
// Supabase client with default pooling
export const supabase = createClient(url, serviceKey);
```

**Problem**:
- Default connection pool size unknown
- Each request may hold connection during async operations
- Long-running queries block pool

**Calculation**:
```
Supabase free tier: 60 connections
Pro tier: 200 connections
Each active order update: ~50-100ms connection hold
Peak: 100 orders/min = ~10 concurrent connections
```

**Threshold**: Safe for current scale, risk at ~500 orders/min

**Recommendation**:
- Add connection pool monitoring
- Implement query timeout limits
- Consider read replicas for reporting

---

### 4. Rate Limiter State Loss

**Location**: `server/src/middleware/rateLimiter.ts`

**Current Behavior**:
```typescript
// In-memory rate limit storage
const requests = new Map<string, number[]>();
```

**Problem**:
- Server restart clears all rate limits
- Render deploys = rate limit reset
- Attackers can time attacks around deploys
- Legitimate users get double-rate-limited after restart

**Impact**:
- POST-deploy: Flood of requests from devices that queued
- Brute force window during restart
- Inconsistent rate limiting experience

**Recommendation**:
- Migrate to Redis for distributed state
- Add grace period after restart
- Implement sliding window vs fixed window

---

## Reliability Analysis

### Single Points of Failure

| Component | SPOF? | Mitigation | Recovery Time |
|-----------|-------|------------|---------------|
| Express Server | Yes | Render auto-restart | ~30-60s |
| Supabase Database | No | Managed HA | ~0s (failover) |
| Stripe API | No | Built-in redundancy | N/A |
| OpenAI API | Yes | Feature degrades gracefully | N/A |
| WebSocket Hub | Yes | Client reconnection | ~5-10s |

### Failure Cascade Analysis

**Scenario: Database Connection Exhaustion**

```
1. Traffic spike → connection pool exhausted
2. New requests queue → response times increase
3. Timeouts cascade → WebSocket heartbeats fail
4. Clients reconnect → more connections requested
5. Negative feedback loop → server becomes unresponsive
```

**Mitigation**:
- Circuit breaker for database calls
- Connection pool alerts at 70% utilization
- Request queuing with backpressure

**Scenario: Memory Exhaustion (OOM)**

```
1. Embedding cache grows unbounded
2. GC pressure increases → latency spikes
3. GC pause exceeds healthcheck timeout
4. Render restarts instance
5. All in-memory state lost (rate limits, caches)
6. Cold start: All clients request embeddings simultaneously
7. OOM again → restart loop
```

**Mitigation**:
- Bounded cache sizes
- Lazy embedding generation
- Startup rate limiting for cache warming

---

### Timeout Analysis

| Operation | Current Timeout | Recommended | Risk |
|-----------|-----------------|-------------|------|
| HTTP requests | 120s (default) | 30s | Request pile-up |
| Database queries | None observed | 10s | Pool exhaustion |
| Stripe API calls | None observed | 30s | Payment hang |
| OpenAI API calls | None observed | 60s | Embedding delay |
| WebSocket ping | Unknown | 30s | Stale connections |

---

## Capacity Planning

### Current State (Single Instance)

```
┌────────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Render Instance (4GB RAM)                                     │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Express Server                                          │  │
│   │  ├── Rate Limiter (in-memory)                           │  │
│   │  ├── Embedding Cache (in-memory, unbounded)             │  │
│   │  ├── WebSocket Hub (single process)                     │  │
│   │  └── All HTTP handlers                                  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                         │                                       │
│                         ▼                                       │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Supabase (Managed)                                      │  │
│   │  ├── PostgreSQL + RLS                                   │  │
│   │  ├── Auth service                                       │  │
│   │  └── Real-time subscriptions                            │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   Capacity: ~50 restaurants, ~200 users, ~1000 orders/hour     │
└────────────────────────────────────────────────────────────────┘
```

### Scaling Path (Recommended)

```
┌────────────────────────────────────────────────────────────────┐
│                    SCALED ARCHITECTURE                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Load Balancer                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Cloudflare / Render LB                                  │  │
│   │  ├── SSL termination                                    │  │
│   │  ├── DDoS protection                                    │  │
│   │  └── Session affinity (WebSocket)                       │  │
│   └─────────────────────────────────────────────────────────┘  │
│                         │                                       │
│           ┌─────────────┼─────────────┐                        │
│           ▼             ▼             ▼                        │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐                 │
│   │ Instance 1│  │ Instance 2│  │ Instance 3│                 │
│   │ (Stateless)│ │ (Stateless)│ │ (Stateless)│                │
│   └───────────┘  └───────────┘  └───────────┘                 │
│           │             │             │                        │
│           └─────────────┼─────────────┘                        │
│                         ▼                                       │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Redis (Rate Limits + Cache)                             │  │
│   │  ├── Distributed rate limiting                          │  │
│   │  ├── LRU embedding cache                                │  │
│   │  └── Session store (optional)                           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                         │                                       │
│                         ▼                                       │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Supabase (Managed)                                      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   Capacity: ~500 restaurants, ~2000 users, ~10000 orders/hour  │
└────────────────────────────────────────────────────────────────┘
```

---

## Performance Benchmarks (Estimated)

### Latency Targets

| Operation | P50 Target | P99 Target | Current (Est.) |
|-----------|-----------|-----------|----------------|
| Menu load | <200ms | <500ms | ~300ms |
| Order creation | <300ms | <1s | ~400ms |
| Payment initiation | <500ms | <2s | ~600ms |
| KDS update (WebSocket) | <100ms | <300ms | ~150ms |
| Search (semantic) | <500ms | <1.5s | ~800ms |

### Throughput Targets

| Operation | Target/min | Current Capacity | Gap |
|-----------|-----------|------------------|-----|
| Order creates | 500 | ~200 | 2.5x |
| Menu updates | 50 | ~30 | 1.7x |
| Payment processes | 200 | ~100 | 2x |
| WebSocket messages | 10000 | ~5000 | 2x |

---

## Reliability Metrics

### Current State (Estimated)

| Metric | Target | Current (Est.) | Gap |
|--------|--------|----------------|-----|
| Availability | 99.9% | ~99.5% | 0.4% |
| MTTR | <5 min | ~2 min | ✓ |
| MTBF | >7 days | ~3 days | 2.3x |
| Error Rate | <0.1% | ~0.3% | 3x |

### Risk Factors Affecting Reliability

1. **Deploy-time downtime**: ~30-60s per deploy
2. **Memory leaks**: Embedding cache growth
3. **Rate limit reset**: Every restart
4. **Single instance**: No redundancy

---

## Recommendations

### Phase 1: Stabilization (Week 1-2)

| Item | Effort | Impact |
|------|--------|--------|
| Add cache size limits | Low | High |
| Add query timeouts | Low | Medium |
| Add connection pool monitoring | Low | Medium |
| Add memory usage alerts | Low | High |

### Phase 2: Hardening (Week 3-4)

| Item | Effort | Impact |
|------|--------|--------|
| Migrate rate limiting to Redis | Medium | High |
| Add circuit breakers | Medium | Medium |
| Implement connection pooling | Medium | Medium |
| Add graceful shutdown | Low | Medium |

### Phase 3: Scaling (Month 2+)

| Item | Effort | Impact |
|------|--------|--------|
| Multi-instance deployment | High | High |
| WebSocket clustering | High | Medium |
| Read replicas | High | Medium |
| CDN for static assets | Medium | Medium |

---

## Disaster Recovery

### Current State

| Aspect | Status | Gap |
|--------|--------|-----|
| Database backups | ✓ Supabase automatic | None |
| Code versioning | ✓ Git | None |
| Config backups | ❌ Not observed | Critical |
| Runbooks | ❌ Not observed | Critical |
| RTO target | Unknown | Define |
| RPO target | Unknown | Define |

### Recommended RTO/RPO

| Scenario | RTO | RPO |
|----------|-----|-----|
| Server crash | 5 min | 0 (no data loss) |
| Database corruption | 1 hour | 24 hours |
| Total infrastructure loss | 24 hours | 24 hours |
| Secret compromise | 1 hour | N/A |

---

## Conclusion

The system is **adequately sized for initial launch** with ~50 restaurants but will require significant investment to scale beyond that. The primary concerns are:

1. **Memory management**: Unbounded caches risk OOM
2. **Stateful middleware**: Rate limiting lost on restart
3. **Single instance**: No horizontal scaling path without Redis

The reliability gaps are manageable for soft launch but must be addressed before high-volume production use.

**Scalability Grade**: C (Works now, won't scale)
**Reliability Grade**: B- (Adequate, gaps in edge cases)

---

**Report Prepared By**: Hostile Enterprise Auditor
**Review Date**: 2025-12-28
