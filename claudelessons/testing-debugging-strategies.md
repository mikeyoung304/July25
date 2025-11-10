# Lesson: Testing & Debugging Best Practices

**Date:** 2025-11-10
**Severity:** HIGH (prevents bugs, reduces debug time)
**Impact:** 23% → 98.5% test coverage improvement
**Time Saved:** Potentially weeks of debugging

---

## The Problems

### 1. Low Test Coverage

```typescript
// ❌ WRONG - Critical code paths untested
// server/src/routes/auth.routes.ts
router.get('/auth/me',
  authenticate,
  validateRestaurantAccess,  // This middleware was missing initially
  (req, res) => {
    res.json({ user: req.user, role: req.role })
  }
)

// No tests for this endpoint
// Missing middleware not caught until production
// Caused P0 blocker: "Access Denied" for all authenticated users
```

**Impact:**
- 23% test coverage at one point
- Critical auth, payments, orders untested
- Bugs only discovered manually in production
- **P0 production blockers that tests would have caught**

---

### 2. No End-to-End Testing

```typescript
// ❌ WRONG - Components tested in isolation, flow broken end-to-end
// Unit tests pass
test('CheckoutPage renders', () => {
  render(<CheckoutPage />)
  expect(screen.getByText('Checkout')).toBeInTheDocument()
})

// But end-to-end flow fails
// User clicks "Checkout" → Cart empties → Payment fails
// Requires 3 sequential fixes in production
// E2E test would have caught this before deployment
```

**Impact:**
- Demo user checkout bug only found manually
- "Invalid UUID" error never caught in CI
- Had to run manual E2E test with Puppeteer to diagnose
- **2 hours to fix, but only after discovering in production**

---

### 3. First Assumptions Often Wrong

```typescript
// ❌ WRONG - Debugging by assumption instead of evidence
// Hydration bug investigation

// Day 1: "Maybe it's the nested UnifiedCartProvider"
- <UnifiedCartProvider>
    <Router />
- </UnifiedCartProvider>
// Deploy, test → Still broken

// Day 2: "Maybe it's caching"
await db.query('TRUNCATE cache')
await deleteAllCookies()
// Deploy, test → Still broken

// Day 3: "Maybe it's the Date.now() calls"
- timestamp: Date.now()
+ timestamp: new Date('2024-01-01').getTime()
// Deploy, test → Still broken

// FINALLY: Read the actual error message
// React #318: "Hydration failed because initial UI does not match"
// Real cause: Early return before AnimatePresence
```

**Impact:**
- 3 days wasted on wrong hypotheses
- Multiple deploy cycles
- Actual error message ignored
- **All because assumptions came before evidence**

---

### 4. Test Quarantine Crisis

```bash
# ❌ WRONG - Skip failing tests without tracking
describe('auth flow', () => {
  it.skip('should login successfully', () => {}) // Skip #1
  it.skip('should validate permissions', () => {}) // Skip #2
  it.skip('should handle logout', () => {}) // Skip #3
})

# Result: 137 tests quarantined, 73% pass rate
# Whack-a-mole fixing is unsustainable
# No visibility into what's broken
```

**Impact:**
- 137 tests skipped at peak
- Pass rate dropped to 73%
- No systematic tracking
- "Whack-a-mole" test fixing
- **4+ days building test health infrastructure**

---

## The Solutions

### 1. Improve Test Coverage for Critical Paths

```typescript
// ✅ CORRECT - Integration test for auth endpoint
// tests/integration/auth.test.ts
describe('GET /auth/me', () => {
  it('rejects requests without restaurant ID', async () => {
    const token = await getValidUserToken()

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      // No X-Restaurant-ID header

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Restaurant ID required')
  })

  it('rejects unauthorized restaurant access', async () => {
    const token = await getValidUserToken()

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Restaurant-ID', unauthorizedRestaurantId)

    expect(response.status).toBe(403)
  })

  it('returns user data with valid access', async () => {
    const token = await getValidUserToken()

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Restaurant-ID', authorizedRestaurantId)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      user: expect.any(Object),
      role: expect.any(String),
      restaurantId: authorizedRestaurantId
    })
  })
})
```

**Coverage Goals:**
- Auth flows: 100%
- Payment processing: 100%
- Order creation: 100%
- Critical business logic: 90%+
- Overall: 80%+

---

### 2. Automated End-to-End Tests

```typescript
// ✅ CORRECT - E2E test for demo user checkout
// tests/e2e/demo-checkout.spec.ts
import { test, expect } from '@playwright/test'

test('demo user can complete checkout', async ({ page }) => {
  // 1. Start as demo user
  await page.goto('/demo')
  await page.click('[data-testid=demo-server-mode]')

  // 2. Add items to cart
  await page.click('[data-testid=menu-item-burger]')
  await page.click('[data-testid=add-to-cart]')

  // Verify cart has item
  await expect(page.locator('[data-testid=cart-count]')).toHaveText('1')

  // 3. Navigate to checkout
  await page.click('[data-testid=checkout-button]')

  // Verify cart persists
  await expect(page.locator('[data-testid=cart-items]')).toBeVisible()
  await expect(page.locator('[data-testid=cart-item-burger]')).toBeVisible()

  // 4. Complete payment
  await page.click('[data-testid=payment-method-card]')
  await page.fill('[data-testid=card-number]', '4111111111111111')
  await page.click('[data-testid=submit-payment]')

  // 5. Verify success
  await expect(page.locator('[data-testid=order-confirmation]')).toBeVisible()

  // 6. Check database
  const order = await getLastOrder()
  expect(order.status).toBe('paid')
  expect(order.total).toBeGreaterThan(0)
  expect(order.items).toHaveLength(1)
})
```

**E2E Test Criteria:**
- Test complete user journeys (not just components)
- Include database verification
- Test both normal and edge cases (demo users, errors)
- Run in CI before deployment
- Use production build, not dev mode

---

### 3. Evidence-Based Debugging

```typescript
// ✅ CORRECT - Systematic debugging process

// Step 1: Read the actual error message
// React #318: "Hydration failed because the initial UI does not match what was rendered on the server"
// This tells us EXACTLY what to look for: server vs client mismatch

// Step 2: Gather evidence
console.log('=== SERVER RENDER ===')
console.log('show:', show)
console.log('table:', table)
console.log('seat:', seat)
console.log('Rendering:', show && table && seat ? 'AnimatePresence' : 'null')

console.log('=== CLIENT RENDER ===')
console.log('show:', show)
console.log('table:', table)
console.log('seat:', seat)
console.log('Rendering:', 'AnimatePresence (always)')

// Evidence shows:
// Server: returns null (early return)
// Client: returns AnimatePresence wrapper

// Step 3: Form hypothesis based on evidence
// "Early return causes server to render null, client to render wrapper"

// Step 4: Test hypothesis
// Remove early return, move logic inside wrapper
return (
  <AnimatePresence>
    {show && table && seat && <Content />}
  </AnimatePresence>
)

// Step 5: Verify fix
npm run build && npm run start
// Test in production mode
// Check console for React #318 → GONE

// Evidence-based debugging: 30 minutes after reading error
// Assumption-based debugging: 3 days of wrong fixes
```

**Debugging Checklist:**
```markdown
1. [ ] Read the actual error message (don't assume)
2. [ ] Check logs for exact failure point
3. [ ] Gather evidence (console.log, network tab, database query)
4. [ ] Form hypothesis based on evidence
5. [ ] Make minimal change to test hypothesis
6. [ ] Verify fix in production-like environment
7. [ ] Add regression test
8. [ ] Document in post-mortem
```

---

### 4. Systematic Test Health Tracking

```typescript
// ✅ CORRECT - Test quarantine system with tracking
// test-health.json
{
  "lastUpdated": "2025-11-10T10:00:00Z",
  "summary": {
    "total": 245,
    "passing": 243,
    "quarantined": 2,
    "passRate": 99.2
  },
  "quarantined": [
    {
      "test": "auth/permission-scopes.test.ts",
      "reason": "Flaky due to timing issue",
      "quarantinedAt": "2025-11-08",
      "assignedTo": "eng-team",
      "priority": "high",
      "estimatedFix": "2 hours"
    },
    {
      "test": "payments/square-webhook.test.ts",
      "reason": "Needs Square sandbox setup",
      "quarantinedAt": "2025-11-09",
      "assignedTo": "payments-team",
      "priority": "medium",
      "estimatedFix": "4 hours"
    }
  ]
}
```

```typescript
// tests/test-quarantine.ts
export function quarantineTest(testName: string, reason: string) {
  const health = readTestHealth()

  health.quarantined.push({
    test: testName,
    reason,
    quarantinedAt: new Date().toISOString(),
    assignedTo: null,
    priority: 'medium',
    estimatedFix: null
  })

  health.summary.quarantined = health.quarantined.length
  health.summary.passRate =
    ((health.summary.total - health.summary.quarantined) / health.summary.total) * 100

  writeTestHealth(health)

  // Alert if pass rate drops below threshold
  if (health.summary.passRate < 85) {
    throw new Error(
      `Test pass rate (${health.summary.passRate}%) below 85% threshold. ` +
      `Systematic test fixing required.`
    )
  }
}
```

**Test Health Rules:**
- Pass rate must stay above 85%
- Track every skipped/quarantined test
- Assign ownership and estimate fix time
- Review weekly in team meeting
- Fix immediately or delete (no lingering skips)

---

## Key Lessons

### 1. Tests Prevent Costly Bugs
**Problem:** 23% coverage, bugs reach production

**Solution:**
- Target 80%+ overall coverage
- 100% coverage for critical paths (auth, payments, orders)
- Integration tests > unit tests for critical flows
- Add test for every bug fix (regression prevention)

### 2. E2E Tests Catch Real Issues
**Problem:** Unit tests pass, but user flow breaks

**Solution:**
- Playwright tests for complete journeys
- Test with both normal and demo users
- Verify database state, not just UI
- Run E2E tests in CI before deployment
- Use production builds for E2E tests

### 3. Read Error Messages First
**Problem:** Wasted 3 days ignoring React #318 error

**Solution:**
- Error messages usually tell you exactly what's wrong
- Don't jump to assumptions
- React #318 = hydration mismatch (specific pattern)
- TypeScript errors = type mismatch (check the types)
- SQL errors = schema issue (check migration)

### 4. Evidence Before Hypothesis
**Problem:** Fixed wrong things based on assumptions

**Solution:**
- Gather data first (logs, network tab, database queries)
- Form hypothesis based on evidence
- Test hypothesis with minimal change
- Verify in production-like environment
- Don't assume, measure

### 5. Systematic Test Management
**Problem:** 137 tests skipped, no tracking

**Solution:**
- Test quarantine system with registry
- Track reason, owner, priority for each skip
- Pass rate threshold (85%) triggers action
- Weekly review of quarantined tests
- Fix immediately or delete (no "skip forever")

---

## Quick Reference Card

### Test Coverage Targets

```bash
# Critical paths: 100%
- Auth flows (login, logout, permissions)
- Payment processing (create, verify, refund)
- Order creation (cart → checkout → confirmation)

# Business logic: 90%+
- Menu management
- Table/seat assignment
- Inventory tracking

# Overall: 80%+
npm run test:coverage
# Fail CI if coverage drops below 80%
```

### E2E Test Template

```typescript
// Template for critical user journeys
import { test, expect } from '@playwright/test'

test('complete user journey', async ({ page }) => {
  // 1. Setup
  await setupTestData()

  // 2. Navigate
  await page.goto('/start')

  // 3. Perform actions
  await page.click('[data-testid=action-button]')

  // 4. Verify UI
  await expect(page.locator('[data-testid=result]')).toBeVisible()

  // 5. Verify database
  const record = await db.query('SELECT * FROM table WHERE id = ?')
  expect(record).toMatchObject({ status: 'completed' })

  // 6. Cleanup
  await cleanupTestData()
})
```

### Debugging Process

```markdown
When encountering a bug:

1. [ ] Read the error message (don't skip this!)
2. [ ] Check relevant logs (server, client, database)
3. [ ] Check network tab (API calls, status codes)
4. [ ] Gather evidence with console.log or debugger
5. [ ] Form hypothesis based on evidence
6. [ ] Make minimal change to test hypothesis
7. [ ] Verify in production build (npm run build && npm run start)
8. [ ] Add regression test
9. [ ] Document in claudelessons/ if valuable
```

---

## When to Reference This Lesson

**Symptoms:**
- ✅ Bug discovered in production that tests should have caught
- ✅ E2E user flow broken despite unit tests passing
- ✅ Debugging taking days with wrong assumptions
- ✅ Test pass rate dropping
- ✅ Tests being skipped without tracking

**Scenarios:**
- Adding new critical feature (auth, payments, orders)
- Investigating production bug
- Test suite health declining
- Need to speed up debugging process

---

## Prevention

### 1. Coverage Gates in CI

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Check coverage thresholds
  run: |
    npx nyc check-coverage \
      --lines 80 \
      --functions 80 \
      --branches 75 \
      --statements 80

- name: Check critical path coverage
  run: |
    # Ensure auth, payments, orders are 100% covered
    npx nyc check-coverage \
      --lines 100 \
      --include 'src/routes/auth.ts' \
      --include 'src/services/payments.ts' \
      --include 'src/routes/orders.ts'
```

### 2. E2E Smoke Tests

```yaml
# .github/workflows/e2e.yml
- name: Build production bundle
  run: npm run build

- name: Start production server
  run: npm run start &

- name: Run E2E smoke tests
  run: npx playwright test --grep @smoke

# Smoke tests:
# - Login flow (@smoke)
# - Demo user checkout (@smoke)
# - Order creation (@smoke)
# - Payment processing (@smoke)
```

### 3. Test Quarantine Monitoring

```typescript
// tests/setup/quarantine-monitor.ts
beforeAll(() => {
  const health = readTestHealth()

  if (health.summary.passRate < 85) {
    console.error(`
      ⚠️  TEST HEALTH ALERT ⚠️
      Pass rate: ${health.summary.passRate}%
      Quarantined: ${health.summary.quarantined} tests

      Quarantine reasons:
      ${health.quarantined.map(t => `- ${t.test}: ${t.reason}`).join('\n')}

      Action required: Fix quarantined tests or pass rate will continue to drop.
    `)
  }
})
```

### 4. Debugging Template

```markdown
# .github/ISSUE_TEMPLATE/bug_investigation.md

## Bug Investigation Template

### 1. Error Message
<!-- Paste the exact error message -->

### 2. Evidence Gathered
- [ ] Server logs checked
- [ ] Client console checked
- [ ] Network tab checked
- [ ] Database state verified
- [ ] Recent commits reviewed

### 3. Evidence Summary
<!-- What does the evidence show? -->

### 4. Hypothesis
<!-- Based on evidence, what do you think is wrong? -->

### 5. Test Plan
<!-- How will you test the hypothesis? -->

### 6. Fix Applied
<!-- What change was made? -->

### 7. Verification
<!-- How was the fix verified? -->

### 8. Regression Test
<!-- Link to test that prevents recurrence -->
```

---

## Code Review Checklist

When reviewing code:
- [ ] New features have tests (integration or E2E)
- [ ] Critical paths maintain 100% coverage
- [ ] Regression test added for bug fixes
- [ ] E2E tests for complete user journeys
- [ ] No tests skipped without quarantine tracking
- [ ] Production build tested for SSR/hydration
- [ ] Evidence-based fixes (not assumptions)
- [ ] Post-mortem documented for major bugs

---

## Related Lessons

- [React Hydration Bug](./react-hydration-early-return-bug.md) - Example of evidence-based debugging
- [Database Schema Mismatches](./database-schema-mismatches.md) - Integration tests would catch
- [Auth & Multi-Tenancy Security](./auth-multi-tenancy-security.md) - Critical path testing

---

## TL;DR

**Problem:** Low coverage, no E2E tests, assumption-based debugging, test decay
**Solutions:**
1. **Test coverage** - 80%+ overall, 100% for critical paths
2. **E2E tests** - Complete user journeys, verify database
3. **Read errors first** - Don't assume, gather evidence
4. **Track test health** - Quarantine system, 85% pass rate minimum
5. **Regression tests** - Add test for every bug fix

**Remember:**
- 23% → 98.5% test coverage improvement saved weeks of debugging
- E2E test caught demo checkout bug in minutes vs hours in production
- Reading React #318 error would have saved 3 days of wrong fixes
- 137 quarantined tests = unsustainable whack-a-mole fixing
- Evidence before hypothesis (measure, don't assume)

**Quick Fix Pattern:**
```typescript
// ✅ Integration test for critical paths
describe('critical flow', () => {
  it('completes successfully', async () => {
    const result = await fullFlowTest()
    expect(result.status).toBe('success')
    const dbRecord = await db.query(...)
    expect(dbRecord).toMatchObject(...)
  })
})

// ✅ Evidence-based debugging
1. Read error message
2. Check logs
3. Gather evidence
4. Form hypothesis
5. Test minimal fix
6. Verify in production build
7. Add regression test
```
