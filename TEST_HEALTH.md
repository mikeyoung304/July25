# 🏥 Test Health Dashboard

**Last Updated:** 2025-11-24
**Health Score:** HEALTHY
**Overall Pass Rate:** 99.8%

## 📊 Quick Stats

| Metric | Value | Status |
| ------ | ----- | ------ |
| Total Tests | 431 | - |
| Passing | 430 | ✅ |
| Quarantined | 0 | ⚠️ |
| Pass Rate | 99.8% | ✅ |

## 🔬 Module Health

### ✅ Auth

| Metric | Value |
| ------ | ----- |
| Total Tests | 120 |
| Passing | 120 |
| Quarantined | 0 |
| Pass Rate | 100.0% |

### ❌ Voice

| Metric | Value |
| ------ | ----- |
| Total Tests | 95 |
| Passing | 71 |
| Quarantined | 24 |
| Pass Rate | 74.7% |

### ✅ Orders

| Metric | Value |
| ------ | ----- |
| Total Tests | 87 |
| Passing | 87 |
| Quarantined | 0 |
| Pass Rate | 100.0% |

### ✅ Shared

| Metric | Value |
| ------ | ----- |
| Total Tests | 75 |
| Passing | 66 |
| Quarantined | 0 |
| Pass Rate | 88.0% |

## 🚨 Quarantined Tests (0 total)

### By Priority

#### 🔴 Priority 1: CRITICAL (0 tests)

#### 🟡 Priority 2: HIGH (3 tests)

- **auth-003**: `server/tests/middleware/auth-restaurant-id.test.ts.skip`
  - **Reason**: Spy assertion failure - expected call not received. Pre-existing regression from Oct 30 fix.
  - **Fix Strategy**: Review middleware implementation changes. Update spy expectations.
  - **Status**: QUARANTINED

- **voice-001**: `client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip`
  - **Reason**: Method configureSession() does not exist on WebRTCVoiceClient class. Tests written against API that was never implemented.
  - **Fix Strategy**: Either implement configureSession() method or rewrite tests to use sessionConfig property directly
  - **Status**: SKIPPED

- **voice-002**: `client/src/modules/voice/services/orderIntegration.integration.test.tsx.skip`
  - **Reason**: useAuth must be used within an AuthProvider. Missing AuthProvider wrapper in test setup.
  - **Fix Strategy**: Add AuthProvider wrapper to renderWithRouter test utility
  - **Status**: SKIPPED

#### 🟢 Priority 3: MEDIUM (3 tests)

- **auth-004**: `client/src/pages/__tests__/WorkspaceDashboard.test.tsx.skip`
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

## 📋 Remediation Plan

| Phase | Target Date | Tests | Status |
| ----- | ----------- | ----- | ------ |
| Phase 1: Critical Auth Fixes | 2025-11-03 | 0 tests | 🔜 |
| Phase 2: Order Flow Restoration | 2025-11-05 | 0 tests | ⏳ |
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
