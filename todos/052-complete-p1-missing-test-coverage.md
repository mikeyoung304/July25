---
status: complete
priority: p1
issue_id: "052"
tags: [code-review, testing, voice-ordering]
dependencies: []
---

# Missing Test Coverage for Voice Module Changes

## Problem Statement

Critical new functions in `realtime-menu-tools.ts` have ZERO test coverage, including input validation, database lookups, and price calculations.

**Why It Matters:**
- Input validation functions not tested = potential security gaps
- Price calculations not tested = financial errors
- Rate limiting mocked in existing tests = not actually verified

## Findings

### Critical Functions Without Tests:

| Function | Lines | Security Risk | Coverage |
|----------|-------|---------------|----------|
| `validateModifierName()` | 173-202 | HIGH | 0% |
| `lookupModifierPrices()` | 211-306 | MEDIUM | 0% |
| `updateCartTotals()` | 334-348 | MEDIUM | 0% |
| `add_to_order` handler | 588-671 | HIGH | 0% |

### Test Files That Exist:
- ✅ `VoiceEventHandler.test.ts` - 33 tests, 85% coverage
- ✅ `VoiceCheckoutOrchestrator.test.ts` - cart management
- ⚠️ `ai.routes.security.test.ts` - mocks `aiServiceLimiter` (not real testing)
- ❌ `realtime-menu-tools.test.ts` - DOES NOT EXIST

### Rate Limiter Not Actually Tested:
```typescript
// In ai.routes.security.test.ts line 148:
vi.mock('../src/middleware/rateLimiter', () => ({
  aiServiceLimiter: vi.fn((req, res, next) => next())  // Always passes!
}));
```

## Proposed Solutions

### Solution 1: Create Comprehensive Test Suite (Recommended)
**Pros:** Full coverage, catches regressions
**Cons:** Time investment
**Effort:** Medium (1 day)
**Risk:** Low

**Tests Needed:**

```typescript
// validateModifierName()
- Null/undefined input → returns null
- Empty string → returns null
- String > 100 characters → returns null
- SQL injection attempts → returns null
- Valid modifiers → returns trimmed string
- Unicode/emoji injection → returns null

// lookupModifierPrices()
- Empty modifier array → returns []
- Cache hit → returns cached prices
- Cache miss → queries database
- Multi-tenant isolation → only returns own restaurant's rules
- Max array bounds (20) → truncates

// updateCartTotals()
- Single item calculation
- Multiple items with modifiers
- Tax calculation accuracy
- Edge case: subtotal = 0

// Rate limiting (actual, not mocked)
- Hits limit after 50 requests
- Returns 429 status
- Resets after window
```

### Solution 2: Integration Tests Only
**Pros:** Tests real behavior end-to-end
**Cons:** Slower, harder to debug failures
**Effort:** Medium (1 day)
**Risk:** Medium

### Solution 3: Property-Based Testing
**Pros:** Finds edge cases automatically
**Cons:** Learning curve, setup overhead
**Effort:** High (2 days)
**Risk:** Low

## Recommended Action
<!-- To be filled after triage -->

## Technical Details

**New Test Files Needed:**
- `server/tests/ai/functions/realtime-menu-tools.test.ts`
- `server/tests/routes/realtime.routes.test.ts` (rate limit tests)

## Acceptance Criteria

- [ ] `validateModifierName()` - 10+ test cases
- [ ] `lookupModifierPrices()` - 8+ test cases
- [ ] `updateCartTotals()` - 6+ test cases
- [ ] Rate limiting tests that don't mock the limiter
- [ ] All tests pass in CI

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-24 | Created from code review | Discovered existing tests mock rate limiter |

## Resources

- Existing test patterns in `VoiceEventHandler.test.ts`
- Vitest documentation for mocking Supabase
