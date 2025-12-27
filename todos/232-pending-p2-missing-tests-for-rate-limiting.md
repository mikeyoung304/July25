# TODO-232: Missing Unit Tests for Rate Limiting Logic

**Priority:** P2 (Important - Quality)
**Category:** Testing
**Source:** Code Review - Architecture, Git History Agents (2025-12-27)
**Commit:** 66773b6d (fix: resolve TODO items from enterprise audit review)

## Problem Statement

The `MenuEmbeddingService` received significant new rate limiting functionality but has no corresponding unit tests. This creates risk of regressions and makes the logic harder to maintain.

## Findings

### Evidence

```bash
# No test file exists for MenuEmbeddingService
find server -name "*embedding*test*" -o -name "*embedding*spec*"
# Returns: nothing
```

### Untested Code Paths

1. `checkRateLimit()` - Sliding window logic
2. `recordGeneration()` - Timestamp tracking
3. `clearRateLimitHistory()` - Test helper
4. Cooldown period enforcement (12 minutes)
5. Hourly limit enforcement (5 calls/hour)
6. Per-restaurant isolation

## Proposed Solutions

### Option 1: Add Dedicated Test File
- Create `server/src/services/menu-embedding.service.test.ts`
- Test all rate limiting scenarios
- **Pros:** Comprehensive coverage, follows existing patterns
- **Cons:** Requires mocking OpenAI and Supabase
- **Effort:** Medium
- **Risk:** Low

### Option 2: Integration Tests Only
- Test rate limiting via API integration tests
- **Pros:** Tests real behavior
- **Cons:** Slower, harder to test edge cases
- **Effort:** Medium
- **Risk:** Medium

## Recommended Action

**Option 1** - Create unit tests with mocked dependencies.

## Technical Details

**Files to Create:**
- `server/src/services/menu-embedding.service.test.ts`

**Test Cases:**
```typescript
describe('MenuEmbeddingService.checkRateLimit', () => {
  beforeEach(() => MenuEmbeddingService.clearRateLimitHistory());

  it('allows first generation attempt');
  it('enforces 12-minute cooldown between calls');
  it('enforces max 5 calls per hour');
  it('isolates rate limits per restaurant');
  it('cleans up old timestamps on check');
  it('returns correct retryAfterMs when limited');
});
```

## Acceptance Criteria

- [ ] Test file created for `MenuEmbeddingService`
- [ ] Rate limiting logic has >80% coverage
- [ ] Tests pass in CI pipeline

## Work Log

| Date | Action | Result |
|------|--------|--------|
| 2025-12-27 | Created from code review | Identified by 2 agents |

## Resources

- Similar tests: `server/src/services/order-validation.service.test.ts`
