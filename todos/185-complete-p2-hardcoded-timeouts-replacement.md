---
status: complete
priority: p2
issue_id: "185"
tags: [e2e-testing, playwright, flaky-tests, best-practices, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-testing-audit
---

# Replace 280+ Hardcoded Timeouts with Smart Waits

## Problem Statement

The E2E test suite contains 280+ instances of `page.waitForTimeout()` with arbitrary values (2000, 5000, 10000ms). These create brittle, flaky tests that fail on slower CI runners.

## Findings

### Pattern Recognition Agent Discovery

**Files with highest occurrence:**
- `voice-ordering-debug.spec.ts`: 4000, 2000, 2000, 2000+ ms
- `checkout-flow.spec.ts`: Lines 55, 151, 161, 239
- `card-payment.spec.ts`: Line 261
- `kitchen-display.smoke.spec.ts`: Line 86

**Example of Anti-Pattern:**
```typescript
// AVOID
await page.click('button');
await page.waitForTimeout(2000);  // Why 2 seconds? No feedback if it fails
```

**Correct Pattern:**
```typescript
// PREFERRED
await page.click('button');
await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
```

### Impact Analysis

- Tests fail on slower CI (arbitrary timeout not met)
- Tests pass incorrectly on fast machines (race condition masked)
- No semantic meaning - doesn't validate correct behavior
- Adds 30-60+ seconds unnecessary wait time per test run

## Proposed Solutions

### Solution A: Gradual Replacement (Recommended)

**Effort:** 1-2 days | **Risk:** Low

Replace in priority order:
1. Critical path tests (auth, checkout, payment)
2. Smoke tests
3. Remaining E2E tests

**Replacement Patterns:**

```typescript
// Wait for element visibility
await expect(page.locator('[data-testid="order-success"]')).toBeVisible();

// Wait for API response
const response = page.waitForResponse(r => r.url().includes('/api/orders'));
await page.click('submit');
await response;

// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for custom condition
await page.waitForFunction(() => {
  return document.querySelectorAll('.order-card').length > 0;
});
```

### Solution B: Create Test Helpers

**Effort:** 4 hours | **Risk:** Low

Create reusable wait helpers in `test-helpers.ts`:
```typescript
export async function waitForOrderSubmit(page: Page) {
  await page.waitForResponse(r => r.url().includes('/api/orders') && r.status() === 201);
}
```

## Recommended Action

Start with Solution B (create helpers), then apply Solution A using those helpers.

## Technical Details

**Affected Files:**
- All files in `tests/e2e/` containing `waitForTimeout`

**Search Command:**
```bash
grep -r "waitForTimeout" tests/e2e/ --include="*.ts" | wc -l
```

## Acceptance Criteria

- [ ] No `waitForTimeout` > 1000ms in critical path tests
- [ ] Test helpers created for common wait patterns
- [ ] E2E flakiness rate reduced (fewer retries needed)
- [ ] Test execution time reduced by 20-30%

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent testing audit |

## Resources

- Pattern Recognition agent findings
- [Avoiding Flaky Tests | Playwright](https://betterstack.com/community/guides/testing/avoid-flaky-playwright-tests/)
