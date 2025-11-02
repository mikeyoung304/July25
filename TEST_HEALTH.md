# 🏥 Test Health Dashboard

**Last Updated:** 2025-11-02
**Health Score:** DEGRADED
**Overall Pass Rate:** 87.3%

## 📊 Quick Stats

| Metric | Value | Status |
| ------ | ----- | ------ |
| Total Tests | 377 | - |
| Passing | 329 | ✅ |
| Quarantined | 24 | ⚠️ |
| Pass Rate | 87.3% | ⚠️ |

## 🔬 Module Health

### ⚠️ Auth

| Metric | Value |
| ------ | ----- |
| Total Tests | 120 |
| Passing | 111 |
| Quarantined | 9 |
| Pass Rate | 92.5% |

### ❌ Voice

| Metric | Value |
| ------ | ----- |
| Total Tests | 95 |
| Passing | 71 |
| Quarantined | 24 |
| Pass Rate | 74.7% |

### ⚠️ Orders

| Metric | Value |
| ------ | ----- |
| Total Tests | 87 |
| Passing | 81 |
| Quarantined | 6 |
| Pass Rate | 93.1% |

### ✅ Shared

| Metric | Value |
| ------ | ----- |
| Total Tests | 75 |
| Passing | 66 |
| Quarantined | 0 |
| Pass Rate | 88.0% |

## 🚨 Quarantined Tests (24 total)

### By Priority

#### 🔴 Priority 1: CRITICAL (3 tests)

- **auth-001**: `client/src/hooks/__tests__/useWorkspaceAccess.test.ts.skip`
  - **Reason**: Parser error: Unterminated regular expression at line 38. JSX syntax causing parse failure before tests run.
  - **Fix Strategy**: Rewrite test without JSX syntax issues or convert to plain function components
  - **Status**: QUARANTINED

- **auth-002**: `client/src/components/auth/__tests__/WorkspaceAuthModal.test.tsx.skip`
  - **Reason**: Multiple password field elements found. Component structure changed to have duplicate password fields.
  - **Fix Strategy**: Use data-testid selectors instead of text matching. Add unique IDs to password fields.
  - **Status**: QUARANTINED

- **auth-005**: `server/tests/routes/orders.auth.test.ts`
  - **Reason**: 403 Forbidden instead of 201 Created. Auth middleware not allowing customer/server roles to create orders.
  - **Fix Strategy**: Review RBAC changes from Oct 30-31. Restore proper role permissions or update test expectations.
  - **Status**: SKIPPED

#### 🟡 Priority 2: HIGH (7 tests)

- **auth-003**: `server/tests/middleware/auth-restaurant-id.test.ts.skip`
  - **Reason**: Spy assertion failure - expected call not received. Pre-existing regression from Oct 30 fix.
  - **Fix Strategy**: Review middleware implementation changes. Update spy expectations.
  - **Status**: QUARANTINED

- **voice-001**: `client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts`
  - **Reason**: Method configureSession() does not exist on WebRTCVoiceClient class. Tests written against API that was never implemented.
  - **Fix Strategy**: Either implement configureSession() method or rewrite tests to use sessionConfig property directly
  - **Status**: SKIPPED

- **voice-002**: `client/src/modules/voice/services/orderIntegration.integration.test.tsx`
  - **Reason**: useAuth must be used within an AuthProvider. Missing AuthProvider wrapper in test setup.
  - **Fix Strategy**: Add AuthProvider wrapper to renderWithRouter test utility
  - **Status**: SKIPPED

- **orders-001**: `client/src/modules/order-system/__tests__/checkout-simple.test.tsx`
  - **Reason**: Unable to find element with text /checkout/i. CheckoutPage structure changed since test written.
  - **Fix Strategy**: Update selectors to match current CheckoutPage structure. Use data-testid attributes.
  - **Status**: SKIPPED

- **orders-002**: `client/src/pages/__tests__/CheckoutPage.demo.test.tsx`
  - **Reason**: mockNavigate never called. Navigation to /order-confirmation not triggered.
  - **Fix Strategy**: Fix navigation mocking setup. Ensure form submission triggers navigation.
  - **Status**: SKIPPED

- **orders-004**: `client/src/modules/order-system/__tests__/checkout.e2e.test.tsx`
  - **Reason**: Unable to find element with text: Checkout. CheckoutPage structure changed.
  - **Fix Strategy**: Update E2E test to match current page structure and text
  - **Status**: SKIPPED

- **orders-005**: `server/tests/contracts/order.contract.test.ts`
  - **Reason**: OrderPayload schema doesn't accept snake_case per ADR-001. Schema validation mismatch.
  - **Fix Strategy**: Align OrderPayload Zod schema with ADR-001 snake_case convention
  - **Status**: SKIPPED

#### 🟢 Priority 3: MEDIUM (4 tests)

- **auth-004**: `client/src/pages/__tests__/WorkspaceDashboard.test.tsx`
  - **Reason**: Spy not called on Enter key press. handleAccess not being triggered by keyboard events.
  - **Fix Strategy**: Fix keyboard event handling in WorkspaceTile component
  - **Status**: SKIPPED

- **voice-003**: `client/src/modules/voice/components/HoldToRecordButton.test.tsx.skip`
  - **Reason**: Multiple failures: text assertions (LISTENING..., PROCESSING...) and event handler spies not called.
  - **Fix Strategy**: Update text assertions to match current component state. Fix event handler mocking.
  - **Status**: QUARANTINED

- **voice-004**: `client/src/modules/voice/components/RecordingIndicator.test.tsx`
  - **Reason**: CI-specific failure not caught locally. Component structure mismatch.
  - **Fix Strategy**: Investigate CI vs local environment differences. Update selectors.
  - **Status**: FAILING

- **orders-003**: `client/src/pages/__tests__/CheckoutPage.demo.test.tsx`
  - **Reason**: Found multiple elements with /required/i. Form validation showing multiple required fields.
  - **Fix Strategy**: Use more specific selectors to target individual validation messages
  - **Status**: SKIPPED

## 📋 Remediation Plan

| Phase | Target Date | Tests | Status |
| ----- | ----------- | ----- | ------ |
| Phase 1: Critical Auth Fixes | 2025-11-03 | 3 tests | 🔜 |
| Phase 2: Order Flow Restoration | 2025-11-05 | 4 tests | ⏳ |
| Phase 3: Voice Integration | 2025-11-07 | 4 tests | ⏳ |

## 🛠️ How to Use

### Run Only Healthy Tests
```bash
npm run test:healthy
```

### Check Quarantine Status
```bash
npm run test:quarantine:status
```

### Regenerate This Dashboard
```bash
npm run test:quarantine:dashboard
```

### Run System Health Check
```bash
npm run health
```

## 📚 Documentation

- **Root Cause**: Oct 30-31 refactoring without test updates
- **Triggered By**: PR #132 documentation update
- **Created**: Claude Code

---

*This dashboard is auto-generated from `test-quarantine/test-health.json`*
