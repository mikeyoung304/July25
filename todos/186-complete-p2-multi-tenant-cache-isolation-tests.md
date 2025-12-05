---
status: complete
priority: p2
issue_id: "186"
tags: [testing, multi-tenant, cache, security, data-integrity, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-testing-audit
---

# Add Multi-Tenant Cache Isolation Tests

## Problem Statement

Menu and voice config caches use `restaurantId` in keys (correct), but **no tests verify**:
- Cache doesn't leak between restaurants
- Cache clears correctly on tenant switch
- Cache keys correctly include restaurantId in ALL operations

This creates a data integrity risk where stale cache could serve wrong tenant's data.

## Findings

### Data Integrity Guardian Agent Discovery

**Cache Implementation Locations:**
- `server/src/services/menu.service.ts` lines 31-37, 83-88, 115-119
- `server/src/services/voice-config.service.ts` lines 36-42, 113-119

**Current Cache Key Pattern:**
```typescript
`${CACHE_KEYS.FULL_MENU}${restaurantId}`
```

**Missing Test Coverage:**
1. No test verifies Restaurant A cache doesn't return Restaurant B data
2. No test verifies cache clear on restaurant switch
3. No test for cache key collision (e.g., "restaurant-1" vs "restaurant-111")

### Potential Risk Scenario

```
1. User A loads menu for Restaurant A (cached)
2. User A switches to Restaurant B
3. Bug in cache clearing leaves Restaurant A data
4. User B sees Restaurant A's menu items
```

## Proposed Solutions

### Solution A: Add Cache Isolation Test Suite

**Effort:** 4-6 hours | **Risk:** Low

```typescript
// tests/cache-isolation.test.ts
describe('Cache Isolation - Multi-Tenant', () => {
  const RESTAURANT_A = '11111111-1111-1111-1111-111111111111';
  const RESTAURANT_B = '22222222-2222-2222-2222-222222222222';

  it('should isolate menu cache by restaurant_id', async () => {
    const menuA = await MenuService.getFullMenu(RESTAURANT_A);
    const menuB = await MenuService.getFullMenu(RESTAURANT_B);

    // Verify different cache keys
    expect(menuA).not.toEqual(menuB);

    // Verify cache lookup returns correct data
    const cachedA = await MenuService.getFullMenu(RESTAURANT_A);
    expect(cachedA).toEqual(menuA);
  });

  it('should clear only target restaurant cache on item update', async () => {
    // Load both restaurant menus
    await MenuService.getFullMenu(RESTAURANT_A);
    await MenuService.getFullMenu(RESTAURANT_B);

    // Update Restaurant A item
    await MenuService.updateItem(RESTAURANT_A, itemId, { name: 'Updated' });

    // Verify Restaurant A cache cleared, Restaurant B cache intact
    // (Check internal cache state or use timing)
  });

  it('should prevent cache poisoning on restaurant switch', async () => {
    // Load menu for Restaurant A (cached)
    await MenuService.getFullMenu(RESTAURANT_A);

    // Simulate restaurant context switch
    // GET /api/v1/menu with Restaurant B context
    // Should NOT return Restaurant A data
  });
});
```

## Recommended Action

Implement cache isolation tests as part of integration test suite.

## Technical Details

**Affected Files:**
- `server/tests/cache-isolation.test.ts` (new)
- `server/src/services/menu.service.ts` (verify coverage)
- `server/src/services/voice-config.service.ts` (verify coverage)

**Test Restaurant IDs:**
- `11111111-1111-1111-1111-111111111111`
- `22222222-2222-2222-2222-222222222222`

## Acceptance Criteria

- [ ] Cache isolation tests exist for MenuService
- [ ] Cache isolation tests exist for VoiceConfigService
- [ ] Tests verify cache key includes restaurantId
- [ ] Tests verify cache clear affects only target restaurant
- [ ] Tests run as part of CI pipeline

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent testing audit |

## Resources

- Data Integrity Guardian agent findings
- CL-SEC-003 cache key tenant isolation fix
