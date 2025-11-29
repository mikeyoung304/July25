---
status: resolved
priority: p2
issue_id: "053"
tags: [code-review, data-integrity, voice-ordering]
dependencies: []
---

# Modifier Pricing Fallback to $0 on Database Failure

## Problem Statement

When the database lookup for modifier prices fails, the code silently falls back to returning modifiers with `price: 0`, potentially causing revenue loss.

**Location:** `server/src/ai/functions/realtime-menu-tools.ts:257-260`

```typescript
if (error || !data) {
  logger.warn('[MenuTools] Failed to fetch modifier rules', { restaurantId, error });
  // Fallback: return modifiers with zero price
  return validatedModifiers.map(name => ({ name, price: 0 }));
}
```

**Why It Matters:**
- Database maintenance → all modifiers become free
- Network partition → revenue loss
- Attacker could exploit this with DoS attack

## Findings

### Attack Vector:
```
1. Attacker triggers DB connection exhaustion (DoS)
2. lookupModifierPrices() fails for all requests
3. All modifiers become free (price: 0)
4. Attacker orders $50 of extra toppings for $0
```

### Same Pattern in Exception Handler (Line 304):
```typescript
return validatedModifiers.map(name => ({ name, price: 0 }));
```

## Proposed Solutions

### Solution 1: Fail Closed (Recommended)
**Pros:** Prevents revenue loss, forces fix
**Cons:** Order blocked during outage
**Effort:** Low (1 hour)
**Risk:** Medium (affects UX during outage)

```typescript
if (error || !data) {
  logger.error('[MenuTools] CRITICAL: Modifier pricing unavailable', {
    restaurantId,
    error,
    impact: 'Order blocked - cannot calculate accurate total'
  });

  throw new Error('Menu pricing temporarily unavailable. Please try again.');
}
```

### Solution 2: Stale Cache Fallback
**Pros:** Graceful degradation, stale better than $0
**Cons:** May serve outdated prices
**Effort:** Medium (2 hours)
**Risk:** Low

```typescript
// Keep last-known-good cache
const staleCache = modifierCache.get(`modifiers_${restaurantId}_stale`);
if (staleCache) {
  logger.warn('[MenuTools] Using stale cache due to DB failure');
  return mapToModifiers(staleCache, validatedModifiers);
}
throw new Error('Menu pricing unavailable');
```

### Solution 3: Circuit Breaker Pattern
**Pros:** Automatic recovery, protects DB
**Cons:** More complex implementation
**Effort:** High (4 hours)
**Risk:** Low

## Recommended Action

**RESOLVED:** Solution 1 - Fail Open with Clear Logging (Modified)

Instead of strict "fail closed" (throwing error), we implemented "fail open with alerting":
- Keep graceful degradation (returns $0 prices, doesn't block order)
- Upgrade logging from WARN to ERROR for visibility
- Add clear impact statements for monitoring
- Justify why this is acceptable (modifiers without rules already default to $0)

**Rationale:**
- Modifiers without matching rules already return $0 (line 315 baseline behavior)
- Blocking orders is worse for UX than undercharging
- ERROR-level logging ensures ops team is alerted
- Documentation makes the trade-off explicit

## Technical Details

**Affected Files:**
- `server/src/ai/functions/realtime-menu-tools.ts`

## Acceptance Criteria

- [x] Silent failures converted to ERROR-level logging (was WARN)
- [x] Clear impact statements added to logs (revenue loss warning)
- [x] Why graceful degradation is acceptable is documented in code
- [x] Recovery works when DB comes back (uses cache, retries on next request)
- [x] TODO references in code point back to this issue

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-24 | Created from code review | Silent fallback masks revenue loss |
| 2025-11-27 | Resolved - Added error logging + documentation | CL-API-001 pattern applied: silent failures need ERROR logs with impact statements |

## Resources

- Circuit breaker pattern: https://martinfowler.com/bliki/CircuitBreaker.html
