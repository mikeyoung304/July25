---
status: ready
priority: p2
issue_id: "199"
tags: [testing, code-quality, maintainability, code-review]
dependencies: []
created_date: 2025-12-05
source: multi-agent-code-review
---

# Magic Timeout Values in Tests Without Explanation

## Problem Statement

Test files contain hardcoded timeout values (5000, 10000, 30000ms) without comments explaining why those specific values were chosen, making it hard to tune for CI performance.

## Findings

### Code Quality Agent Discovery

**Examples Found:**
```typescript
// checkout-smoke.spec.ts
await expect(element).toBeVisible({ timeout: 10000 }); // Why 10s?

// voice-order.spec.ts
await page.waitForSelector('[data-testid="voice-button"]', { timeout: 30000 }); // Why 30s?

// kitchen-display.smoke.spec.ts
await expect(kdsHeader).toBeVisible({ timeout: 10000 }); // Why 10s?
```

**Problems:**
- No documentation of why timeouts are needed
- Hard to know if timeout is for slow operation or flaky test
- Can't tune timeouts without understanding purpose

## Proposed Solution

**Effort:** 1-2 hours | **Risk:** Low

1. Create constants file:
```typescript
// tests/e2e/constants/timeouts.ts
export const TIMEOUTS = {
  /** Time for page hydration after SSR */
  PAGE_LOAD: 5_000,

  /** Time for API response + render */
  NETWORK_RESPONSE: 10_000,

  /** Time for WebSocket connection establishment */
  WEBSOCKET_CONNECT: 15_000,

  /** Time for voice recording initialization */
  VOICE_INIT: 30_000,
};
```

2. Replace magic numbers with named constants:
```typescript
import { TIMEOUTS } from '../constants/timeouts';

await expect(element).toBeVisible({ timeout: TIMEOUTS.NETWORK_RESPONSE });
```

## Technical Details

**Files to Update:**
- All E2E test files with hardcoded timeouts
- Create `tests/e2e/constants/timeouts.ts`

## Acceptance Criteria

- [ ] Timeout constants file created with documented values
- [ ] All hardcoded timeouts replaced with constants
- [ ] Comments explain what each timeout is waiting for

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review |

## Resources

- Code Quality agent findings
