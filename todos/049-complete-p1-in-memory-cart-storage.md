---
status: complete
priority: p1
issue_id: "049"
tags: [code-review, architecture, scalability, voice-ordering]
dependencies: []
---

# In-Memory Cart Storage - Data Loss Risk

## Problem Statement

The voice ordering cart storage uses an in-memory `Map` which causes data loss on server restart and prevents horizontal scaling.

**Location:** `server/src/ai/functions/realtime-menu-tools.ts:126`

```typescript
// In-memory cart storage (replace with Redis in production)
const cartStorage = new Map<string, Cart>();
```

**Why It Matters:**
- Server restart = ALL active carts lost mid-order
- Cannot scale horizontally (different servers have different carts)
- No persistence during deploys

## Findings

### From Architecture Review:
- Single-Point-of-Failure: Server restart loses all active carts
- No Horizontal Scaling: Cannot distribute across multiple server instances
- Race Conditions: Multiple servers accessing different cart state
- Session Affinity Required: Load balancer must route same session to same server

### Data Loss Scenario:
```
User: "I'd like 2 burgers with extra cheese"
AI: "Added to cart, total $24.50"
[Server restarts for deploy]
User: "And a large fries"
AI: "Your cart is empty" ❌
```

### Impact Assessment:
- **Current:** Works fine for single-server development/staging
- **Production:** Fails at >1 server instance (required for HA)
- **Scale:** 100 concurrent voice orders × 5KB per cart = 500KB (manageable memory)

## Proposed Solutions

### Solution 1: Redis Cart Storage (Recommended)
**Pros:** Industry standard, fast, TTL support, atomic operations
**Cons:** New dependency, infrastructure cost
**Effort:** Medium (2-3 days)
**Risk:** Low

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function getCart(sessionId: string, restaurantId: string): Promise<Cart> {
  const cached = await redis.get(`cart:${sessionId}`);
  if (cached) return JSON.parse(cached);

  const cart = createNewCart(sessionId, restaurantId);
  await redis.setex(`cart:${sessionId}`, 1800, JSON.stringify(cart));
  return cart;
}
```

### Solution 2: Supabase Session Storage
**Pros:** Uses existing infrastructure, no new dependencies
**Cons:** Higher latency, database load
**Effort:** Medium (2 days)
**Risk:** Low

```typescript
const { data: cart } = await supabase
  .from('voice_order_sessions')
  .select('cart_data')
  .eq('session_id', sessionId)
  .eq('restaurant_id', restaurantId)
  .single();
```

### Solution 3: Client-Side Cart
**Pros:** Server becomes stateless, simplest
**Cons:** Cart lost if browser closes, larger payloads
**Effort:** Low (1 day)
**Risk:** Medium

## Recommended Action
<!-- To be filled after triage -->

## Technical Details

**Affected Files:**
- `server/src/ai/functions/realtime-menu-tools.ts`

**Database Changes:**
- New table `voice_order_sessions` if using Supabase solution
- Or Redis connection string env var

## Acceptance Criteria

- [ ] Active carts survive server restart
- [ ] Multiple server instances can access same cart
- [ ] Cart expiration after 30 minutes of inactivity
- [ ] No data loss during deploys

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-24 | Created from code review | Identified as P0 for production |

## Resources

- Code comment acknowledges issue: "replace with Redis in production"
- Cleanup function exists but only runs every 5 minutes (line 896-906)
