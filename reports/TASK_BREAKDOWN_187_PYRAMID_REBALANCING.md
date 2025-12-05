# Task 187: Test Pyramid Rebalancing - Structured Breakdown

**Epic:** E2E Testing Infrastructure Improvements
**Priority:** P2 - Medium
**Status:** Ready for implementation
**Effort:** 42 hours (4-5 weeks, 2 engineers)
**Created:** December 5, 2025

---

## Overview

Convert 15 E2E test files (138+ tests, ~3,500 lines) to unit and integration tests. Target: Reduce E2E test count from 188 → ~50, improve CI feedback loop from 35 minutes → 7 minutes.

---

## Task Breakdown by Group

### Group A: UI/Component Tests → Unit Tests

#### A1: viewport-test.spec.ts
**Location:** `/tests/e2e/viewport-test.spec.ts`
**Current Count:** ~12 E2E tests
**Target:** Viewport.test.tsx (5 unit tests)
**Estimated Effort:** 3.5 hours
**Priority:** Medium

**What to Test:**
- Viewport sizing at different breakpoints (375px, 768px, 1024px, 1920px)
- Responsive behavior (flex layout, media queries)
- Device orientation changes
- Safe area insets (notch handling)

**Conversion Steps:**
1. Create `/client/src/components/__tests__/Viewport.test.tsx`
2. Mock window.matchMedia for responsive behavior
3. Test CSS classes/styles based on breakpoints
4. Remove `/tests/e2e/viewport-test.spec.ts`
5. Update CI config to skip removed file

**Before:**
```typescript
test('adjusts viewport on mobile', async ({ page, context }) => {
  const mobileDevice = devices['Pixel 5'];
  const mobileContext = await browser.newContext(mobileDevice);
  await page.setViewportSize({ width: 375, height: 812 });
  // ... 15 more lines for one assertion
});
```

**After:**
```typescript
describe('Viewport', () => {
  it('renders at mobile width (375px)', () => {
    render(<Viewport width={375} />);
    expect(screen.getByTestId('viewport')).toHaveStyle('width: 375px');
  });
});
```

---

#### A2: kiosk-voice-button.spec.ts
**Location:** `/tests/e2e/kiosk-voice-button.spec.ts`
**Current Count:** ~8 E2E tests
**Target:** VoiceButton.test.tsx (4 unit tests)
**Estimated Effort:** 2.5 hours
**Priority:** Medium

**What to Test:**
- Button rendering with correct label/icon
- Click handlers triggered
- Loading/disabled states
- Accessibility (ARIA labels)
- Audio permission request flow

**Conversion Steps:**
1. Create `/client/src/modules/voice/__tests__/VoiceButton.test.tsx`
2. Mock WebRTC APIs (getUserMedia, RTCPeerConnection)
3. Test state transitions (idle → listening → processing)
4. Verify event emissions
5. Remove E2E version

**Test Structure:**
```typescript
describe('VoiceButton', () => {
  it('renders as disabled when audio permissions not granted', () => {
    render(<VoiceButton hasAudioPermission={false} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('emits audio-start event when clicked', () => {
    const onStart = vi.fn();
    render(<VoiceButton onStart={onStart} />);
    userEvent.click(screen.getByRole('button'));
    expect(onStart).toHaveBeenCalled();
  });
});
```

---

#### A3: basic-routes.spec.ts
**Location:** `/tests/e2e/basic-routes.spec.ts`
**Current Count:** ~18 E2E tests
**Target:** routes.test.tsx (4 integration tests)
**Estimated Effort:** 4 hours
**Priority:** High

**What to Test:**
- Route mounting/unmounting
- Route parameters passed to components
- Navigate between routes
- 404 handling

**Current Issue:**
Test checks for element existence without understanding why it's being tested. Example:
```typescript
test('kitchen display route exists', async ({ page }) => {
  await page.goto('http://localhost:5173/kds');
  expect(await page.locator('[data-testid="kds-container"]')).toBeVisible();
});
```

**Better Approach:**
```typescript
describe('Route Navigation', () => {
  it('renders kitchen display at /kds path', () => {
    const { container } = render(
      <BrowserRouter>
        <Routes><Route path="/kds" element={<KitchenDisplay />} /></Routes>
      </BrowserRouter>
    );
    expect(container.querySelector('[data-testid="kds-container"]')).toBeInTheDocument();
  });
});
```

---

#### A4: checkout-smoke.spec.ts (Partial)
**Location:** `/tests/e2e/checkout-smoke.spec.ts`
**Current Count:** ~15 E2E tests (only form rendering/UI tests)
**Target:** CheckoutFlow.e2e.test.tsx (1 E2E test) + CheckoutForm.test.tsx (8 unit tests)
**Estimated Effort:** 4 hours
**Priority:** High

**What to Keep as E2E:**
- Complete checkout flow: menu → cart → payment → order confirmation (1 test)

**What to Convert to Unit:**
- Form validation (empty fields, invalid amounts)
- Tax calculation display
- Tip field behavior
- Payment method switching
- CVC masking in card field

**Conversion Example:**
```typescript
// KEEP AS E2E
describe('checkout-e2e', () => {
  it('completes full order from menu to confirmation', async ({ page }) => {
    // Add item to cart, go to checkout, pay, get order number
  });
});

// CONVERT TO UNIT
describe('CheckoutForm', () => {
  it('shows validation error for empty name', () => {
    render(<CheckoutForm />);
    const submit = screen.getByRole('button', { name: /pay/i });
    fireEvent.click(submit);
    expect(screen.getByText(/name required/i)).toBeInTheDocument();
  });
});
```

---

#### A5: production-serverview-detailed.spec.ts
**Location:** `/tests/e2e/production-serverview-detailed.spec.ts`
**Current Count:** ~24 E2E tests
**Target:** ServerViewDetailed.test.tsx (6 unit tests)
**Estimated Effort:** 4 hours
**Priority:** High

**What to Test (Unit):**
- Table rendering with correct status colors
- Order count display
- Customer name display
- Payment status indicator
- Table assignment

**Conversion Steps:**
1. Create `/client/src/pages/__tests__/ServerView.test.tsx`
2. Mock table data from fixture
3. Test rendered HTML structure
4. Test CSS classes for status colors
5. Test accessibility (table roles, headers)

**Example:**
```typescript
describe('ServerView Detail Panel', () => {
  it('displays table with occupied status in red', () => {
    const table = { id: '1', status: 'occupied', order_count: 3 };
    render(<TableCard table={table} />);
    expect(screen.getByTestId('table-status')).toHaveClass('status-occupied');
  });
});
```

---

#### A6: production-serverview-interaction.spec.ts
**Location:** `/tests/e2e/production-serverview-interaction.spec.ts`
**Current Count:** ~18 E2E tests
**Target:** ServerViewInteraction.test.tsx (5 unit tests)
**Estimated Effort:** 3.5 hours
**Priority:** High

**What to Test (Unit):**
- Click handlers on table cards
- Drag-drop behavior (mock React Beautiful DnD)
- Context menu triggers
- Modal opens/closes
- Toast notifications

**Conversion Steps:**
1. Create interaction test file in `/client/src/pages/__tests__/`
2. Mock drag-drop library
3. Use userEvent for clicks and drags
4. Verify event handlers called with correct parameters

**Example:**
```typescript
describe('ServerView Interactions', () => {
  it('opens order detail modal when table clicked', () => {
    const onSelectTable = vi.fn();
    render(<ServerView onSelectTable={onSelectTable} tables={[mockTable]} />);
    userEvent.click(screen.getByTestId('table-card-1'));
    expect(onSelectTable).toHaveBeenCalledWith('1');
  });
});
```

---

### Group B: Validation Tests → Unit Tests

#### B1: checkout-flow.spec.ts (Validation)
**Location:** `/tests/e2e/checkout-flow.spec.ts`
**Current Count:** ~22 E2E tests (validation-focused)
**Target:** CheckoutValidation.test.tsx (8 unit tests)
**Estimated Effort:** 3.5 hours
**Priority:** High

**What to Test (Convert to Unit):**
- Required field validation (customer name, email)
- Email format validation
- Amount validation (must be >0)
- Special characters handling
- Field length limits

**Why It's Misplaced:**
```typescript
// Current E2E: Fires up entire server + browser
test('checkout validates customer name required', async ({ page }) => {
  await page.goto('http://localhost:5173/checkout');
  await page.locator('[name="customerName"]').clear();
  await page.locator('[type="submit"]').click();
  // Wait 2 seconds for async validation
  await page.waitForTimeout(2000);
  expect(await page.locator('.error-message').textContent()).toContain('Name required');
});

// Better as Unit: Validates form logic in isolation
describe('CheckoutFormValidation', () => {
  it('rejects empty customer name', () => {
    const { errors } = validateCheckout({ customerName: '', email: 'test@x.com' });
    expect(errors.customerName).toBe('Name required');
  });
});
```

**Conversion Steps:**
1. Extract validation logic from form component (if not already)
2. Create unit tests for validation functions
3. Create component tests for error display
4. Keep 1 E2E test for complete flow

---

#### B2: card-payment.spec.ts (Validation)
**Location:** `/tests/e2e/card-payment.spec.ts`
**Current Count:** ~14 E2E tests (mostly validation)
**Target:** CardPaymentValidation.test.tsx (7 unit tests)
**Estimated Effort:** 3 hours
**Priority:** High

**Evidence of Over-Testing:**
```
Test 1: Valid card accepted
Test 2: Invalid card rejected
Test 3: Expired card rejected
Test 4: CVV validation (too short)
Test 5: CVV validation (too long)
Test 6: CVV validation (non-numeric)
Test 7: Card number validation (too short)
Test 8: Card number validation (too long)
Test 9: Card number validation (non-numeric)
Test 10: Zip code validation (non-numeric)
... 4 more
```

**Problem:** Same validation logic tested 14 times in browser (35+ seconds total).

**Solution:** Extract to validation unit tests (0.2 seconds total)
```typescript
describe('Payment Validation', () => {
  it.each([
    { cardNum: '4111111111111111', valid: true },
    { cardNum: '4111111111111112', valid: false },
    { cardNum: '411111111111111', valid: false },
  ])('validates card number', ({ cardNum, valid }) => {
    const result = validateCardNumber(cardNum);
    expect(result.isValid).toBe(valid);
  });
});
```

---

#### B3: cash-payment.spec.ts (Validation)
**Location:** `/tests/e2e/cash-payment.spec.ts`
**Current Count:** ~8 E2E tests
**Target:** CashPaymentValidation.test.tsx (4 unit tests)
**Estimated Effort:** 2 hours
**Priority:** Medium

**What to Test:**
- Amount must be > 0
- Amount must be numeric
- Change calculation
- Denomination selection

**Conversion:**
```typescript
describe('CashPayment', () => {
  it('calculates change correctly', () => {
    const change = calculateChange(30, 25.99);
    expect(change).toBeCloseTo(4.01, 2);
  });

  it('rejects negative amounts', () => {
    const result = validateCashAmount(-10);
    expect(result.error).toBe('Amount must be positive');
  });
});
```

---

#### B4: workspace-landing.spec.ts (Partial)
**Location:** `/tests/e2e/workspace-landing.spec.ts`
**Current Count:** ~12 E2E tests (permission validation + UI tests)
**Target:** WorkspaceLanding.e2e.test.tsx (1 E2E) + WorkspaceLanding.test.tsx (6 unit)
**Estimated Effort:** 3 hours
**Priority:** High

**What to Keep as E2E (1 test):**
- Manager can login and access workspace (permission check with auth)

**What to Convert to Unit:**
- Demo mode badge visibility (component prop)
- Role indicator display (given a user object)
- Workspace list rendering (given array of workspaces)
- Permission checks (given RBAC roles)

**Conversion:**
```typescript
// E2E
describe('workspace-e2e', () => {
  it('manager logs in and sees workspace', async ({ page }) => {
    // Full login flow + redirect check
  });
});

// Unit
describe('WorkspaceLanding', () => {
  it('shows demo badge when in demo mode', () => {
    render(<WorkspaceLanding isDemoMode={true} />);
    expect(screen.getByText(/demo/i)).toBeInTheDocument();
  });

  it('hides workspace list when user lacks permission', () => {
    render(<WorkspaceLanding role="viewer" />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
```

---

### Group C: Smoke Tests (Consolidate)

#### C1: auth/login.smoke.spec.ts
**Location:** `/tests/e2e/auth/login.smoke.spec.ts`
**Current Count:** ~8 separate tests
**Target:** 2 consolidated E2E tests
**Estimated Effort:** 2 hours
**Priority:** High

**Current Approach (Wrong):**
```typescript
test('manager can login', async ({ page }) => { /* 30s test */ });
test('server can login', async ({ page }) => { /* 30s test */ });
test('kitchen can login', async ({ page }) => { /* 30s test */ });
test('invalid creds fail', async ({ page }) => { /* 30s test */ });
test('session expires', async ({ page }) => { /* 30s test */ });
// ... 3 more
```

**Better Approach:**
```typescript
test('all roles can login successfully', async ({ page }) => {
  // Login as manager, verify redirect
  // Logout, login as server, verify redirect
  // Logout, login as kitchen, verify redirect
  // Total: 1 test file, 1 minute for 3 paths
});

test('invalid credentials show error', async ({ page }) => {
  // Try invalid password
  // Try non-existent email
});

// Other edge cases → unit tests with mocked auth
```

**Actions:**
1. Consolidate 8 tests into 2 E2E tests
2. Move edge cases (expired tokens, rate limiting) to unit tests
3. Delete redundant tests

---

#### C2: kds/kitchen-display.smoke.spec.ts
**Location:** `/tests/e2e/kds/kitchen-display.smoke.spec.ts`
**Current Count:** ~6 tests
**Target:** 1 consolidated E2E test
**Estimated Effort:** 2 hours
**Priority:** High

**Consolidation:**
```typescript
// BEFORE: 6 separate tests (3 minutes total)
test('KDS receives new order', async ({ page }) => { });
test('KDS updates order status', async ({ page }) => { });
test('KDS shows completed orders', async ({ page }) => { });
test('KDS filters by station', async ({ page }) => { });
test('KDS printer integration', async ({ page }) => { });
test('KDS real-time updates via WebSocket', async ({ page }) => { });

// AFTER: 1 consolidated E2E test (30 seconds)
test('complete kitchen display flow', async ({ page }) => {
  // Create order via API
  // KDS receives it
  // Mark as prepared
  // Verify status updated
  // Filter by station
  // Verify real-time update
});

// Edge cases → unit/integration tests
```

---

#### C3: orders/server-order-flow.smoke.spec.ts
**Location:** `/tests/e2e/orders/server-order-flow.smoke.spec.ts`
**Current Count:** ~10 tests
**Target:** 1 consolidated E2E test
**Estimated Effort:** 2 hours
**Priority:** High

**Complete End-to-End Test:**
```typescript
test('complete order flow from menu to delivery', async ({ page }) => {
  // Customer places order (via kiosk)
  // Server sees order on workstation
  // Kitchen receives order on KDS
  // Kitchen marks as ready
  // Customer sees order ready notification
  // Server delivers order
  // Payment processed
});
```

---

#### C4: voice-ordering.spec.ts
**Location:** `/tests/e2e/voice-ordering.spec.ts`
**Current Count:** ~14 tests
**Target:** 1 consolidated E2E test
**Estimated Effort:** 2 hours
**Priority:** Medium (Skip in CI, manual testing)

**Consolidation:**
```typescript
test('voice order from speech to confirmation', async ({ page, context }) => {
  // Grant microphone permission
  // Start voice ordering
  // Mock WebRTC with audio stream
  // Verify transcription
  // Verify menu items recognized
  // Complete checkout
  // Verify order created
});

// Note: Keep marked with @skip in CI due to microphone requirement
```

---

## Implementation Plan

### Phase 1: Group A Implementation (2 weeks)
**Timeline:** Week 1-2
**Team:** 1-2 engineers
**Effort:** 19 hours

| File | Week | Status |
|------|------|--------|
| viewport-test.spec.ts | 1 | Create Viewport.test.tsx |
| kiosk-voice-button.spec.ts | 1 | Create VoiceButton.test.tsx |
| basic-routes.spec.ts | 1 | Create routes.test.tsx |
| checkout-smoke.spec.ts | 2 | Split E2E + unit |
| production-serverview-detailed.spec.ts | 2 | Create ServerView.test.tsx |
| production-serverview-interaction.spec.ts | 2 | Create ServerViewInteraction.test.tsx |

### Phase 2: Group B Implementation (1.5 weeks)
**Timeline:** Week 3-4
**Team:** 1 engineer
**Effort:** 13 hours

| File | Week | Status |
|------|------|--------|
| checkout-flow.spec.ts | 3 | Create CheckoutValidation.test.tsx |
| card-payment.spec.ts | 3 | Create CardPaymentValidation.test.tsx |
| cash-payment.spec.ts | 3-4 | Create CashPaymentValidation.test.tsx |
| workspace-landing.spec.ts | 4 | Split E2E + unit |

### Phase 3: Group C Consolidation (1 week)
**Timeline:** Week 4-5
**Team:** 1 engineer
**Effort:** 10 hours

| File | Week | Status |
|------|------|--------|
| auth/login.smoke.spec.ts | 4 | Consolidate to 2 tests |
| kds/kitchen-display.smoke.spec.ts | 4-5 | Consolidate to 1 test |
| orders/server-order-flow.smoke.spec.ts | 5 | Consolidate to 1 test |
| voice-ordering.spec.ts | 5 | Consolidate to 1 test |

---

## Success Criteria

### Test Count Reduction
- [ ] E2E test count reduced from 188 → ~50 (73% reduction)
- [ ] Group A: 95 tests → 25 unit tests (70% reduction)
- [ ] Group B: 56 tests → 30 unit tests (46% reduction)
- [ ] Group C: Consolidated to 5 E2E tests (75% reduction)

### Quality Metrics
- [ ] Unit test pass rate: 95%+ (currently 1,397 tests)
- [ ] E2E test pass rate: 95%+
- [ ] No regression in code coverage

### Performance Improvement
- [ ] E2E test duration reduced from 35 min → 7 min
- [ ] Unit test suite runs in <5 minutes
- [ ] CI feedback loop: 35 min → 12 min total

### Code Quality
- [ ] All converted tests follow Testing Library best practices
- [ ] No hardcoded waits (all dynamic waits)
- [ ] Proper accessibility testing (a11y queries)
- [ ] Comprehensive error message assertions

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Missed test coverage | Medium | High | Run old + new tests in parallel for 1 week |
| Unit test flakiness | Low | Medium | Proper mocking, no real API calls |
| Conversion mistakes | Medium | Medium | Peer review all conversions before merge |
| CI configuration errors | Low | Medium | Test sharding locally first |

---

## Acceptance Checklist

### Pre-Implementation
- [ ] Review and approve test pyramid strategy
- [ ] Allocate engineering resources (2 engineers)
- [ ] Create feature branch for conversion work
- [ ] Set up monitoring for test flakiness

### During Implementation
- [ ] Weekly check-ins on progress
- [ ] Verify no regression in code coverage
- [ ] Monitor CI times (should decrease)
- [ ] Validate test assertions match original intent

### Post-Implementation
- [ ] All 50 E2E tests passing in CI
- [ ] All new unit tests passing locally
- [ ] Code review sign-off
- [ ] Documentation updated
- [ ] Deploy confidence assessment

---

## Related Documentation

- [Test Pyramid Pattern](https://martinfowler.com/bliki/TestPyramid.html)
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Configuration](../../vitest.config.ts)
- [Playwright Best Practices](../../playwright.config.ts)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-05
**Author:** Claude Code Agent
**Status:** Ready for Implementation
