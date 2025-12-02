---
status: mitigated
priority: p1
issue_id: "085"
tags: [code-review, financial, reliability]
dependencies: []
reviewed_date: 2025-11-28
verified_date: 2025-12-01
resolution: fail-fast-with-cache
---

# Modifier Pricing Falls Back to $0 on Database Failure

## Current Status: MITIGATED ✅

**Verified:** 2025-12-01

The original concern about silent $0 fallbacks has been addressed. The current implementation now **throws errors** on NULL pricing instead of silently falling back to $0.

### What Changed

**Before (as described in original TODO):**
```typescript
// Silent $0 fallback - BAD
return modifier?.price_adjustment || 0;
```

**After (current implementation at lines 331-341):**
```typescript
if (matchingRule.price_adjustment == null) {
  logger.error('[MenuTools] Modifier rule has null price, cannot calculate pricing', {
    modifierName: modName,
    targetName: matchingRule.target_name,
    restaurantId,
    severity: 'revenue-loss'
  });
  throw new Error(
    `Modifier rule for "${modName}" (${matchingRule.target_name}) has invalid pricing...`
  );
}
```

### Mitigations Now in Place

1. **Fail-Fast on NULL Prices:** Orders now fail with clear error if modifier pricing is unavailable
2. **ERROR-Level Logging:** All pricing issues logged with `severity: 'revenue-loss'` tag
3. **5-Minute Cache:** `modifierPriceRulesCache` (line 307) provides resilience during transient outages
4. **Database Failure Handling:** Lines 294-302 throw errors rather than falling back

### Verification Evidence

```typescript
// File: server/src/ai/functions/realtime-menu-tools.ts
// Lines 331-341: Explicit rejection of NULL prices
// Lines 294-302: Database failure throws error
// Line 307: 5-minute cache for fallback resilience
```

### Remaining Considerations

While the primary risk is mitigated, consider these optional enhancements for future:

- [ ] Extend cache TTL during outages (stale-while-revalidate pattern)
- [ ] Add database constraint: `ALTER TABLE modifiers ALTER COLUMN price_adjustment SET NOT NULL`
- [ ] Add monitoring dashboard for `severity: 'revenue-loss'` events
- [ ] Create runbook for modifier pricing alert response

---

## Original Problem Statement (Historical)

> The modifier pricing logic in `realtime-menu-tools.ts` falls back to `$0` when database lookups fail or modifiers are not found. This creates silent revenue loss during database outages.

**Status:** This problem has been resolved. The code now implements Option 1 (Fail Fast with Error) from the proposed solutions.

---

## Resolution Summary

| Aspect | Before | After |
|--------|--------|-------|
| NULL price handling | Silent $0 fallback | Throws error with logging |
| Database failure | Silent $0 fallback | Throws error |
| Cache protection | None | 5-minute TTL cache |
| Logging | None | ERROR level with severity tag |
| Revenue protection | ❌ None | ✅ Fail-fast approach |

---

## References

- Original code review finding: P1 financial reliability
- Implementation: `server/src/ai/functions/realtime-menu-tools.ts:331-341`
- Related: TODO 082 (NaN/Infinity validation), TODO 080 (floating-point arithmetic)
- Verification date: 2025-12-01 via multi-agent code scan
