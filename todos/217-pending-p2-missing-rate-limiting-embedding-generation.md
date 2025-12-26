# TODO-217: Missing Rate Limiting on Embedding Generation

**Priority:** P2 (Important - Security/Cost)
**Category:** Security / Performance
**Source:** Code Review - Security Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

The embedding generation endpoints lack rate limiting, allowing potential abuse:

```typescript
// No rate limiting on these operations
static async generateItemEmbedding(restaurantId: string, itemId: string)
static async generateAllEmbeddings(restaurantId: string, options)
```

## Risks

1. **Cost attack** - Attacker triggers massive OpenAI API usage
2. **DoS** - Overwhelming the system with embedding requests
3. **Budget exhaustion** - OpenAI billing spikes

## Current Batch Limits

The code has internal batching (20 items, 1s delay) but no request-level protection:
```typescript
const { batchSize = 20 } = options;
// Rate limiting: wait 1 second between batches
await new Promise(resolve => setTimeout(resolve, 1000));
```

This doesn't prevent:
- Multiple concurrent calls to `generateAllEmbeddings`
- Rapid sequential calls
- Automated abuse

## Resolution

### Option 1: Add Rate Limiter Middleware
```typescript
import { rateLimit } from 'express-rate-limit';

const embeddingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per restaurant
  keyGenerator: (req) => req.params.restaurantId
});

router.post('/embeddings/generate', embeddingLimiter, ...);
```

### Option 2: Queue-Based Processing
```typescript
// Use job queue with concurrency limits
await embeddingQueue.add('generate', { restaurantId }, {
  rateLimiter: { max: 1, duration: 60000 }
});
```

### Option 3: Admin-Only Access
```typescript
// Restrict to admin role
router.post('/embeddings/generate', requireRole('admin'), ...);
```

## Files Affected

- `server/src/services/menu-embedding.service.ts`
- `server/src/routes/menu.routes.ts` (if endpoint exists)

## Verification

```bash
# Check if embedding endpoints are exposed
grep -rn "embedding" server/src/routes/
```

## Impact

- Potential cost overruns
- OpenAI API rate limit hits
- Service degradation under attack
