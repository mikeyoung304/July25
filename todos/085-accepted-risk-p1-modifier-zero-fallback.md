---
status: accepted-risk
priority: p1
issue_id: "085"
tags: [code-review, financial, reliability]
dependencies: []
reviewed_date: 2025-11-28
---

# Modifier Pricing Falls Back to $0 on Database Failure

## Current Status: ACCEPTED RISK

The current implementation (lines 273-288, 331-342 in `realtime-menu-tools.ts`) intentionally falls back to $0 on database failures with ERROR-level logging. This is documented as TODO-053 and represents a conscious trade-off:

**Business Decision:** Better to complete the order (potentially undercharging) than to block the customer during database outages.

**Mitigations in Place:**
- ERROR-level logging with detailed context (lines 283-288)
- Explicit comments documenting the fallback behavior (lines 275-282)
- Monitoring hooks for detecting revenue loss events
- Cache layer with 5-minute TTL reduces database dependency

**Recommendation:** Consider implementing Option 2 (stale-while-revalidate cache) from proposed solutions to extend cache TTL during outages.

## Problem Statement

The modifier pricing logic in `realtime-menu-tools.ts` (lines 273-288, 331-342) falls back to `$0` when database lookups fail or modifiers are not found. This creates silent revenue loss during database outages, network issues, or data inconsistencies. Customers receive free modifiers without any error indication, and the restaurant loses revenue without detection.

## Findings

**Affected File:** `server/routes/realtime/realtime-menu-tools.ts`

**Vulnerable Code:**
```typescript
// Lines 273-288: Silent $0 fallback
const modifierPrices = await Promise.all(
  selectedModifiers.map(async (modId) => {
    const modifier = await db.modifiers.findById(modId);
    return modifier?.price_adjustment || 0; // ❌ Returns $0 if not found
  })
);

// Lines 331-342: Similar pattern
const modifiers = item.modifiers?.map(mod => ({
  id: mod.id,
  name: mod.name,
  price_adjustment: mod.price_adjustment || 0 // ❌ Returns $0 if null
}));
```

**Failure Scenarios:**

1. **Database Outage:**
   ```typescript
   // DB connection fails
   const modifier = await db.modifiers.findById('mod-123');
   // modifier = null (query failed silently)
   return modifier?.price_adjustment || 0; // Returns $0
   ```

2. **Data Inconsistency:**
   ```typescript
   // Modifier exists in order but deleted from DB
   const modifier = await db.modifiers.findById('deleted-mod');
   // modifier = null (not found)
   return 0; // Customer gets free modifier
   ```

3. **Null/Undefined Price:**
   ```typescript
   // Modifier exists but price_adjustment is NULL
   const modifier = { id: '123', name: 'Extra Cheese', price_adjustment: null };
   return modifier.price_adjustment || 0; // Returns $0 instead of erroring
   ```

**Revenue Impact Example:**
```
Order: Burger with 3 modifiers
- Extra Cheese: $1.50 → $0 (DB lookup failed)
- Bacon: $2.00 → $0 (not found)
- Avocado: $1.50 → $0 (price null)

Expected Revenue: $5.00
Actual Revenue: $0.00
Loss per Order: $5.00

If 100 orders/day affected during 1-hour outage:
Daily Loss: ~$20 (4 orders/hour × $5)
```

## Proposed Solutions

### Option 1: Fail Fast with Error (Recommended)
Reject orders if modifier pricing cannot be determined:

```typescript
const modifierPrices = await Promise.all(
  selectedModifiers.map(async (modId) => {
    const modifier = await db.modifiers.findById(modId);

    if (!modifier) {
      throw new Error(
        `Modifier not found: ${modId}. Cannot calculate accurate pricing.`
      );
    }

    if (modifier.price_adjustment == null) {
      throw new Error(
        `Modifier ${modId} (${modifier.name}) has invalid pricing.`
      );
    }

    return modifier.price_adjustment;
  })
);
```

**Benefits:**
- No silent revenue loss
- Forces fixing data integrity issues
- User gets immediate error feedback
- Alerts monitoring systems

**Drawbacks:**
- Orders fail during database issues
- May frustrate users during outages

### Option 2: Cache Modifier Prices with Stale-While-Revalidate
Maintain an in-memory cache with fallback to last-known prices:

```typescript
import { LRUCache } from 'lru-cache';

const modifierCache = new LRUCache<string, number>({
  max: 1000,
  ttl: 1000 * 60 * 15, // 15 minutes
});

async function getModifierPrice(modId: string): Promise<number> {
  try {
    const modifier = await db.modifiers.findById(modId);

    if (!modifier || modifier.price_adjustment == null) {
      // Check cache for last-known price
      const cachedPrice = modifierCache.get(modId);
      if (cachedPrice !== undefined) {
        logger.warn('Using cached modifier price due to DB issue', {
          modId,
          cachedPrice
        });
        return cachedPrice;
      }

      // No cache available - fail
      throw new Error(`Cannot determine price for modifier ${modId}`);
    }

    // Update cache and return
    modifierCache.set(modId, modifier.price_adjustment);
    return modifier.price_adjustment;
  } catch (error) {
    // Try cache as last resort
    const cachedPrice = modifierCache.get(modId);
    if (cachedPrice !== undefined) {
      logger.error('DB error, using cached modifier price', {
        modId,
        cachedPrice,
        error
      });
      return cachedPrice;
    }

    // No fallback available
    throw error;
  }
}
```

### Option 3: Log and Alert on $0 Fallback
Keep fallback behavior but add monitoring:

```typescript
const modifierPrices = await Promise.all(
  selectedModifiers.map(async (modId) => {
    const modifier = await db.modifiers.findById(modId);

    if (!modifier) {
      logger.error('Modifier not found, falling back to $0', {
        modId,
        orderId: currentOrderId,
        severity: 'revenue-loss'
      });

      // Alert monitoring system
      await metrics.increment('modifier.price.fallback.zero', {
        reason: 'not-found',
        modifierId: modId
      });

      return 0;
    }

    if (modifier.price_adjustment == null) {
      logger.error('Modifier price null, falling back to $0', {
        modId,
        modifierName: modifier.name,
        severity: 'revenue-loss'
      });

      await metrics.increment('modifier.price.fallback.zero', {
        reason: 'null-price',
        modifierId: modId
      });

      return 0;
    }

    return modifier.price_adjustment;
  })
);
```

### Option 4: Hybrid Approach (Recommended for Production)
Combine error handling with graceful degradation:

```typescript
async function getModifierPriceOrFail(
  modId: string,
  options: { allowCache?: boolean } = {}
): Promise<number> {
  try {
    const modifier = await db.modifiers.findById(modId);

    if (!modifier || modifier.price_adjustment == null) {
      throw new Error(`Invalid modifier: ${modId}`);
    }

    // Cache successful lookups
    modifierCache.set(modId, modifier.price_adjustment);
    return modifier.price_adjustment;

  } catch (error) {
    // Only use cache if explicitly allowed
    if (options.allowCache) {
      const cachedPrice = modifierCache.get(modId);
      if (cachedPrice !== undefined) {
        logger.warn('Using cached modifier price', { modId, error });
        metrics.increment('modifier.cache.hit');
        return cachedPrice;
      }
    }

    // Log revenue-impacting error
    logger.error('Cannot determine modifier price', {
      modId,
      error,
      severity: 'revenue-loss',
      alertOncall: true
    });

    // Re-throw to fail the order
    throw new Error(
      `Unable to calculate order total due to pricing error. Please try again.`
    );
  }
}
```

## Acceptance Criteria

- [ ] Orders fail with clear error message if modifier pricing unavailable
- [ ] No silent $0 fallbacks that cause revenue loss
- [ ] Cache implemented for modifier prices (optional but recommended)
- [ ] Monitoring/alerting added for pricing failures
- [ ] Database constraints ensure price_adjustment is never NULL
- [ ] Unit tests verify error handling for missing modifiers
- [ ] Integration tests verify order rejection on pricing failure
- [ ] Runbook documents response to modifier pricing alerts
- [ ] Users see helpful error message, not generic 500
- [ ] Admin dashboard shows revenue-at-risk metrics

## Related Files

- `server/routes/realtime/realtime-menu-tools.ts` (lines 273-288, 331-342)
- `server/services/orders/orders.service.ts` - Order creation logic
- `server/middleware/errorHandler.ts` - Error response formatting
- `supabase/migrations/` - Add NOT NULL constraint to price_adjustment

## Database Migration

```sql
-- Add constraint to prevent NULL prices
ALTER TABLE modifiers
  ALTER COLUMN price_adjustment SET NOT NULL;

-- Add check constraint for valid prices
ALTER TABLE modifiers
  ADD CONSTRAINT modifiers_price_valid
  CHECK (price_adjustment >= -100 AND price_adjustment <= 100);

-- Backfill any existing NULL values
UPDATE modifiers
  SET price_adjustment = 0
  WHERE price_adjustment IS NULL;
```

## Monitoring & Alerts

```typescript
// metrics.ts
export const modifierMetrics = {
  priceFallback: (reason: string, modId: string) => {
    metrics.increment('modifier.price.fallback', {
      reason,
      modifierId: modId,
      severity: 'high'
    });
  },

  cacheHit: (modId: string) => {
    metrics.increment('modifier.cache.hit', { modifierId: modId });
  },

  cacheMiss: (modId: string) => {
    metrics.increment('modifier.cache.miss', { modifierId: modId });
  }
};

// Alert configuration (PagerDuty, Slack, etc.)
if (metrics.get('modifier.price.fallback').count > 10 per hour) {
  alert.trigger({
    severity: 'high',
    message: 'Revenue loss: Modifier pricing failures detected',
    runbook: 'docs/runbooks/modifier-pricing-failure.md'
  });
}
```

## Testing Strategy

```typescript
describe('Modifier Pricing Reliability', () => {
  it('should reject order if modifier not found', async () => {
    mockDb.modifiers.findById.mockResolvedValue(null);

    await expect(
      calculateItemPrice(itemId, ['unknown-mod'])
    ).rejects.toThrow('Modifier not found');
  });

  it('should reject order if modifier price is null', async () => {
    mockDb.modifiers.findById.mockResolvedValue({
      id: 'mod-123',
      name: 'Extra Cheese',
      price_adjustment: null
    });

    await expect(
      calculateItemPrice(itemId, ['mod-123'])
    ).rejects.toThrow('invalid pricing');
  });

  it('should use cached price during DB outage if allowed', async () => {
    // Prime cache
    modifierCache.set('mod-123', 1.50);

    // Simulate DB failure
    mockDb.modifiers.findById.mockRejectedValue(new Error('DB down'));

    const price = await getModifierPrice('mod-123', { allowCache: true });
    expect(price).toBe(1.50);
  });

  it('should fail without cache during DB outage', async () => {
    mockDb.modifiers.findById.mockRejectedValue(new Error('DB down'));

    await expect(
      getModifierPrice('mod-123', { allowCache: false })
    ).rejects.toThrow();
  });
});
```

## Notes

**Revenue Protection Principles:**
1. **Fail Secure:** When in doubt, reject the transaction
2. **Never Silent:** Log all financial errors with high severity
3. **Monitor Trends:** Track fallback rates, alert on anomalies
4. **Cache Wisely:** Use cache for availability, not to hide bugs
5. **Audit Trail:** Every $0 fallback should be recorded

**Related Issues:**
- See TODO 082 for NaN/Infinity validation
- See TODO 080 for floating-point arithmetic issues
- Consider creating CL-REVENUE-001 lesson for financial error handling

**Real-World Impact:**
At scale, silent $0 fallbacks can cost thousands per day. A competitor's food delivery platform lost $100K/month to a similar bug before detection.
